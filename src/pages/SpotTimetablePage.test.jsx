import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { loadSpots } from '../lib/spots'
import SpotTimetablePage from './SpotTimetablePage'

vi.mock('../lib/api', () => ({
  api: { spotDepartures: vi.fn(), spotFerries: vi.fn() },
}))

vi.mock('../lib/spots', () => ({ loadSpots: vi.fn() }))

// 타는 곳 지도는 jsdom에서 뜨지 않습니다 — 목록만 봅니다.
vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn(() => Promise.reject(new Error('no sdk'))) }))

const DATE = '2026-09-14'
const NOW = '12:30'

const SPOTS = new Map(
  [
    [1, '바람의언덕'],
    [2, '도장포유람선'],
    [3, '해금강'],
    [4, '학동몽돌해변'],
    [5, '외도보타니아'],
  ].map(([poiId, shortName]) => [poiId, { poiId, shortName, name: shortName }]),
)

/** 버스 응답 — 학동에서 고현터미널로 가는 55번 한 편. */
function busOf(poiId, overrides = {}) {
  const spot = SPOTS.get(Number(poiId))
  return {
    poiId: Number(poiId),
    name: spot.name,
    shortName: spot.shortName,
    boardStop: '학동',
    alightLabel: '학동 정류장',
    boardStopDiffers: false,
    to: { stop: '고현', name: '고현터미널' },
    date: DATE,
    dayClass: 'WEEKDAY',
    departures: [{ routeNo: '55', depart: '13:00', arrive: '13:40', durationMin: 40 }],
    count: 1,
    firstDeparture: '13:00',
    lastDeparture: '13:00',
    next: { routeNo: '55', depart: '13:00', durationMin: 40 },
    byRoute: [{ routeNo: '55', count: 1, durationMin: 40, durationMinLow: 40, durationVaries: false }],
    emptyReason: null,
    unknownTimeRoutes: [],
    source: '거제시 BIS 원문',
    baseDate: '2026-08-18',
    boarding: null,
    ...overrides,
  }
}

function ferriesOf(poiId, overrides = {}) {
  return {
    poiId: Number(poiId),
    shortName: SPOTS.get(Number(poiId)).shortName,
    hasBusStop: true,
    toPoiId: null,
    toIsFerryDestination: false,
    towardEmptyReason: null,
    asOf: { date: DATE, time: NOW, zone: 'Asia/Seoul' },
    days: 14,
    ferries: [],
    ...overrides,
  }
}

const LANDING = {
  courseId: 1,
  landsOnOedo: true,
  legendLabel: '외도상륙+해금강선상관광',
  name: '외도상륙+해금강, 십자동굴 선상관광(외도입장료 별도)',
  totalMin: 160,
  totalText: '약 2시간 40분',
  oedoStayMin: 120,
  bookingUrl: 'https://www.oedoticket.com/page/view.php?cid=landing',
}

const CRUISE = {
  courseId: 2,
  landsOnOedo: false,
  legendLabel: '해금강선상관광',
  name: '해금강, 십자동굴 선상관광(신선대,우제봉,외도상륙X)',
  totalMin: 60,
  totalText: '약 1시간',
  oedoStayMin: null,
  bookingUrl: 'https://www.oedoticket.com/page/view.php?cid=cruise',
}

const DOCKS = {
  DOJANGPO: { dockCode: 'DOJANGPO', operatorName: '도장포유람선', shortName: '도장포', address: '경남 거제시 남부면 도장포1길 55' },
  WAHYEON: { dockCode: 'WAHYEON', operatorName: '와현유람선', shortName: '와현', address: '경남 거제시 일운면 와현리' },
  JANGSEUNGPO: { dockCode: 'JANGSEUNGPO', operatorName: '장승포유람선', shortName: '장승포', address: '경남 거제시 장승포동' },
  JISEPO: { dockCode: 'JISEPO', operatorName: '지세포유람선', shortName: '지세포', address: '경남 거제시 일운면 지세포리' },
}

/** 선착장 하나의 배 — 오늘 14:00 외도상륙 한 편. */
function ferryOf(relation, dockCode, overrides = {}) {
  return {
    key: `${relation}:${dockCode}`,
    relation,
    landingOnly: relation !== 'DOCK',
    dock: DOCKS[dockCode],
    access: null,
    courses: [LANDING],
    next: [{ courseId: 1, date: DATE, depart: '14:00', returnApprox: '16:40' }],
    rows: [{ date: DATE, status: 'PUBLISHED', sailings: [{ depart: '14:00', courseId: 1, returnApprox: '16:40' }] }],
    coverage: {
      publishedThrough: '2026-10-31',
      fetchedAt: '2026-09-13T23:24:00+09:00',
      source: '외도유람선 예약센터',
      sourceUrl: 'https://oedoticket.com/page/time-schedule.php',
      crossCheckUrl: null,
    },
    ...overrides,
  }
}

const OEDO_FERRIES = ferriesOf(5, {
  hasBusStop: false,
  ferries: ['DOJANGPO', 'WAHYEON', 'JANGSEUNGPO', 'JISEPO'].map((code) => ferryOf('DESTINATION', code)),
})

/** 바람의언덕 → 외도보타니아 — 도장포 선착장 외도상륙 편(TOWARD). */
const BARAM_TOWARD_OEDO = ferriesOf(1, {
  toPoiId: 5,
  toIsFerryDestination: true,
  ferries: [
    ferryOf('TOWARD', 'DOJANGPO', {
      access: { quote: '도보 1분거리에 바람의 언덕이 있습니다.', sourceUrl: 'https://www.oedoticket.com/page/view.php?cid=x' },
    }),
  ],
})

/** 도장포유람선 — 두 코스 전부(DOCK). */
const DOJANGPO_DOCK = ferriesOf(2, {
  ferries: [ferryOf('DOCK', 'DOJANGPO', { landingOnly: false, courses: [LANDING, CRUISE] })],
})

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="loc">{location.search}</output>
}

/** 지금 주소의 쿼리 — 칩을 누른 뒤 무엇이 주소에 남는지 봅니다. */
const currentQuery = () => new URLSearchParams(screen.getByTestId('loc').textContent)

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/timetable/:poiId" element={<SpotTimetablePage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

/** 손으로 끝내는 약속 — 새 칩의 요청이 아직 안 끝난 순간을 만듭니다. */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.clearAllMocks()
  loadSpots.mockResolvedValue(SPOTS)
  api.spotDepartures.mockImplementation(async (poiId) => busOf(poiId))
  api.spotFerries.mockImplementation(async (poiId) => ferriesOf(poiId))
})

describe('SpotTimetablePage — 버스만 있는 스팟 (회귀 가드)', () => {
  it('/timetable/4 — 고현터미널 왕복 칩 둘, 버스 호출 인자는 전과 같다', async () => {
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('button', { name: '학동몽돌해변 → 고현터미널' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '고현터미널 → 학동몽돌해변' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /→/ })).toHaveLength(2)
    expect(await screen.findByText('다음 버스 13:00 · 55번')).toBeInTheDocument()
    expect(await screen.findByText('평일')).toBeInTheDocument()
    expect(api.spotDepartures).toHaveBeenCalledTimes(1)
    expect(api.spotDepartures).toHaveBeenCalledWith('4', { date: DATE, after: NOW })
  })
})

describe('SpotTimetablePage — 유람선', () => {
  it('배 응답이 오기 전에는 칩 없이 로딩만 — 버스도 아직 부르지 않는다', async () => {
    api.spotFerries.mockReturnValue(new Promise(() => {}))
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    expect(screen.getByText('시간표를 불러오는 중')).toBeInTheDocument()
    await Promise.resolve()
    expect(screen.queryAllByRole('button', { name: /→/ })).toHaveLength(0)
    expect(api.spotDepartures).not.toHaveBeenCalled()
  })

  it('/timetable/4 — 버스와 같은 날짜·시각으로 배를 한 번 묻는다', async () => {
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    await screen.findByRole('button', { name: '학동몽돌해변 → 고현터미널' })
    expect(api.spotFerries).toHaveBeenCalledTimes(1)
    expect(api.spotFerries).toHaveBeenCalledWith('4', { date: DATE, after: NOW, toPoiId: null })
  })

  it('/timetable/5 외도보타니아 — 선착장 칩 넷, 버스는 부르지 않고 평일/휴일 표시도 없다', async () => {
    api.spotFerries.mockResolvedValue(OEDO_FERRIES)
    renderAt(`/timetable/5?date=${DATE}&now=${NOW}`)

    const first = await screen.findByRole('button', { name: '도장포 선착장 → 외도보타니아' })
    expect(first).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { name: /선착장 → 외도보타니아$/ }).map((b) => b.textContent)).toEqual([
      '도장포 선착장 → 외도보타니아',
      '와현 선착장 → 외도보타니아',
      '장승포 선착장 → 외도보타니아',
      '지세포 선착장 → 외도보타니아',
    ])
    expect(screen.queryByRole('button', { name: /고현터미널/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '외도보타니아' })).toBeInTheDocument()
    expect(screen.getByText('도장포 선착장에서 타요.')).toBeInTheDocument()
    expect(screen.queryByText('평일')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '타는 곳' })).not.toBeInTheDocument()
    expect(api.spotDepartures).not.toHaveBeenCalled()
  })

  it('선착장 칩을 누르면 그 선착장의 배 — 다시 묻지 않는다', async () => {
    const user = userEvent.setup()
    api.spotFerries.mockResolvedValue(OEDO_FERRIES)
    renderAt(`/timetable/5?date=${DATE}&now=${NOW}`)

    await user.click(await screen.findByRole('button', { name: '와현 선착장 → 외도보타니아' }))

    expect(screen.getByRole('button', { name: '와현 선착장 → 외도보타니아' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('와현 선착장에서 타요.')).toBeInTheDocument()
    expect(screen.queryByText('도장포 선착장에서 타요.')).not.toBeInTheDocument()
    expect(api.spotFerries).toHaveBeenCalledTimes(1)
    expect(api.spotDepartures).not.toHaveBeenCalled()
  })

  it('칩을 눌러도 주소에 없던 date·now를 박지 않는다 — 다시 열면 그때의 오늘·지금으로 보인다', async () => {
    const user = userEvent.setup()
    api.spotFerries.mockResolvedValue(OEDO_FERRIES)
    renderAt('/timetable/5')

    await user.click(await screen.findByRole('button', { name: '와현 선착장 → 외도보타니아' }))

    const query = currentQuery()
    expect(query.get('dir')).toBe('dock:WAHYEON')
    expect(query.has('date')).toBe(false)
    expect(query.has('now')).toBe(false)
  })

  it('주소에 date·now가 있었으면 칩을 눌러도 그대로 둔다', async () => {
    const user = userEvent.setup()
    api.spotFerries.mockResolvedValue(OEDO_FERRIES)
    renderAt(`/timetable/5?date=${DATE}&now=${NOW}`)

    await user.click(await screen.findByRole('button', { name: '와현 선착장 → 외도보타니아' }))

    const query = currentQuery()
    expect(query.get('dir')).toBe('dock:WAHYEON')
    expect(query.get('date')).toBe(DATE)
    expect(query.get('now')).toBe(NOW)
  })

  it('?dir=dock:WAHYEON 으로 들어오면 그 칩이 눌려 있다', async () => {
    api.spotFerries.mockResolvedValue(OEDO_FERRIES)
    renderAt(`/timetable/5?dir=dock:WAHYEON&date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('button', { name: '와현 선착장 → 외도보타니아' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('와현 선착장에서 타요.')).toBeInTheDocument()
  })

  it('외도보타니아에 배가 하나도 없으면 칩이 비지 않게 버스 칩으로 돌아간다', async () => {
    api.spotFerries.mockResolvedValue(ferriesOf(5, { hasBusStop: false, ferries: [] }))
    renderAt(`/timetable/5?date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('button', { name: '외도보타니아 → 고현터미널' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '고현터미널 → 외도보타니아' })).toBeInTheDocument()
    expect(api.spotDepartures).toHaveBeenCalledWith('5', { date: DATE, after: NOW })
  })

  it('/timetable/1?to=5 — 다음 스팟이 외도면 그 칩은 배(도장포 외도상륙), 거꾸로 칩은 없다', async () => {
    const user = userEvent.setup()
    api.spotFerries.mockResolvedValue(BARAM_TOWARD_OEDO)
    renderAt(`/timetable/1?to=5&date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('button', { name: '바람의언덕 → 외도보타니아' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('도장포 선착장에서 타요.')).toBeInTheDocument()
    expect(screen.getByText('예약센터 안내 — “도보 1분거리에 바람의 언덕이 있습니다.”')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '외도보타니아 → 바람의언덕' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /→/ }).map((b) => b.textContent)).toEqual([
      '바람의언덕 → 외도보타니아',
      '바람의언덕 → 고현터미널',
      '고현터미널 → 바람의언덕',
    ])
    expect(api.spotDepartures).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '바람의언덕 → 고현터미널' }))
    expect(await screen.findByText('다음 버스 13:00 · 55번')).toBeInTheDocument()
    expect(api.spotDepartures).toHaveBeenCalledWith('1', { date: DATE, after: NOW })
    expect(api.spotDepartures.mock.calls.some(([, args]) => args.toPoiId != null)).toBe(false)
  })

  it('/timetable/3?to=5 — 근처 선착장 근거가 없으면 빈 칸이 아니라 이유를 말한다', async () => {
    api.spotFerries.mockResolvedValue(
      ferriesOf(3, { toPoiId: 5, toIsFerryDestination: true, towardEmptyReason: 'NO_DOCK_NEAR_SPOT', ferries: [] }),
    )
    const { container } = renderAt(`/timetable/3?to=5&date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('button', { name: '해금강 → 외도보타니아' })).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByText('해금강 근처에서 외도보타니아에 가는 배를 타는 선착장을 원문에서 찾지 못했어요.'),
    ).toBeInTheDocument()
    expect(screen.getByText('외도보타니아 시간표에서 선착장 4곳의 배를 볼 수 있어요.')).toBeInTheDocument()
    expect(screen.queryByText('평일')).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent('운행 없음')
    expect(api.spotDepartures).not.toHaveBeenCalled()
  })

  it('/timetable/2 도장포유람선 — 버스 칩 뒤에 「도장포 선착장 배 시간표」, 누르면 두 코스 각주 · 돌아오면 버스를 다시 묻는다', async () => {
    const user = userEvent.setup()
    api.spotFerries.mockResolvedValue(DOJANGPO_DOCK)
    renderAt(`/timetable/2?date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('button', { name: '도장포유람선 → 고현터미널' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { name: /→|배 시간표$/ }).map((b) => b.textContent)).toEqual([
      '도장포유람선 → 고현터미널',
      '고현터미널 → 도장포유람선',
      '도장포 선착장 배 시간표',
    ])
    expect(api.spotDepartures).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '도장포 선착장 배 시간표' }))
    expect(screen.getByText(LANDING.name)).toBeInTheDocument()
    expect(screen.getByText(CRUISE.name)).toBeInTheDocument()
    expect(screen.queryByText('평일')).not.toBeInTheDocument()
    expect(api.spotDepartures).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '고현터미널 → 도장포유람선' }))
    expect(await screen.findByText('평일')).toBeInTheDocument()
    expect(api.spotDepartures).toHaveBeenCalledTimes(2)
    expect(api.spotDepartures).toHaveBeenLastCalledWith('2', { date: DATE, after: NOW, from: 'origin' })
  })

  it('배 요청이 실패하면 버스 칩은 그대로 두고 한 줄만 알린다', async () => {
    api.spotFerries.mockRejectedValue(new Error('서버가 제때 응답하지 않았습니다'))
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('button', { name: '학동몽돌해변 → 고현터미널' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText(/배 시간표를 불러오지 못했어요/)).toHaveLength(1)
    expect(await screen.findByText('다음 버스 13:00 · 55번')).toBeInTheDocument()
    expect(api.spotDepartures).toHaveBeenCalledWith('4', { date: DATE, after: NOW })
  })
})

describe('SpotTimetablePage — 타는 곳', () => {
  const BOARDING = {
    from: { name: '도장포유람선', kind: 'SPOT', lat: 34.7426, lng: 128.6628 },
    stops: [{ nodeId: 'GJB900', name: '도장포', lat: 34.7431, lng: 128.6622, distanceM: 80, routes: ['55'] }],
    exceptions: [],
    unresolved: [],
    source: '정류소 좌표 국토교통부 TAGO · 2026-09-13',
  }

  it('버스 칩이면 다음 버스 카드 바로 아래에 「타는 곳」 카드(09-14 개정) — 배 칩으로 바꾸면 사라진다', async () => {
    const user = userEvent.setup()
    api.spotDepartures.mockImplementation(async (poiId) => busOf(poiId, { boarding: BOARDING }))
    api.spotFerries.mockResolvedValue(ferriesOf(2, { ferries: [ferryOf('DOCK', 'DOJANGPO')] }))
    renderAt(`/timetable/2?date=${DATE}&now=${NOW}`)

    const card = await screen.findByRole('region', { name: '타는 곳' })
    const nextCard = screen.getByText('다음 버스 13:00 · 55번')
    const tableTitle = screen.getByRole('heading', { name: '평일 시간표' })
    expect(nextCard.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(card.compareDocumentPosition(tableTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(card).getByText('도장포 정류장')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '도장포 선착장 배 시간표' }))
    expect(screen.queryByRole('region', { name: '타는 곳' })).not.toBeInTheDocument()
  })

  it('boarding이 null이면 「타는 곳」을 그리지 않는다', async () => {
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    await screen.findByText('다음 버스 13:00 · 55번')
    expect(screen.queryByRole('region', { name: '타는 곳' })).not.toBeInTheDocument()
  })

  it('출처는 맨 아래 두 줄 — 시각(BIS) · 정류소 좌표(TAGO). 요일 꼬리는 붙이지 않는다', async () => {
    api.spotDepartures.mockImplementation(async (poiId) => busOf(poiId, { boarding: BOARDING }))
    const { container } = renderAt(`/timetable/2?date=${DATE}&now=${NOW}`)

    const bis = await screen.findByText('시각 거제시 BIS 원문 · 2026-08-18')
    const tago = screen.getByText('정류소 좌표 국토교통부 TAGO · 2026-09-13')
    expect(bis.compareDocumentPosition(tago) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container).not.toHaveTextContent('평일 기준')
    expect(container).not.toHaveTextContent('정류장 위치')
  })
})

describe('SpotTimetablePage — 칩을 바꾼 직후', () => {
  const BOARDING_HAKDONG = {
    from: { name: '학동몽돌해변', kind: 'SPOT', lat: 34.7747, lng: 128.6415 },
    stops: [{ nodeId: 'GJB700', name: '학동', lat: 34.775, lng: 128.641, distanceM: 90, routes: ['55'] }],
    exceptions: [],
    unresolved: [],
    source: '정류소 좌표 국토교통부 TAGO · 2026-09-13',
  }

  it('버스 칩을 바꾸면 새 요청이 끝날 때까지 앞 칩의 타는 곳·다음 버스·타는 문장을 그리지 않는다', async () => {
    const user = userEvent.setup()
    const pending = deferred()
    api.spotDepartures.mockImplementation((poiId, args) =>
      args.from === 'origin' ? pending.promise : Promise.resolve(busOf(poiId, { boarding: BOARDING_HAKDONG })),
    )
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    expect(await screen.findByRole('region', { name: '타는 곳' })).toBeInTheDocument()
    expect(screen.getByText('다음 버스 13:00 · 55번')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '고현터미널 → 학동몽돌해변' }))

    expect(screen.getByRole('button', { name: '고현터미널 → 학동몽돌해변' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('시간표를 불러오는 중')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '타는 곳' })).not.toBeInTheDocument()
    expect(screen.queryByText('다음 버스 13:00 · 55번')).not.toBeInTheDocument()
    expect(screen.queryByText('학동 정류장에서 타요.')).not.toBeInTheDocument()
    expect(screen.queryByText('평일')).not.toBeInTheDocument()

    await act(async () =>
      pending.resolve(
        busOf(4, {
          departures: [{ routeNo: '55', depart: '14:00', arrive: '14:40', durationMin: 40 }],
          next: { routeNo: '55', depart: '14:00', durationMin: 40 },
        }),
      ),
    )

    expect(await screen.findByText('다음 버스 14:00 · 55번')).toBeInTheDocument()
    expect(screen.getByText('고현터미널에서 타요.')).toBeInTheDocument()
    expect(screen.queryByText('시간표를 불러오는 중')).not.toBeInTheDocument()
  })

  it('배 칩에서 버스 칩으로 처음 바꿔도 제목·칩은 그대로 — 버스만 칩 아래에서 불러온다', async () => {
    const user = userEvent.setup()
    api.spotDepartures.mockReturnValue(new Promise(() => {}))
    api.spotFerries.mockResolvedValue(BARAM_TOWARD_OEDO)
    renderAt(`/timetable/1?to=5&date=${DATE}&now=${NOW}`)

    await user.click(await screen.findByRole('button', { name: '바람의언덕 → 고현터미널' }))

    expect(screen.getByRole('heading', { name: '바람의언덕' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /→/ })).toHaveLength(3)
    expect(screen.getByRole('button', { name: '바람의언덕 → 고현터미널' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('시간표를 불러오는 중')).toBeInTheDocument()
    expect(screen.queryByText('도장포 선착장에서 타요.')).not.toBeInTheDocument()
  })

  it('버스 요청이 실패해도 칩은 남고, 배 칩으로 돌아가면 배 시간표가 다시 보인다', async () => {
    const user = userEvent.setup()
    api.spotDepartures.mockRejectedValue(new Error('서버가 제때 응답하지 않았습니다'))
    api.spotFerries.mockResolvedValue(DOJANGPO_DOCK)
    renderAt(`/timetable/2?dir=dock:DOJANGPO&date=${DATE}&now=${NOW}`)

    expect(await screen.findByText(LANDING.name)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '도장포유람선 → 고현터미널' }))

    expect(await screen.findByText('불러오지 못했습니다 — 서버가 제때 응답하지 않았습니다')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '도장포유람선' })).toBeInTheDocument()
    expect(screen.queryByText(LANDING.name)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '도장포 선착장 배 시간표' }))

    expect(screen.getByText(LANDING.name)).toBeInTheDocument()
    expect(screen.queryByText(/불러오지 못했습니다/)).not.toBeInTheDocument()
  })
})

describe('SpotTimetablePage — 버스 시간표 09-14 개정(530:213 · 541:213 · 541:327)', () => {
  const dep = (routeNo, depart, durationMin, extra = {}) => ({
    routeNo,
    depart,
    arrive: depart,
    durationMin,
    estimated: false,
    departEstimated: false,
    ...extra,
  })

  /** 학동몽돌해변 → 고현터미널 모양 — 55번 둘 · 67-1번 하나, 07시에 두 대. */
  const HAKDONG = {
    departures: [dep('67-1', '07:35', 58), dep('55', '07:47', 43), dep('55', '13:00', 40)],
    count: 3,
    firstDeparture: '07:35',
    lastDeparture: '13:00',
    next: dep('55', '13:00', 40),
    byRoute: [
      { routeNo: '55', count: 2, durationMin: 43, durationMinLow: 40, durationVaries: true },
      { routeNo: '67-1', count: 1, durationMin: 58, durationMinLow: 58, durationVaries: false },
    ],
  }

  it('다음 버스 카드 둘째 줄 — 지금부터 몇 분 뒤인지 · 시간표 기준', async () => {
    renderAt(`/timetable/4?date=${DATE}&now=12:20`)

    expect(await screen.findByText('다음 버스 13:00 · 55번')).toBeInTheDocument()
    expect(screen.getByText('약 40분 뒤 · 시간표 기준')).toBeInTheDocument()
  })

  it('한 시간 넘게 남으면 시간·분으로, 바로 떠나면 「곧 출발」', async () => {
    renderAt(`/timetable/4?date=${DATE}&now=11:55`)
    expect(await screen.findByText('약 1시간 5분 뒤 · 시간표 기준')).toBeInTheDocument()
  })

  it('곧 출발', async () => {
    renderAt(`/timetable/4?date=${DATE}&now=13:00`)
    expect(await screen.findByText('곧 출발 · 시간표 기준')).toBeInTheDocument()
  })

  it('오늘이 아닌 날짜를 보면 「몇 분 뒤」를 쓰지 않는다 — 지금 시각과 무관한 날이다', async () => {
    renderAt('/timetable/4?date=2020-01-06')

    await screen.findByText(/다음 버스|오늘 남은 버스/)
    expect(screen.queryByText(/뒤 · 시간표 기준/)).not.toBeInTheDocument()
  })

  it('노선이 하나면 칩 줄 없이 「첫차 · 막차 · 하루 N회」', async () => {
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    expect(await screen.findByText('첫차 13:00 · 막차 13:00 · 하루 1회')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^전체/ })).not.toBeInTheDocument()
  })

  it('노선이 여럿이면 「하루 N회」 + 노선 칩(전체 · 노선별 횟수), 전체일 때는 소요시간 줄이 없다', async () => {
    api.spotDepartures.mockImplementation(async (poiId) => busOf(poiId, HAKDONG))
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    expect(await screen.findByText('하루 3회')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전체 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '55번 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '67-1번 1' })).toBeInTheDocument()
    expect(screen.queryByText(/^약 \d+(~\d+)?분$/)).not.toBeInTheDocument()
  })

  it('노선 칩을 고르면 그 노선 편만 · 「55번 2회」 · 소요시간(폭이 있으면 범위) · 다음 버스도 그 노선', async () => {
    const user = userEvent.setup()
    api.spotDepartures.mockImplementation(async (poiId) => busOf(poiId, HAKDONG))
    renderAt(`/timetable/4?date=${DATE}&now=07:00`)

    await user.click(await screen.findByRole('button', { name: '55번 2' }))
    expect(screen.getByText('55번 2회')).toBeInTheDocument()
    expect(screen.getByText('약 40~43분')).toBeInTheDocument()
    expect(screen.queryByText('07:35')).not.toBeInTheDocument()
    expect(screen.getByText('07:47')).toBeInTheDocument()
    expect(screen.getByText('다음 버스 07:47 · 55번')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '67-1번 1' }))
    expect(screen.getByText('약 58분')).toBeInTheDocument()
    expect(screen.getByText('다음 버스 07:35 · 67-1번')).toBeInTheDocument()
  })

  it('한 시에 여러 대면 한 편에 한 줄, 시(時)는 그 시의 첫 줄에만', async () => {
    api.spotDepartures.mockImplementation(async (poiId) => busOf(poiId, HAKDONG))
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    await screen.findByText('07:35')
    expect(screen.getAllByText('07시')).toHaveLength(1)
    expect(screen.getAllByRole('listitem').filter((li) => /\d\d:\d\d/.test(li.textContent))).toHaveLength(3)
    expect(screen.getByText('13:00').closest('li')).toHaveTextContent('다음')
  })

  it('★ 출발 시각이 전부 추정이면 표 위에 한 줄로 알리고, 다음 버스 카드도 추정이라고 말한다(절대규칙 1)', async () => {
    api.spotDepartures.mockImplementation(async (poiId) =>
      busOf(poiId, {
        departures: [dep('55', '12:48', 52, { estimated: true, departEstimated: true }), dep('55', '14:48', 52, { estimated: true, departEstimated: true })],
        count: 2,
        next: dep('55', '12:48', 52, { estimated: true, departEstimated: true }),
      }),
    )
    const { container } = renderAt(`/timetable/1?date=${DATE}&now=12:20`)

    expect(await screen.findByText('약 28분 뒤 · 앞뒤 정류장 시각으로 추정')).toBeInTheDocument()
    expect(
      screen.getByText('이 정류장 시각은 원문 시간표에 칸이 없어 앞뒤 정류장 시각으로 추정했어요. 적힌 시각에 나가 있으면 버스를 놓치지 않아요.'),
    ).toBeInTheDocument()
    expect(container).not.toHaveTextContent('시간표 기준')
    // 전부 추정이면 줄마다 태그를 달지 않는다 — 한 줄로 충분하다
    expect(screen.queryAllByText('추정')).toHaveLength(0)
  })

  it('★ 일부만 추정이면 그 편에만 「추정」 태그', async () => {
    api.spotDepartures.mockImplementation(async (poiId) =>
      busOf(poiId, {
        departures: [dep('32', '06:00', 60), dep('2000', '07:00', 60, { estimated: true, departEstimated: true })],
        count: 2,
        next: null,
      }),
    )
    renderAt(`/timetable/4?date=${DATE}&now=${NOW}`)

    const estimated = await screen.findByText('07:00')
    expect(estimated.closest('li')).toHaveTextContent('추정')
    expect(screen.getByText('06:00').closest('li')).not.toHaveTextContent('추정')
    expect(screen.getByText('「추정」 시각은 원문 시간표에 칸이 없어 앞뒤 정류장 시각으로 추정했어요. 적힌 시각에 나가 있으면 버스를 놓치지 않아요.')).toBeInTheDocument()
  })

  it('도착만 추정인 편(estimated · departEstimated false)은 시각에 추정 표시를 붙이지 않는다 — 고현 출발은 원문 칸이다', async () => {
    api.spotDepartures.mockImplementation(async (poiId) =>
      busOf(poiId, {
        departures: [dep('55', '06:25', 50, { estimated: true, departEstimated: false })],
        next: dep('55', '06:25', 50, { estimated: true, departEstimated: false }),
      }),
    )
    const { container } = renderAt(`/timetable/1?dir=fromOrigin&date=${DATE}&now=06:00`)

    expect(await screen.findByText('약 25분 뒤 · 시간표 기준')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('추정')
  })
})
