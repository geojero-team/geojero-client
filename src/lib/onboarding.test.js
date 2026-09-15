import { beforeEach, describe, expect, it } from 'vitest'
import { isFirstVisit, markOnboarded } from './onboarding'

describe('onboarding — 첫 방문 표시(localStorage)', () => {
  beforeEach(() => localStorage.clear())

  it('처음이면 참, 본 뒤로는 거짓 — 본 날을 남긴다', () => {
    expect(isFirstVisit()).toBe(true)
    markOnboarded()
    expect(isFirstVisit()).toBe(false)
    expect(Number.isNaN(Date.parse(localStorage.getItem('gj_onboarded_v1')))).toBe(false)
  })
})
