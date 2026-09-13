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

  it('소개가 없는 스팟이면 「버스 시간표 보기」 바로 뒤에 온다', async () => {
    renderDetail({ ...SPOT, overview: null })

    const section = await screen.findByRole('region', { name: '방문자 사진' })
    const button = screen.getByRole('button', { name: '버스 시간표 보기' })
    expect(button.nextElementSibling).toBe(section)
  })
})
