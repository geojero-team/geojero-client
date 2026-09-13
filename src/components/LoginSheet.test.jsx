import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LoginSheet from './LoginSheet'

describe('LoginSheet', () => {
  it('손잡이를 끌어내리면 닫힌다 — 올리기 시트와 같은 손잡이', () => {
    const onClose = vi.fn()
    const { container } = render(<LoginSheet open onClose={onClose} onLogin={vi.fn()} />)
    const handle = container.querySelector('[data-sheet-handle]')
    expect(handle).toHaveStyle({ touchAction: 'none' })

    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 200 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 200 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('title을 주지 않으면 기존 코스 저장 문구 그대로다', () => {
    render(<LoginSheet open onClose={vi.fn()} onLogin={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '코스를 저장하려면 로그인 해주세요' })).toBeInTheDocument()
  })

  it('title을 주면 그 문구를 제목으로 쓴다', () => {
    render(
      <LoginSheet open onClose={vi.fn()} onLogin={vi.fn()} title="사진을 올리려면 로그인 해주세요" />,
    )
    expect(screen.getByRole('heading', { name: '사진을 올리려면 로그인 해주세요' })).toBeInTheDocument()
    expect(screen.queryByText('코스를 저장하려면 로그인 해주세요')).not.toBeInTheDocument()
  })
})
