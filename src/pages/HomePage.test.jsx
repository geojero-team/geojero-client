import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { loadSpotDetail } from '../lib/spots'
import { peekHeightOf } from '../components/spotSheetHeight'
import HomePage from './HomePage'

vi.mock('../lib/api', () => ({
  api: {
    pois: vi.fn(),
    getVisitorPhotos: vi.fn(),
    me: vi.fn(),
    places: vi.fn(),
    place: vi.fn(),
    likePlace: vi.fn(),
    unlikePlace: vi.fn(),
    getPlaceVisitorPhotos: vi.fn(() => Promise.resolve({ count: 0, photos: [] })),
  },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/spots', () => ({ loadSpotDetail: vi.fn(), loadVisibleSpots: vi.fn(() => Promise.resolve([])) }))

// 맛집 · 숙소 상세의 위치 지도도 카카오라 jsdom 에서 뜨지 않습니다.
vi.mock('../components/PlaceMap', () => ({ default: () => null }))

// 카카오 지도는 jsdom에서 뜨지 않습니다. 받은 핀을 버튼으로 그려 누를 수 있게만 합니다.
let mapProps = null
vi.mock('../components/MapView', () => ({
  default: (props) => {
    mapProps = props
    return (
      <div data-testid="map">
        {props.spots.map((s) => (
          <button key={s.spotId} type="button" onClick={() => props.onSelectSpot(s)}>
            {`핀 ${s.shortName ?? s.name}`}
          </button>
        ))}
      </div>
    )
  },
}))

const POIS = [
  { poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', kind: 'SPOT', theme: 'BEACH', region: '남부권', category: '해수욕장', lat: 34.77, lng: 128.64, imageUrl: null, nineScenicNo: 4 },
  { poiId: 12, name: '명사해수욕장', shortName: '명사해수욕장', kind: 'SPOT', theme: null, lat: 34.72, lng: 128.6, imageUrl: null },
  { poiId: 23, name: '고현터미널', shortName: '고현터미널', kind: 'TERMINAL', theme: null, region: null, category: null, lat: 34.8906148, lng: 128.6242507, imageUrl: null },
  // 9경 번호는 서버가 줍니다(/api/pois nineScenicNo, V28). 해금강은 9경 링크 확인용 — 뒤에 붙여 위 index(POIS[2])를 흔들지 않습니다.
  { poiId: 3, name: '해금강', shortName: '해금강', kind: 'SPOT', theme: 'VIEW', region: '남부권', category: '언덕·전망', lat: 34.7333, lng: 128.6839, imageUrl: null, nineScenicNo: 1 },
]

const STAYS = [
  { placeId: 2578495, kind: 'STAY', name: '소노캄 거제', category: '콘도', imageUrl: 'https://tong.visitkorea.or.kr/a.jpg', grade: null, restDay: null, nearSpot: null, lat: 34.8433682, lng: 128.7029354 },
  { placeId: 976736, kind: 'STAY', name: '호텔상상', category: '2성 호텔', imageUrl: null, grade: 2, restDay: null, nearSpot: null, lat: 34.8475732, lng: 128.7098527 },
]
const FOODS = [
  { placeId: 2783696, kind: 'FOOD', name: '대박난맛집', category: '문어해물칼국수', imageUrl: null, grade: null, restDay: '연중무휴', nearSpot: null, lat: 34.7721525, lng: 128.6380248 },
]
const CAFES = [
  { placeId: 2783404, kind: 'CAFE', name: '심해', category: '아이스크림 라떼', imageUrl: null, grade: null, restDay: '연중무휴', nearSpot: null, lat: 34.9666431, lng: 128.7059415 },
]

beforeEach(() => {
  vi.clearAllMocks()
  mapProps = null
  // 튜토리얼을 이미 본 기기 — 말풍선 확인용(첫 방문이면 튜토리얼이 먼저라 말풍선을 띄우지 않는다)
  localStorage.setItem('gj_onboarded_v1', '2026-09-19')
  sessionStorage.clear() // 말풍선은 탭마다 한 번 — 테스트마다 새 탭
  api.pois.mockResolvedValue({ pois: POIS })
  api.places.mockImplementation((kind) =>
    Promise.resolve({ places: { STAY: STAYS, FOOD: FOODS, CAFE: CAFES }[kind] ?? [] }),
  )
  api.place.mockResolvedValue({
    placeId: 2578495, kind: 'STAY', name: '소노캄 거제', category: '콘도', grade: null, lat: 34.8433682, lng: 128.7029354,
    bookingUrl: 'https://www.yeogi.com/domestic-accommodations/6605', nearSpots: [],
    detail: { source: 'TourAPI', address: '경상남도 거제시 일운면 거제대로 2660', images: [], checkIn: '15:00', checkOut: '11:00' },
  })
  api.getVisitorPhotos.mockResolvedValue({ poiId: 23, count: 0, photos: [] })
  loadSpotDetail.mockResolvedValue({ ...POIS[2], photos: [] })
})

describe('홈 지도 — 고현터미널(출발 지점)', () => {
  it('화면 스팟과 함께 고현터미널을 지도에 넘기고, theme 없는 스팟은 넘기지 않는다', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '핀 고현터미널' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '핀 학동몽돌해변' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '핀 명사해수욕장' })).not.toBeInTheDocument()
    const terminal = mapProps.spots.find((s) => s.poiId === 23)
    expect(terminal).toMatchObject({ spotId: 23, kind: 'TERMINAL', lat: 34.8906148, lng: 128.6242507 })
  })

  it('누르면 스팟처럼 시트가 올라오고 지도는 터미널 시트 높이만큼 줄어든다', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '핀 고현터미널' }))

    const sheet = screen.getByRole('dialog', { name: '고현터미널' })
    expect(sheet).toHaveTextContent('모든 코스의 출발 지점')
    expect(mapProps.selectedSpotId).toBe(23)
    expect(screen.getByTestId('map').parentElement.style.bottom).toBe(`${peekHeightOf(POIS[2])}px`)
  })
})

describe('홈 — 거제9경(2026-09-14)', () => {
  function LocationProbe() {
    const location = useLocation()
    return <output data-testid="loc">{location.pathname + location.search}</output>
  }

  const renderHome = (entry = '/') =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <HomePage />
        <LocationProbe />
      </MemoryRouter>,
    )

  it('9경 스팟에만 몇 경인지 붙여 지도에 넘기고, 9경 핀의 스팟 시트에는 배지가 붙는다', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    expect(mapProps.spots.find((s) => s.poiId === 4).nineScenic).toBe(4)
    expect(mapProps.spots.find((s) => s.poiId === 23).nineScenic).toBeNull()

    await user.click(screen.getByRole('button', { name: '핀 학동몽돌해변' }))
    expect(screen.getByRole('dialog', { name: '학동몽돌해변' })).toHaveTextContent('거제9경 · 4경')
  })

  it('목록의 9경 이름은 스팟 상세로 가는 링크다 — 앱에 없는 곳만 링크가 아니다', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    await user.click(screen.getByRole('button', { name: '몽꾸' }))
    await user.click(screen.getByRole('button', { name: '거제 9경이 뭘까?' }))
    // 말풍선 다음은 **9경 설명** 두 단계입니다(2026-09-19) — 넘겨야 목록 시트가 나옵니다.
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    const dialog = screen.getByRole('dialog', { name: '거제 9경' })
    // 설명 세 문장은 투어가 말하므로 시트에서 뺐습니다 — 시트는 범례와 목록을 맡습니다.
    expect(dialog).not.toHaveTextContent('2024년')
    expect(dialog).toHaveTextContent('보라색 테두리')
    expect(screen.getByTestId('loc')).toHaveTextContent('/?nine=1')

    // 링크 주소는 서버 목록의 9경 번호(nineScenicNo)에서 온다 — 앱에 poiId 를 박지 않는다
    expect(within(dialog).getByRole('link', { name: '1경 거제해금강 상세 보기' })).toHaveAttribute('href', '/spots/3')
    expect(within(dialog).getByRole('link', { name: '4경 학동흑진주몽돌해변 상세 보기' })).toHaveAttribute('href', '/spots/4')
    // 목록에 번호가 없는 곳은 링크가 아니고 이유를 말한다(이 목 데이터에는 1경 · 4경만 있다)
    expect(within(dialog).queryByRole('link', { name: /동백섬 지심도/ })).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('지도에 없음')).toHaveLength(7)

    await user.click(within(dialog).getByRole('link', { name: '4경 학동흑진주몽돌해변 상세 보기' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/spots/4')
  })

  it('상세에서 뒤로 오면(?nine=1) 9경 시트가 다시 열려 있다', async () => {
    renderHome('/?nine=1')
    expect(await screen.findByRole('dialog', { name: '거제 9경' })).toBeInTheDocument()
  })

  it('스팟 목록을 못 받았으면 줄이 링크도 아니고 「지도에 없음」도 적지 않는다 — 없는 걸 없다고 말하지 않는다', async () => {
    api.pois.mockRejectedValue(new Error('down'))
    renderHome('/?nine=1')
    const dialog = await screen.findByRole('dialog', { name: '거제 9경' })

    expect(within(dialog).queryAllByRole('link')).toHaveLength(0)
    expect(within(dialog).queryByText('지도에 없음')).not.toBeInTheDocument()
  })

  it('Esc 로 닫히면 주소에서 nine 이 빠지고 포커스가 몽꾸로 돌아온다(말풍선은 시트를 열면 닫힌다)', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    const opener = screen.getByRole('button', { name: '몽꾸' })
    await user.click(opener)
    await user.click(screen.getByRole('button', { name: '거제 9경이 뭘까?' }))
    // 설명 두 단계를 넘겨야 목록 시트입니다(2026-09-19).
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('heading', { name: '거제 9경' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '거제 9경' })).not.toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)
    expect(opener).toHaveFocus()
  })
})

describe('홈 — 몽꾸(거제시 캐릭터) → 말풍선 → 「거제9경이란?」(2026-09-19)', () => {
  const renderHome = () =>
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

  it('평소엔 팔을 내리고 말풍선이 없다 — 누르면 팔을 올리며 말풍선만, 말풍선을 눌러야 9경 설명', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })
    const mascot = screen.getByRole('button', { name: '몽꾸' })
    // 거제시청 공식 그림에서 나눈 세 장 — 평소 팔(반대쪽 팔을 좌우로 뒤집어 대칭) · 올리는 팔(어깨를 축으로 돈다) · 몸
    const srcs = [...mascot.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(srcs).toEqual([
      expect.stringMatching(/mongkku-arm-rest/),
      expect.stringMatching(/mongkku-arm-raise/),
      expect.stringMatching(/mongkku-body/),
    ])
    expect(mascot).toHaveAttribute('data-arm', 'down')
    expect(mascot).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: '거제 9경이 뭘까?' })).not.toBeInTheDocument()

    await user.click(mascot)
    expect(mascot).toHaveAttribute('data-arm', 'up')
    expect(mascot).toHaveAttribute('aria-expanded', 'true')
    const bubble = screen.getByRole('button', { name: '거제 9경이 뭘까?' })
    // 기다려도 저절로 열리지 않는다
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(screen.queryByRole('dialog', { name: '거제 9경' })).not.toBeInTheDocument()

    // 말풍선을 누르면 목록이 아니라 **설명**이 먼저 뜹니다(2026-09-19 사용자).
    await user.click(bubble)
    expect(screen.getByText('거제 9경이란')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '거제 9경' })).not.toBeInTheDocument()
  })

  it('몽꾸를 한 번 더 누르면 말풍선이 닫히고 팔을 내린다', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })
    const mascot = screen.getByRole('button', { name: '몽꾸' })

    await user.click(mascot)
    await user.click(mascot)
    expect(mascot).toHaveAttribute('data-arm', 'down')
    expect(screen.queryByRole('button', { name: '거제 9경이 뭘까?' })).not.toBeInTheDocument()
  })

  it('스팟 시트가 올라오면 캐릭터와 칩을 감춘다', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(await screen.findByRole('button', { name: '핀 학동몽돌해변' }))
    expect(screen.queryByRole('button', { name: '몽꾸' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: '지도에 보일 곳' })).not.toBeInTheDocument()
  })
})

/* 9경 설명(2026-09-19 사용자) — 말풍선 다음은 목록이 아니라 설명 두 단계입니다.
   전에는 시트가 「지도의 보라색 테두리 스팟이 9경이에요」라고 말하면서 그 지도를 자기가 덮고 있었습니다. */
describe('홈 — 거제9경 설명(2026-09-19)', () => {
  const renderHome = () =>
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

  const openTour = async (user) => {
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })
    await user.click(screen.getByRole('button', { name: '몽꾸' }))
    await user.click(screen.getByRole('button', { name: '거제 9경이 뭘까?' }))
  }

  it('지도를 9경 아홉 곳에만 맞추고, 두 번에 나눠 말한 뒤 목록으로 넘어간다', async () => {
    const user = userEvent.setup()
    renderHome()
    await openTour(user)

    // 1단계 — 지도는 **전체 스팟이 아니라** 9경에만 맞춥니다(기본 배율에서는 핀이 묶여 다 안 보입니다).
    expect(screen.getByText('거제 9경이란')).toBeInTheDocument()
    expect(mapProps.fitSpots.length).toBeGreaterThan(0)
    expect(mapProps.fitSpots.every((spot) => spot.nineScenic != null)).toBe(true)
    expect(screen.queryByRole('dialog', { name: '거제 9경' })).not.toBeInTheDocument()

    // 2단계 — 호흡이 길어 끊었습니다(사용자 판단). 1단계 문장은 물러납니다.
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('자신 있게 추천하는 스팟이에요!')).toBeInTheDocument()
    expect(screen.queryByText('거제 9경이란')).not.toBeInTheDocument()

    // 끝나면 목록 시트
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('dialog', { name: '거제 9경' })).toBeInTheDocument()
    expect(screen.queryByText('자신 있게 추천하는 스팟이에요!')).not.toBeInTheDocument()
  })

  it('설명이 끝나도 지도는 9경에 맞춘 그대로 둔다 — 되돌리면 방금 가리킨 화면이 사라진다', async () => {
    const user = userEvent.setup()
    renderHome()
    await openTour(user)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(mapProps.fitSpots.every((spot) => spot.nineScenic != null)).toBe(true)
  })
})

describe('홈 — 스팟 · 숙소 · 맛집 · 카페 칩(2026-09-19 · 카페는 09-20)', () => {
  function LocationProbe() {
    const location = useLocation()
    return <output data-testid="loc">{location.pathname + location.search}</output>
  }
  const renderHome = (entry = '/') =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <HomePage />
        <LocationProbe />
      </MemoryRouter>,
    )

  it('처음엔 「스팟」이 골라져 있고 맛집 · 숙소 · 카페는 부르지 않는다', async () => {
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })
    const group = screen.getByRole('radiogroup', { name: '지도에 보일 곳' })
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['관광지', '숙소', '맛집', '카페'])
    expect(within(group).getByRole('radio', { name: '관광지' })).toHaveAttribute('aria-checked', 'true')
    expect(api.places).not.toHaveBeenCalled()
  })

  it('「카페」를 누르면 카페 핀만 남고 주소에 남는다 — 상세에서 뒤로 와도 그대로', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    await user.click(screen.getByRole('radio', { name: '카페' }))

    expect(await screen.findByRole('button', { name: '핀 심해' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '핀 학동몽돌해변' })).not.toBeInTheDocument()
    expect(api.places).toHaveBeenCalledWith('CAFE')
    expect(screen.getByTestId('loc')).toHaveTextContent('/?layer=cafe')
  })

  it('주소가 ?layer=cafe 면 카페가 골라진 채로 열린다 — 상세에서 뒤로 와도 그대로', async () => {
    renderHome('/?layer=cafe')
    expect(await screen.findByRole('button', { name: '핀 심해' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '카페' })).toHaveAttribute('aria-checked', 'true')
  })

  it('「숙소」를 누르면 숙소 핀과 고현터미널만 남고, 주소에 남는다', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    await user.click(screen.getByRole('radio', { name: '숙소' }))

    expect(await screen.findByRole('button', { name: '핀 소노캄 거제' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '핀 호텔상상' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '핀 고현터미널' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '핀 학동몽돌해변' })).not.toBeInTheDocument()
    expect(api.places).toHaveBeenCalledWith('STAY')
    expect(screen.getByRole('radio', { name: '숙소' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('loc')).toHaveTextContent('/?layer=stay')
    // 숙소 · 맛집 핀에도 대표 사진을 넘긴다 — 핀은 사진을 자르지 않는 사각 액자로 그린다(mapPins)
    const pin = mapProps.spots.find((s) => s.name === '소노캄 거제')
    expect(pin).toMatchObject({ kind: 'STAY', lat: 34.8433682, lng: 128.7029354, thumbnailUrl: 'https://tong.visitkorea.or.kr/a.jpg' })
    expect(mapProps.spots.find((s) => s.name === '호텔상상').thumbnailUrl).toBeNull()
    expect(pin.spotId).not.toBe(2578495) // 스팟 poiId 와 섞이지 않게 따로 이름 붙인다
  })

  it('주소가 ?layer=food 면 맛집이 골라진 채로 열린다 — 상세에서 뒤로 와도 그대로', async () => {
    renderHome('/?layer=food')
    expect(await screen.findByRole('button', { name: '핀 대박난맛집' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '맛집' })).toHaveAttribute('aria-checked', 'true')
  })

  it('숙소 핀을 누르면 스팟처럼 시트 — 이름과 종류, 펼치면 숙소 상세', async () => {
    const user = userEvent.setup()
    renderHome('/?layer=stay')
    await user.click(await screen.findByRole('button', { name: '핀 소노캄 거제' }))

    const sheet = screen.getByRole('dialog', { name: '소노캄 거제' })
    expect(sheet).toHaveTextContent('콘도')
    expect(screen.getByTestId('map').parentElement.style.bottom).toBe(`${peekHeightOf(STAYS[0])}px`)

    await user.click(within(sheet).getAllByRole('button', { name: '자세히 보기' })[0])
    expect(await within(sheet).findByRole('heading', { name: '소노캄 거제' })).toBeInTheDocument()
    expect(api.place).toHaveBeenCalledWith(2578495)
    expect(within(sheet).getByRole('link', { name: /여기어때/ })).toHaveAttribute(
      'href',
      'https://www.yeogi.com/domestic-accommodations/6605',
    )
  })

  it('목록을 못 받으면 빈 지도로 두지 않고 이유를 말한다', async () => {
    const user = userEvent.setup()
    api.places.mockRejectedValue(new Error('down'))
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })
    await user.click(screen.getByRole('radio', { name: '맛집' }))
    expect(await screen.findByText('맛집을 불러오지 못했어요 — down')).toBeInTheDocument()
  })
})
