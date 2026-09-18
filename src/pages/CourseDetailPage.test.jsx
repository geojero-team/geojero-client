import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '../i18n'
import { api } from '../lib/api'
import { getToken } from '../lib/session'
import { loadSpots } from '../lib/spots'
import CourseDetailPage from './CourseDetailPage'
import styles from './CourseDetailPage.module.css'

vi.mock('../lib/api', () => ({
  api: { course: vi.fn(), saveTrip: vi.fn(), savedTrips: vi.fn() },
  beginKakaoLogin: vi.fn(),
}))

// regionsOf 는 그대로 쓰고 /api/pois 만 흉내 냅니다.
vi.mock('../lib/spots', async (importOriginal) => ({ ...(await importOriginal()), loadSpots: vi.fn() }))

vi.mock('../lib/session', () => ({ getToken: vi.fn(() => null) }))

// 코스 지도는 카카오 SDK가 필요합니다 — jsdom에는 없어 늘 실패 상태로 봅니다.
vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn(() => Promise.reject(new Error('no sdk'))) }))

/** /api/pois — 권역 · 고현터미널 좌표 · 대표 사진은 목록에만 있습니다. 해금강은 사진이 없는 경우(저작권 Type3). */
const POIS = new Map(
  [
    [1, '바람의언덕', '남부권', 'https://tong.visitkorea.or.kr/windhill.jpg'],
    [3, '해금강', '남부권', null],
    [4, '학동몽돌해변', '남부권', 'https://tong.visitkorea.or.kr/hakdong.jpg'],
    [18, '거제씨월드', '동부권', null],
    [20, '조선해양문화관', '동부권', null],
  ]
    .map(([poiId, shortName, region, imageUrl]) => [
      poiId,
      { poiId, shortName, name: shortName, region, theme: 'VIEW', kind: 'SPOT', imageUrl },
    ])
    .concat([[23, { poiId: 23, shortName: '고현터미널', name: '고현터미널', kind: 'TERMINAL', lat: 34.8906148, lng: 128.6242507 }]]),
)

const ride = (routeNo, boardEstimated = false, alightEstimated = false) => ({
  routeNo,
  boardStop: 'x',
  boardAt: '11:05',
  boardEstimated,
  alightStop: 'y',
  alightAt: '11:45',
  alightEstimated,
})

/**
 * 버스 구간 첫 줄 — 노선 알약 「55」 + 글 「약 40분」으로 조각나 있어 줄 전체로 찾습니다.
 * 단언은 화면 모양 그대로 「[55] 약 40분」으로 씁니다. 알약 안에 읽기 도구용 「번」이 있어 줄의 textContent 는 「55번 약 40분」입니다.
 * 정규식은 textContent 에 그대로 겁니다.
 */
const busLine = (expected) => (_, el) => {
  if (!el.classList?.contains(styles.legBus)) return false
  const text = el.textContent.replace(/\s+/g, ' ')
  return expected instanceof RegExp ? expected.test(text) : text === expected.replace(/^\[(\S+)\] /, '$1번 ')
}

/** 정류장 점(장소) 바로 뒤 · 앞 줄 = 걷는 칸(이동)의 글 — 「걸어가요 · 직선 약 310m」(2026-09-18 「점 = 장소, 사이 = 이동」). */
// 걷는 칸 오른쪽 「길찾기 ↗」 링크 글은 빼고 읽는다
const rowText = (row) => {
  const copy = row.cloneNode(true)
  copy.querySelectorAll('a').forEach((a) => a.remove())
  return copy.textContent.replace(/\u00a0/g, ' ')
}
const walkAfter = (station) => rowText(station.closest(`.${styles.stationRow}`).nextElementSibling)
const walkBefore = (station) => rowText(station.closest(`.${styles.stationRow}`).previousElementSibling)

/** 운영 3-01 그대로(2026-09-14) — 3·4구간이 도장포를 감싼 추정값이다. */
const COURSE_301 = {
  courseId: 101,
  courseCode: '3-01',
  name: '학동 · 해금강 · 바람의언덕',
  spotCount: 3,
  busMinTotal: 114,
  busTotalText: '약 1시간 54분',
  legCount: 4,
  estimatedLegCount: 2,
  service: 'WEEKDAY',
  baseDate: '2026-08-18',
  source: '거제시 BIS 원문',
  originName: '고현터미널',
  stops: [
    { seq: 1, poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', theme: 'BEACH', lat: 34.774752, lng: 128.641498 },
    { seq: 2, poiId: 3, name: '해금강', shortName: '해금강', theme: 'VIEW', lat: 34.7333, lng: 128.6839 },
    { seq: 3, poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', lat: 34.7440458, lng: 128.6633111 },
  ],
  legs: [
    { seq: 1, mode: 'BUS', fromPoiId: null, toPoiId: 4, durationMin: 40, estimated: false, rides: [ride('55')], alight: { stop: '학동', distanceM: 311, lat: 34.7721, lng: 128.6390 } },
    { seq: 2, mode: 'BUS', fromPoiId: 4, toPoiId: 3, durationMin: 10, estimated: false, rides: [ride('55')] },
    { seq: 3, mode: 'BUS', fromPoiId: 3, toPoiId: 1, durationMin: 12, estimated: true, rides: [ride('55', false, true)] },
    // 마지막 구간 — 고현터미널로 돌아간다. 내릴 스팟이 없어 대신 타는 곳이 온다
    { seq: 4, mode: 'BUS', fromPoiId: 1, toPoiId: null, durationMin: 52, estimated: true, rides: [ride('55', true, false)], board: { stop: '도장포', distanceM: 376, lat: 34.7423, lng: 128.6598 } },
  ],
}

/** 운영 3-08 — 조선해양문화관 → 거제씨월드는 같은 정류장이라 버스를 타지 않는다. 추정 구간 없음. */
const COURSE_308 = {
  ...COURSE_301,
  courseId: 110,
  courseCode: '3-08',
  name: '학동 · 조선해양문화관 · 씨월드',
  busMinTotal: 112,
  estimatedLegCount: 0,
  stops: [
    { seq: 1, poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', theme: 'BEACH', lat: 34.77, lng: 128.64 },
    // 좌표는 운영 값(TourAPI) — 두 스팟 사이 직선 112.9m
    { seq: 2, poiId: 20, name: '거제조선해양문화관', shortName: '조선해양문화관', theme: 'EXHIBIT', lat: 34.834849, lng: 128.701634 },
    { seq: 3, poiId: 18, name: '거제씨월드', shortName: '거제씨월드', theme: 'EXHIBIT', lat: 34.8358552, lng: 128.7014662 },
  ],
  legs: [
    { seq: 1, mode: 'BUS', durationMin: 40, estimated: false, rides: [ride('55')], alight: { stop: '학동', distanceM: 311 } },
    { seq: 2, mode: 'BUS', durationMin: 27, estimated: false, rides: [ride('67-1')], alight: { stop: '지세포', distanceM: 675 } },
    // 걸어서 옮기는 구간 — 버스에서 내리지 않으므로 줄이 없다
    { seq: 3, mode: 'SAME_STOP', fromPoiId: 20, fromName: '조선해양문화관', toPoiId: 18, toName: '거제씨월드', durationMin: 0, estimated: false, rides: [], alight: null },
    { seq: 4, mode: 'BUS', durationMin: 45, estimated: false, rides: [ride('22')], alight: { stop: '학동', distanceM: 311 } },
  ],
}

/**
 * 운영 3-11(V36) — 배 구간이 든 첫 코스.
 * 배는 버스와 둘이 다르다: ① **왕복**이라 구간이 둘(가는 구간 160분 · 돌아오는 구간 0분)이고
 * ② **시각이 날짜마다 달라** departAt·arriveAt 이 없다. 원문이 주는 시간은 왕복 + 외도 체류를
 * 합친 「약 2시간 40분」 하나뿐이라 그 값이 가는 구간에 실려 온다.
 */
const FERRY = {
  legendLabel: '외도상륙+해금강선상관광',
  courseName: '외도상륙+해금강, 십자동굴 선상관광(외도입장료 별도)',
  totalText: '약 2시간 40분',
  stayMin: 120,
  landsOnOedo: true,
  dockName: '도장포',
  bookingUrl: 'https://www.oedoticket.com/page/view.php?cid=abc',
}

const COURSE_311 = {
  ...COURSE_301,
  courseId: 124,
  courseCode: '3-11',
  name: '도장포유람선 · 외도보타니아 · 바람의언덕',
  title: '배로 건너가는 거제 9경, 외도보타니아',
  busMinTotal: 102,
  busTotalText: '약 1시간 42분',
  ferryMinTotal: 160,
  ferryTotalText: '약 2시간 40분',
  legCount: 5,
  estimatedLegCount: 2,
  stops: [
    { seq: 1, poiId: 2, name: '도장포유람선', shortName: '도장포유람선', theme: 'CRUISE', lat: 34.7421508, lng: 128.6626096 },
    { seq: 2, poiId: 5, name: '외도보타니아', shortName: '외도보타니아', theme: 'CRUISE', lat: 34.7225, lng: 128.6969 },
    { seq: 3, poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', lat: 34.7440458, lng: 128.6633111 },
  ],
  // fromName·toName 은 운영 응답 그대로입니다 — 배 구간의 둘째 줄이 「어느 스팟에 머무는가」를 거기서 읽습니다.
  legs: [
    { seq: 1, mode: 'BUS', fromName: '고현터미널', toName: '도장포유람선', durationMin: 50, estimated: true, rides: [ride('55', false, true)], alight: { stop: '도장포', distanceM: 174 } },
    { seq: 2, mode: 'FERRY', fromName: '도장포유람선', toName: '외도보타니아', durationMin: 160, estimated: false, rides: [], ferry: FERRY },
    { seq: 3, mode: 'FERRY', fromName: '외도보타니아', toName: '도장포유람선', durationMin: 0, estimated: false, rides: [], ferry: FERRY },
    { seq: 4, mode: 'SAME_STOP', fromPoiId: 2, fromName: '도장포유람선', toPoiId: 1, toName: '바람의언덕', durationMin: 0, estimated: false, rides: [] },
    { seq: 5, mode: 'BUS', fromName: '바람의언덕', toName: '고현터미널', durationMin: 52, estimated: true, rides: [ride('55', true, false)], board: { stop: '도장포', distanceM: 376 } },
  ],
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="loc">{location.pathname + location.search}</output>
}

function renderCourse(id) {
  return render(
    <MemoryRouter initialEntries={[`/courses/${id}`]}>
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/timetable/:poiId" element={<p>시간표 화면</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  loadSpots.mockResolvedValue(POIS)
  api.course.mockImplementation(async (id) => (String(id) === '110' ? COURSE_308 : COURSE_301))
  // 로그인 상태면 화면이 저장 목록을 묻습니다(이미 저장한 코스인지). 기본은 빈 목록.
  api.savedTrips.mockResolvedValue([])
})

describe('CourseDetailPage — 같은 코스는 한 번만 저장(2026-09-15 사용자 요청)', () => {
  afterEach(() => {
    getToken.mockReturnValue(null)
  })

  it('이미 내 일정에 있는 코스면 저장 버튼 대신 「이미 내 일정에 저장한 코스예요」 · 내 일정 보기', async () => {
    getToken.mockReturnValue('token')
    api.savedTrips.mockResolvedValue([{ savedTripId: 9, courseId: 101 }])
    renderCourse(101)

    expect(await screen.findByText('이미 내 일정에 저장한 코스예요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `${t('courseDetail.savedGo')} ›` })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('courseDetail.save') })).not.toBeInTheDocument()
  })

  it('다른 코스만 저장했으면 저장 버튼은 그대로', async () => {
    getToken.mockReturnValue('token')
    api.savedTrips.mockResolvedValue([{ savedTripId: 9, courseId: 110 }])
    renderCourse(101)

    expect(await screen.findByRole('button', { name: t('courseDetail.save') })).toBeInTheDocument()
    expect(screen.queryByText('이미 내 일정에 저장한 코스예요')).not.toBeInTheDocument()
  })

  it('서버가 409(이미 저장)를 주면 오류가 아니라 저장된 상태로 — 다른 기기에서 저장했거나 목록을 못 받았을 때', async () => {
    const user = userEvent.setup()
    getToken.mockReturnValue('token')
    api.saveTrip.mockRejectedValue(Object.assign(new Error('POST /api/saved-trips → 409'), { status: 409 }))
    renderCourse(101)

    await user.click(await screen.findByRole('button', { name: t('courseDetail.save') }))

    expect(await screen.findByText('이미 내 일정에 저장한 코스예요')).toBeInTheDocument()
    expect(screen.queryByText(/저장하지 못했어요/)).not.toBeInTheDocument()
  })
})

describe('CourseDetailPage — 09-14 확정(547:200)', () => {
  it('머리 · 권역 · 제목(첫 스팟에서 끝 스팟까지) · 스팟 체인 · 칩 둘 — 출발지 문장은 그림에 없다', async () => {
    renderCourse(101)

    expect(await screen.findByRole('heading', { level: 1, name: '학동몽돌해변에서 바람의언덕까지' })).toBeInTheDocument()
    // 체인은 이름마다 nowrap 조각이라 한 문단의 textContent 로 봅니다.
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === '학동몽돌해변 · 해금강 · 바람의언덕')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '뒤로' })).toHaveTextContent('코스')
    // 머리 「평일」 알약은 뺐다(2026-09-17 사용자 결정) — 확인용 편 사슬의 요일이라 「평일용 코스」로 읽혔다.
    // 요일 사정은 구간 줄(「평일 N회 · 휴일 M회」 · 「휴일엔 이 구간 버스가 없어요」)이 말한다.
    expect(screen.queryByText('평일')).not.toBeInTheDocument()
    expect(screen.queryByText('휴일')).not.toBeInTheDocument()
    // 곳 수는 뺐다(2026-09-18 사용자) — 스팟 체인과 타임라인 번호가 이미 센다
    expect(screen.getByText('남부권')).toBeInTheDocument()
    expect(screen.queryByText(/3곳/)).not.toBeInTheDocument()
    expect(screen.queryByText('고현터미널에서 출발해 고현터미널로 돌아와요')).not.toBeInTheDocument()
    expect(screen.getByText('버스 약 1시간 54분')).toBeInTheDocument()
    // 「구간」은 방문하는 곳 수로 읽혔다(왼쪽 「남부권 · 3곳」과 나란히 보인다) — 버스 타는 횟수로 적는다(2026-09-16 사용자 결정).
    expect(screen.getByText('버스 4번')).toBeInTheDocument()
    expect(screen.queryByText('4구간')).not.toBeInTheDocument()
    // 코스 name 은 줄임말(「학동」 · 「기성관」)이라 제목으로 쓰지 않는다 — TourAPI 정본은 shortName 쪽이다
    expect(screen.queryByText('학동 · 해금강 · 바람의언덕')).not.toBeInTheDocument()
  })

  it('타임라인 스팟 줄 — 40px 둥근 사진에 번호. 사진이 없는 스팟은 분류 자리그림', async () => {
    renderCourse(101)

    const hakdong = (await screen.findByText('학동몽돌해변', { selector: '[data-stop] *' })).closest('[data-stop]')
    const haegeumgang = screen.getByText('해금강', { selector: '[data-stop] *' }).closest('[data-stop]')
    expect(hakdong.querySelector('img')).toHaveAttribute('src', 'https://tong.visitkorea.or.kr/hakdong.jpg')
    expect(hakdong.querySelector('img')).toHaveAttribute('alt', '')
    expect(haegeumgang.querySelector('img').getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(within(hakdong).getByText('1')).toBeInTheDocument()
    expect(within(haegeumgang).getByText('2')).toBeInTheDocument()
  })

  it('스팟 목록을 못 받아도 스팟 줄은 자리그림으로 그린다', async () => {
    loadSpots.mockResolvedValue(new Map())
    renderCourse(101)

    const row = (await screen.findByText('학동몽돌해변', { selector: '[data-stop] *' })).closest('[data-stop]')
    expect(row.querySelector('img').getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  })

  it('타임라인 — 구간마다 노선 번호와 분, 추정 구간만 「약」', async () => {
    renderCourse(101)

    await screen.findByText(busLine('[55] 40분'))
    expect(screen.getByText('고현터미널 출발')).toBeInTheDocument()
    expect(screen.getByText(busLine('[55] 10분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[55] 약 12분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[55] 약 52분'))).toBeInTheDocument()
    expect(screen.getByText('고현터미널 도착')).toBeInTheDocument()
    expect(screen.queryByText(busLine('[55] 약 40분'))).not.toBeInTheDocument()
  })

  it('추정 구간이 있으면 각주 · 출처 · 출발지 가정 — 옛 안내 줄과 큰 헤드라인은 없다', async () => {
    const { container } = renderCourse(101)

    await screen.findByText(busLine('[55] 40분'))
    expect(screen.getByText('실제 이동 시간은 적힌 것보다 짧습니다 — 버스를 놓치지 않는 쪽으로만 어긋납니다.')).toBeInTheDocument()
    expect(screen.getByText('출처 거제시 BIS 원문 · 2026-08-18')).toBeInTheDocument()
    expect(screen.getByText('모든 첫 출발지는 고현터미널로 가정합니다')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('시간표를 클릭하면')
    expect(container).not.toHaveTextContent('소요 예정')
    expect(screen.getByRole('button', { name: '이 코스 저장하기' })).toBeInTheDocument()
  })

  it('추정 구간이 없는 코스에는 「적힌 것보다 짧습니다」를 쓰지 않는다 — 확정값을 짧다고 말하게 된다', async () => {
    renderCourse(110)

    await screen.findByText(busLine('[55] 40분'))
    expect(screen.queryByText(/적힌 것보다 짧습니다/)).not.toBeInTheDocument()
  })

  it('권역이 섞이면 방문 순서대로 한 번씩 적는다', async () => {
    renderCourse(110)

    expect(await screen.findByText('남부권·동부권')).toBeInTheDocument()
  })

  it('스팟 목록을 못 받아 권역을 모르면 그 줄이 없다 — 빈 줄 · 곳 수만 남기지 않는다', async () => {
    loadSpots.mockResolvedValue(new Map())
    const { container } = renderCourse(101)

    await screen.findByText('버스 약 1시간 54분')
    expect(container.querySelector(`.${styles.meta}`)).toBeNull()
    expect(screen.queryByText(/3곳/)).not.toBeInTheDocument()
  })

  it('서버가 title 을 주면 제목은 그것 — 규칙 제목은 쓰지 않는다(코스 추천 카드와 같은 이름이어야 고른 카드를 알아본다)', async () => {
    api.course.mockResolvedValue({ ...COURSE_301, title: '환승 없이 남부 9경 세 곳' })
    renderCourse(101)

    expect(await screen.findByRole('heading', { level: 1, name: '환승 없이 남부 9경 세 곳' })).toBeInTheDocument()
    expect(screen.queryByText('학동몽돌해변에서 바람의언덕까지')).not.toBeInTheDocument()
    // 체인 부제는 그대로 — 제목이 사람 말이 되면 가운데 스팟은 여기서만 보입니다
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === '학동몽돌해변 · 해금강 · 바람의언덕')).toBeInTheDocument()
  })

  it('제목 규칙은 두 곳 이상일 때만 — 한 곳이면 「해금강에서 해금강까지」 대신 이름 그대로', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      stops: [COURSE_301.stops[1]],
      legs: COURSE_301.legs.slice(0, 2),
      legCount: 2,
    })
    renderCourse(101)

    expect(await screen.findByRole('heading', { level: 1, name: '해금강' })).toBeInTheDocument()
  })

  it('「시간표 ›」 — 다음 스팟을 목적지로 넘긴다, 마지막 스팟은 넘기지 않는다', async () => {
    const user = userEvent.setup()
    renderCourse(101)

    const links = await screen.findAllByRole('button', { name: / 시간표$/ })
    expect(links).toHaveLength(3)
    await user.click(links[0])
    expect(screen.getByTestId('loc')).toHaveTextContent('/timetable/4?to=3')
  })

  it('타는 정류장이 점으로 있으면 「시간표 ›」는 그 점에 — 그 정류장에서 타는 버스 시간표다(2026-09-18 · 네이버지도 승차 줄)', async () => {
    const user = userEvent.setup()
    renderCourse(101)

    const station = (await screen.findByText('도장포 정류장에서 타요')).closest(`.${styles.stationRow}`)
    // 읽기 도구 이름은 그대로 스팟 이름 — 어느 스팟에서 떠나는 버스인지
    const button = within(station).getByRole('button', { name: '바람의언덕 시간표' })
    expect(button).toHaveTextContent('시간표 ›')
    expect(within(document.querySelector('[data-stop="1"]')).queryByRole('button')).not.toBeInTheDocument()
    await user.click(button)
    expect(screen.getByTestId('loc').textContent).toBe('/timetable/1')
  })
  it('마지막 스팟의 「시간표 ›」는 목적지 없이 연다', async () => {
    const user = userEvent.setup()
    renderCourse(101)

    const links = await screen.findAllByRole('button', { name: / 시간표$/ })
    await user.click(links[2])
    expect(screen.getByTestId('loc').textContent).toBe('/timetable/1')
  })

  it('버스가 내리는 정류장은 점(장소), 그 뒤 걷는 칸에 직선거리 — 「10분 뒤 스팟 도착」으로 읽히지 않게(2026-09-16 · 09-18 사용자 결정)', async () => {
    renderCourse(101)

    // 이름만으로는 정류장인지 모른다(「대금교차로」) — 이름 뒤에 「정류장」을 붙인다
    const station = await screen.findByText('학동 정류장에서 내려요')
    expect(walkAfter(station)).toBe('도보 약 310m')
  })
  it('이름이 「종점」으로 끝나면 「정류장」을 붙이지 않는다 — 같은 말을 두 번 하게 된다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 0 ? { ...leg, alight: { stop: '해금강종점', distanceM: 1070 } } : leg)),
    })
    renderCourse(101)

    const station = await screen.findByText('해금강종점에서 내려요')
    expect(walkAfter(station)).toBe('도보 약 1.1km')
  })
  it('거리를 모르면 걷는 칸에 「도보」만 — 값 없이 「직선 약」만 남기지 않는다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 0 ? { ...leg, alight: { stop: '학동', distanceM: null } } : leg)),
    })
    renderCourse(101)

    const station = await screen.findByText('학동 정류장에서 내려요')
    expect(walkAfter(station)).toBe('도보')
    expect(screen.queryByText(/직선 약$/)).not.toBeInTheDocument()
  })
  it('걸어서 옮기는 구간에는 정류장 점이 없다 — 버스에서 내리지 않는다', async () => {
    renderCourse(110)

    expect(await screen.findByText('지세포 정류장에서 내려요')).toBeInTheDocument()
    // 두 스팟 사이에는 걷는 칸 하나뿐 — 조선해양문화관 → 걷기 → 거제씨월드
    const walk = document.querySelector('[data-stop="20"]').nextElementSibling
    expect(rowText(walk)).toBe('도보 약 110m')
    expect(walk.nextElementSibling).toBe(document.querySelector('[data-stop="18"]'))
  })
  it('점은 장소, 사이는 이동 — 걷는 칸은 회색 동그라미 점선 + 「도보 약 N」, 아이콘 없이(2026-09-18 사용자 결정 · 네이버지도)', async () => {
    renderCourse(110)

    await screen.findByText('지세포 정류장에서 내려요')
    const walk = document.querySelector('[data-stop="20"]').nextElementSibling
    // 선이 수단을 말한다 — 걷기는 동그라미 점선. 수단 아이콘은 점(정류장) 원에 둔다
    expect(walk.querySelector('svg')).toBeNull()
    expect(walk.querySelector(`.${styles.lineDots}`)).not.toBeNull()
    expect(within(walk).getByText('도보 약 110m')).toBeInTheDocument()
    // 스팟에서 시작하는 걷기는 위에 걷기 원이 없다 — 「도보」가 글에서 말한다(2026-09-18 사용자 · 네이버지도 「도보 240m」)
    expect(screen.queryByText(/걸어가요 · /)).not.toBeInTheDocument()
    // 전 문구 「같은 정류장 · 바로 이동」은 데이터 말이라 버스를 또 타는지 읽히지 않았다
    expect(screen.queryByText(/같은 정류장/)).not.toBeInTheDocument()
    expect(screen.queryByText(/바로 이동/)).not.toBeInTheDocument()
  })
  it('걸어가는 구간 — 스팟 좌표를 모르면 「도보」만, 값 없이 「직선 약」을 남기지 않는다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_308,
      stops: COURSE_308.stops.map((stop) => (stop.poiId === 20 ? { ...stop, lat: null, lng: null } : stop)),
    })
    renderCourse(110)

    await screen.findByText('지세포 정류장에서 내려요')
    expect(rowText(document.querySelector('[data-stop="20"]').nextElementSibling)).toBe('도보')
  })
  it('마지막 구간에는 돌아갈 때 타는 정류장 점 — 그 앞에 걷는 칸(2026-09-16 사용자 지적)', async () => {
    renderCourse(101)

    const station = await screen.findByText('도장포 정류장에서 타요')
    expect(walkBefore(station)).toBe('도보 약 380m')
    // 「내려요」가 아니라 「타요」다
    expect(screen.queryByText('도장포 정류장에서 내려요')).not.toBeInTheDocument()
  })
  it('내린 정류장으로 돌아와 다시 탈 때도 점을 찍는다 — 스팟에서 그 정류장까지 다시 걸어간다(2026-09-18)', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 2 ? { ...leg, alight: { stop: '도장포', distanceM: 376 } } : leg)),
    })
    renderCourse(101)

    const off = await screen.findByText('도장포 정류장에서 내려요')
    const on = screen.getByText('도장포 정류장에서 타요')
    // 내림 → 걷기 → 바람의언덕 → 걷기 → 탐 — 같은 정류장이라 방향은 붙이지 않는다
    expect(walkAfter(off)).toBe('도보 약 380m')
    expect(walkBefore(on)).toBe('도보 약 380m')
    expect(screen.queryByText(/방향\)에서 타요/)).not.toBeInTheDocument()
  })
  it('이름만 같고 거리가 다르면 길 건너편일 수 있다 — 타는 정류장에 가는 방향을 붙인다(도장포 393m 에 내려 376m 에서 탐)', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 2 ? { ...leg, alight: { stop: '도장포', distanceM: 393 } } : leg)),
    })
    renderCourse(101)

    const off = await screen.findByText('도장포 정류장에서 내려요')
    expect(walkAfter(off)).toBe('도보 약 390m')
    // 반올림하면 같은 거리라 같은 줄이 두 번 나온 것처럼 읽혔다(2026-09-17 밤 사용자 — 신촌 184m / 176m).
    // 「길 건너편」은 정류장 번호가 없어 단정하지 않고, 사실인 **버스가 가는 방향**만 붙인다 — 이 구간은 고현터미널로 간다.
    const on = screen.getByText('도장포 정류장(고현터미널 방향)에서 타요')
    expect(walkBefore(on)).toBe('도보 약 380m')
  })
  it('이름이 다른 정류장에서 탈 때는 방향을 붙이지 않는다 — 헷갈릴 일이 없다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 2 ? { ...leg, alight: { stop: '해금강종점', distanceM: 1070 } } : leg)),
    })
    renderCourse(101)

    expect(await screen.findByText('도장포 정류장에서 타요')).toBeInTheDocument()
    expect(screen.queryByText(/방향\)에서 타요/)).not.toBeInTheDocument()
  })
  it('버스 구간은 움직이는 순서대로 — 걷기 → 타는 정류장(점) → 노선 → 내리는 정류장(점) → 걷기(2026-09-18 사용자 결정)', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) =>
        i === 0
          ? { ...leg, alight: { stop: '학동삼거리', distanceM: 106 } }
          : i === 1
            ? { ...leg, board: { stop: '학동', distanceM: 271 }, alight: { stop: '해금강종점', distanceM: 1070 } }
            : leg,
      ),
    })
    renderCourse(101)

    const route = await screen.findByText(busLine('[55] 10분'))
    const on = screen.getByText('학동 정류장에서 타요')
    const off = screen.getByText('해금강종점에서 내려요')
    expect(on.compareDocumentPosition(route) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(route.compareDocumentPosition(off) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(walkBefore(on)).toBe('도보 약 270m')
    expect(walkAfter(off)).toBe('도보 약 1.1km')
    // 네이버지도처럼 점 원 안에 **다음 수단** 아이콘 — 타는 정류장은 버스(파란 원), 내리는 정류장은 걷기(회색 원)
    const onNode = on.closest(`.${styles.stationRow}`).querySelector(`.${styles.stationNode}`)
    const offNode = off.closest(`.${styles.stationRow}`).querySelector(`.${styles.stationNode}`)
    expect(onNode).toHaveClass(styles.stationNodeBus)
    expect(offNode).not.toHaveClass(styles.stationNodeBus)
    for (const node of [onNode, offNode]) expect(node.querySelector('svg')).not.toBeNull()
    // 이동 칸에는 아이콘 없이 선(버스는 굵은 막대)과 글만
    const routeRow = route.closest(`.${styles.legRow}`)
    expect(routeRow.querySelector('svg')).toBeNull()
    expect(routeRow.querySelector(`.${styles.line}`)).not.toBeNull()
  })
  it('좁은 폰에서 「직선 약 380m」 안에서 줄이 갈리지 않는다 — 붙는 공백', async () => {
    renderCourse(101)

    const station = await screen.findByText('도장포 정류장에서 타요')
    const walk = station.closest(`.${styles.stationRow}`).previousElementSibling
    expect(within(walk).getByText('도보 약 380m').textContent).toBe('도보\u00a0약\u00a0380m')
  })
  it('걷는 시간이 빠져 있다고 각주가 말한다 — 걷는 시간은 어느 원문에도 없다', async () => {
    renderCourse(101)

    // 어디를 눌러야 하는지 적는다 — 「스팟의 시간표 화면에서」는 막연했다(2026-09-16)
    expect(await screen.findByText(/버스 시간에는 걷는 시간이 빠져 있어요/)).toBeInTheDocument()
  })

  it('칩은 버스를 타는 구간만 센다 — 같은 정류장으로 걸어가는 구간은 빼고 「버스 3번」(서버 legCount 는 4)', async () => {
    renderCourse(110)

    expect(await screen.findByText('버스 3번')).toBeInTheDocument()
    expect(screen.queryByText('버스 4번')).not.toBeInTheDocument()
  })

  it('두 스팟 사이 걷는 칸에 「길찾기 ↗」 — 두 스팟 좌표로 카카오맵 도보 길찾기, 스팟 줄에는 버튼이 없다(2026-09-18 사용자 결정)', async () => {
    renderCourse(110)

    await screen.findByText('지세포 정류장에서 내려요')
    // 조선해양문화관 → 거제씨월드는 걸어간다. 시간표를 두면 「조선해양문화관 → 고현터미널」 버스가 열려 버스를 또 타는 것처럼 보였다
    const spot = document.querySelector('[data-stop="20"]')
    expect(within(spot).queryByRole('button')).not.toBeInTheDocument()
    expect(within(spot).queryByRole('link')).not.toBeInTheDocument()
    // 걷는 길은 카카오가 그린다 — 걷는 칸 오른쪽
    const walk = spot.nextElementSibling
    const link = within(walk).getByRole('link', { name: '조선해양문화관에서 거제씨월드까지 카카오맵 도보 길찾기 — 새 창에서 열려요' })
    expect(link).toHaveTextContent('길찾기 ↗')
    // 거리 바로 뒤에 — 오른쪽 끝에 두면 아래 정류장 점의 「시간표 ›」와 붙어 보였다(2026-09-18 사용자 지적)
    expect(link.closest(`.${styles.segLine}`)).not.toBeNull()
    expect(link).toHaveAttribute(
      'href',
      `https://map.kakao.com/link/by/walk/${encodeURIComponent('조선해양문화관')},34.834849,128.701634/${encodeURIComponent('거제씨월드')},34.8358552,128.7014662`,
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('정류장 ↔ 스팟 걷는 칸에도 「길찾기 ↗」 — 정류장 좌표는 TAGO(서버 board · alight 의 lat/lng)', async () => {
    renderCourse(101)

    // 학동 정류장에서 내려 학동몽돌해변까지
    const off = (await screen.findByText('학동 정류장에서 내려요')).closest(`.${styles.stationRow}`).nextElementSibling
    expect(within(off).getByRole('link', { name: '학동 정류장에서 학동몽돌해변까지 카카오맵 도보 길찾기 — 새 창에서 열려요' })).toHaveAttribute(
      'href',
      `https://map.kakao.com/link/by/walk/${encodeURIComponent('학동 정류장')},34.7721,128.639/${encodeURIComponent('학동몽돌해변')},34.774752,128.641498`,
    )
    // 바람의언덕에서 도장포 정류장까지(돌아갈 때 타는 곳)
    const on = screen.getByText('도장포 정류장에서 타요').closest(`.${styles.stationRow}`).previousElementSibling
    expect(within(on).getByRole('link', { name: '바람의언덕에서 도장포 정류장까지 카카오맵 도보 길찾기 — 새 창에서 열려요' })).toHaveAttribute(
      'href',
      `https://map.kakao.com/link/by/walk/${encodeURIComponent('바람의언덕')},34.7440458,128.6633111/${encodeURIComponent('도장포 정류장')},34.7423,128.6598`,
    )
  })

  it('정류장 좌표가 없으면(옛 응답) 그 걷는 칸에는 길찾기를 걸지 않는다 — 추측으로 잇지 않는다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 0 ? { ...leg, alight: { stop: '학동', distanceM: 311 } } : leg)),
    })
    renderCourse(101)

    const off = (await screen.findByText('학동 정류장에서 내려요')).closest(`.${styles.stationRow}`).nextElementSibling
    expect(within(off).queryByRole('link')).not.toBeInTheDocument()
    expect(rowText(off)).toBe('도보 약 310m')
  })
  it('두 스팟 좌표 중 하나라도 모르면 걷는 칸에 길찾기를 걸지 않는다(스팟 줄에도 버튼이 없다)', async () => {
    api.course.mockResolvedValue({
      ...COURSE_308,
      stops: COURSE_308.stops.map((stop) => (stop.poiId === 18 ? { ...stop, lat: null, lng: null } : stop)),
    })
    renderCourse(110)

    await screen.findByText('지세포 정류장에서 내려요')
    const spot = document.querySelector('[data-stop="20"]')
    expect(within(spot.nextElementSibling).queryByRole('link')).not.toBeInTheDocument()
    expect(within(spot).queryByRole('button', { name: /시간표/ })).not.toBeInTheDocument()
  })
  it('각주는 걷는 길을 어디서 여는지 말한다 — 걷는 칸의 「길찾기 ↗」(2026-09-18)', async () => {
    renderCourse(110)

    // 걷는 칸은 「도보 약 110m」 — 그 값이 직선거리라는 것은 각주가 한 번 말한다(2026-09-18 사용자 결정: 「도보 · 직선」이 한 줄에 붙어 어색했다).
    // 카카오맵 길찾기가 더 긴 거리를 보여줘도 우리 숫자가 틀린 것으로 읽히지 않게.
    expect(
      await screen.findByText('버스 시간에는 걷는 시간이 빠져 있어요. 걷는 거리는 두 곳 사이 직선거리예요. 실제 걷는 길은 「길찾기 ↗」에서 카카오맵으로 확인하세요.'),
    ).toBeInTheDocument()
  })
  it('버스 합계가 한 시간이 안 되면 「0시간」을 쓰지 않는다', async () => {
    api.course.mockResolvedValue({ ...COURSE_301, busMinTotal: 40 })
    renderCourse(101)

    expect(await screen.findByText('버스 약 40분')).toBeInTheDocument()
  })

  it('구간이 없는 옛 코스 — 빈 제목 · 「0구간」 대신 코스 이름과 이유 한 줄', async () => {
    api.course.mockResolvedValue({
      courseId: 1,
      name: '부산발 당일치기',
      stops: [],
      legs: [],
      legCount: 0,
      estimatedLegCount: 0,
      busMinTotal: 0,
      service: null,
      source: null,
      baseDate: null,
      originName: null,
    })
    const { container } = renderCourse(1)

    expect(await screen.findByRole('heading', { level: 1, name: '부산발 당일치기' })).toBeInTheDocument()
    expect(screen.getByText('이 코스는 구간별 버스 정보가 없어요.')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('버스 0번')
    expect(container).not.toHaveTextContent('버스 약')
    expect(screen.queryByText('평일')).not.toBeInTheDocument()
  })

  it('지도를 못 불러와도 타임라인은 그대로 — 지도 칸에 한 줄', async () => {
    renderCourse(101)

    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.getByText(busLine('[55] 40분'))).toBeInTheDocument()
  })

  it('「시간표 ›」 버튼은 읽기 도구에 스팟 이름까지 말한다 — 같은 이름 버튼이 셋이면 어느 스팟인지 모른다', async () => {
    renderCourse(101)

    expect(await screen.findByRole('button', { name: '학동몽돌해변 시간표' })).toHaveTextContent('시간표 ›')
    expect(screen.getByRole('button', { name: '해금강 시간표' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '바람의언덕 시간표' })).toBeInTheDocument()
  })

  it('구간이 없는 옛 코스에는 저장 버튼을 두지 않는다 — 출발·복귀 시각이 없어 서버가 늘 400을 준다', async () => {
    api.course.mockResolvedValue({
      courseId: 1,
      name: '부산발 당일치기',
      stops: [],
      legs: [],
      legCount: 0,
      estimatedLegCount: 0,
      busMinTotal: 0,
      service: null,
      source: null,
      baseDate: null,
      originName: null,
    })
    renderCourse(1)

    await screen.findByText('이 코스는 구간별 버스 정보가 없어요.')
    expect(screen.queryByRole('button', { name: '이 코스 저장하기' })).not.toBeInTheDocument()
  })

  // ── 배 구간 (2026-09-16) ──────────────────────────────────────────────────

  it('배 구간 줄은 「유람선 코스 · 총 시간」 한 줄이다 — 배 아이콘은 버스 · 걷기처럼 글 옆, 레일에는 굵은 점선만', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    const line = await screen.findByText('외도상륙+해금강선상관광 · 약 2시간 40분')
    const row = line.closest(`.${styles.legRow}`)
    expect(row.querySelector(`.${styles.rail} svg`)).toBeNull()
    expect(row.querySelector(`.${styles.lineFerry}`)).not.toBeNull()
    expect(row.querySelector('svg')).not.toBeNull()
  })
  it('머무는 시간은 그 스팟 줄 아래에 붙는다 — 배가 정한 값이라 스팟에 대한 사실이다', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    // 정류장 이름(「대금교차로」)은 버스에 대한 것이라 구간 줄에 두지만(2026-09-16),
    // 「2시간 머물러요」는 그 스팟에 대한 것이라 이름 아래가 맞다 — Tripadvisor·Booking 투어도 그렇다.
    // 이름이 바로 위에 있으니 「외도보타니아에」를 되풀이하지 않는다.
    // 「입장료 별도」는 상품 원문 코스명에 든 사실이라 화면에 남아야 한다(부록 G).
    const name = await screen.findByText('외도보타니아')
    const row = name.closest('[data-stop]')
    expect(within(row).getByText('2시간 머물러요 · 입장료 별도')).toBeInTheDocument()
  })

  it('배가 정하지 않은 스팟에는 체류 줄이 없다 — 얼마나 머물지는 사용자가 정한다', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    // 「바람의언덕」은 제목 아래 스팟 체인에도 나오므로 타임라인 줄만 골라 본다
    await screen.findByText('외도상륙+해금강선상관광 · 약 2시간 40분')
    const row = document.querySelector('[data-stop="1"]')
    expect(within(row).getByText('바람의언덕')).toBeInTheDocument()
    expect(within(row).queryByText(/머물러요/)).not.toBeInTheDocument()
  })

  it('돌아오는 배 — 「배로 돌아와요」 다음 선착장이 점(뒤가 버스일 때도)', async () => {
    api.course.mockResolvedValue({
      ...COURSE_311,
      legs: COURSE_311.legs.map((leg) =>
        leg.mode === 'SAME_STOP' ? { ...leg, mode: 'BUS', durationMin: 5, rides: [ride('55')], alight: { stop: '도장포', distanceM: 390 } } : leg,
      ),
    })
    renderCourse(124)

    // 「같은 배로」라고 적지 않는다 — 원문이 같은 배인지 말하지 않는다(기준문서 §3).
    const back = await screen.findByText('배로 돌아와요')
    const dock = screen.getByText('도장포 선착장에서 내려요')
    expect(back.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('배로 돌아와 걸으면 선착장 점 뒤에 걷는 칸 — 외도보타니아 → 배 → 도장포 선착장 → 걷기 → 바람의언덕(2026-09-18 사용자 결정)', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    const back = await screen.findByText('배로 돌아와요')
    const dock = screen.getByText('도장포 선착장에서 내려요')
    expect(walkAfter(dock)).toBe('도보 약 220m')
    expect(document.querySelector('[data-stop="5"]').compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(dock.closest(`.${styles.stationRow}`).nextElementSibling.nextElementSibling).toBe(document.querySelector('[data-stop="1"]'))
    expect(back.closest(`.${styles.legRow}`).querySelector(`.${styles.lineFerry}`)).not.toBeNull()
  })
  it('배 시간을 버스 시간과 갈라 적는다 — 배를 버스로 세면 「버스 약 N분」이 거짓말이 된다', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    await screen.findByText('버스 약 1시간 42분')
    expect(screen.getByText('배 약 2시간 40분')).toBeInTheDocument()
  })

  it('「버스 N번」 칩은 배를 세지 않는다', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    // 구간 다섯 중 버스는 둘(고현터미널 → 도장포 · 바람의언덕 → 고현터미널)이다.
    await screen.findByText('버스 2번')
  })

  it('배가 없는 코스에는 배 칩을 그리지 않는다', async () => {
    api.course.mockResolvedValue(COURSE_301)
    renderCourse(101)

    await screen.findByText('버스 약 1시간 54분')
    expect(screen.queryByText(/^배 약/)).not.toBeInTheDocument()
  })

  it('배 구간에는 정류장 줄이 없다 — 버스를 타고 내리지 않는다', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    await screen.findByText('외도상륙+해금강선상관광 · 약 2시간 40분')
    // 도장포 정류장 줄은 버스 구간(첫 구간 하차 · 마지막 구간 승차)에만 있다
    expect(walkAfter(screen.getByText('도장포 정류장에서 내려요'))).toBe('도보 약 170m')
    expect(walkBefore(screen.getByText('도장포 정류장에서 타요'))).toBe('도보 약 380m')
  })
})

describe('CourseDetailPage — 되짚기: 가운데 고현터미널 줄(코스재설계 §3-3 · §5-3)', () => {
  /**
   * 되짚기는 구간 둘로 온다 — `A → 고현터미널`(toPoiId null) + `고현터미널 → B`(fromPoiId null).
   * 모양은 2차 세트 ⑥(바람의언덕 → 해금강 → 학동몽돌해변 → 포로수용소)을 따랐고 노선 · 분 · 거리는 테스트 값이다.
   * 스팟 넷에 구간 여섯 — 보통 코스(스팟 + 1)보다 하나 많다.
   */
  const leg = (seq, fromPoiId, toPoiId, extra = {}) => ({
    seq,
    mode: 'BUS',
    fromPoiId,
    fromName: fromPoiId == null ? '고현터미널' : `스팟${fromPoiId}`,
    toPoiId,
    toName: toPoiId == null ? '고현터미널' : `스팟${toPoiId}`,
    durationMin: 30,
    estimated: false,
    rides: [ride('55')],
    ...extra,
  })

  const COURSE_BACKTRACK = {
    ...COURSE_301,
    courseId: 130,
    courseCode: '4-B',
    title: null,
    busMinTotal: 180,
    legCount: 6,
    estimatedLegCount: 0,
    stops: [
      { seq: 1, poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', lat: 34.744, lng: 128.663 },
      { seq: 2, poiId: 3, name: '해금강', shortName: '해금강', theme: 'VIEW', lat: 34.733, lng: 128.684 },
      { seq: 3, poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', theme: 'BEACH', lat: 34.775, lng: 128.641 },
      { seq: 4, poiId: 12, name: '거제도포로수용소유적공원', shortName: '포로수용소', theme: 'HISTORY', lat: 34.887, lng: 128.623 },
    ],
    legs: [
      leg(1, null, 1),
      leg(2, 1, 3),
      leg(3, 3, 4),
      leg(4, 4, null, { board: { stop: '학동', distanceM: 311 } }),
      leg(5, null, 12, { rides: [ride('10')] }),
      leg(6, 12, null, { rides: [ride('10')] }),
    ],
  }

  const stopOrder = () => [...document.querySelectorAll('[data-stop]')].map((e) => Number(e.dataset.stop))
  const VIA = '고현터미널에서 갈아타요'

  it('가운데 구간이 고현터미널로 가면 스팟이 아니라 「고현터미널에서 갈아타요」 줄 — 스팟 번호가 밀리지 않는다', async () => {
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    const via = await screen.findByText(VIA)
    // 스팟 넷이 순서대로 한 번씩 — 터미널 구간이 스팟을 하나 먹으면 학동 자리에 포로수용소가 온다
    expect(stopOrder()).toEqual([1, 3, 4, 12])
    // 학동몽돌해변과 포로수용소 사이에 온다
    const hakdong = document.querySelector('[data-stop="4"]')
    const pow = document.querySelector('[data-stop="12"]')
    expect(hakdong.compareDocumentPosition(via) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(via.compareDocumentPosition(pow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // 출발 · 갈아타요 · 도착 — 터미널 줄은 셋
    expect(screen.getByText('고현터미널 출발')).toBeInTheDocument()
    expect(screen.getByText('고현터미널 도착')).toBeInTheDocument()
    expect(screen.getAllByText(VIA)).toHaveLength(1)
  })

  it('갈아타는 이유(두 곳을 바로 잇는 버스가 없다)는 읽기 도구에만 — 화면 글은 한 줄', async () => {
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    await screen.findByText(VIA)
    expect(screen.getByText('두 곳을 바로 잇는 버스가 없어요')).toHaveClass(styles.srOnly)
  })

  it('갈아타는 줄은 출발 · 도착 줄과 같은 한 줄 모양 — 글이 아이콘 높이라 따로 선을 긋지 않는다', async () => {
    // 두 줄(이름 + 이유)일 때는 아이콘 밑이 22px 비어 선을 따로 그었다. 한 줄이면 위아래 구간 선이 아이콘에 닿는다.
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    const viaRow = (await screen.findByText(VIA)).closest(`.${styles.timeline} > *`)
    expect(viaRow).toHaveClass(styles.stopRow)
    expect(viaRow.querySelector(`.${styles.stopSub}`)).toBeNull()
  })

  it('터미널로 가는 구간은 그대로 그린다 — 노선 · 타는 정류장', async () => {
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    await screen.findByText(VIA)
    expect(walkBefore(screen.getByText('학동 정류장에서 타요'))).toBe('도보 약 310m')
    expect(screen.getByText('버스 6번')).toBeInTheDocument()
  })

  it('터미널을 거치는 스팟의 「시간표 ›」는 다음 스팟을 넘기지 않는다 — 바로 가는 버스가 없어 「운행 없음」이 뜬다', async () => {
    const user = userEvent.setup()
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    await screen.findByText(VIA)
    await user.click(screen.getByRole('button', { name: '학동몽돌해변 시간표' }))
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/timetable\/4$/)
  })

  it('터미널이 없는 코스에는 「갈아타요」 줄이 없다 — 마지막 구간(toPoiId null)은 도착 줄이다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: [leg(1, null, 4), leg(2, 4, 3), leg(3, 3, 1), leg(4, 1, null)],
    })
    renderCourse(101)

    await screen.findByText('고현터미널 도착')
    expect(screen.queryByText(VIA)).not.toBeInTheDocument()
    expect(stopOrder()).toEqual([4, 3, 1])
  })

  it('배 왕복(돌아오는 구간 0분)과 함께여도 스팟 짝이 맞는다', async () => {
    // 포로수용소 → (고현터미널) → 도장포유람선 → 외도보타니아 → (도장포로 돌아옴) → 바람의언덕
    api.course.mockResolvedValue({
      ...COURSE_311,
      stops: [
        { seq: 1, poiId: 12, name: '거제도포로수용소유적공원', shortName: '포로수용소', theme: 'HISTORY', lat: 34.887, lng: 128.623 },
        ...COURSE_311.stops.map((stop) => ({ ...stop, seq: stop.seq + 1 })),
      ],
      legs: [
        leg(1, null, 12),
        leg(2, 12, null),
        leg(3, null, 2),
        { seq: 4, mode: 'FERRY', fromPoiId: 2, toPoiId: 5, durationMin: 160, estimated: false, rides: [], ferry: FERRY },
        { seq: 5, mode: 'FERRY', fromPoiId: 5, toPoiId: 2, durationMin: 0, estimated: false, rides: [], ferry: FERRY },
        { seq: 6, mode: 'SAME_STOP', fromPoiId: 2, toPoiId: 1, durationMin: 0, estimated: false, rides: [] },
        leg(7, 1, null),
      ],
    })
    renderCourse(124)

    const via = await screen.findByText(VIA)
    expect(stopOrder()).toEqual([12, 2, 5, 1])
    expect(via.compareDocumentPosition(document.querySelector('[data-stop="2"]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(document.querySelector('[data-stop="5"]')).getByText('2시간 머물러요 · 입장료 별도')).toBeInTheDocument()
    expect(walkAfter(screen.getByText('도장포 선착장에서 내려요'))).toBe('도보 약 220m')
  })
})

describe('CourseDetailPage — 구간 줄은 그 구간을 가장 자주 다니는 직행 노선 + 약 분(2026-09-17 사용자 결정)', () => {
  /**
   * 서버가 BUS 구간마다 주는 `service`(계약 — 서버는 동시에 만드는 중이라 이 모양이 곧 계약입니다).
   * 코스가 저장한 편 사슬(rides)은 「이 순서가 버스로 이어지는가」 확인용이라, 사슬이 우연히 탄 노선(하루 1회 55-1번)을
   * 화면에 내면 시간을 스스로 정하는 사용자가 하루 한 번 오는 버스를 기다리게 됩니다. 노선 · 분 · 횟수는 테스트 값입니다.
   */
  const service = (routeNo, durationMin, extra = {}) => ({
    routeNo,
    durationMin,
    durationMinLow: durationMin,
    estimated: false,
    tripsWeekday: 6,
    tripsHoliday: 6,
    ...extra,
  })

  /** 3-01 모양에 service 를 얹는다 — 둘째 구간은 사슬이 55-1번을 탔지만 가장 자주 다니는 노선은 55번이다. */
  const withService = (services, extra = {}) => ({
    ...COURSE_301,
    legs: COURSE_301.legs.map((leg, i) => ({
      ...leg,
      ...(i === 1 ? { rides: [ride('55-1')] } : {}),
      service: services[i] ?? null,
      holidayNoBus: false,
      ...(extra[i] ?? {}),
    })),
  })

  it('노선 · 약 분 — 사슬이 탄 노선(55-1번)이 아니라 가장 자주 다니는 노선', async () => {
    api.course.mockResolvedValue(withService([service('55', 40), service('55', 10), service('55', 12), service('55', 52)]))
    renderCourse(101)

    expect(await screen.findByText(busLine('[55] 약 40분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[55] 약 10분'))).toBeInTheDocument()
    expect(screen.queryByText(busLine(/55-1번/))).not.toBeInTheDocument()
    // 사슬 기준 옛 줄은 나오지 않는다
    expect(screen.queryByText(busLine('[55] 40분'))).not.toBeInTheDocument()
  })

  it('소요가 편마다 다르면 폭 「약 50~55분」, 60분을 넘으면 시간 단위 「약 58분~1시간 2분」 · 「약 1시간 5분」', async () => {
    api.course.mockResolvedValue(
      withService([
        service('55', 55, { durationMinLow: 50 }),
        service('22-1', 62, { durationMinLow: 58 }),
        service('67-1', 65),
        service('55', 52),
      ]),
    )
    renderCourse(101)

    expect(await screen.findByText(busLine('[55] 약 50~55분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[22-1] 약 58분~1시간 2분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[67-1] 약 1시간 5분'))).toBeInTheDocument()
  })

  it('「약 58분~1시간 2분」 안에서 줄이 갈리지 않는다 — 붙는 공백(「1시간 / 2분」으로 갈리지 않게)', async () => {
    api.course.mockResolvedValue(
      withService([service('22-1', 62, { durationMinLow: 58 }), service('55', 10), service('55', 12), service('55', 52)]),
    )
    renderCourse(101)

    const line = await screen.findByText(busLine('[22-1] 약 58분~1시간 2분'))
    const NB = '\u00a0'
    expect(line.textContent).toBe(`22-1번 약${NB}58분~1시간${NB}2분`)
  })

  it('하루 · 평일 · 휴일 횟수는 구간 줄에 적지 않는다 — 스팟 시간표(「시간표 ›」)가 보여준다. 휴일에 버스가 정말 없다는 줄은 남는다', async () => {
    // 사용자(2026-09-17): 「굳이 넣어야 되나? 어차피 들어가면 보이잖아」 · 「휴일 6회를 보고 무슨 의민지 알 수 있을까?」
    api.course.mockResolvedValue(
      withService(
        [
          service('55', 40),
          service('22-1', 30, { tripsWeekday: 14, tripsHoliday: 9 }),
          service('남부2', 20, { tripsWeekday: 2, tripsHoliday: 0 }),
          service('55', 52),
        ],
        { 2: { holidayNoBus: true } },
      ),
    )
    const { container } = renderCourse(101)

    expect(await screen.findByText(busLine('[22-1] 약 30분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[남부2] 약 20분'))).toBeInTheDocument()
    const timeline = container.querySelector(`.${styles.timeline}`).textContent
    expect(timeline).not.toMatch(/\d+\s*회/)
    expect(timeline).not.toMatch(/하루|평일/)
    expect(screen.getByText('휴일엔 이 구간 버스가 없어요')).toBeInTheDocument()
  })

  it('휴일에 그 구간 버스가 정말 없으면(holidayNoBus) 그 구간 줄 아래에만 한 줄', async () => {
    api.course.mockResolvedValue(
      withService(
        [service('55', 40), service('남부2', 20, { tripsWeekday: 2, tripsHoliday: 0 }), service('55', 12), service('55', 52)],
        { 1: { holidayNoBus: true } },
      ),
    )
    renderCourse(101)

    const note = await screen.findByText('휴일엔 이 구간 버스가 없어요')
    expect(screen.getAllByText('휴일엔 이 구간 버스가 없어요')).toHaveLength(1)
    // 그 구간 줄 바로 아래 — 다른 구간 줄에 붙지 않는다
    const legText = screen.getByText(busLine('[남부2] 약 20분'))
    expect(legText.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(note.compareDocumentPosition(screen.getByText(busLine('[55] 약 12분'))) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('휴일 0회여도 holidayNoBus 가 아니면(시각 미상) 「버스가 없어요」를 쓰지 않는다 — 운행 없음 ≠ 시각 미상', async () => {
    api.course.mockResolvedValue(
      withService([service('55', 40), service('남부2', 20, { tripsWeekday: 2, tripsHoliday: 0 }), service('55', 12), service('55', 52)]),
    )
    renderCourse(101)

    await screen.findByText(busLine('[남부2] 약 20분'))
    expect(screen.queryByText(/휴일엔 이 구간 버스가 없어요/)).not.toBeInTheDocument()
  })

  it('정류장 줄(alight · board)은 그대로 함께 — 노선 줄 · 휴일 줄 · 정류장 줄', async () => {
    api.course.mockResolvedValue(
      withService([service('55', 40), service('55', 10), service('55', 12), service('55', 52)], { 3: { holidayNoBus: true } }),
    )
    renderCourse(101)

    expect(await screen.findByText('학동 정류장에서 내려요')).toBeInTheDocument()
    const last = screen.getByText(busLine('[55] 약 52분'))
    const holiday = screen.getByText('휴일엔 이 구간 버스가 없어요')
    const board = screen.getByText('도장포 정류장에서 타요')
    // 타러 걷기 → 노선 → 휴일 줄(노선 단계에 붙는다)
    expect(board.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(last.compareDocumentPosition(holiday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(last.closest(`.${styles.legRow}`)).toBe(holiday.closest(`.${styles.legRow}`))
  })

  it('service 가 없는 구간(옛 응답)은 지금 줄 그대로 — 사슬이 탄 노선 · 분', async () => {
    api.course.mockResolvedValue(withService([service('55', 40), null, null, service('55', 52)]))
    renderCourse(101)

    expect(await screen.findByText(busLine('[55] 약 40분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[55-1] 10분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[55] 약 12분'))).toBeInTheDocument()
  })

  it('추정 각주는 화면에 적힌 분을 따른다 — service 가 있으면 service.estimated', async () => {
    // 사슬(leg.estimated)은 추정이지만 가장 자주 다니는 노선의 소요는 확정값이면 각주가 없다
    api.course.mockResolvedValue(withService([service('55', 40), service('55', 10), service('55', 12), service('55', 52)]))
    const { unmount } = renderCourse(101)
    await screen.findByText(busLine('[55] 약 12분'))
    expect(screen.queryByText(/적힌 것보다 짧습니다/)).not.toBeInTheDocument()
    unmount()

    // 사슬은 확정인데(3-08 은 추정 구간 0) 노선 소요가 추정이면 각주가 있다
    api.course.mockResolvedValue({
      ...COURSE_308,
      legs: COURSE_308.legs.map((leg, i) => ({ ...leg, service: i === 1 ? service('67-1', 27, { estimated: true }) : null })),
    })
    renderCourse(110)
    await screen.findByText(busLine('[67-1] 약 27분'))
    expect(screen.getByText(/적힌 것보다 짧습니다/)).toBeInTheDocument()
  })

  it('되짚기 가운데 고현터미널 줄과 섞여도 짝이 맞는다 — 노선 줄 · 휴일 줄 · 타는 곳 줄 뒤에 「갈아타요」, 스팟 번호는 밀리지 않는다', async () => {
    // 로컬 서버 4-12(2026-09-17) 응답 그대로 — service 가 사슬 노선과 다른 구간이 둘이다(학동 → 고현 55 → 67-1 · 고현 → 포로수용소 100 → 110).
    // 정류장 줄(board)도 서버가 service 노선으로 찾아 67-1 의 학동삼거리다. 휴일 줄은 이 테스트가 얹은 값이다(운영 데이터에는 아직 없다).
    const bus = (seq, fromPoiId, toPoiId, chainRoute, svc, extra = {}) => ({
      seq, mode: 'BUS', fromPoiId, toPoiId, durationMin: svc.durationMin, estimated: svc.estimated,
      rides: [ride(chainRoute)], board: null, alight: null, ferry: null,
      service: { tripsWeekday: 6, tripsHoliday: 6, ...svc }, holidayNoBus: false, ...extra,
    })
    api.course.mockResolvedValue({
      ...COURSE_301,
      courseId: 129,
      courseCode: '4-12',
      title: '풍차 언덕에서 6·25 포로수용소 유적까지',
      busMinTotal: 160,
      legCount: 6,
      holidayNoBusLegs: [{ fromName: '학동몽돌해변', toName: '고현터미널' }],
      stops: [
        { seq: 1, poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', lat: 34.744, lng: 128.663 },
        { seq: 2, poiId: 3, name: '해금강', shortName: '해금강', theme: 'VIEW', lat: 34.733, lng: 128.684 },
        { seq: 3, poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', theme: 'BEACH', lat: 34.775, lng: 128.641 },
        { seq: 4, poiId: 13, name: '거제도포로수용소유적공원', shortName: '포로수용소', theme: 'HISTORY', lat: 34.876, lng: 128.625 },
      ],
      legs: [
        bus(1, null, 1, '55', { routeNo: '55', durationMin: 50, durationMinLow: 50, estimated: true }, { alight: { stop: '도장포', distanceM: 393 } }),
        bus(2, 1, 3, '55', { routeNo: '55', durationMin: 10, durationMinLow: 10, estimated: true }),
        bus(3, 3, 4, '55', { routeNo: '55', durationMin: 12, durationMinLow: 10, estimated: false }),
        bus(4, 4, null, '55', { routeNo: '67-1', durationMin: 58, durationMinLow: 47, estimated: false, tripsWeekday: 8, tripsHoliday: 0 }, {
          board: { stop: '학동삼거리', distanceM: 106 },
          holidayNoBus: true,
        }),
        bus(5, null, 13, '100', { routeNo: '110', durationMin: 15, durationMinLow: 11, estimated: true, tripsWeekday: 28, tripsHoliday: 23 }, {
          alight: { stop: '포로수용소', distanceM: 11 },
        }),
        bus(6, 13, null, '110', { routeNo: '110', durationMin: 15, durationMinLow: 9, estimated: true, tripsWeekday: 27, tripsHoliday: 22 }),
      ],
    })
    renderCourse(129)

    const via = await screen.findByText('고현터미널에서 갈아타요')
    expect([...document.querySelectorAll('[data-stop]')].map((e) => Number(e.dataset.stop))).toEqual([1, 3, 4, 13])
    // 사슬이 탄 노선(55 · 100)은 그 두 구간에 나오지 않는다
    const toTerminal = screen.getByText(busLine('[67-1] 약 47~58분'))
    const holiday = screen.getByText('휴일엔 이 구간 버스가 없어요')
    const board = screen.getByText('학동삼거리 정류장에서 타요')
    const fromTerminal = screen.getByText(busLine('[110] 약 11~15분'))
    // 학동몽돌해변 → (학동삼거리까지 걷기 · 67-1 · 휴일 없음) → 고현터미널에서 갈아타요 → (110) → 포로수용소
    const order = [document.querySelector('[data-stop="4"]'), board, toTerminal, holiday, via, fromTerminal, document.querySelector('[data-stop="13"]')]
    order.slice(1).forEach((el, i) => expect(order[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy())
    expect(screen.getAllByText('휴일엔 이 구간 버스가 없어요')).toHaveLength(1)
    expect(screen.queryByText(busLine(/^100번/))).not.toBeInTheDocument()
    expect(screen.getByText('버스 6번')).toBeInTheDocument()
    expect(screen.getByText(/적힌 것보다 짧습니다/)).toBeInTheDocument()
  })

  it('배 · 같은 정류장 구간과 섞여도 그대로 — service 는 BUS 구간에만 온다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_311,
      legs: COURSE_311.legs.map((leg) => ({
        ...leg,
        service: leg.mode === 'BUS' ? service('55', leg.durationMin) : null,
        holidayNoBus: false,
      })),
    })
    renderCourse(124)

    expect(await screen.findByText(busLine('[55] 약 50분'))).toBeInTheDocument()
    expect(screen.getByText(busLine('[55] 약 52분'))).toBeInTheDocument()
    expect(screen.getByText('외도상륙+해금강선상관광 · 약 2시간 40분')).toBeInTheDocument()
    // 배에서 내려 선착장(점)에서 걷는다
    expect(screen.getByText('배로 돌아와요')).toBeInTheDocument()
    expect(walkAfter(screen.getByText('도장포 선착장에서 내려요'))).toBe('도보 약 220m')
    // 배를 타는 스팟의 「시간표 ›」는 배 시간표를 연다 — 걷기 전 스팟이 아니라 남는다
    expect(screen.getByRole('button', { name: '도장포유람선 시간표' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '외도보타니아 시간표' })).toBeInTheDocument()
    expect(screen.getByText('버스 2번')).toBeInTheDocument()
  })
})

describe('CourseDetailPage — 거제시 추천 관광코스 안내 줄을 두지 않는다', () => {
  // 2026-09-17 저녁 카드 배지에서 뺀 숫자(「당일코스」 여섯 곳 중 네 곳 · 원문 순서대로 · 원문 보기 ↗)를 여기 한 줄로 옮겼는데,
  // 2026-09-18 사용자가 뺐다 — *"너무 번잡해 보인다"*. 제목 · 스팟 체인 · 칩 사이에 줄이 하나 더 끼어 머리가 무거웠다.
  // 어느 축으로 고른 코스인지는 카드 배지(「거제시 추천 관광코스」)가 말한다.
  const OFFICIAL = { name: '당일코스', total: 6, matched: 4, orderKept: true, sourceUrl: 'https://tour.geoje.go.kr/index.geoje?menuCd=DOM_000008502008002000' }

  it('서버가 officialCourse 를 줘도 안내 줄 · 원문 링크가 없다', async () => {
    api.course.mockResolvedValue({ ...COURSE_301, officialCourse: OFFICIAL })
    renderCourse(101)

    await screen.findByText('버스 약 1시간 54분')
    expect(screen.queryByText(/거제시 추천 관광코스/)).not.toBeInTheDocument()
    expect(screen.queryByText(/곳 중/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /원문/ })).not.toBeInTheDocument()
  })
})
