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
  { poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', region: '남부권', category: '언덕·전망', imageUrl: null, likeCount: 12, liked: false },
  { poiId: 20, name: '거제조선해양문화관', shortName: '조선해양문화관', theme: 'EXHIBIT', region: '동부권', category: '전시', imageUrl: null, likeCount: 0, liked: false },
]

// 서버 순서 = T맵 인기순(기준문서 §6 「맛집 · 숙소」). 화면은 그 순서를 바꾸지 않는다.
const FOOD = [
  { placeId: 901, kind: 'FOOD', name: '대박난맛집', category: '문어해물칼국수', imageUrl: 'https://tong.visitkorea.or.kr/a.jpg',
    grade: null, restDay: '연중무휴', nearSpot: { poiId: 4, shortName: '학동몽돌해변', distanceM: 429 } },
  { placeId: 909, kind: 'FOOD', name: '거제멸치쌈밥', category: '멸치쌈밥정식 A코스', imageUrl: null,
    grade: null, restDay: '매월 두번째·네번째 수요일', nearSpot: { poiId: 20, shortName: '조선해양문화관', distanceM: 120 },
    nineTasteNos: [6] },
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

  /**
   * 거제 9미(2026-09-20 사용자 결정) — 근거는 서버 V47(거제시 9미 목록 × TourAPI 대표메뉴 · 가게 이름).
   * 배지 글자는 「거제 9미」 하나다 — 어느 음식인지는 상세가 말한다(코스재설계 §5-2 배지 원칙).
   * ⚠️ 「거제 9미란?」 **설명 화면은 나중에 따로 만든다**(사용자) — 목록에 그걸 여는 줄을 두지 않는다.
   */
  it('9미인 맛집 카드에만 「거제 9미」 배지가 붙는다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '맛집' }))

    const melchi = await screen.findByRole('button', { name: /거제멸치쌈밥/ })
    expect(within(melchi).getByText('거제 9미')).toBeInTheDocument()
    // 9미가 아닌 곳에는 붙지 않는다 — 원문이 9미라고 말하지 않는다
    const daebak = screen.getByRole('button', { name: /대박난맛집/ })
    expect(within(daebak).queryByText('거제 9미')).not.toBeInTheDocument()
  })

  it('9미를 설명하는 줄은 목록에 두지 않는다 — 설명 화면은 나중에 따로 만든다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('tab', { name: '맛집' }))
    await screen.findByRole('button', { name: /대박난맛집/ })
    expect(screen.queryByRole('button', { name: /거제 9미란/ })).not.toBeInTheDocument()
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

/** 스팟 하트(2026-09-21 사용자 결정 · 부록 Q) — 카드에는 수만 보이고 누를 수 없다. 0 도 「♥ 0」. 누르는 자리는 스팟 상세뿐이다. */
describe('스팟 탭 — 하트 수', () => {
  /**
   * 자리는 2026-09-21 저녁에 바뀌었다(부록 Q 「자리를 고쳤다」) — 「권역 · 분류」 줄 오른쪽 끝에서 **사진 왼쪽 아래**로.
   * 글줄을 건드리지 않아 분류가 두 줄인 카드(외도보타니아 「동부권 · 식물원 · 유람선」)에서도 수가 안 밀린다.
   */
  it('격자 카드의 수는 사진 위에 얹힌다 — 0 도 보이고, 카드 안에 누를 것은 없다', async () => {
    renderPage()

    const wind = await screen.findByRole('button', { name: /바람의언덕/ })
    const count = within(wind).getByRole('img', { name: '하트 12' })
    expect(count).toHaveTextContent('12')
    expect(wind.querySelector('img').parentElement).toContainElement(count) // 사진 칸 안이다
    expect(within(wind).getByText(/남부권/)).not.toContainElement(count) // 글줄에는 없다

    const museum = screen.getByRole('button', { name: /조선해양문화관/ })
    expect(within(museum).getByRole('img', { name: '하트 0' })).toHaveTextContent('0')
    expect(within(wind).queryByRole('button')).not.toBeInTheDocument()
  })

  it('크게 보기 카드도 사진 위에 — 오른쪽 아래 9경 배지와 좌우로 갈린다', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /바람의언덕/ })

    await user.click(screen.getByRole('button', { name: '크게 보기' }))

    const wind = await screen.findByRole('button', { name: /바람의언덕/ })
    const count = within(wind).getByRole('img', { name: '하트 12' })
    expect(count).toHaveTextContent('12')
    expect(wind.querySelector('img').parentElement).toContainElement(count)
  })

  it('추천순은 하트 많은 순이다 — 서버 순서가 반대여도', async () => {
    loadVisibleSpots.mockResolvedValue([SPOTS[1], SPOTS[0]])
    renderPage()

    const cards = await screen.findAllByRole('button', { name: /바람의언덕|조선해양문화관/ })
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining('바람의언덕'),
      expect.stringContaining('조선해양문화관'),
    ])
  })

  /**
   * 2026-09-22 사용자 — 「내가 하트 누른 경우는 스팟에서 하트가 빨간색으로 칠해져 있어야 하는데 그렇지 않다」.
   * 카드는 `liked` 를 아예 넘기지 않아 **눌렀어도 늘 빈 하트**였습니다. 수(모두의 것)와 달리
   * 채운 빨간 하트는 **보는 사람이 눌렀는가**를 말합니다. 누를 수 없는 것은 그대로입니다.
   */
  it('내가 누른 하트는 카드에서도 채워져 빨갛다 — 안 누른 것은 빈 하트', async () => {
    loadVisibleSpots.mockResolvedValue([{ ...SPOTS[0], liked: true }, SPOTS[1]])
    renderPage()

    const wind = await screen.findByRole('button', { name: /바람의언덕/ })
    const mine = within(wind).getByRole('img', { name: '하트 12' })
    expect(mine.querySelector('svg')).toHaveAttribute('fill', 'currentColor')
    expect(mine.className).toContain('filled')

    const museum = screen.getByRole('button', { name: /조선해양문화관/ })
    const others = within(museum).getByRole('img', { name: '하트 0' })
    expect(others.querySelector('svg')).toHaveAttribute('fill', 'none')
    expect(others.className).not.toContain('filled')
  })

  it('likeCount 가 없는 옛 응답이면 수를 그리지 않는다', async () => {
    const old = SPOTS.map((spot) => Object.fromEntries(Object.entries(spot).filter(([key]) => key !== 'likeCount' && key !== 'liked')))
    loadVisibleSpots.mockResolvedValue(old)
    renderPage()

    const wind = await screen.findByRole('button', { name: /바람의언덕/ })
    expect(within(wind).queryByRole('img', { name: /하트/ })).not.toBeInTheDocument()
  })
})
