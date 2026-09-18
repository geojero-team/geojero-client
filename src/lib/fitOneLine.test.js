import { describe, expect, it } from 'vitest'
import { fitOneLine } from './fitOneLine'

/** 잰 값을 흉내 냅니다 — jsdom 은 글자를 그리지 않아 clientWidth · scrollWidth 가 늘 0 입니다. */
const elementOf = ({ available, neededAtMax, max }) => ({
  style: {},
  clientWidth: available,
  get scrollWidth() {
    // 글자 폭은 크기에 비례합니다 — 지금 걸린 크기에 맞춰 필요한 폭을 돌려줍니다.
    const size = parseInt(this.style.fontSize, 10) || max
    return Math.round((neededAtMax * size) / max)
  },
})

describe('fitOneLine', () => {
  it('한 줄에 들어가면 크기를 건드리지 않는다', () => {
    const el = elementOf({ available: 350, neededAtMax: 300, max: 30 })
    fitOneLine(el, { max: 30, min: 22 })
    expect(el.style.fontSize).toBe('30px')
    expect(el.style.whiteSpace).toBe('nowrap')
  })

  it('조금 넘치면 그만큼만 줄여 한 줄로 앉힌다', () => {
    // 코스 125 의 제목과 같은 상황 — 350 칸에 한 줄로는 약 420 이 필요했습니다.
    const el = elementOf({ available: 350, neededAtMax: 420, max: 30 })
    fitOneLine(el, { max: 30, min: 22 })
    expect(el.style.fontSize).toBe('25px')
    expect(el.style.whiteSpace).toBe('nowrap')
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth)
  })

  it('최소 크기로도 못 들어가면 두 줄로 되돌린다 — 읽기 어려운 크기로 한 줄을 만들지 않는다', () => {
    const el = elementOf({ available: 350, neededAtMax: 900, max: 30 })
    fitOneLine(el, { max: 30, min: 22 })
    expect(el.style.fontSize).toBe('22px')
    expect(el.style.whiteSpace).toBe('normal')
  })

  it('잴 수 없는 곳에서는 아무것도 하지 않는다(테스트 · 화면 밖)', () => {
    const el = { style: {}, clientWidth: 0, scrollWidth: 0 }
    fitOneLine(el, { max: 30, min: 22 })
    expect(el.style.fontSize).toBe('30px')
  })
})
