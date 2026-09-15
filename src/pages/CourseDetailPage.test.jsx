import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '../i18n'
import { api } from '../lib/api'
import { getToken } from '../lib/session'
import { loadSpots } from '../lib/spots'
import CourseDetailPage from './CourseDetailPage'

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
    { seq: 1, mode: 'BUS', durationMin: 40, estimated: false, rides: [ride('55')] },
    { seq: 2, mode: 'BUS', durationMin: 10, estimated: false, rides: [ride('55')] },
    { seq: 3, mode: 'BUS', durationMin: 12, estimated: true, rides: [ride('55', false, true)] },
    { seq: 4, mode: 'BUS', durationMin: 52, estimated: true, rides: [ride('55', true, false)] },
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
    { seq: 1, mode: 'BUS', durationMin: 40, estimated: false, rides: [ride('55')] },
    { seq: 2, mode: 'BUS', durationMin: 27, estimated: false, rides: [ride('67-1')] },
    { seq: 3, mode: 'SAME_STOP', durationMin: 0, estimated: false, rides: [] },
    { seq: 4, mode: 'BUS', durationMin: 45, estimated: false, rides: [ride('22')] },
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
    expect(screen.getByText('4구간')).toBeInTheDocument()
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
    expect(container).not.toHaveTextContent('0구간')
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
})
