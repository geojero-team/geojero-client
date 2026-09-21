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

  it('데스크톱은 프레임을 가운데 두고 창에 맞춘다', () => {
    expect(zoomFor(1440, 900)).toBeCloseTo(900 / 844, 5) // 높이가 한계
    expect(zoomFor(1440, 3000)).toBe(1.8) // 아무리 커도 상한
    // 낮은 창에서는 **줄여서 전부 보여준다**(2026-09-21 사용자 — 전에는 하한이 1 이라 844 설계가 잘렸다)
    expect(zoomFor(800, 500)).toBeCloseTo(500 / 844, 5)
  })

  /* 2026-09-21 사용자: 「시작화면이 줌하면 줌 처리된다(줌아웃도 마찬가지)」.
     브라우저 줌은 CSS 창을 그만큼 줄입니다 — 배율이 같이 줄어야 화면에 보이는 크기가 그대로입니다.
     전에는 하한 1 에 걸려 배율이 안 줄고 틀만 잘렸습니다(744 → 496 → 372). */
  it('브라우저 줌(Ctrl +/−)이 화면을 바꾸지 않는다 — 배율이 줌만큼 줄어 실제 크기가 같다', () => {
    const [W, H] = [1414, 744] // 물리 창(1440×900 노트북의 내용 칸)
    const shown = (pct) => zoomFor(Math.round(W / pct), Math.round(H / pct)) * pct

    expect(shown(1.5)).toBeCloseTo(shown(1), 3)
    expect(shown(2)).toBeCloseTo(shown(1), 3)
  })
})
