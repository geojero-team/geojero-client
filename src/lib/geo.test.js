import { describe, expect, it } from 'vitest'
import { distanceMeters } from './geo'

describe('distanceMeters — 두 좌표 사이 직선거리(m)', () => {
  it('매미성 대금교차로 두 정류장(GJB1599 · GJB1621)은 6m 남짓', () => {
    const main = { lat: 34.9673158, lng: 128.7030327 }
    const opposite = { lat: 34.9672817, lng: 128.7029844 }
    const d = distanceMeters(main, opposite)
    expect(d).toBeGreaterThan(5)
    expect(d).toBeLessThan(7)
  })

  it('위도 1도는 약 111km', () => {
    expect(distanceMeters({ lat: 34, lng: 128 }, { lat: 35, lng: 128 })).toBeCloseTo(111195, -2)
  })

  it('같은 자리는 0', () => {
    expect(distanceMeters({ lat: 34.97, lng: 128.7 }, { lat: 34.97, lng: 128.7 })).toBe(0)
  })
})
