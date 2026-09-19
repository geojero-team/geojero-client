import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSplash } from './useSplash'

describe('useSplash — 앱을 열면 시작화면을 2.3초 동안 띄운다(2026-09-20 사용자 — 2초에서 0.3초 늘림)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/')
  })
  afterEach(() => {
    vi.useRealTimers()
    window.history.replaceState(null, '', '/')
  })

  it('2.3초가 되기 직전까지는 떠 있고, 2.3초에 닫힌다', () => {
    const { result } = renderHook(() => useSplash())
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(2299))
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(false)
  })

  it('카카오 로그인에서 돌아오는 자리(/auth/callback)에서는 띄우지 않는다 — 로그인 도중이다', () => {
    window.history.replaceState(null, '', '/auth/callback?code=x')
    const { result } = renderHook(() => useSplash())
    expect(result.current).toBe(false)
  })
})
