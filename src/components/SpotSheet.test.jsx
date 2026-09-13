import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, beginKakaoLoginTo } from '../lib/api'
import { loadSpotDetail } from '../lib/spots'
import Screen from './Screen'
import SpotSheet from './SpotSheet'
import { PEEK_HEIGHT, peekHeightOf } from './spotSheetHeight'

vi.mock('../lib/api', () => ({
  api: { getVisitorPhotos: vi.fn(), me: vi.fn() },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/spots', () => ({ loadSpotDetail: vi.fn() }))

const SPOT = { poiId: 4, shortName: '학동몽돌해변', region: '남부권', category: '해수욕장', theme: 'BEACH' }

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="loc">{location.pathname + location.search}</output>
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  loadSpotDetail.mockResolvedValue({ ...SPOT, photos: [] })
  api.getVisitorPhotos.mockResolvedValue({ poiId: 4, count: 0, photos: [] })
})

const TERMINAL = { poiId: 23, kind: 'TERMINAL', name: '고현터미널', shortName: '고현터미널', theme: null, region: null, category: null }

describe('SpotSheet — 고현터미널(출발 지점)', () => {
  it('peek는 이름과 「모든 코스의 출발 지점」뿐 — 사진이 없어 시트가 낮다', () => {
    render(
      <MemoryRouter>
        <SpotSheet spot={TERMINAL} onClose={vi.fn()} />
      </MemoryRouter>,
    )
    const sheet = screen.getByRole('dialog', { name: '고현터미널' })
    expect(sheet).toHaveTextContent('고현터미널')
    expect(sheet).toHaveTextContent('모든 코스의 출발 지점')
    expect(sheet.querySelector('img')).toBeNull()
    expect(sheet.style.height).toBe(`${peekHeightOf(TERMINAL)}px`)
    expect(peekHeightOf(TERMINAL)).toBeLessThan(PEEK_HEIGHT)
    expect(peekHeightOf(SPOT)).toBe(PEEK_HEIGHT)
  })

  it('펼치면 버스 시간표 버튼 없이 출발 지점 문구와 방문자 사진', async () => {
    loadSpotDetail.mockResolvedValue({ ...TERMINAL, photos: [] })
    api.getVisitorPhotos.mockResolvedValue({ poiId: 23, count: 0, photos: [] })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SpotSheet spot={TERMINAL} onClose={vi.fn()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '자세히 보기', expanded: false }))

    expect(await screen.findByRole('heading', { name: '방문자 사진' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '고현터미널' })).toBeInTheDocument()
    expect(screen.getByText('모든 코스의 출발 지점')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '시간표 보기' })).not.toBeInTheDocument()
    expect(api.getVisitorPhotos).toHaveBeenCalledWith(23)
  })
})

describe('SpotSheet — 방문자 사진', () => {
  it('peek에는 없고 full에서 보인다 — 비로그인 올리기는 화면 프레임에 로그인 시트, 복귀는 /spots/4?upload=1', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Screen data-testid="frame">
          <SpotSheet spot={SPOT} onClose={vi.fn()} />
        </Screen>
        <LocationProbe />
      </MemoryRouter>,
    )

    expect(screen.queryByText('방문자 사진')).not.toBeInTheDocument()

    // 손잡이(aria-expanded=false)로 펼칩니다 — peek 덩어리도 같은 이름의 버튼입니다.
    await user.click(screen.getByRole('button', { name: '자세히 보기', expanded: false }))
    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    const title = screen.getByRole('heading', { name: '사진을 올리려면 로그인 해주세요' })
    expect(title.closest('section').parentElement).toBe(screen.getByTestId('frame'))
    expect(screen.getByRole('dialog', { name: '학동몽돌해변' })).not.toContainElement(title)
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLoginTo).toHaveBeenCalledWith('/spots/4?upload=1')
  })
})
