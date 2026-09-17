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
    { seq: 1, mode: 'BUS', durationMin: 40, estimated: false, rides: [ride('55')], alight: { stop: '학동', distanceM: 311 } },
    { seq: 2, mode: 'BUS', durationMin: 10, estimated: false, rides: [ride('55')] },
    { seq: 3, mode: 'BUS', durationMin: 12, estimated: true, rides: [ride('55', false, true)] },
    // 마지막 구간 — 고현터미널로 돌아간다. 내릴 스팟이 없어 대신 타는 곳이 온다
    { seq: 4, mode: 'BUS', durationMin: 52, estimated: true, rides: [ride('55', true, false)], board: { stop: '도장포', distanceM: 376 } },
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
    { seq: 2, poiId: 20, name: '거제조선해양문화관', shortName: '조선해양문화관', theme: 'EXHIBIT', lat: 34.83, lng: 128.7 },
    { seq: 3, poiId: 18, name: '거제씨월드', shortName: '거제씨월드', theme: 'EXHIBIT', lat: 34.83, lng: 128.7 },
  ],
  legs: [
    { seq: 1, mode: 'BUS', durationMin: 40, estimated: false, rides: [ride('55')], alight: { stop: '학동', distanceM: 311 } },
    { seq: 2, mode: 'BUS', durationMin: 27, estimated: false, rides: [ride('67-1')], alight: { stop: '지세포', distanceM: 675 } },
    // 걸어서 옮기는 구간 — 버스에서 내리지 않으므로 줄이 없다
    { seq: 3, mode: 'SAME_STOP', durationMin: 0, estimated: false, rides: [], alight: null },
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
    { seq: 1, poiId: 2, name: '도장포유람선', shortName: '도장포유람선', theme: 'CRUISE', lat: 34.7435, lng: 128.6636 },
    { seq: 2, poiId: 5, name: '외도보타니아', shortName: '외도보타니아', theme: 'CRUISE', lat: 34.7225, lng: 128.6969 },
    { seq: 3, poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', lat: 34.7440458, lng: 128.6633111 },
  ],
  // fromName·toName 은 운영 응답 그대로입니다 — 배 구간의 둘째 줄이 「어느 스팟에 머무는가」를 거기서 읽습니다.
  legs: [
    { seq: 1, mode: 'BUS', fromName: '고현터미널', toName: '도장포유람선', durationMin: 50, estimated: true, rides: [ride('55', false, true)], alight: { stop: '도장포', distanceM: 174 } },
    { seq: 2, mode: 'FERRY', fromName: '도장포유람선', toName: '외도보타니아', durationMin: 160, estimated: false, rides: [], ferry: FERRY },
    { seq: 3, mode: 'FERRY', fromName: '외도보타니아', toName: '도장포유람선', durationMin: 0, estimated: false, rides: [], ferry: FERRY },
    { seq: 4, mode: 'SAME_STOP', fromName: '도장포유람선', toName: '바람의언덕', durationMin: 0, estimated: false, rides: [] },
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
    expect(screen.getByText('평일')).toBeInTheDocument()
    expect(screen.getByText('남부권 · 3곳')).toBeInTheDocument()
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

    await screen.findByText('55번 · 40분')
    expect(screen.getByText('고현터미널 출발')).toBeInTheDocument()
    expect(screen.getByText('55번 · 10분')).toBeInTheDocument()
    expect(screen.getByText('55번 · 약 12분')).toBeInTheDocument()
    expect(screen.getByText('55번 · 약 52분')).toBeInTheDocument()
    expect(screen.getByText('고현터미널 도착')).toBeInTheDocument()
    expect(screen.queryByText('55번 · 약 40분')).not.toBeInTheDocument()
  })

  it('추정 구간이 있으면 각주 · 출처 · 출발지 가정 — 옛 안내 줄과 큰 헤드라인은 없다', async () => {
    const { container } = renderCourse(101)

    await screen.findByText('55번 · 40분')
    expect(screen.getByText('실제 이동 시간은 적힌 것보다 짧습니다 — 버스를 놓치지 않는 쪽으로만 어긋납니다.')).toBeInTheDocument()
    expect(screen.getByText('출처 거제시 BIS 원문 · 2026-08-18')).toBeInTheDocument()
    expect(screen.getByText('모든 첫 출발지는 고현터미널로 가정합니다')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('시간표를 클릭하면')
    expect(container).not.toHaveTextContent('소요 예정')
    expect(screen.getByRole('button', { name: '이 코스 저장하기' })).toBeInTheDocument()
  })

  it('추정 구간이 없는 코스에는 「적힌 것보다 짧습니다」를 쓰지 않는다 — 확정값을 짧다고 말하게 된다', async () => {
    renderCourse(110)

    await screen.findByText('55번 · 40분')
    expect(screen.queryByText(/적힌 것보다 짧습니다/)).not.toBeInTheDocument()
  })

  it('권역이 섞이면 방문 순서대로 한 번씩 적는다', async () => {
    renderCourse(110)

    expect(await screen.findByText('남부권·동부권 · 3곳')).toBeInTheDocument()
  })

  it('스팟 목록을 못 받으면 권역 없이 곳 수만 — 빈 가운뎃점을 남기지 않는다', async () => {
    loadSpots.mockResolvedValue(new Map())
    renderCourse(101)

    expect(await screen.findByText('3곳')).toBeInTheDocument()
    expect(screen.queryByText(/^ · 3곳/)).not.toBeInTheDocument()
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

  it('마지막 스팟의 「시간표 ›」는 목적지 없이 연다', async () => {
    const user = userEvent.setup()
    renderCourse(101)

    const links = await screen.findAllByRole('button', { name: / 시간표$/ })
    await user.click(links[2])
    expect(screen.getByTestId('loc').textContent).toBe('/timetable/1')
  })

  it('구간 줄에 그 버스가 내리는 정류장과 직선거리 — 「10분 뒤 스팟 도착」으로 읽히지 않게(2026-09-16 사용자 결정)', async () => {
    renderCourse(101)

    // 이름만으로는 정류장인지 모른다(「대금교차로」) — 이름 뒤에 「정류장」을 붙인다
    expect(await screen.findByText('학동 정류장에서 내려 직선 약 310m')).toBeInTheDocument()
  })

  it('이름이 「종점」으로 끝나면 「정류장」을 붙이지 않는다 — 같은 말을 두 번 하게 된다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 0 ? { ...leg, alight: { stop: '해금강종점', distanceM: 1070 } } : leg)),
    })
    renderCourse(101)

    expect(await screen.findByText('해금강종점에서 내려 직선 약 1.1km')).toBeInTheDocument()
  })

  it('거리를 모르면 정류장 이름만 적는다 — 값 없이 「직선 약」만 남기지 않는다', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) => (i === 0 ? { ...leg, alight: { stop: '학동', distanceM: null } } : leg)),
    })
    renderCourse(101)

    expect(await screen.findByText('학동 정류장에서 내려요')).toBeInTheDocument()
    expect(screen.queryByText(/직선 약$/)).not.toBeInTheDocument()
  })

  it('걸어서 옮기는 구간에는 내리는 곳 줄이 없다 — 버스에서 내리지 않는다', async () => {
    renderCourse(110)

    expect(await screen.findByText('지세포 정류장에서 내려 직선 약 680m')).toBeInTheDocument()
    // 같은 정류장 구간에는 내리는 곳 줄이 붙지 않는다 — 버스에서 내리지 않는다
    expect(screen.getByText('같은 정류장 · 바로 이동').parentElement.textContent).toBe('같은 정류장 · 바로 이동')
  })

  it('마지막 구간에는 돌아갈 때 타는 정류장 — 내릴 스팟이 없다(2026-09-16 사용자 지적)', async () => {
    renderCourse(101)

    expect(await screen.findByText('도장포 정류장에서 타요 · 직선 약 380m')).toBeInTheDocument()
    // 「내려」가 아니라 「타요」다 — 같은 구간에 둘이 같이 나오지 않는다
    expect(screen.queryByText('도장포 정류장에서 내려 직선 약 380m')).not.toBeInTheDocument()
  })

  it('내리는 곳이 있으면 타는 곳은 적지 않는다 — 구간마다 한 줄', async () => {
    api.course.mockResolvedValue({
      ...COURSE_301,
      legs: COURSE_301.legs.map((leg, i) =>
        i === 0 ? { ...leg, board: { stop: '고현', distanceM: 0 }, alight: { stop: '학동', distanceM: 271 } } : leg,
      ),
    })
    renderCourse(101)

    expect(await screen.findByText('학동 정류장에서 내려 직선 약 270m')).toBeInTheDocument()
    expect(screen.queryByText(/고현 정류장에서 타요/)).not.toBeInTheDocument()
  })

  it('걷는 시간이 빠져 있다고 각주가 말한다 — 걷는 시간은 어느 원문에도 없다', async () => {
    renderCourse(101)

    // 어디를 눌러야 하는지 적는다 — 「스팟의 시간표 화면에서」는 막연했다(2026-09-16)
    expect(await screen.findByText(/걷는 길은 스팟 옆 「시간표 ›」에서 카카오맵으로 열 수 있어요/)).toBeInTheDocument()
  })

  it('칩은 버스를 타는 구간만 센다 — 같은 정류장으로 걸어가는 구간은 빼고 「버스 3번」(서버 legCount 는 4)', async () => {
    renderCourse(110)

    expect(await screen.findByText('버스 3번')).toBeInTheDocument()
    expect(screen.queryByText('버스 4번')).not.toBeInTheDocument()
  })

  it('같은 정류장 구간 — 버스 줄 대신 걸어가는 줄, 그 앞 스팟 시간표는 목적지를 넘기지 않는다(「운행 없음」이 뜬다)', async () => {
    const user = userEvent.setup()
    renderCourse(110)

    expect(await screen.findByText('같은 정류장 · 바로 이동')).toBeInTheDocument()
    const row = screen.getByText('조선해양문화관').closest('[data-stop]')
    await user.click(within(row).getByRole('button', { name: /시간표/ }))
    expect(screen.getByTestId('loc').textContent).toBe('/timetable/20')
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
    expect(screen.getByText('55번 · 40분')).toBeInTheDocument()
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

  it('배 구간 줄은 「유람선 코스 · 총 시간」 한 줄이다', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    await screen.findByText('외도상륙+해금강선상관광 · 약 2시간 40분')
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

  it('돌아오는 배 구간은 한 줄 — 떠난 선착장으로 돌아온다', async () => {
    api.course.mockResolvedValue(COURSE_311)
    renderCourse(124)

    // 「같은 배로」라고 적지 않는다 — 원문이 같은 배인지 말하지 않는다(기준문서 §3).
    await screen.findByText('도장포 선착장으로 돌아와요')
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
    expect(screen.getByText('도장포 정류장에서 내려 직선 약 170m')).toBeInTheDocument()
    expect(screen.getByText('도장포 정류장에서 타요 · 직선 약 380m')).toBeInTheDocument()
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
  const VIA = '고현터미널을 거쳐요'

  it('가운데 구간이 고현터미널로 가면 스팟이 아니라 「고현터미널을 거쳐요」 줄 — 스팟 번호가 밀리지 않는다', async () => {
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
    // 출발 · 거쳐요 · 도착 — 터미널 줄은 셋
    expect(screen.getByText('고현터미널 출발')).toBeInTheDocument()
    expect(screen.getByText('고현터미널 도착')).toBeInTheDocument()
    expect(screen.getAllByText(VIA)).toHaveLength(1)
  })

  it('거쳐 가는 이유는 사실 한 줄 — 두 곳을 바로 잇는 버스가 없다', async () => {
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    await screen.findByText(VIA)
    expect(screen.getByText('두 곳을 바로 잇는 버스가 없어요')).toBeInTheDocument()
  })

  it('거쳐 가는 줄은 아이콘 아래로 선을 잇는다 — 끊기면 「도착」 줄처럼 여정이 끝난 것으로 읽힌다', async () => {
    // 이름 아래 한 줄이 붙어 글(약 40px)이 아이콘(22px)보다 길다. 아이콘 밑 레일이 비면 선이 22px 끊겼다(로컬 실측).
    // 출발 · 도착 줄은 선의 끝이라 선이 없다.
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    const viaRow = (await screen.findByText(VIA)).closest(`.${styles.timeline} > *`)
    expect(viaRow.querySelector(`.${styles.viaLine}`)).not.toBeNull()
    for (const end of ['고현터미널 출발', '고현터미널 도착']) {
      expect(screen.getByText(end).closest(`.${styles.timeline} > *`).querySelector(`.${styles.viaLine}`)).toBeNull()
    }
  })

  it('터미널로 가는 구간은 그대로 그린다 — 노선 · 타는 정류장', async () => {
    api.course.mockResolvedValue(COURSE_BACKTRACK)
    renderCourse(130)

    await screen.findByText(VIA)
    expect(screen.getByText('학동 정류장에서 타요 · 직선 약 310m')).toBeInTheDocument()
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

  it('터미널이 없는 코스에는 「거쳐요」 줄이 없다 — 마지막 구간(toPoiId null)은 도착 줄이다', async () => {
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
    expect(screen.getByText('도장포 선착장으로 돌아와요')).toBeInTheDocument()
  })
})

describe('CourseDetailPage — 구간 줄은 그 구간을 가장 자주 다니는 직행 노선 + 하루 횟수(2026-09-17 사용자 결정)', () => {
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

  it('노선 · 약 분 · 하루 횟수 — 사슬이 탄 노선(55-1번)이 아니라 가장 자주 다니는 노선', async () => {
    api.course.mockResolvedValue(withService([service('55', 40), service('55', 10), service('55', 12), service('55', 52)]))
    renderCourse(101)

    expect(await screen.findByText('55번 · 약 40분 · 하루 6회')).toBeInTheDocument()
    expect(screen.getByText('55번 · 약 10분 · 하루 6회')).toBeInTheDocument()
    expect(screen.queryByText(/55-1번/)).not.toBeInTheDocument()
    // 사슬 기준 옛 줄은 나오지 않는다
    expect(screen.queryByText('55번 · 40분')).not.toBeInTheDocument()
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

    expect(await screen.findByText('55번 · 약 50~55분 · 하루 6회')).toBeInTheDocument()
    expect(screen.getByText('22-1번 · 약 58분~1시간 2분 · 하루 6회')).toBeInTheDocument()
    expect(screen.getByText('67-1번 · 약 1시간 5분 · 하루 6회')).toBeInTheDocument()
  })

  it('좁은 폰에서는 「· 」 뒤에서만 줄이 바뀐다 — 나머지 띄어쓰기는 붙는 공백(「1시간 / 2분」 · 「평일 / 14회」로 갈리지 않게)', async () => {
    // 이 줄은 281px 까지 길어진다(헤드리스 크롬 Noto Sans KR 13px 실측). 360 폭 화면의 칸은 264px 이다.
    api.course.mockResolvedValue(
      withService([
        service('22-1', 62, { durationMinLow: 58, tripsWeekday: 14, tripsHoliday: 9 }),
        service('55', 10),
        service('55', 12),
        service('55', 52),
      ]),
    )
    renderCourse(101)

    const line = await screen.findByText('22-1번 · 약 58분~1시간 2분 · 평일 14회 · 휴일 9회')
    const NB = '\u00a0'
    expect(line.textContent).toBe(`22-1번${NB}· 약${NB}58분~1시간${NB}2분${NB}· 평일${NB}14회${NB}·${NB}휴일${NB}9회`)
  })

  it('횟수 — 평일과 휴일이 다르면 둘 다 · 휴일 0회면 평일만', async () => {
    api.course.mockResolvedValue(
      withService([
        service('55', 40),
        service('22-1', 30, { tripsWeekday: 14, tripsHoliday: 9 }),
        service('남부2', 20, { tripsWeekday: 2, tripsHoliday: 0 }),
        service('55', 52),
      ]),
    )
    renderCourse(101)

    expect(await screen.findByText('22-1번 · 약 30분 · 평일 14회 · 휴일 9회')).toBeInTheDocument()
    expect(screen.getByText('남부2번 · 약 20분 · 평일 2회')).toBeInTheDocument()
    expect(screen.queryByText(/휴일 0회/)).not.toBeInTheDocument()
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
    const legText = screen.getByText('남부2번 · 약 20분 · 평일 2회')
    expect(legText.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(note.compareDocumentPosition(screen.getByText('55번 · 약 12분 · 하루 6회')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('휴일 0회여도 holidayNoBus 가 아니면(시각 미상) 「버스가 없어요」를 쓰지 않는다 — 운행 없음 ≠ 시각 미상', async () => {
    api.course.mockResolvedValue(
      withService([service('55', 40), service('남부2', 20, { tripsWeekday: 2, tripsHoliday: 0 }), service('55', 12), service('55', 52)]),
    )
    renderCourse(101)

    await screen.findByText('남부2번 · 약 20분 · 평일 2회')
    expect(screen.queryByText(/휴일엔 이 구간 버스가 없어요/)).not.toBeInTheDocument()
  })

  it('정류장 줄(alight · board)은 그대로 함께 — 노선 줄 · 휴일 줄 · 정류장 줄', async () => {
    api.course.mockResolvedValue(
      withService([service('55', 40), service('55', 10), service('55', 12), service('55', 52)], { 3: { holidayNoBus: true } }),
    )
    renderCourse(101)

    expect(await screen.findByText('학동 정류장에서 내려 직선 약 310m')).toBeInTheDocument()
    const last = screen.getByText('55번 · 약 52분 · 하루 6회')
    const holiday = screen.getByText('휴일엔 이 구간 버스가 없어요')
    const board = screen.getByText('도장포 정류장에서 타요 · 직선 약 380m')
    expect(last.compareDocumentPosition(holiday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(holiday.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('service 가 없는 구간(옛 응답)은 지금 줄 그대로 — 사슬이 탄 노선 · 분', async () => {
    api.course.mockResolvedValue(withService([service('55', 40), null, null, service('55', 52)]))
    renderCourse(101)

    expect(await screen.findByText('55번 · 약 40분 · 하루 6회')).toBeInTheDocument()
    expect(screen.getByText('55-1번 · 10분')).toBeInTheDocument()
    expect(screen.getByText('55번 · 약 12분')).toBeInTheDocument()
  })

  it('추정 각주는 화면에 적힌 분을 따른다 — service 가 있으면 service.estimated', async () => {
    // 사슬(leg.estimated)은 추정이지만 가장 자주 다니는 노선의 소요는 확정값이면 각주가 없다
    api.course.mockResolvedValue(withService([service('55', 40), service('55', 10), service('55', 12), service('55', 52)]))
    const { unmount } = renderCourse(101)
    await screen.findByText('55번 · 약 12분 · 하루 6회')
    expect(screen.queryByText(/적힌 것보다 짧습니다/)).not.toBeInTheDocument()
    unmount()

    // 사슬은 확정인데(3-08 은 추정 구간 0) 노선 소요가 추정이면 각주가 있다
    api.course.mockResolvedValue({
      ...COURSE_308,
      legs: COURSE_308.legs.map((leg, i) => ({ ...leg, service: i === 1 ? service('67-1', 27, { estimated: true }) : null })),
    })
    renderCourse(110)
    await screen.findByText('67-1번 · 약 27분 · 하루 6회')
    expect(screen.getByText(/적힌 것보다 짧습니다/)).toBeInTheDocument()
  })

  it('되짚기 가운데 고현터미널 줄과 섞여도 짝이 맞는다 — 노선 줄 · 휴일 줄 · 타는 곳 줄 뒤에 「거쳐요」, 스팟 번호는 밀리지 않는다', async () => {
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

    const via = await screen.findByText('고현터미널을 거쳐요')
    expect([...document.querySelectorAll('[data-stop]')].map((e) => Number(e.dataset.stop))).toEqual([1, 3, 4, 13])
    // 사슬이 탄 노선(55 · 100)은 그 두 구간에 나오지 않는다
    const toTerminal = screen.getByText('67-1번 · 약 47~58분 · 평일 8회')
    const holiday = screen.getByText('휴일엔 이 구간 버스가 없어요')
    const board = screen.getByText('학동삼거리 정류장에서 타요 · 직선 약 110m')
    const fromTerminal = screen.getByText('110번 · 약 11~15분 · 평일 28회 · 휴일 23회')
    // 학동몽돌해변 → (67-1 · 휴일 없음 · 학동삼거리) → 고현터미널을 거쳐요 → (110) → 포로수용소
    const order = [document.querySelector('[data-stop="4"]'), toTerminal, holiday, board, via, fromTerminal, document.querySelector('[data-stop="13"]')]
    order.slice(1).forEach((el, i) => expect(order[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy())
    expect(screen.getAllByText('휴일엔 이 구간 버스가 없어요')).toHaveLength(1)
    expect(screen.queryByText(/^100번/)).not.toBeInTheDocument()
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

    expect(await screen.findByText('55번 · 약 50분 · 하루 6회')).toBeInTheDocument()
    expect(screen.getByText('55번 · 약 52분 · 하루 6회')).toBeInTheDocument()
    expect(screen.getByText('외도상륙+해금강선상관광 · 약 2시간 40분')).toBeInTheDocument()
    expect(screen.getByText('도장포 선착장으로 돌아와요')).toBeInTheDocument()
    expect(screen.getByText('같은 정류장 · 바로 이동')).toBeInTheDocument()
    expect(screen.getByText('버스 2번')).toBeInTheDocument()
  })
})
