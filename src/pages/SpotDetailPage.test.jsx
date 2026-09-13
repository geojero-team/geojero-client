import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, beginKakaoLogin } from '../lib/api'
import { loadSpotDetail } from '../lib/spots'
import SpotDetailPage from './SpotDetailPage'

vi.mock('../lib/api', () => ({
  api: { getVisitorPhotos: vi.fn(), me: vi.fn() },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/spots', () => ({ loadSpotDetail: vi.fn() }))

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('SpotDetailPage — 방문자 사진 올리기 주소', () => {
  it('주소로 바로 연 화면: 올리기는 ?upload=1 을 붙이고, 닫은 뒤 ‹ 는 앱 밖이 아니라 홈으로 간다', async () => {
    window.history.replaceState(null, '', '/spots/4')
    loadSpotDetail.mockResolvedValue({ poiId: 4, shortName: '학동몽돌해변', region: '남부권', category: '해수욕장', photos: [] })
    api.getVisitorPhotos.mockResolvedValue({ poiId: 4, count: 0, photos: [] })
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<p>홈 화면</p>} />
          <Route path="/spots/:spotId" element={<SpotDetailPage />} />
        </Routes>
      </BrowserRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))
    expect(window.location.search).toBe('?upload=1')

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLogin).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '나중에' }))
    expect(window.location.search).toBe('')

    await user.click(screen.getByRole('button', { name: '뒤로' }))
    expect(await screen.findByText('홈 화면')).toBeInTheDocument()
  })

  it('목록에서 들어온 화면: 올리기를 열었다 닫아도 ‹ 는 그 목록으로 돌아간다', async () => {
    window.history.replaceState(null, '', '/spots')
    loadSpotDetail.mockResolvedValue({ poiId: 4, shortName: '학동몽돌해변', region: '남부권', category: '해수욕장', photos: [] })
    api.getVisitorPhotos.mockResolvedValue({ poiId: 4, count: 0, photos: [] })
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<p>홈 화면</p>} />
          <Route path="/spots" element={<Link to="/spots/4">스팟 목록</Link>} />
          <Route path="/spots/:spotId" element={<SpotDetailPage />} />
        </Routes>
      </BrowserRouter>,
    )

    await user.click(screen.getByRole('link', { name: '스팟 목록' }))
    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))
    await user.click(screen.getByRole('button', { name: '나중에' }))
    await user.click(screen.getByRole('button', { name: '뒤로' }))

    expect(await screen.findByRole('link', { name: '스팟 목록' })).toBeInTheDocument()
  })
})
