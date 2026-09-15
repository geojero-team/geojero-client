import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { getToken } from '../lib/session'
import { loadSpotPhotos, loadSpots } from '../lib/spots'
import CoursesPage from './CoursesPage'
import styles from './CoursesPage.module.css'

vi.mock('../lib/api', () => ({ api: { courses: vi.fn(), savedTrips: vi.fn() } }))

// 로그인 여부 — 기본은 비로그인(저장 목록을 묻지 않습니다). 저장한 코스 빼기 테스트만 로그인으로 바꿉니다.
vi.mock('../lib/session', () => ({ getToken: vi.fn(() => null) }))

// withPhotos · regionsOf 는 그대로 쓰고 /api/pois 만 흉내 냅니다 — 사진·권역은 거기서 오고 코스 API는 주지 않습니다.
vi.mock('../lib/spots', async (importOriginal) => ({
  ...(await importOriginal()),
  loadSpotPhotos: vi.fn(),
  loadSpots: vi.fn(),
}))

const spot = (seq, poiId, name, shortName, theme) => ({ seq, poiId, name, shortName, theme, lat: 34.7, lng: 128.6 })

/** 브리프의 계약 응답 그대로 — 3-01 · 3-02. 서버는 아직 배포 전이라 이 모양이 곧 계약입니다. */
const COURSE_301 = {
  courseId: 101,
  courseCode: '3-01',
  spotCount: 3,
  rank: 1,
  nineScenicCount: 3,
  name: '학동 · 해금강 · 바람의언덕',
  summary: '고현터미널 11:05 출발 → 19:40 복귀 · 약 8시간 30분',
  title: '환승 없이 남부 9경 세 곳',
  intro: '학동 몽돌해변에서 해금강을 지나 바람의언덕까지, 거제 9경 세 곳을 55번 한 노선으로 잇습니다. 환승도 배도 없어 버스만 타면 됩니다.',
  nineScenicNos: [1, 2, 4],
  busRoutes: ['55'],
  tripsPerDay: { weekday: 6, holiday: 6 },
  holidayService: true,
  departAt: '11:05',
  returnAt: '19:40',
  approxTotalMin: 510,
  approxTotalText: '약 8시간 30분',
  busMinTotal: 114,
  busTotalText: '약 1시간 54분',
  spots: [
    spot(1, 4, '학동흑진주몽돌해변', '학동몽돌해변', 'BEACH'),
    spot(2, 3, '해금강', '해금강', 'VIEW'),
    spot(3, 1, '바람의언덕', '바람의언덕', 'VIEW'),
  ],
}

const COURSE_302 = {
  courseId: 104,
  courseCode: '3-02',
  spotCount: 3,
  rank: 2,
  nineScenicCount: 2,
  name: '씨월드 · 학동 · 바람의언덕',
  summary: '고현터미널 11:04 출발 → 20:55 복귀 · 약 10시간',
  title: '돌고래 보고 몽돌 밟고 바람의언덕',
  intro: '지세포의 돌고래 체험파크 거제씨월드에서 학동 몽돌해변으로 내려가 바람의언덕에서 마무리합니다.',
  nineScenicNos: [2, 4],
  busRoutes: ['22-1', '67-1', '55'],
  tripsPerDay: null,
  holidayService: false,
  departAt: '11:04',
  returnAt: '20:55',
  approxTotalMin: 600,
  approxTotalText: '약 10시간',
  busMinTotal: 134,
  busTotalText: '약 2시간 14분',
  spots: [
    spot(1, 18, '거제씨월드', '거제씨월드', 'EXHIBIT'),
    spot(2, 4, '학동흑진주몽돌해변', '학동몽돌해변', 'BEACH'),
    spot(3, 1, '바람의언덕', '바람의언덕', 'VIEW'),
  ],
}

/** 9경이 한 곳도 없는 코스 — 배지가 없어야 합니다. 제목·소개도 없는 경우를 겸합니다. */
const COURSE_NO_NINE = {
  ...COURSE_302,
  courseId: 120,
  courseCode: '4-07',
  spotCount: 4,
  rank: 7,
  nineScenicCount: 0,
  name: '양지암조각공원 · 조선해양문화관 · 씨월드 · 옥포대첩기념공원',
  title: null,
  intro: null,
  nineScenicNos: [],
  busRoutes: ['10', '22-1'],
  busMinTotal: 163,
  busTotalText: '약 2시간 43분',
  spots: [
    spot(1, 16, '양지암조각공원', '양지암조각공원', 'EXHIBIT'),
    spot(2, 20, '거제조선해양문화관', '조선해양문화관', 'EXHIBIT'),
    spot(3, 18, '거제씨월드', '거제씨월드', 'EXHIBIT'),
    spot(4, 21, '옥포대첩기념공원', '옥포대첩기념공원', 'HISTORY'),
  ],
}

const TWO = { counts: { 3: 10, 4: 10, 5: 3 }, courses: [COURSE_301, COURSE_302] }

/** /api/pois 대표 사진 — 거제씨월드(18)는 사진이 없는 경우(저작권 Type3). */
const PHOTOS = new Map([
  [4, 'https://tong.visitkorea.or.kr/hakdong.jpg'],
  [1, 'https://tong.visitkorea.or.kr/windhill.jpg'],
])

/** /api/pois 권역 — TourAPI 주소의 읍·면·동으로 정한 값(기준문서 §6). 권역 태그의 근거. */
const POIS = new Map(
  [
    [1, '남부권'], [3, '남부권'], [4, '남부권'],
    [16, '동부권'], [18, '동부권'], [20, '동부권'], [21, '동부권'],
  ].map(([poiId, region]) => [poiId, { poiId, region }]),
)

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="loc">{location.pathname + location.search}</output>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/courses']}>
      <Routes>
        <Route path="/" element={<p>홈 화면</p>} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/course-map" element={<p>지도 화면</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const card = (id) => document.querySelector(`[data-course="${id}"]`)

beforeEach(() => {
  vi.clearAllMocks()
  loadSpotPhotos.mockResolvedValue(PHOTOS)
  loadSpots.mockResolvedValue(POIS)
  api.courses.mockResolvedValue(TWO)
  // 로그인 상태면 화면이 저장 목록을 묻습니다(저장한 코스는 추천에서 뺌). 기본은 빈 목록.
  api.savedTrips.mockResolvedValue([])
})

describe('CoursesPage — v3 대표 코스 카드(585:417 · 585:485 · 582:416)', () => {
  it('머리 · 헤드라인 두 줄 · 출처 한 줄 · 「대표 코스 2가지」 — 3/4/5곳 칩은 없다', async () => {
    renderPage()

    expect(await screen.findByText('대표 코스 2가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '코스 추천' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('거제 9경을 버스로 잇는대표 코스')
    expect(screen.getByText('출발은 고현터미널 · 노선과 시간은 거제시 BIS 원문 기준')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '3곳' })).not.toBeInTheDocument()
    expect(screen.queryByText(/총 코스/)).not.toBeInTheDocument()
    expect(api.courses).toHaveBeenCalledWith({ featured: true })
  })

  it('카드 — 제목 · 스팟 체인 · 소개 · 태그 넷(버스 시간 · 권역 · 매일 6회 · 평일·휴일)', async () => {
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    const c = within(card(101))
    expect(c.getByText('학동몽돌해변 → 해금강 → 바람의언덕')).toBeInTheDocument()
    expect(c.getByText(COURSE_301.intro)).toBeInTheDocument()
    expect(c.getByText('버스 약 1시간 54분')).toBeInTheDocument()
    // 노선 번호 태그(「55번 한 노선」)는 2026-09-14 밤 권역으로 바꿨다 — 노선은 코스 상세가 구간마다 말한다
    expect([...card(101).querySelectorAll(`.${styles.tag}`)].map((e) => e.textContent)).toEqual([
      '버스 약 1시간 54분', '남부권', '매일 6회', '평일·휴일',
    ])
    // 코스 name 은 줄임말 체인이라 화면에 내지 않는다(코스 상세와 같은 이유)
    expect(c.queryByText('학동 · 해금강 · 바람의언덕')).not.toBeInTheDocument()
  })

  it('권역이 섞인 카드 — 가는 순서대로 「동부권·남부권」 · 배차 태그 없음(노선 여럿) · 「평일만」', async () => {
    renderPage()

    await screen.findByText('돌고래 보고 몽돌 밟고 바람의언덕')
    expect([...card(104).querySelectorAll(`.${styles.tag}`)].map((e) => e.textContent)).toEqual([
      '버스 약 2시간 14분', '동부권·남부권', '평일만',
    ])
  })

  it('스팟 목록을 못 받으면 권역 태그만 빠진다 — 빈 태그를 남기지 않는다', async () => {
    loadSpots.mockResolvedValue(new Map())
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    const c = within(card(101))
    expect(c.queryByText(/권$/)).not.toBeInTheDocument()
    expect(card(101).querySelectorAll(`.${styles.tag}`)).toHaveLength(3)
  })

  it('평일과 휴일 회차가 다르면 「평일 N회」', async () => {
    api.courses.mockResolvedValue({ ...TWO, courses: [{ ...COURSE_301, tripsPerDay: { weekday: 6, holiday: 3 } }] })
    renderPage()

    expect(await screen.findByText('평일 6회')).toBeInTheDocument()
    expect(screen.queryByText(/매일/)).not.toBeInTheDocument()
  })

  it('9경 배지 — [1, 2, 4] → 「거제 9경 · 1경 2경 4경」, 9경이 0곳이면 배지 없음', async () => {
    api.courses.mockResolvedValue({ ...TWO, courses: [COURSE_301, COURSE_NO_NINE] })
    renderPage()

    await screen.findByText('거제 9경 · 1경 2경 4경')
    expect(within(card(120)).queryByText(/거제 9경/)).not.toBeInTheDocument()
  })

  it('hero — 첫 스팟의 /api/pois 대표 사진, 없으면 「사진 없음 — TourAPI 사진 0장」(자리그림 SVG 아님)', async () => {
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    const img = card(101).querySelector('img')
    expect(img).toHaveAttribute('src', 'https://tong.visitkorea.or.kr/hakdong.jpg')
    expect(img).toHaveAttribute('alt', '')
    expect(card(104).querySelector('img')).toBeNull()
    expect(within(card(104)).getByText('사진 없음 — TourAPI 사진 0장')).toBeInTheDocument()
  })

  it('사진 링크가 죽으면(onError) 같은 「사진 없음」 상태로', async () => {
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    fireEvent.error(card(101).querySelector('img'))
    expect(within(card(101)).getByText('사진 없음 — TourAPI 사진 0장')).toBeInTheDocument()
    expect(card(101).querySelector('img')).toBeNull()
  })

  it('사진 목록을 못 받아도(빈 Map) 카드는 「사진 없음」으로 그린다', async () => {
    loadSpotPhotos.mockResolvedValue(new Map())
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    expect(screen.getAllByText('사진 없음 — TourAPI 사진 0장')).toHaveLength(2)
  })

  it('title 이 없으면 코스 상세와 같은 규칙 「학동몽돌해변에서 바람의언덕까지」 · intro 가 없으면 소개 문단 자체가 없다', async () => {
    api.courses.mockResolvedValue({ ...TWO, courses: [{ ...COURSE_301, title: null, intro: null }] })
    renderPage()

    expect(await screen.findByText('학동몽돌해변에서 바람의언덕까지')).toBeInTheDocument()
    expect(within(card(101)).queryByText(/잇습니다/)).not.toBeInTheDocument()
    expect(card(101).querySelector(`.${styles.intro}`)).toBeNull()
    expect(card(101).querySelector(`.${styles.badge}`)).not.toBeNull()
  })

  it('고르기 전엔 선택 바가 없다 → 카드를 누르면 「코스 1개 선택하기」 → 둘이면 「코스 2개 선택하기」 → 지도로', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    expect(screen.queryByRole('button', { name: /선택하기/ })).not.toBeInTheDocument()
    expect(card(101)).toHaveAttribute('aria-pressed', 'false')

    await user.click(card(101))
    expect(card(101)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '코스 1개 선택하기' })).toBeInTheDocument()

    await user.click(card(104))
    expect(screen.getByRole('button', { name: '코스 2개 선택하기' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '코스 2개 선택하기' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/course-map?courses=101,104')
  })

  it('다시 누르면 고름이 풀리고, 전부 풀리면 바가 사라진다', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    await user.click(card(104))
    await user.click(card(101))
    expect(screen.getByRole('button', { name: '코스 2개 선택하기' })).toBeInTheDocument()

    await user.click(card(104))
    expect(card(104)).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '코스 1개 선택하기' })).toBeInTheDocument()

    await user.click(card(101))
    expect(screen.queryByRole('button', { name: /선택하기/ })).not.toBeInTheDocument()
  })

  it('불러오는 중 · 실패 — 실패에는 이유가 붙는다', async () => {
    api.courses.mockReturnValue(new Promise(() => {}))
    const { unmount } = renderPage()
    expect(await screen.findByText('코스를 불러오는 중')).toBeInTheDocument()
    unmount()

    api.courses.mockRejectedValue(new Error('서버에 연결하지 못했습니다'))
    renderPage()
    expect(await screen.findByText('불러오지 못했습니다 — 서버에 연결하지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByText(/대표 코스 \d+가지/)).not.toBeInTheDocument()
  })

  it('코스가 0개면 「코스가 아직 없어요」 한 줄 — 3/4/5곳 빈 상태 문구는 없다', async () => {
    api.courses.mockResolvedValue({ counts: { 3: 0, 4: 0, 5: 0 }, courses: [] })
    renderPage()

    expect(await screen.findByText('코스가 아직 없어요')).toBeInTheDocument()
    expect(screen.queryByText(/아직 안내할 수 없어요/)).not.toBeInTheDocument()
    expect(screen.queryByText(/대표 코스 \d+가지/)).not.toBeInTheDocument()
  })

  it('「뒤로」 — 처음 들어온 화면이면 홈으로', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    await user.click(screen.getByRole('button', { name: '뒤로' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/')
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })
})

describe('CoursesPage — 저장한 코스는 추천에서 뺀다(2026-09-15 사용자 요청)', () => {
  beforeEach(() => {
    getToken.mockReturnValue('token')
  })

  afterEach(() => {
    getToken.mockReturnValue(null)
  })

  it('내 일정에 저장한 코스는 카드가 없고, 뺀 이유를 한 줄로 말한다', async () => {
    api.courses.mockResolvedValue({ courses: [COURSE_301, COURSE_302] })
    api.savedTrips.mockResolvedValue([{ savedTripId: 9, courseId: 101 }])
    renderPage()

    expect(await screen.findByText('돌고래 보고 몽돌 밟고 바람의언덕')).toBeInTheDocument()
    expect(screen.queryByText('환승 없이 남부 9경 세 곳')).not.toBeInTheDocument()
    expect(screen.getByText('저장한 코스 1개는 빼고 보여줘요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내 일정 보기 ›' })).toBeInTheDocument()
  })

  it('추천 코스를 전부 저장했으면 빈 목록 대신 그 사실과 내 일정으로 가는 길', async () => {
    api.courses.mockResolvedValue({ courses: [COURSE_301] })
    api.savedTrips.mockResolvedValue([{ savedTripId: 9, courseId: 101 }])
    renderPage()

    expect(await screen.findByText('추천 코스를 모두 내 일정에 저장했어요')).toBeInTheDocument()
    expect(screen.queryByText('코스가 아직 없어요')).not.toBeInTheDocument()
  })

  it('저장 목록을 못 받으면(만료 · 장애) 빼지 않고 다 보여준다 — 추천을 막지 않는다', async () => {
    api.courses.mockResolvedValue({ courses: [COURSE_301, COURSE_302] })
    api.savedTrips.mockRejectedValue(new Error('401'))
    renderPage()

    expect(await screen.findByText('환승 없이 남부 9경 세 곳')).toBeInTheDocument()
    expect(screen.getByText('돌고래 보고 몽돌 밟고 바람의언덕')).toBeInTheDocument()
    expect(screen.queryByText(/빼고 보여줘요/)).not.toBeInTheDocument()
  })
})
