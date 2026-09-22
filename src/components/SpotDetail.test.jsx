import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, beginKakaoLogin, beginKakaoLoginTo } from '../lib/api'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import { loadSpotDetail, patchSpot } from '../lib/spots'
import SpotDetail from './SpotDetail'

vi.mock('../lib/api', () => ({
  api: { getVisitorPhotos: vi.fn(), me: vi.fn(), likeSpot: vi.fn(), unlikeSpot: vi.fn() },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/spots', () => ({ loadSpotDetail: vi.fn(), patchSpot: vi.fn() }))

// 고현터미널의 위치 지도만 부릅니다. 기본은 실패(지도 도구 없음) — 지도 테스트만 가짜 SDK 를 줍니다.
vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn() }))

/** 카카오 지도 SDK 흉내 — 만든 지도의 옵션과 핀만 봅니다. */
function fakeKakao() {
  const Map = vi.fn(function () {
    this.setZoomable = vi.fn()
  })
  const CustomOverlay = vi.fn()
  const LatLng = vi.fn(function (lat, lng) {
    this.lat = lat
    this.lng = lng
  })
  return { maps: { Map, CustomOverlay, LatLng } }
}

const TERMINAL = {
  poiId: 23, kind: 'TERMINAL', name: '고현터미널', shortName: '고현터미널', lat: 34.8906148, lng: 128.6242507,
  theme: null, region: null, category: null, overview: null, overviewSource: 'FALLBACK', photos: [],
}

const TOUR_PHOTOS = [
  'https://tong.visitkorea.or.kr/a.jpg',
  'https://tong.visitkorea.or.kr/b.jpg',
  'https://tong.visitkorea.or.kr/c.jpg',
]

const SPOT = {
  poiId: 4,
  name: '학동흑진주몽돌해변',
  shortName: '학동몽돌해변',
  region: '남부권',
  category: '해수욕장',
  theme: 'BEACH',
  overview: '몽돌이 깔린 해변입니다.',
  overviewSource: 'TourAPI',
  photos: TOUR_PHOTOS,
}

const VISITOR = [1, 2].map((n) => ({
  photoId: n,
  imageUrl: `https://api.example.test/api/visitor-photos/${n}/image`,
  width: 1600,
  height: 1200,
  caption: null,
  uploadedDate: '2026-09-13',
  isMine: false,
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  loadKakaoMaps.mockRejectedValue(new Error('no sdk'))
})

function renderDetail(spot = SPOT) {
  loadSpotDetail.mockResolvedValue(spot)
  api.getVisitorPhotos.mockResolvedValue({ poiId: spot.poiId, count: VISITOR.length, photos: VISITOR })
  return render(
    <MemoryRouter initialEntries={['/spots/4']}>
      <SpotDetail poiId={4} />
    </MemoryRouter>,
  )
}

/** 문단의 날 글(textContent) 그대로 찾습니다 — 기본 매처는 줄바꿈을 공백으로 접어서 개행을 확인할 수 없습니다. */
const paragraphWithText = (text) => (_, el) => el?.tagName === 'P' && el.textContent === text

describe('SpotDetail — 고현터미널 사진 자리 = 위치 지도 (2026-09-19)', () => {
  it('자리그림 대신 움직이지 않는 지도에 파란 버스 핀 하나 — 터미널 좌표가 가운데', async () => {
    const kakao = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)
    renderDetail(TERMINAL)

    const map = await screen.findByRole('img', { name: '고현터미널 위치 지도' })
    await waitFor(() => expect(kakao.maps.Map).toHaveBeenCalledTimes(1))
    const [container, options] = kakao.maps.Map.mock.calls[0]
    expect(container).toBe(map)
    expect(options.center).toEqual({ lat: 34.8906148, lng: 128.6242507 })
    expect(options.draggable).toBe(false)
    expect(kakao.maps.CustomOverlay).toHaveBeenCalledTimes(1)
    // 사진 자리에 자리그림이 같이 깔리지 않는다
    expect(map.parentElement.querySelector('img')).toBeNull()
  })

  it('지도 도구를 못 받으면 자리그림으로 — 빈 칸을 남기지 않는다', async () => {
    renderDetail(TERMINAL)

    await screen.findByRole('heading', { name: '고현터미널' })
    await waitFor(() => expect(screen.queryByRole('img', { name: '고현터미널 위치 지도' })).not.toBeInTheDocument())
    expect(document.querySelector('img[alt=""]')).not.toBeNull()
  })

  it('터미널이 아닌 스팟은 사진이 없어도 지도가 아니라 자리그림 — 지도 도구도 부르지 않는다', async () => {
    renderDetail({ ...SPOT, photos: [] })

    await screen.findByRole('heading', { name: '학동몽돌해변' })
    expect(screen.queryByRole('img', { name: /위치 지도/ })).not.toBeInTheDocument()
    expect(loadKakaoMaps).not.toHaveBeenCalled()
  })
})

describe('SpotDetail — 사진 넘기기: 마지막 장에서 더 넘기면 첫 장 (2026-09-19)', () => {
  /** jsdom 은 크기 · 스크롤이 없어 트랙 폭과 scrollTo 를 흉내 내고, 지금 몇 번째 장인지 스크롤 위치로 맞춥니다. */
  async function trackAt(index) {
    renderDetail(SPOT)
    const track = await screen.findByRole('group', { name: '사진 3장 — 좌우로 넘겨보세요' })
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 390 })
    track.scrollTo = vi.fn()
    track.scrollLeft = index * 390
    fireEvent.scroll(track)
    return track
  }

  it('키보드 → — 마지막 장이면 첫 장으로', async () => {
    const track = await trackAt(2)
    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('손가락으로 마지막 장을 왼쪽으로 밀면 첫 장으로', async () => {
    const track = await trackAt(2)
    fireEvent.touchStart(track, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 200, clientY: 104 }] })
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('마지막 장이 아니면 손가락 넘기기는 브라우저에 맡긴다 · 세로로 민 것은 넘기기가 아니다', async () => {
    const track = await trackAt(1)
    fireEvent.touchStart(track, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 200, clientY: 104 }] })
    expect(track.scrollTo).not.toHaveBeenCalled()

    track.scrollLeft = 780
    fireEvent.scroll(track)
    fireEvent.touchStart(track, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(track, { changedTouches: [{ clientX: 280, clientY: 260 }] })
    expect(track.scrollTo).not.toHaveBeenCalled()
  })

  it('마우스로 마지막 장을 끌어도 첫 장으로', async () => {
    const track = await trackAt(2)
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1170 })
    track.getBoundingClientRect = () => ({ width: 390 })
    track.setPointerCapture = vi.fn()
    fireEvent.pointerDown(track, { pointerType: 'mouse', clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(track, { pointerType: 'mouse', clientX: 200, pointerId: 1 })
    fireEvent.pointerUp(track, { pointerType: 'mouse', clientX: 200, pointerId: 1 })
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })
  })
})

describe('SpotDetail — 소개 (2026-09-15: 우리 요약 + TourAPI 원문)', () => {
  it('요약이 원문 위에 오고, 둘 다 문장마다 줄이 바뀐다 — 원문 글자는 그대로', async () => {
    renderDetail({
      ...SPOT,
      summary: '검은 몽돌이 깔린 해변입니다. 유람선도 탈 수 있습니다.',
      overview: '몽돌이 깔린 해변이다.소리가 아름답다.',
    })

    const summary = await screen.findByText(paragraphWithText('검은 몽돌이 깔린 해변입니다.\n유람선도 탈 수 있습니다.'))
    const original = screen.getByText(paragraphWithText('몽돌이 깔린 해변이다.\n소리가 아름답다.'))
    expect(summary.compareDocumentPosition(original) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument()
  })

  it('요약이 없으면(예전 서버) 원문만 그린다', async () => {
    renderDetail(SPOT)

    expect(await screen.findByText(paragraphWithText('몽돌이 깔린 해변입니다.'))).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '소개' })).toBeInTheDocument()
  })
})

describe('SpotDetail — 방문자 사진 자리', () => {
  it('소개 뒤에 방문자 사진 섹션이 오고, TourAPI 사진과 섞이지 않는다', async () => {
    const { container } = renderDetail()

    const section = await screen.findByRole('region', { name: '방문자 사진' })
    expect(await within(section).findAllByRole('button', { name: /번째 방문자 사진$/ })).toHaveLength(2)
    const intro = screen.getByRole('heading', { name: '소개' })
    expect(intro.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // hero는 TourAPI 사진 3장 그대로 — 방문자 사진이 끼어들지 않습니다.
    const heroSources = [...container.querySelectorAll('img')]
      .filter((img) => !section.contains(img))
      .map((img) => img.getAttribute('src'))
    expect(heroSources).toEqual(TOUR_PHOTOS)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(within(section).queryByText('출처 TourAPI')).not.toBeInTheDocument()
    expect(api.getVisitorPhotos).toHaveBeenCalledWith(4)

    expect(screen.queryByText('일정에 담기')).not.toBeInTheDocument()
    expect(screen.queryByText(/^v2 ·/)).not.toBeInTheDocument()
  })

  it('고현터미널이면 권역·분류 대신 「모든 코스의 출발 지점」, 버스 시간표 버튼 없이 방문자 사진', async () => {
    renderDetail({
      poiId: 23, kind: 'TERMINAL', name: '고현터미널', shortName: '고현터미널',
      theme: null, region: null, category: null, overview: null, overviewSource: 'FALLBACK', photos: [],
    })

    expect(await screen.findByRole('region', { name: '방문자 사진' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '고현터미널' })).toBeInTheDocument()
    expect(screen.getByText('모든 코스의 출발 지점')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '시간표 보기' })).not.toBeInTheDocument()
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })

  it('소개가 없는 스팟이면 주소 · 내리는 곳 덩어리 바로 뒤에 온다', async () => {
    const { container } = renderDetail({ ...SPOT, overview: null })

    const section = await screen.findByRole('region', { name: '방문자 사진' })
    expect(container.querySelector('[data-info]').nextElementSibling).toBe(section)
  })
})

/**
 * Figma 02-2 `613:3`(2026-09-14 밤) — 제목 아래 주소 줄 + 내리는 곳 줄. 내리는 곳 줄은 **줄 전체가 시간표로 가는 버튼**(613:11, 오른쪽 ›)이고
 * 「시간표 보기」 버튼은 없어졌다. 읽기 도구 이름에는 「시간표 보기」가 숨은 글로 남는다.
 */
describe('SpotDetail — 주소 · 내리는 곳', () => {
  const WITH_INFO = {
    ...SPOT,
    address: '경상남도 거제시 남부면 어딘가길 1',
    alightLabel: '학동 정류장',
    timetableStop: '학동',
    boardStopDiffers: false,
    ferryDocks: [],
  }
  const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  function Probe() {
    return <p>{`at ${useLocation().pathname}`}</p>
  }

  function renderRoutes(spot) {
    loadSpotDetail.mockResolvedValue(spot)
    api.getVisitorPhotos.mockResolvedValue({ poiId: spot.poiId, count: 0, photos: [] })
    return render(
      <MemoryRouter initialEntries={[`/spots/${spot.poiId}`]}>
        <Routes>
          <Route path="/spots/:id" element={<SpotDetail poiId={spot.poiId} />} />
          <Route path="/timetable/:id" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('제목 → 주소 → 「학동 정류장에서 내려요」 순이고, 그 줄이 곧 시간표 버튼이며 따로 「시간표 보기」 버튼은 없다', async () => {
    renderDetail(WITH_INFO)

    const addr = await screen.findByText('경상남도 거제시 남부면 어딘가길 1')
    const alight = screen.getByText('학동 정류장에서 내려요')
    const title = screen.getByRole('heading', { name: '학동몽돌해변' })
    expect(follows(title, addr)).toBe(true)
    expect(follows(addr, alight)).toBe(true)
    const row = screen.getByRole('button', { name: /학동 정류장에서 내려요/ })
    expect(row).toContainElement(alight)
    expect(row).toHaveAccessibleName(/시간표 보기/)
    expect(screen.getAllByRole('button', { name: /시간표 보기/ })).toHaveLength(1)
    expect(screen.queryByText(/시간표는 .* 정류장 기준이에요/)).not.toBeInTheDocument()
  })

  it('내리는 곳 줄을 누르면 그 스팟의 시간표로 간다', async () => {
    renderRoutes(WITH_INFO)

    await userEvent.click(await screen.findByRole('button', { name: /학동 정류장에서 내려요/ }))
    expect(await screen.findByText('at /timetable/4')).toBeInTheDocument()
  })

  it('내리는 곳과 시간표 기준 정류장이 다르면 둘째 줄로 말한다 (거제씨월드 — 신촌에서 내리고 시각은 지세포)', async () => {
    renderDetail({
      ...WITH_INFO, poiId: 18, name: '거제씨월드', shortName: '거제씨월드',
      alightLabel: '신촌 정류장', timetableStop: '지세포', boardStopDiffers: true,
    })

    expect(await screen.findByText('신촌 정류장에서 내려요')).toBeInTheDocument()
    expect(screen.getByText('시간표는 지세포 정류장 기준이에요')).toBeInTheDocument()
  })

  it('정류장이 없는 외도보타니아는 선착장 넷 줄이 배 시간표로 가는 버튼이다', async () => {
    renderRoutes({
      ...WITH_INFO, poiId: 5, name: '외도보타니아', shortName: '외도보타니아', theme: 'GARDEN',
      alightLabel: null, timetableStop: null, boardStopDiffers: false, ferryDocks: ['도장포', '와현', '장승포', '지세포'],
    })

    const row = await screen.findByRole('button', { name: /도장포 · 와현 · 장승포 · 지세포 선착장에서 타요/ })
    expect(screen.queryByText(/에서 내려요$/)).not.toBeInTheDocument()
    await userEvent.click(row)
    expect(await screen.findByText('at /timetable/5')).toBeInTheDocument()
  })

  it('내리는 곳도 선착장도 모르면(옛 응답) 「시간표 보기」 줄만 남긴다 — 시간표로 가는 길을 잃지 않는다', async () => {
    renderDetail({ ...WITH_INFO, address: null, alightLabel: null, timetableStop: null, ferryDocks: [] })

    const row = await screen.findByRole('button', { name: '시간표 보기' })
    expect(screen.queryByText(/에서 내려요$/)).not.toBeInTheDocument()
    expect(row.closest('[data-info]')).not.toBeNull()
  })
})

/**
 * 스팟 하트(2026-09-21 사용자 결정 · Figma 프레임 없음 — 디자인브리프 부록 Q).
 * 상세에서 누르고 카드에는 수만. 누르는 것만 로그인, 보기는 비로그인. 0 도 「♡ 0」으로 보인다.
 * 로그인 복귀는 방문자 사진의 `?upload=1` 과 같은 방식 — `?like=1` 을 주소에 실어 돌아오면 이어서 누른다.
 */
describe('SpotDetail — 하트', () => {
  const LIKABLE = { ...SPOT, address: '경상남도 거제시 남부면 어딘가길 1', likeCount: 3, liked: false }
  const LIKE_TITLE = '하트를 누르려면 로그인 해주세요'
  const FAILED = '하트를 누르지 못했어요. 잠시 뒤 다시 시도해 주세요'
  const httpError = (status) => Object.assign(new Error(`PUT /api/pois/4/like → ${status}`), { status })
  const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  /* `<p>` 인 이유 — `<output>` 은 암묵적 role=status 라 실패 한 줄(role=status)과 겹칩니다. */
  function LocationProbe() {
    const location = useLocation()
    return <p data-testid="loc">{location.pathname + location.search}</p>
  }

  /** 지도 시트 호스트(주소 그대로)면 uploadInUrl 없이, 스팟 상세 화면이면 uploadInUrl 로 그립니다. */
  function renderLike(spot, { route = '/spots/4', uploadInUrl = false } = {}) {
    loadSpotDetail.mockResolvedValue(spot)
    api.getVisitorPhotos.mockResolvedValue({ poiId: spot.poiId, count: 0, photos: [] })
    render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <SpotDetail poiId={4} uploadInUrl={uploadInUrl} />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    return userEvent.setup()
  }

  /**
   * 자리는 2026-09-21 저녁에 두 번 바뀌었다(부록 Q 「자리를 고쳤다」).
   * 제목 아래 알약 줄 → 제목 줄 오른쪽 끝 아이콘(수는 권역 줄 꼬리) → **제목 줄 오른쪽 끝 「♡ 3」 알약**.
   * 우리 하트는 저장이 아니라 **추천**이라 수가 버튼에 붙는다(유튜브 좋아요 · 네이버 공감) — 사용자 결정 A.
   */
  it('제목 줄 오른쪽 끝의 「♡ 3」 알약 — 수가 버튼 안에 있고 권역 줄에는 없다', async () => {
    renderLike(LIKABLE)

    const button = await screen.findByRole('button', { name: '하트 누르기' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveTextContent('3')
    expect(button).toHaveAccessibleDescription('하트 3')
    expect(button).toHaveAttribute('data-api', 'PUT /api/pois/{id}/like')
    expect(button.querySelector('svg')).toHaveAttribute('fill', 'none')

    // 수는 버튼 안 한 곳뿐이다 — 권역 줄은 분류만 말한다(성격이 다른 것을 한 줄에 섞지 않는다)
    const count = screen.getByRole('img', { name: '하트 3' })
    expect(count.closest('button')).toBe(button)
    expect(screen.getByText(/남부권/)).not.toContainElement(count)

    const title = screen.getByRole('heading', { name: '학동몽돌해변' })
    const addr = screen.getByText('경상남도 거제시 남부면 어딘가길 1')
    expect(follows(title, button)).toBe(true)
    expect(follows(button, addr)).toBe(true)
  })

  /* 이미 누른 스팟을 **처음 열 때**도 채운 하트다 — 눌러서 바뀌는 경우(아래)와 다른 길이라 따로 지킵니다.
     서버가 liked 를 주는데 화면이 안 읽으면 「내가 눌렀는지」가 사라집니다(2026-09-22 사용자 지적의 자리). */
  it('이미 누른 스팟은 열자마자 채운 하트다', async () => {
    renderLike({ ...LIKABLE, likeCount: 4, liked: true })

    const button = await screen.findByRole('button', { name: '하트 취소' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.querySelector('svg')).toHaveAttribute('fill', 'currentColor')
  })

  it('0 도 「♥ 0」으로 보인다 — 값이 없을 때만 숨긴다', async () => {
    renderLike({ ...LIKABLE, likeCount: 0 })

    expect(await screen.findByRole('img', { name: '하트 0' })).toHaveTextContent('0')
  })

  it('likeCount 가 없는 옛 응답이면 버튼을 그리지 않는다 — 값 없이 하트만 남기지 않는다', async () => {
    renderLike(SPOT)

    await screen.findByRole('heading', { name: '학동몽돌해변' })
    expect(screen.queryByRole('button', { name: /하트/ })).not.toBeInTheDocument()
  })

  it('고현터미널에는 하트가 없다 — 화면 스팟이 아니다(서버도 404)', async () => {
    renderLike({ ...TERMINAL, likeCount: 0, liked: false })

    await screen.findByRole('heading', { name: '고현터미널' })
    expect(screen.queryByRole('button', { name: /하트/ })).not.toBeInTheDocument()
  })

  it('비로그인이면 누를 때 로그인 시트 — 지도 시트 호스트는 주소를 두고 /spots/4?like=1 로 돌아오게 맡긴다', async () => {
    const user = renderLike(LIKABLE)

    await user.click(await screen.findByRole('button', { name: '하트 누르기' }))

    expect(screen.getByRole('heading', { name: LIKE_TITLE })).toBeInTheDocument()
    expect(api.likeSpot).not.toHaveBeenCalled()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/spots\/4$/)

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLoginTo).toHaveBeenCalledWith('/spots/4?like=1')
    expect(beginKakaoLogin).not.toHaveBeenCalled()
  })

  it('스팟 상세 화면(uploadInUrl)이면 주소에 ?like=1 을 싣고 beginKakaoLogin — 「나중에」면 지운다', async () => {
    const user = renderLike(LIKABLE, { uploadInUrl: true })

    await user.click(await screen.findByRole('button', { name: '하트 누르기' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/spots/4?like=1')
    expect(screen.getByRole('heading', { name: LIKE_TITLE })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLogin).toHaveBeenCalledTimes(1)
    expect(beginKakaoLoginTo).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '나중에' }))
    expect(screen.queryByRole('heading', { name: LIKE_TITLE })).not.toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/spots\/4$/)
  })

  it('토큰이 있으면 PUT 을 부르고 응답대로 「♥ 4」 · 눌림 — 목록 캐시도 같이 고친다', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.likeSpot.mockResolvedValue({ poiId: 4, likeCount: 4, liked: true })
    const user = renderLike(LIKABLE)

    await user.click(await screen.findByRole('button', { name: '하트 누르기' }))

    const button = await screen.findByRole('button', { name: '하트 취소' })
    expect(api.likeSpot).toHaveBeenCalledWith(4)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: '하트 4' })).toBeInTheDocument()
    expect(button).toHaveAccessibleDescription('하트 4')
    expect(button.querySelector('svg')).toHaveAttribute('fill', 'currentColor')
    expect(patchSpot).toHaveBeenCalledWith(4, { likeCount: 4, liked: true })
    expect(screen.queryByRole('heading', { name: LIKE_TITLE })).not.toBeInTheDocument()
  })

  it('요청 중에는 버튼이 비활성이다', async () => {
    localStorage.setItem('gj_token', 'tok')
    let resolve
    api.likeSpot.mockReturnValue(new Promise((r) => { resolve = r }))
    const user = renderLike(LIKABLE)

    const button = await screen.findByRole('button', { name: '하트 누르기' })
    await user.click(button)
    expect(button).toBeDisabled()

    resolve({ poiId: 4, likeCount: 4, liked: true })
    await waitFor(() => expect(screen.getByRole('button', { name: '하트 취소' })).toBeEnabled())
  })

  it('눌린 상태에서 누르면 DELETE — 「♥ 3」으로 돌아온다', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.unlikeSpot.mockResolvedValue({ poiId: 4, likeCount: 3, liked: false })
    const user = renderLike({ ...LIKABLE, likeCount: 4, liked: true })

    await user.click(await screen.findByRole('button', { name: '하트 취소' }))

    const button = await screen.findByRole('button', { name: '하트 누르기' })
    expect(api.unlikeSpot).toHaveBeenCalledWith(4)
    expect(api.likeSpot).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: '하트 3' })).toBeInTheDocument()
    expect(button.querySelector('svg')).toHaveAttribute('fill', 'none')
  })

  it('401 이면 토큰을 지우고 로그인 시트 — 수는 그대로', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.likeSpot.mockRejectedValue(httpError(401))
    const user = renderLike(LIKABLE)

    await user.click(await screen.findByRole('button', { name: '하트 누르기' }))

    expect(await screen.findByRole('heading', { name: LIKE_TITLE })).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBeNull()
    expect(screen.getByRole('img', { name: '하트 3' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('그 밖의 실패면 버튼 아래 한 줄로 말하고 수는 그대로 — 다시 누르면 문구가 사라진다', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.likeSpot.mockRejectedValueOnce(httpError(502)).mockResolvedValue({ poiId: 4, likeCount: 4, liked: true })
    const user = renderLike(LIKABLE)

    await user.click(await screen.findByRole('button', { name: '하트 누르기' }))

    expect(await screen.findByRole('status')).toHaveTextContent(FAILED)
    expect(screen.getByRole('img', { name: '하트 3' })).toBeInTheDocument()
    expect(patchSpot).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: LIKE_TITLE })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '하트 누르기' }))
    await screen.findByRole('button', { name: '하트 취소' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('?like=1 로 돌아오면(로그인 복귀) 저절로 누르고 주소에서 like 를 지운다', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.likeSpot.mockResolvedValue({ poiId: 4, likeCount: 4, liked: true })
    renderLike(LIKABLE, { route: '/spots/4?like=1', uploadInUrl: true })

    await screen.findByRole('button', { name: '하트 취소' })
    expect(screen.getByRole('img', { name: '하트 4' })).toBeInTheDocument()
    expect(api.likeSpot).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent(/^\/spots\/4$/))
    expect(screen.queryByRole('heading', { name: LIKE_TITLE })).not.toBeInTheDocument()
  })

  it('?like=1 인데 토큰이 없으면 로그인 시트만 — 부르지 않는다', async () => {
    renderLike(LIKABLE, { route: '/spots/4?like=1', uploadInUrl: true })

    expect(await screen.findByRole('heading', { name: LIKE_TITLE })).toBeInTheDocument()
    expect(api.likeSpot).not.toHaveBeenCalled()
  })

  it('?like=1 복귀에서 401 이면 세션을 지우고 로그인 시트 — ?like=1 은 남겨 다시 로그인하면 이어서 누른다', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.likeSpot.mockRejectedValue(httpError(401))
    renderLike(LIKABLE, { route: '/spots/4?like=1', uploadInUrl: true })

    expect(await screen.findByRole('heading', { name: LIKE_TITLE })).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBeNull()
    expect(screen.getByTestId('loc')).toHaveTextContent('/spots/4?like=1')
  })
})
