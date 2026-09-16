import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { clearSession, getToken } from '../lib/session'
import { loadSpotPhotos } from '../lib/spots'
import MyPlansPage from './MyPlansPage'

vi.mock('../lib/api', () => ({
  api: {
    savedTrips: vi.fn(),
    course: vi.fn(),
    deleteTrip: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  },
  beginKakaoLogin: vi.fn(),
}))
vi.mock('../lib/session', () => ({ getToken: vi.fn(), clearSession: vi.fn() }))
vi.mock('../lib/spots', async (importOriginal) => ({
  ...(await importOriginal()),
  loadSpotPhotos: vi.fn(),
}))

function Loc() {
  const location = useLocation()
  return <output data-testid="loc">{location.pathname}</output>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/my']}>
      <Routes>
        <Route path="/my" element={<MyPlansPage />} />
        <Route path="/privacy" element={<p>개인정보처리방침 화면</p>} />
      </Routes>
      <Loc />
    </MemoryRouter>,
  )
}

const TRIP = {
  savedTripId: 7,
  courseId: 101,
  title: '학동 · 해금강 · 바람의언덕',
  chain: '고현 → 학동',
  travelDate: '2026-09-20',
  arrivalTime: '08:20',
  returnTime: '21:10',
}

beforeEach(() => {
  vi.clearAllMocks()
  getToken.mockReturnValue('token')
  loadSpotPhotos.mockResolvedValue(new Map())
  api.savedTrips.mockResolvedValue([TRIP])
  api.course.mockResolvedValue({ courseId: 101, stops: [] })
  api.deleteAccount.mockResolvedValue(undefined)
})

describe('MyPlansPage — 회원 탈퇴와 개인정보처리방침 (2026-09-16)', () => {
  it('탈퇴는 한 번 더 묻고, 확인하면 계정을 지운 뒤 비로그인 화면으로 돌아온다', async () => {
    const user = userEvent.setup()
    renderPage()

    // 확인 없이는 부르지 않는다 — 되돌릴 수 없는 일이다
    await user.click(await screen.findByRole('button', { name: '회원 탈퇴' }))
    expect(api.deleteAccount).not.toHaveBeenCalled()
    expect(screen.getByText('정말 탈퇴할까요?')).toBeInTheDocument()
    expect(screen.getByText(/저장한 코스와 올린 사진이 모두 지워져요/)).toBeInTheDocument()
    // 카카오 계정 자체는 남는다는 것도 그 자리에서 말한다
    expect(screen.getByText(/카카오 계정은 그대로예요/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))
    expect(api.deleteAccount).toHaveBeenCalledTimes(1)

    // 토큰을 버리고 비로그인 화면으로 — 다른 데로 튕기지 않는다
    expect(clearSession).toHaveBeenCalled()
    expect(await screen.findByText('코스를 저장하려면 로그인이 필요해요')).toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent('/my')
    expect(screen.queryByRole('button', { name: '회원 탈퇴' })).not.toBeInTheDocument()
  })

  it('취소하면 아무것도 지우지 않는다', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: '회원 탈퇴' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(api.deleteAccount).not.toHaveBeenCalled()
    expect(screen.queryByText('정말 탈퇴할까요?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '회원 탈퇴' })).toBeInTheDocument()
  })

  it('탈퇴에 실패하면 이유를 말하고 로그인 상태를 유지한다', async () => {
    const user = userEvent.setup()
    api.deleteAccount.mockRejectedValue(new Error('서버 응답 없음'))
    renderPage()

    await user.click(await screen.findByRole('button', { name: '회원 탈퇴' }))
    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

    expect(await screen.findByText(/서버 응답 없음/)).toBeInTheDocument()
    expect(clearSession).not.toHaveBeenCalled()
  })

  it('개인정보처리방침은 로그인과 무관하게 열린다', async () => {
    const user = userEvent.setup()
    getToken.mockReturnValue(null)
    renderPage()

    expect(screen.queryByRole('button', { name: '회원 탈퇴' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '개인정보처리방침' }))
    expect(await screen.findByText('개인정보처리방침 화면')).toBeInTheDocument()
  })
})
