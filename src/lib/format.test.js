import { describe, expect, it } from 'vitest'
import { formatDistance } from './format'

describe('formatDistance — 타는 곳 거리 (「약」은 문구 쪽이 붙입니다)', () => {
  it('1000m 미만은 10m 단위로 반올림한다', () => {
    expect(formatDistance(311)).toBe('310m')
    expect(formatDistance(315)).toBe('320m')
    expect(formatDistance(4)).toBe('0m')
    expect(formatDistance(994)).toBe('990m')
  })

  it('1000m 이상은 km 소수 한 자리', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(1080)).toBe('1.1km')
    expect(formatDistance(1449)).toBe('1.4km')
  })

  it('10m 반올림이 1000m가 되면 km로 적는다 — 「1000m」라고 쓰지 않는다', () => {
    expect(formatDistance(996)).toBe('1.0km')
  })
})
