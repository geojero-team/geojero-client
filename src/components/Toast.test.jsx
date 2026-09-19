import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Toast from './Toast'

/* 2026-09-19 — 코스를 저장하면 결과를 화면 아래 가운데에 띄웁니다(사용자 결정).
   앞서 쓰던 「로그인하고 돌아오면 맨 아래로 스크롤」은 높이가 계속 바뀌는 자리라 번번이 어긋났습니다. */
describe('Toast — 한 일이 끝났다고 알리는 띠', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<Toast open={false} message="내 일정에 저장했어요" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('말을 보여주고, 시간이 지나면 스스로 물러난다', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<Toast open message="내 일정에 저장했어요" onDone={onDone} />)

    expect(screen.getByRole('status')).toHaveTextContent('내 일정에 저장했어요')
    expect(onDone).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(2400)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('부모가 다시 그려도 사라질 시각이 밀리지 않는다 — 콜백을 ref 로 읽기 때문', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const { rerender } = render(<Toast open message="저장" onDone={() => onDone('첫 번째')} />)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    // 부모가 렌더마다 새 함수를 넘깁니다. 타이머가 다시 시작되면 띠가 영영 안 사라집니다.
    rerender(<Toast open message="저장" onDone={() => onDone('두 번째')} />)

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
    // 그러면서도 **최신** 콜백을 부릅니다
    expect(onDone).toHaveBeenCalledWith('두 번째')
  })
})
