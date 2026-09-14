import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { loadSpotDetail } from '../lib/spots'
import SpotDetail from './SpotDetail'

vi.mock('../lib/api', () => ({
  api: { getVisitorPhotos: vi.fn(), me: vi.fn() },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/spots', () => ({ loadSpotDetail: vi.fn() }))

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

  it('소개가 없는 스팟이면 「시간표 보기」 바로 뒤에 온다', async () => {
    renderDetail({ ...SPOT, overview: null })

    const section = await screen.findByRole('region', { name: '방문자 사진' })
    const button = screen.getByRole('button', { name: '시간표 보기' })
    expect(button.nextElementSibling).toBe(section)
  })
})

/** Figma 02-2 `607:4`(2026-09-14 밤) — 제목 아래 주소 줄 + 내리는 곳 줄, 그 다음이 「시간표 보기」. */
describe('SpotDetail — 주소 · 내리는 곳', () => {
  const WITH_INFO = {
    ...SPOT,
    address: '경상남도 거제시 남부면 어딘가길 1',
    alightLabel: '학동 정류장',
    timetableStop: '학동',
    boardStopDiffers: false,
  }
  const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  it('제목 → 주소 → 「학동 정류장에서 내려요」 → 「시간표 보기」 순이고, 기준 정류장이 같으면 둘째 줄이 없다', async () => {
    renderDetail(WITH_INFO)

    const addr = await screen.findByText('경상남도 거제시 남부면 어딘가길 1')
    const alight = screen.getByText('학동 정류장에서 내려요')
    const title = screen.getByRole('heading', { name: '학동몽돌해변' })
    const button = screen.getByRole('button', { name: '시간표 보기' })
    expect(follows(title, addr)).toBe(true)
    expect(follows(addr, alight)).toBe(true)
    expect(follows(alight, button)).toBe(true)
    expect(screen.queryByText(/시간표는 .* 정류장 기준이에요/)).not.toBeInTheDocument()
  })

  it('내리는 곳과 시간표 기준 정류장이 다르면 둘째 줄로 말한다 (거제씨월드 — 신촌에서 내리고 시각은 지세포)', async () => {
    renderDetail({
      ...WITH_INFO, poiId: 18, name: '거제씨월드', shortName: '거제씨월드',
      alightLabel: '신촌 정류장', timetableStop: '지세포', boardStopDiffers: true,
    })

    expect(await screen.findByText('신촌 정류장에서 내려요')).toBeInTheDocument()
    expect(screen.getByText('시간표는 지세포 정류장 기준이에요')).toBeInTheDocument()
  })

  it('주소도 내리는 곳도 없으면(TourAPI 폴백 · 터미널) 그 덩어리를 그리지 않는다 — 아이콘만 남는 빈 줄 금지', async () => {
    const { container } = renderDetail({ ...WITH_INFO, address: null, alightLabel: null, timetableStop: null })

    await screen.findByRole('button', { name: '시간표 보기' })
    expect(screen.queryByText(/에서 내려요$/)).not.toBeInTheDocument()
    expect(container.querySelector('[data-info]')).toBeNull()
  })
})
