import { describe, expect, it } from 'vitest'
import { zoomFor } from './frameZoom'

/** 화면 틀 배율 — 폰은 폭에 맞춰 꽉, 데스크톱은 390×844 프레임을 키워서. */
describe('zoomFor', () => {
  it('폰은 폭에 맞춘다 — 좌우 여백이 남지 않게(앱 전체 화면)', () => {
    expect(zoomFor(412, 915)).toBeCloseTo(412 / 390, 5) // 갤럭시 계열
    expect(zoomFor(430, 932)).toBeCloseTo(430 / 390, 5) // 큰 아이폰
    expect(zoomFor(390, 844)).toBe(1) // Figma 기준 기기
    expect(zoomFor(360, 780)).toBeCloseTo(360 / 390, 5) // 좁은 폰은 줄인다
  })

  it('데스크톱은 프레임을 가운데 두고 키우기만 한다', () => {
    expect(zoomFor(1440, 900)).toBeCloseTo(900 / 844, 5) // 높이가 한계
    expect(zoomFor(1440, 3000)).toBe(1.8) // 아무리 커도 상한
    expect(zoomFor(800, 500)).toBe(1) // 낮은 창에서도 줄이지 않는다
  })
})
