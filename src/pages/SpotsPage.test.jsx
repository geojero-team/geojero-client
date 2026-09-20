import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { loadVisibleSpots } from '../lib/spots'
import SpotsPage from './SpotsPage'

vi.mock('../lib/api', () => ({ api: { places: vi.fn() } }))
vi.mock('../lib/spots', () => ({ loadVisibleSpots: vi.fn() }))

const SPOTS = [
  { poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', region: '남부권', category: '언덕·전망', imageUrl: null },
  { poiId: 20, name: '거제조선해양문화관', shortName: '조선해양문화관', theme: 'EXHIBIT', region: '동부권', category: '전시', imageUrl: null },
]

// 서버 순서 = T맵 인기순(기준문서 §6 「맛집 · 숙소」). 화면은 그 순서를 바꾸지 않는다.
const FOOD = [
  { placeId: 901, kind: 'FOOD', name: '대박난맛집', category: '문어해물칼국수', imageUrl: 'https://tong.visitkorea.or.kr/a.jpg',
    grade: null, restDay: '연중무휴', nearSpot: { poiId: 4, shortName: '학동몽돌해변', distanceM: 429 } },
  { placeId: 909, kind: 'FOOD', name: '거제멸치쌈밥', category: '멸치쌈밥정식 A코스', imageUrl: null,
    grade: null, restDay: '매월 두번째·네번째 수요일', nearSpot: { poiId: 20, shortName: '조선해양문화관', distanceM: 120 } },
]

const STAY = [
  { placeId: 913, kind: 'STAY', name: '소노캄 거제', category: '콘도', imageUrl: null, grade: null, restDay: null,
    nearSpot: { poiId: 18, shortName: '거제씨월드', distanceM: 846 } },
  { placeId: 917, kind: 'STAY', name: '거제삼성호텔', category: '4성 호텔', imageUrl: null, grade: 4, restDay: null,
    nearSpot: { poiId: 13, shortName: '포로수용소', distanceM: 2498 } },
]

// 카페 7곳(2026-09-20) — 맛집과 같은 순위표 · 같은 카드 모양이다. 서버가 대표 메뉴를 category 로 준다.
const CAFE = [
  { placeId: 4070772, kind: 'CAFE', name: '씨야드', category: '씨야드라떼', imageUrl: null,
    grade: null, restDay: '연중무휴', nearSpot: { poiId: 9, shortName: '거제식물원', distanceM: 334 } },
  { placeId: 2783404, kind: 'CAFE', name: '심해', category: '아이스크림 라떼', imageUrl: null,
    grade: null, restDay: '연중무휴', nearSpot: { poiId: 7, shortName: '매미성', distanceM: 191 } },
]

function Probe() {
  return <p>{`at ${useLocation().pathname}`}</p>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/spots']}>
      <Routes>
        <Route path="/spots" element={<SpotsPage />} />
        <Route path="/spots/:id" element={<Probe />} />
        <Route path="/places/:id" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  loadVisibleSpots.mockResolvedValue(SPOTS)
  api.places.mockImplementation((kind) =>
    Promise.resolve({ places: { FOOD, STAY, CAFE }[kind] ?? [] }),
  )
})

/** 2026-09-19 사용자 결정 — 맛집 13 · 숙소 7 · 카페 7(2026-09-20)을 스팟 탭의 분류 칩 끝으로 보여준다. */
describe('스팟 탭 — 맛집 · 숙소 · 카페 칩', () => {
  it('분류 칩 끝에 「맛집」 「숙소」 「카페」가 있고, 누르기 전에는 부르지 않는다', async () => {
    renderPage()
    const bar = await screen.findByRole('tablist', { name: '분류' })
    const names = within(bar).getAllByRole('tab').map((tab) => tab.textContent)
    expect(names.slice(-3)).toEqual(['맛집', '숙소', '카페'])
    expect(api.places).not.toHaveBeenCalled()
  })

  /* 카페는 맛집과 같은 카드다 — TourAPI 분류가 같은 음식점(39)이라 대표 메뉴 · 쉬는 날이 같은 자리에 온다.
     가까운 스팟이 걸어갈 거리인 것이 카페를 넣은 이유다(씨야드 → 거제식물원 330m). */
  it('「카페」를 누르면 인기순 카페 카드가 나오고, 대표 메뉴 · 가까운 스팟 · 쉬는 날을 말한다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '카페' }))

    const cards = await screen.findAllByRole('button', { name: /씨야드|심해/ })
    expect(cards.map((card) => card.querySelector('h3')?.textContent)).toEqual(['씨야드', '심해'])
    expect(api.places).toHaveBeenCalledWith('CAFE')

    const seayard = screen.getByRole('button', { name: /씨야드/ })
    expect(seayard).toHaveTextContent('씨야드라떼')
    expect(seayard).toHaveTextContent('거제식물원에서 직선 약 330m')
    expect(seayard).toHaveTextContent('쉬는 날 연중무휴')
  })

  it('「맛집」을 누르면 서버 순서 그대로 맛집 카드가 나오고 스팟 카드는 사라진다', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /바람의언덕/ })

    await user.click(screen.getByRole('tab', { name: '맛집' }))

    const cards = await screen.findAllByRole('button', { name: /대박난맛집|거제멸치쌈밥/ })
    expect(cards.map((card) => card.querySelector('h3')?.textContent)).toEqual(['대박난맛집', '거제멸치쌈밥'])
    expect(api.places).toHaveBeenCalledWith('FOOD')
    expect(screen.queryByRole('button', { name: /바람의언덕/ })).not.toBeInTheDocument()
  })

  it('카드는 대표 메뉴 · 가까운 스팟과의 직선거리 · 쉬는 날을 말한다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '맛집' }))

    const card = await screen.findByRole('button', { name: /거제멸치쌈밥/ })
    expect(card).toHaveTextContent('멸치쌈밥정식 A코스')
    expect(card).toHaveTextContent('조선해양문화관에서 직선 약 120m')
    expect(card).toHaveTextContent('쉬는 날 매월 두번째·네번째 수요일')
    expect(await screen.findByRole('button', { name: /대박난맛집/ })).toHaveTextContent('학동몽돌해변에서 직선 약 430m')
  })

  it('「숙소」는 등급(있으면)을 말하고 쉬는 날 줄이 없다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '숙소' }))

    const hotel = await screen.findByRole('button', { name: /거제삼성호텔/ })
    expect(hotel).toHaveTextContent('4성 호텔')
    expect(hotel).toHaveTextContent('포로수용소에서 직선 약 2.5km')
    expect(hotel).not.toHaveTextContent('쉬는 날')
    expect(api.places).toHaveBeenCalledWith('STAY')
  })

  it('맛집 · 숙소에서는 찾기 · 정렬 도구를 두지 않는다(19곳뿐이고 순서가 곧 인기순이다)', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('searchbox')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '맛집' }))
    await screen.findByRole('button', { name: /대박난맛집/ })
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('카드를 누르면 /places/:id 로 간다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '숙소' }))
    await user.click(await screen.findByRole('button', { name: /소노캄 거제/ }))
    expect(screen.getByText('at /places/913')).toBeInTheDocument()
  })

  it('불러오기에 실패하면 이유를 말한다 — 빈 목록으로 두지 않는다', async () => {
    api.places.mockRejectedValue(new Error('HTTP 502'))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '맛집' }))
    expect(await screen.findByText(/맛집을 불러오지 못했어요/)).toBeInTheDocument()
    // 실패가 다음 호출을 부르지 않는다(무한 재시도 금지)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(api.places).toHaveBeenCalledTimes(1)
  })

  it('다시 분류 칩(전체)을 누르면 스팟 목록으로 돌아온다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '맛집' }))
    await screen.findByRole('button', { name: /대박난맛집/ })
    await user.click(screen.getByRole('tab', { name: '전체' }))
    expect(await screen.findByRole('button', { name: /바람의언덕/ })).toBeInTheDocument()
  })
})
