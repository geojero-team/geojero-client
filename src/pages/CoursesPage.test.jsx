import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { ICON_PATHS } from '../lib/spotIcons'
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

function renderPage(entry = '/courses', { entries = [entry], index = entries.length - 1 } = {}) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
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
  it('머리 · 헤드라인 두 줄 · 출처 한 줄 · 「대표 코스 2가지」', async () => {
    renderPage()

    expect(await screen.findByText('대표 코스 2가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '코스 추천' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('거제 9경을 버스로 잇는대표 코스')
    expect(screen.getByText('출발은 고현터미널 · 노선과 시간은 거제시 BIS 원문 기준')).toBeInTheDocument()
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

  it('9경 배지 — [1, 2, 4] → 도장 「거제 9경 1경 2경 4경」, 9경이 0곳이면 배지 없음', async () => {
    api.courses.mockResolvedValue({ ...TWO, courses: [COURSE_301, COURSE_NO_NINE] })
    renderPage()

    await screen.findByText('거제 9경 1경 2경 4경')
    expect(card(101)).toHaveAccessibleName(/거제 9경 1경 2경 4경/)
    expect(within(card(120)).queryByText(/거제 9경/)).not.toBeInTheDocument()
    expect(card(120).querySelector(`.${styles.badge}`)).toBeNull()
  })

  it('hero — 첫 스팟의 /api/pois 대표 사진 · 첫 스팟에 사진이 없으면 사진 있는 다음 스팟(위 카드가 쓴 사진은 건너뜀)', async () => {
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    const img = card(101).querySelector('img')
    expect(img).toHaveAttribute('src', 'https://tong.visitkorea.or.kr/hakdong.jpg')
    expect(img).toHaveAttribute('alt', '')
    // 3-02: 거제씨월드(사진 없음) → 학동몽돌해변(3-01 이 씀) → 바람의언덕
    expect(card(104).querySelector('img')).toHaveAttribute('src', 'https://tong.visitkorea.or.kr/windhill.jpg')
    expect(card(104).querySelector('img')).toHaveAttribute('alt', '')
  })

  it('어느 스팟에도 사진이 없으면 「사진 없음 — TourAPI 사진 0장」(자리그림 SVG 아님)', async () => {
    api.courses.mockResolvedValue({ ...TWO, courses: [COURSE_301, COURSE_NO_NINE] })
    renderPage()

    await screen.findByText('환승 없이 남부 9경 세 곳')
    expect(card(120).querySelector('img')).toBeNull()
    expect(within(card(120)).getByText('사진 없음 — TourAPI 사진 0장')).toBeInTheDocument()
  })

  it('①② 첫 스팟이 같으면 두 카드 사진 주소가 다르다 — 아래 카드는 아직 안 쓴 사진이 있는 다음 스팟', async () => {
    // 둘 다 학동몽돌해변으로 시작합니다(대표 코스 ①② 실제 모양).
    const second = {
      ...COURSE_301,
      courseId: 130,
      title: '학동에서 시작하는 다른 코스',
      spots: [
        spot(1, 4, '학동흑진주몽돌해변', '학동몽돌해변', 'BEACH'),
        spot(2, 1, '바람의언덕', '바람의언덕', 'VIEW'),
        spot(3, 3, '해금강', '해금강', 'VIEW'),
      ],
    }
    api.courses.mockResolvedValue({ ...TWO, courses: [COURSE_301, second] })
    renderPage()

    await screen.findByText('학동에서 시작하는 다른 코스')
    const first = card(101).querySelector('img').getAttribute('src')
    const other = card(130).querySelector('img').getAttribute('src')
    expect(first).toBe('https://tong.visitkorea.or.kr/hakdong.jpg')
    expect(other).toBe('https://tong.visitkorea.or.kr/windhill.jpg')
    expect(other).not.toBe(first)
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

  it('코스가 0개면 「코스가 아직 없어요」 한 줄 — 개수 칩도 없다', async () => {
    api.courses.mockResolvedValue({ counts: { 3: 0, 4: 0, 5: 0 }, courses: [] })
    renderPage()

    expect(await screen.findByText('코스가 아직 없어요')).toBeInTheDocument()
    expect(screen.queryByText(/아직 안내할 수 없어요/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument()
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

describe('CoursesPage — 개수 칩(Figma 623:444 · 메모 623:520, 2026-09-16 되살림)', () => {
  // 대표 코스 안에서 거릅니다(사용자 결정 A) — 3곳 둘(101 · 104) · 4곳 하나(120) · 5곳 없음
  const THREE = { counts: { 3: 10, 4: 10, 5: 3 }, courses: [COURSE_301, COURSE_302, COURSE_NO_NINE] }
  const chip = (name) => screen.getByRole('button', { name })

  beforeEach(() => {
    api.courses.mockResolvedValue(THREE)
  })

  it('「전체 · 3곳 · 4곳 · 5곳」 — 「전체」가 기본이고 대표 코스가 다 보인다 · 코스가 0개인 5곳은 비활성', async () => {
    renderPage()

    expect(await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
    const group = screen.getByRole('group', { name: '코스 곳 수' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['전체', '3곳', '4곳', '5곳'])
    expect(chip('전체')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('3곳')).toHaveAttribute('aria-pressed', 'false')
    expect(chip('3곳')).toBeEnabled()
    expect(chip('5곳')).toBeDisabled()
    expect(card(101)).toBeInTheDocument()
    expect(card(104)).toBeInTheDocument()
    expect(card(120)).toBeInTheDocument()
    // 서버에 다시 묻지 않는다 — 대표 코스 응답 하나를 화면에서 거른다
    expect(api.courses).toHaveBeenCalledTimes(1)
    expect(api.courses).toHaveBeenCalledWith({ featured: true })
  })

  it('3곳을 누르면 3곳 코스만 · 상태줄이 「3곳 코스 2가지」 · 주소에 남는다 → 전체로 돌아오면 다시 전부', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')
    await user.click(chip('3곳'))
    expect(screen.getByText('3곳 코스 2가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
    expect(chip('3곳')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('전체')).toHaveAttribute('aria-pressed', 'false')
    expect(card(101)).toBeInTheDocument()
    expect(card(104)).toBeInTheDocument()
    expect(card(120)).toBeNull()
    expect(screen.getByTestId('loc')).toHaveTextContent('/courses?spots=3')

    await user.click(chip('전체'))
    expect(screen.getByText('대표 코스 3가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
    expect(card(120)).toBeInTheDocument()
    expect(screen.getByTestId('loc').textContent).toBe('/courses')
  })

  it('고른 코스는 칩을 바꿔도 풀리지 않는다 — 하단 바는 고른 전체 수, 지도는 카드 순서로 전부 넘긴다', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')
    await user.click(card(104))
    await user.click(chip('4곳'))
    expect(card(104)).toBeNull()
    expect(screen.getByRole('button', { name: '코스 1개 선택하기' })).toBeInTheDocument()

    await user.click(card(120))
    expect(screen.getByRole('button', { name: '코스 2개 선택하기' })).toBeInTheDocument()

    await user.click(chip('3곳'))
    expect(card(104)).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '코스 2개 선택하기' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/course-map?courses=104,120')
  })

  it('주소의 개수로 들어오면 그 칩 — 지도에서 뒤로 왔을 때 제자리 · 0개인 개수나 엉뚱한 값이면 전체', async () => {
    const { unmount } = renderPage('/courses?spots=4')
    expect(await screen.findByText('4곳 코스 1가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
    expect(chip('4곳')).toHaveAttribute('aria-pressed', 'true')
    expect(card(101)).toBeNull()
    unmount()

    const second = renderPage('/courses?spots=5')
    expect(await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
    expect(chip('전체')).toHaveAttribute('aria-pressed', 'true')
    second.unmount()

    renderPage('/courses?spots=abc')
    expect(await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
  })

  it('저장해서 뺀 코스는 칩 개수에서도 빠진다 — 4곳 코스를 저장했으면 4곳이 비활성', async () => {
    getToken.mockReturnValue('token')
    api.savedTrips.mockResolvedValue([{ savedTripId: 9, courseId: 120 }])
    try {
      renderPage()

      expect(await screen.findByText('대표 코스 2가지 · 여러 개 고를 수 있어요')).toBeInTheDocument()
      expect(chip('4곳')).toBeDisabled()
      expect(chip('3곳')).toBeEnabled()
    } finally {
      getToken.mockReturnValue(null)
    }
  })

  /** 스크롤 칸 · 칩 줄 · 상태줄의 잰 값을 흉내 냅니다(jsdom 은 배치를 하지 않습니다). zoom 은 데스크톱 프레임 확대(lib/frameZoom). */
  function fakeLayout(total, { zoom = 1, scrollTop = 0 } = {}) {
    const scroller = document.querySelector(`.${styles.scroll}`)
    const chips = screen.getByRole('group', { name: '코스 곳 수' })
    const state = { scrollTop }
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => state.scrollTop, set: (v) => { state.scrollTop = v } })
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, get: () => 788 })
    Object.defineProperty(chips, 'offsetHeight', { configurable: true, get: () => 56 })
    // 잰 상자(getBoundingClientRect)만 확대되고 offsetHeight · clientHeight · scrollTop 은 확대 전 값이다
    scroller.getBoundingClientRect = () => ({ top: 56 * zoom, height: 788 * zoom })
    const place = (localTop) => {
      total.getBoundingClientRect = () => ({ top: 56 * zoom + localTop * zoom })
    }
    return { state, place }
  }

  it('칩을 누르면 목록 맨 위로 — 내려가 있으면 상태줄을 칩 줄 아래 제자리 간격(16)으로, 이미 보이면 그대로', async () => {
    const user = userEvent.setup()
    renderPage()

    const total = await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')
    const { state, place } = fakeLayout(total, { scrollTop: 1200 })
    // 상태줄이 스크롤 칸 위로 300px 지나가 있다 → 칩 줄(56) + 8 아래로 오려면 300 + 64 만큼 올린다.
    // 칩 줄 띠의 아래 8 은 음수 마진이라 칩(40)과 상태줄 사이가 그림처럼 16 이 된다.
    place(-300)
    await user.click(chip('3곳'))
    expect(state.scrollTop).toBe(1200 - 364)

    // 이미 칩 줄 아래에 제자리 간격으로 보이면 움직이지 않는다
    state.scrollTop = 0
    place(180)
    await act(async () => {
      await user.click(chip('4곳'))
    })
    expect(state.scrollTop).toBe(0)
  })

  it('데스크톱 프레임 확대(zoom 1.5)에서도 같은 자리로 — 잰 상자 값을 확대 전 값으로 나눠 계산한다', async () => {
    const user = userEvent.setup()
    renderPage()

    const total = await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')
    const { state, place } = fakeLayout(total, { zoom: 1.5, scrollTop: 1200 })
    place(-300)
    await user.click(chip('3곳'))
    expect(state.scrollTop).toBe(1200 - 364)

    // 칩 줄이 막 붙은 자리 — 상태줄이 칩 줄 뒤(확대 전 40)에 가려 있으면 보이게 내린다
    state.scrollTop = 150
    place(40)
    await user.click(chip('4곳'))
    expect(state.scrollTop).toBe(150 - 24)
  })

  it('상태줄은 읽기 도구가 바뀔 때 읽는 자리(role="status") — 칩을 누르면 새 코스 수를 말한다', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')
    await user.click(chip('3곳'))
    // (테스트의 주소 표시 <output> 도 status 역할이라 글로 찾고 역할을 확인합니다)
    expect(screen.getByText('3곳 코스 2가지 · 여러 개 고를 수 있어요')).toHaveAttribute('role', 'status')
  })

  it('바로 연 화면에서 칩을 누른 뒤 「뒤로」 — 앱 밖이 아니라 홈으로(칩이 주소를 replace 해도)', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')
    await user.click(chip('3곳'))
    await user.click(screen.getByRole('button', { name: '뒤로' }))
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
    expect(screen.getByTestId('loc').textContent).toBe('/')
  })

  it('앞 화면이 있으면(history idx > 0) 「뒤로」는 그 화면으로', async () => {
    const user = userEvent.setup()
    window.history.replaceState({ idx: 1 }, '')
    try {
      renderPage('/courses', { entries: ['/course-map', '/courses'] })

      await screen.findByText('대표 코스 3가지 · 여러 개 고를 수 있어요')
      await user.click(chip('3곳'))
      await user.click(screen.getByRole('button', { name: '뒤로' }))
      expect(screen.getByText('지도 화면')).toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '')
    }
  })

  it('칩으로 거르면 「저장한 코스 N개는 빼고」도 그 칩 기준 — 뺀 코스가 다른 곳 수면 줄이 없다', async () => {
    const user = userEvent.setup()
    getToken.mockReturnValue('token')
    api.courses.mockResolvedValue({ ...THREE, courses: [...THREE.courses, { ...COURSE_302, courseId: 105, courseCode: '3-05' }] })
    api.savedTrips.mockResolvedValue([{ savedTripId: 9, courseId: 120 }, { savedTripId: 10, courseId: 105 }])
    try {
      renderPage()

      expect(await screen.findByText('저장한 코스 2개는 빼고 보여줘요')).toBeInTheDocument()
      await user.click(chip('3곳'))
      expect(screen.getByText('저장한 코스 1개는 빼고 보여줘요')).toBeInTheDocument()
      await user.click(chip('전체'))
      expect(screen.getByText('저장한 코스 2개는 빼고 보여줘요')).toBeInTheDocument()
    } finally {
      getToken.mockReturnValue(null)
    }
  })

  it('뺀 코스가 없는 칩에서는 「빼고 보여줘요」 줄이 없다', async () => {
    const user = userEvent.setup()
    getToken.mockReturnValue('token')
    api.courses.mockResolvedValue({ ...THREE, courses: [...THREE.courses, { ...COURSE_NO_NINE, courseId: 121, courseCode: '4-09' }] })
    api.savedTrips.mockResolvedValue([{ savedTripId: 9, courseId: 120 }])
    try {
      renderPage()

      expect(await screen.findByText('저장한 코스 1개는 빼고 보여줘요')).toBeInTheDocument()
      await user.click(chip('3곳'))
      expect(screen.queryByText(/빼고 보여줘요/)).not.toBeInTheDocument()
      await user.click(chip('4곳'))
      expect(screen.getByText('저장한 코스 1개는 빼고 보여줘요')).toBeInTheDocument()
    } finally {
      getToken.mockReturnValue(null)
    }
  })

  describe('카드 사진 — 보이는 카드 순서대로 겹치지 않게(2026-09-17)', () => {
    // 4곳 코스가 먼저 학동몽돌해변 사진을 씁니다. 3-01 도 학동으로 시작합니다.
    const FOUR_HAKDONG = {
      ...COURSE_NO_NINE,
      courseId: 140,
      title: '학동에서 시작하는 4곳 코스',
      spots: [
        spot(1, 4, '학동흑진주몽돌해변', '학동몽돌해변', 'BEACH'),
        spot(2, 1, '바람의언덕', '바람의언덕', 'VIEW'),
        spot(3, 16, '양지암조각공원', '양지암조각공원', 'EXHIBIT'),
        spot(4, 18, '거제씨월드', '거제씨월드', 'EXHIBIT'),
      ],
    }
    const photoOf = (id) => card(id).querySelector('img')?.getAttribute('src') ?? null

    beforeEach(() => {
      api.courses.mockResolvedValue({ ...THREE, courses: [FOUR_HAKDONG, COURSE_301] })
    })

    it('칩으로 거르면 거른 목록 기준으로 다시 정한다 — 가려진 카드가 사진을 선점하지 않는다', async () => {
      const user = userEvent.setup()
      renderPage()

      await screen.findByText('학동에서 시작하는 4곳 코스')
      // 전체: 4곳 코스가 학동 → 3-01 은 학동(씀) · 해금강(사진 없음) 건너 바람의언덕
      expect(photoOf(140)).toBe('https://tong.visitkorea.or.kr/hakdong.jpg')
      expect(photoOf(101)).toBe('https://tong.visitkorea.or.kr/windhill.jpg')

      await user.click(chip('3곳'))
      expect(card(140)).toBeNull()
      expect(photoOf(101)).toBe('https://tong.visitkorea.or.kr/hakdong.jpg')

      await user.click(chip('전체'))
      expect(photoOf(101)).toBe('https://tong.visitkorea.or.kr/windhill.jpg')
    })

    it('링크가 죽으면 그 사진만 「사진 없음」 — 칩으로 카드 사진이 바뀌면 새 사진은 그린다', async () => {
      const user = userEvent.setup()
      renderPage()

      await screen.findByText('학동에서 시작하는 4곳 코스')
      fireEvent.error(card(101).querySelector('img'))
      expect(within(card(101)).getByText('사진 없음 — TourAPI 사진 0장')).toBeInTheDocument()

      // 같은 카드가 자리를 지킨 채 사진 주소만 바뀝니다 — 죽은 건 바람의언덕 링크지 학동 링크가 아닙니다.
      await user.click(chip('3곳'))
      expect(photoOf(101)).toBe('https://tong.visitkorea.or.kr/hakdong.jpg')

      await user.click(chip('전체'))
      expect(card(101).querySelector('img')).toBeNull()
      expect(within(card(101)).getByText('사진 없음 — TourAPI 사진 0장')).toBeInTheDocument()
    })
  })
})

describe('CoursesPage — 배지는 축마다 색 하나(코스재설계 §5-2 · §5-3)', () => {
  /** 서버가 곧 줄 필드(§5-3) — 아직 배포 전이라 이 모양이 계약입니다. 스팟 · 노선 · 분은 테스트 값입니다. */
  const OFFICIAL = {
    ...COURSE_301,
    courseId: 201,
    featuredRank: 1,
    badgeAxis: 'OFFICIAL',
    officialCourse: { name: '당일코스', total: 6, matched: 4, orderKept: true, sourceUrl: 'https://tour.geoje.go.kr/' },
    nineScenicNos: [1, 2, 4],
  }
  const NINE = { ...COURSE_301, courseId: 202, featuredRank: 6, badgeAxis: 'NINE', officialCourse: null, nineScenicNos: [1, 2, 4, 6] }
  const THEME_VIEW = {
    ...COURSE_301,
    courseId: 203,
    featuredRank: 3,
    badgeAxis: 'THEME',
    officialCourse: null,
    nineScenicNos: [1, 2, 9],
    spots: [spot(1, 1, '바람의언덕', '바람의언덕', 'VIEW'), spot(2, 3, '해금강', '해금강', 'VIEW'), spot(3, 7, '매미성', '매미성', 'VIEW')],
  }
  const THEME_GARDEN = {
    ...THEME_VIEW,
    courseId: 204,
    featuredRank: 4,
    nineScenicNos: [5, 9],
    spots: [
      spot(1, 10, '거제식물원', '거제식물원', 'GARDEN'),
      spot(2, 7, '매미성', '매미성', 'VIEW'),
      spot(3, 11, '거제맹종죽테마공원', '맹종죽테마공원', 'GARDEN'),
    ],
  }
  const THEME_CRUISE = {
    ...THEME_VIEW,
    courseId: 205,
    featuredRank: 5,
    nineScenicNos: [2, 3],
    ferryMinTotal: 160,
    spots: [
      spot(1, 2, '도장포유람선', '도장포유람선', 'CRUISE'),
      spot(2, 5, '외도보타니아', '외도보타니아', 'CRUISE'),
      spot(3, 1, '바람의언덕', '바람의언덕', 'VIEW'),
    ],
  }
  const badgeOf = (id) => card(id).querySelector(`.${styles.badge}`)
  const show = (...courses) => api.courses.mockResolvedValue({ courses })

  it('OFFICIAL — 「거제시 당일코스의 4곳」 + 원문 순서를 지켰으면 「원문 순서 그대로」', async () => {
    show(OFFICIAL)
    renderPage()

    await screen.findByText('거제시 당일코스의 4곳')
    expect(within(badgeOf(201)).getByText('원문 순서 그대로')).toBeInTheDocument()
  })

  it('OFFICIAL — 순서가 원문과 다르면 「원문 순서 그대로」를 적지 않는다', async () => {
    show({ ...OFFICIAL, officialCourse: { ...OFFICIAL.officialCourse, name: '2일코스', matched: 6, orderKept: false } })
    renderPage()

    await screen.findByText('거제시 2일코스의 6곳')
    expect(screen.queryByText('원문 순서 그대로')).not.toBeInTheDocument()
  })

  it('9경이 든 코스라도 축이 OFFICIAL · THEME 이면 9경 도장을 함께 그리지 않는다 — 한 카드에 축 색은 하나', async () => {
    show(OFFICIAL, THEME_VIEW)
    renderPage()

    await screen.findByText('거제시 당일코스의 4곳')
    expect(within(card(201)).queryByText(/^거제 9경/)).not.toBeInTheDocument()
    expect(within(card(203)).queryByText(/^거제 9경/)).not.toBeInTheDocument()
    expect(card(201).querySelectorAll(`.${styles.badge}`)).toHaveLength(1)
  })

  it('NINE — 9경 도장(읽기 도구 「거제 9경 1경 2경 4경 6경」)', async () => {
    show(NINE)
    renderPage()

    await screen.findByText('거제 9경 1경 2경 4경 6경')
    expect([...badgeOf(202).querySelectorAll('[data-no]')].map((e) => e.textContent)).toEqual(['1', '2', '4', '6'])
  })

  it('THEME — 분류가 전부 같으면 「전망·명소만」 · 분류 아이콘', async () => {
    show(THEME_VIEW)
    renderPage()

    await screen.findByText('전망·명소만')
    expect(badgeOf(203).querySelector('path')).toHaveAttribute('d', ICON_PATHS.VIEW)
  })

  it('THEME — 분류가 둘이면 많은 쪽부터 「정원·숲 2곳과 전망·명소 1곳」 · 많은 쪽 아이콘', async () => {
    show(THEME_GARDEN)
    renderPage()

    await screen.findByText('정원·숲 2곳과 전망·명소 1곳')
    expect(badgeOf(204).querySelector('path')).toHaveAttribute('d', ICON_PATHS.GARDEN)
  })

  it('THEME — 둘이 같은 수면 가는 순서대로', async () => {
    show({ ...THEME_GARDEN, courseId: 206, spots: THEME_GARDEN.spots.slice(1) })
    renderPage()

    expect(await screen.findByText('전망·명소 1곳과 정원·숲 1곳')).toBeInTheDocument()
  })

  it('THEME — 유람선이 들면 유람선 아이콘', async () => {
    show(THEME_CRUISE)
    renderPage()

    await screen.findByText('섬·유람선 2곳과 전망·명소 1곳')
    expect(badgeOf(205).querySelector('path')).toHaveAttribute('d', ICON_PATHS.CRUISE)
  })

  it('폴백 — badgeAxis 가 없는 옛 응답이면 지금처럼 9경 도장만', async () => {
    show(COURSE_301)
    renderPage()

    await screen.findByText('거제 9경 1경 2경 4경')
    expect(within(card(101)).queryByText(/^거제시/)).not.toBeInTheDocument()
  })

  it('폴백 — 축 값을 그릴 수 없으면(OFFICIAL 인데 officialCourse 없음 · 분류 셋 이상) 9경 도장으로', async () => {
    show(
      { ...OFFICIAL, officialCourse: null },
      {
        ...THEME_GARDEN,
        courseId: 207,
        spots: [...THEME_GARDEN.spots, spot(4, 4, '학동흑진주몽돌해변', '학동몽돌해변', 'BEACH'), spot(5, 12, '포로수용소', '포로수용소', 'HISTORY')],
      },
    )
    renderPage()

    await screen.findByText('거제 9경 1경 2경 4경')
    expect(within(card(207)).getByText('거제 9경 5경 9경')).toBeInTheDocument()
  })

  it('폴백 — officialCourse 에 코스 이름 · 겹치는 곳 수가 없으면 9경 도장으로(「거제시 undefined의 undefined곳」 금지)', async () => {
    // 서버 필드는 아직 배포 전이라 이름이 어긋나거나 빠질 수 있다 — 값 없이 문장 틀만 남기지 않는다(절대규칙 3)
    show(
      { ...OFFICIAL, officialCourse: { total: 6, orderKept: true, sourceUrl: 'x' } },
      { ...OFFICIAL, courseId: 208, nineScenicNos: [5], officialCourse: { ...OFFICIAL.officialCourse, matched: 0 } },
    )
    renderPage()

    await screen.findByText('거제 9경 1경 2경 4경')
    expect(within(card(208)).getByText('거제 9경 5경')).toBeInTheDocument()
    // 페이지 출처 줄(「… 거제시 BIS 원문 기준」)에도 「거제시」가 있어 카드 안만 본다
    for (const id of [201, 208]) {
      expect(within(card(id)).queryByText(/undefined|^거제시/)).not.toBeInTheDocument()
    }
    expect(screen.queryByText('원문 순서 그대로')).not.toBeInTheDocument()
  })
})
