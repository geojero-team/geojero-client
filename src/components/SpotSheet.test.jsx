import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, beginKakaoLoginTo } from '../lib/api'
import { loadSpotDetail } from '../lib/spots'
import Screen from './Screen'
import SpotSheet from './SpotSheet'

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
    await user.click(await screen.findByRole('button', { name: '첫 사진 올리기' }))

    const title = screen.getByRole('heading', { name: '사진을 올리려면 로그인 해주세요' })
    expect(title.closest('section').parentElement).toBe(screen.getByTestId('frame'))
    expect(screen.getByRole('dialog', { name: '학동몽돌해변' })).not.toContainElement(title)
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLoginTo).toHaveBeenCalledWith('/spots/4?upload=1')
  })
})
