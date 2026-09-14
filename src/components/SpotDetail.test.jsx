import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
