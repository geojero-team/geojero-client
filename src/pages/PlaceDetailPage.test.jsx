import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import PlaceDetailPage from './PlaceDetailPage'

vi.mock('../lib/api', () => ({ api: { place: vi.fn() } }))
// 위치 지도 — 카카오 지도 도구는 테스트에서 오지 않는다(지도 자체는 PlaceMap.test). 스팟 사진은 스팟 목록에서 꺼낸다.
vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn(() => new Promise(() => {})) }))
vi.mock('../lib/spots', () => ({
  loadVisibleSpots: vi.fn(() =>
    Promise.resolve([{ poiId: 18, shortName: '거제씨월드', theme: 'EXHIBIT', thumbnailUrl: 'https://tong.visitkorea.or.kr/seaworld.jpg' }]),
  ),
}))

const FOOD = {
  placeId: 909, kind: 'FOOD', name: '거제멸치쌈밥', category: '멸치쌈밥정식 A코스', grade: null, lat: 34.827, lng: 128.705,
  nineTasteNos: [6], // 거제 9미 6미 멸치쌈밥&회무침 (서버 V47)
  // 가까운 우리 스팟 — 5km 안에서 가까운 순으로 최대 3곳(서버가 TourAPI 좌표로 계산한다).
  nearSpots: [
    { poiId: 20, shortName: '조선해양문화관', distanceM: 120, lat: 34.8245, lng: 128.7044 },
    { poiId: 18, shortName: '거제씨월드', distanceM: 140, lat: 34.8201, lng: 128.7002 },
  ],
  detail: {
    source: 'TourAPI',
    address: '경상남도 거제시 일운면 지세포해안로 12',
    images: ['https://tong.visitkorea.or.kr/a.jpg', 'https://tong.visitkorea.or.kr/b.jpg'],
    overview: '멸치쌈밥 원문 소개.',
    tel: '055-681-1234',
    parking: '가능',
    menu: '멸치쌈밥정식 A코스',
    openTime: '10:30~20:30\n준비시간 15:00~17:00',
    restDay: '매월 두번째·네번째 수요일',
    menus: '멸치쌈밥정식 B코스 / 멸치회무침 등', // 서버가 보내도 그리지 않는다
  },
}

const STAY = {
  placeId: 913, kind: 'STAY', name: '소노캄 거제', category: '콘도', grade: null, lat: 34.81, lng: 128.69,
  nearSpots: [{ poiId: 18, shortName: '거제씨월드', distanceM: 846, lat: 34.8201, lng: 128.7002 }],
  // 예약 링크는 우리가 고른 값이다(TourAPI 에 없다 — 7곳 중 공식 예약 주소가 있는 곳은 하나뿐). TourAPI 가 실패해도 남는다.
  bookingUrl: 'https://www.yeogi.com/domestic-accommodations/6605',
  detail: {
    source: 'TourAPI', address: '경상남도 거제시 일운면 거제대로 2660', images: [],
    overview: '소노캄 거제는 최상의 서비스를 제공하고자 한다.',
    tel: '1588-4888', parking: '가능', checkIn: '15:00', checkOut: '11:00', roomCount: '508실',
    facilities: '사우나 / 산책로 / 노래방',
    reservationUrl: 'https://www.sonohotelsresorts.com',
  },
}

const FALLBACK = { source: 'FALLBACK', reason: '관광정보 확인 실패', checkedAt: '2026-09-19T08:00:00Z' }

function Probe() {
  return <p>{`at ${useLocation().pathname}`}</p>
}

function renderPage(id) {
  return render(
    <MemoryRouter initialEntries={['/spots', `/places/${id}`]} initialIndex={1}>
      <Routes>
        <Route path="/places/:placeId" element={<PlaceDetailPage />} />
        <Route path="/spots" element={<Probe />} />
        <Route path="/spots/:id" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  api.place.mockImplementation((id) => Promise.resolve(Number(id) === 909 ? FOOD : STAY))
})

describe('맛집 · 숙소 상세 — 머리', () => {
  /* 읍면은 2026-09-20 에 뺐다(사용자) — 바로 아래 「위치」에 주소 전문이 있어 같은 말을 두 번 했다.
     숙소 · 맛집 · 카페 모두 종류(또는 대표 메뉴)만 적는다. */
  it('이름 아래 한 줄: 숙소는 종류 · 등급만 — 읍면을 붙이지 않는다', async () => {
    renderPage(913)
    expect(await screen.findByRole('heading', { level: 1, name: '소노캄 거제' })).toBeInTheDocument()
    expect(api.place).toHaveBeenCalledWith('913')
    expect(screen.getByText('콘도')).toBeInTheDocument()
    // 「위치」의 주소 줄에는 읍면이 그대로 있다 — 부제에만 없어야 한다
    expect(screen.queryByText('콘도 · 일운면')).not.toBeInTheDocument()
  })

  it('이름 아래 한 줄: 맛집은 대표 메뉴만 — 메뉴 줄을 따로 두지 않는다', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('멸치쌈밥정식 A코스')).toBeInTheDocument()
    expect(screen.getAllByText(/멸치쌈밥정식 A코스/)).toHaveLength(1)
  })

  /** 거제 9미 배지(2026-09-20) — 배지 글자는 카드와 같은 「거제 9미」이고,
   *  상세는 자리가 넓으니 어느 음식인지를 **거제시 원문 이름 그대로** 이어 적는다. */
  it('9미인 맛집은 이름 아래에 「거제 9미」 배지와 음식 이름이 붙는다', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('거제 9미')).toBeInTheDocument()
    expect(screen.getByText('거제멸치쌈밥&회무침')).toBeInTheDocument()
  })

  it('9미가 아닌 숙소에는 배지가 없다', async () => {
    renderPage(913)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText('거제 9미')).not.toBeInTheDocument()
  })

  it('숙소 — 체크인 · 체크아웃과 부대시설 칩(TourAPI 원문을 「/」로 나눈 것)', async () => {
    renderPage(913)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('체크인 15:00 · 체크아웃 11:00')).toBeInTheDocument()
    const chips = screen.getByRole('list', { name: '부대시설' })
    expect(within(chips).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['사우나', '산책로', '노래방'])
  })

  it('맛집 영업시간 — 본 시간 한 줄 + 쉬는 날이 보이고, 준비시간 · 마지막 주문은 펼쳐야 보인다(네이버 · 카카오 장소 화면처럼)', async () => {
    const user = userEvent.setup()
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('10:30~20:30')).toBeInTheDocument()
    expect(screen.getByText('쉬는 날 매월 두번째·네번째 수요일')).toBeInTheDocument()
    expect(screen.queryByText('준비시간 15:00~17:00')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: /10:30~20:30/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('준비시간 15:00~17:00')).toBeInTheDocument()
  })

  it('영업시간이 한 줄뿐이면 펼칠 것이 없다 — 누르는 줄로 만들지 않는다', async () => {
    api.place.mockResolvedValue({ ...FOOD, detail: { ...FOOD.detail, openTime: '08:00~17:00' } })
    renderPage(909)
    expect(await screen.findByText('08:00~17:00')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /08:00~17:00/ })).not.toBeInTheDocument()
  })

  it('맛집에는 메뉴 칩을 두지 않는다 — 메뉴판 이미지가 TourAPI 에 없고, 글자 목록은 쓸모가 없다(2026-09-19 사용자)', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('list', { name: '메뉴' })).not.toBeInTheDocument()
    expect(screen.queryByText('멸치회무침 등')).not.toBeInTheDocument()
  })

  it('정보가 많지 않게 — 전화 · 주차 · 객실 수 · 정류장은 두지 않는다', async () => {
    renderPage(913)
    await screen.findByRole('heading', { level: 1 })
    for (const gone of ['1588-4888', '508실', /주차/, /정류장/, /쉬는 날/]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument()
    }
  })

  it('사진은 TourAPI 출처를 달고, 여러 장이면 장수를 말한다 — 둘 다 사진 칸 안 아래에 띄운다', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    const hero = document.querySelector('img[src="https://tong.visitkorea.or.kr/a.jpg"]').closest('[data-hero]')
    expect(hero).toContainElement(screen.getByText('출처 TourAPI'))
    expect(hero).toContainElement(screen.getByText('1 / 2'))
  })

  it('사진이 0장이면 자리그림과 그 사실을 말한다 — 빈칸으로 두지 않는다', async () => {
    renderPage(913)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('사진 없음 — TourAPI 사진 0장')).toBeInTheDocument()
  })
})

describe('맛집 · 숙소 상세 — 사진 넘기기: 스팟처럼 마지막 장에서 더 넘기면 첫 장 (2026-09-19)', () => {
  /** jsdom 은 크기 · 스크롤이 없어 트랙 폭과 scrollTo 를 흉내 내고, 지금 몇 번째 장인지 스크롤 위치로 맞춥니다. */
  async function trackAt(index) {
    renderPage(909)
    const track = await screen.findByRole('group', { name: '사진 2장 — 좌우로 넘겨보세요' })
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 390 })
    track.scrollTo = vi.fn()
    track.scrollLeft = index * 390
    fireEvent.scroll(track)
    return track
  }

  it('키보드 → — 마지막 장이면 첫 장으로', async () => {
    const track = await trackAt(1)
    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('손가락으로 마지막 장을 왼쪽으로 밀면 첫 장으로 — 마지막 장이 아니면 브라우저에 맡긴다', async () => {
    const track = await trackAt(0)
    fireEvent.touchStart(track, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 200, clientY: 104 }] })
    expect(track.scrollTo).not.toHaveBeenCalled()

    track.scrollLeft = 390
    fireEvent.scroll(track)
    fireEvent.touchStart(track, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 200, clientY: 104 }] })
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('마우스로 마지막 장을 끌어도 첫 장으로', async () => {
    const track = await trackAt(1)
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 780 })
    track.getBoundingClientRect = () => ({ width: 390 })
    track.setPointerCapture = vi.fn()
    fireEvent.pointerDown(track, { pointerType: 'mouse', clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(track, { pointerType: 'mouse', clientX: 200, pointerId: 1 })
    fireEvent.pointerUp(track, { pointerType: 'mouse', clientX: 200, pointerId: 1 })
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('장수 칩이 넘긴 장을 따라간다', async () => {
    await trackAt(1)
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })
})

describe('맛집 · 숙소 상세 — 위치 · 가까운 스팟', () => {
  it('「위치」 구획: 지도(누르면 카카오맵에서 크게) 아래에 주소', async () => {
    renderPage(913)
    const section = (await screen.findByRole('heading', { level: 2, name: '위치' })).closest('section')
    const map = within(section).getByRole('link', { name: /소노캄 거제 위치를 카카오맵에서/ })
    expect(map).toHaveAttribute('href', `https://map.kakao.com/link/map/${encodeURIComponent('소노캄 거제')},34.81,128.69`)
    const address = within(section).getByText('경상남도 거제시 일운면 거제대로 2660')
    expect(map.compareDocumentPosition(address) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('「가까운 스팟」 구획: 스팟마다 이름 · 직선거리, 누르면 그 스팟 상세', async () => {
    const user = userEvent.setup()
    renderPage(909)
    const section = (await screen.findByRole('heading', { level: 2, name: '가까운 스팟' })).closest('section')
    expect(within(section).getByText('직선 약 120m')).toBeInTheDocument()
    expect(within(section).getByText('직선 약 140m')).toBeInTheDocument()
    await user.click(within(section).getByRole('link', { name: /조선해양문화관.*120m/ }))
    expect(await screen.findByText('at /spots/20')).toBeInTheDocument()
  })

  it('스팟마다 「길찾기 ↗」는 그 스팟 → 여기 카카오맵 대중교통 길찾기다(새 창) — 버스 · 도보 판단은 카카오맵에 맡긴다', async () => {
    renderPage(913)
    const section = (await screen.findByRole('heading', { level: 2, name: '가까운 스팟' })).closest('section')
    const way = within(section).getByRole('link', { name: /대중교통 길찾기/ })
    expect(way).toHaveAttribute(
      'href',
      `https://map.kakao.com/link/by/traffic/${encodeURIComponent('거제씨월드')},34.8201,128.7002/${encodeURIComponent('소노캄 거제')},34.81,128.69`,
    )
    expect(way).toHaveAttribute('target', '_blank')
  })

  it('스팟 사진은 스팟 목록의 대표 사진이다', async () => {
    renderPage(913)
    const section = (await screen.findByRole('heading', { level: 2, name: '가까운 스팟' })).closest('section')
    await vi.waitFor(() =>
      expect(section.querySelector('img[src="https://tong.visitkorea.or.kr/seaworld.jpg"]')).not.toBeNull(),
    )
  })

  it('5km 안에 스팟이 없으면(서버가 빈 배열) 「가까운 스팟」 구획이 없다', async () => {
    api.place.mockResolvedValue({ ...STAY, nearSpots: [] })
    renderPage(913)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: '가까운 스팟' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '위치' })).toBeInTheDocument()
  })

  it('관광정보를 못 받아도(FALLBACK) 위치 지도 · 가까운 스팟 · 예약은 남는다 — TourAPI 상세 값이 아니다', async () => {
    api.place.mockResolvedValue({ ...STAY, detail: FALLBACK })
    renderPage(913)
    expect(await screen.findByText(/관광정보 확인 실패/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /위치를 카카오맵에서/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '가까운 스팟' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /여기어때/ })).toBeInTheDocument()
  })
})

describe('맛집 · 숙소 상세 — 예약 · 소개 · 출처', () => {
  it('숙소 예약은 여기어때 숙소 페이지로 간다(새 창) — 숙소 자체 누리집 링크는 두지 않는다', async () => {
    renderPage(913)
    await screen.findByRole('heading', { level: 1 })
    const book = screen.getByRole('link', { name: /여기어때/ })
    expect(book).toHaveAttribute('href', 'https://www.yeogi.com/domestic-accommodations/6605')
    expect(book).toHaveAttribute('target', '_blank')
    expect(document.querySelector('a[href="https://www.sonohotelsresorts.com"]')).toBeNull()
  })

  it('맛집에는 예약 링크가 없다', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: /여기어때/ })).not.toBeInTheDocument()
  })

  it('숙소는 소개문을 싣지 않는다 — 호텔 자기 홍보 글이다', async () => {
    renderPage(913)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText(/최상의 서비스/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '소개' })).not.toBeInTheDocument()
  })

  it('맛집도 소개문을 싣지 않는다 — 네이버 · 카카오도 첫 화면에 긴 소개글을 두지 않는다(2026-09-19 사용자)', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText('멸치쌈밥 원문 소개.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '소개' })).not.toBeInTheDocument()
  })

  it('「많이 찾아간 곳이에요」 줄 · 맨 아래 출처 줄은 두지 않는다 — 사진 칸의 「출처 TourAPI」만 남는다', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText(/많이 찾아간/)).not.toBeInTheDocument()
    expect(screen.queryByText(/인기 순서/)).not.toBeInTheDocument()
  })

  it('화면 어디에도 한국관광공사 명칭을 쓰지 않는다(기준문서 §8)', async () => {
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    expect(document.body.textContent).not.toMatch(/한국관광공사|KTO/)
  })

  it('불러오기에 실패하면 이유를 말한다', async () => {
    api.place.mockRejectedValue(new Error('HTTP 404'))
    renderPage(909)
    expect(await screen.findByText(/불러오지 못했어요/)).toBeInTheDocument()
  })

  it('‹ 는 앞 화면으로 돌아간다', async () => {
    const user = userEvent.setup()
    renderPage(909)
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: '뒤로' }))
    expect(await screen.findByText('at /spots')).toBeInTheDocument()
  })
})
