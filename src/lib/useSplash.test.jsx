import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSplash } from './useSplash'

describe('useSplash — 앱을 열면 시작화면을 3초 동안 띄운다(2026-09-20 사용자 — 2초 → 2.3초 → 2.8초 → 3초)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/')
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
    sessionStorage.clear()
  })

  it('같은 창에서 한 번 띄웠으면 새로고침해도 다시 띄우지 않는다(2026-09-20 사용자 — 새로고침마다 처음 화면이 떴다)', () => {
    const first = renderHook(() => useSplash())
    expect(first.result.current).toBe(true)
    first.unmount()

    // 새로고침 = 앱이 처음부터 다시 그려진다. 창(탭)을 닫기 전까지는 sessionStorage 가 남는다.
    const again = renderHook(() => useSplash())
    expect(again.result.current).toBe(false)
  })

  it('저장소가 막힌 브라우저에서도 깨지지 않고 띄운다 — 기억할 수 없으니 전처럼 매번', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useSplash())
    expect(result.current).toBe(true)
  })

  it('3초가 되기 직전까지는 떠 있고, 3초에 닫힌다', () => {
    const { result } = renderHook(() => useSplash())
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(2999))
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
