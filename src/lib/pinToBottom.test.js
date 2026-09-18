import { describe, expect, it } from 'vitest'
import { pinToBottom } from './pinToBottom'

/** 프레임과 시계를 손으로 돌립니다 — 진짜 rAF 를 쓰면 시험이 시간에 기댑니다. */
function harness({ height = 500 } = {}) {
  const listeners = new Map()
  const frames = []
  let clock = 0

  const box = {
    scrollHeight: height,
    scrollTop: 0,
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type, fn) => {
      if (listeners.get(type) === fn) listeners.delete(type)
    },
  }

  return {
    box,
    listeners,
    tick(frameCount = 1, msPerFrame = 16) {
      for (let i = 0; i < frameCount; i += 1) {
        const next = frames.shift()
        if (!next) return
        clock += msPerFrame
        next()
      }
    },
    start: (ms) =>
      pinToBottom(box, {
        ms,
        raf: (fn) => frames.push(fn),
        now: () => clock,
      }),
  }
}

describe('pinToBottom', () => {
  it('바로 맨 아래로 내린다', () => {
    const h = harness({ height: 500 })
    h.start(100)
    expect(h.box.scrollTop).toBe(500)
  })

  it('내용이 뒤늦게 자라도 따라간다 — 지도·사진이 나중에 자리를 잡는 경우', () => {
    const h = harness({ height: 500 })
    h.start(1000)
    expect(h.box.scrollTop).toBe(500)

    h.box.scrollHeight = 1800 // 미니 지도와 스팟 사진이 그려졌습니다
    h.tick()
    expect(h.box.scrollTop).toBe(1800)
  })

  it('높이가 그대로면 다시 밀어 넣지 않는다 — 사용자가 올려 둔 자리를 뺏지 않게', () => {
    const h = harness({ height: 500 })
    h.start(1000)

    h.box.scrollTop = 120 // 사용자가 위로 올렸습니다
    h.tick(3)
    expect(h.box.scrollTop).toBe(120)
  })

  it('손을 대면 그만둔다', () => {
    const h = harness({ height: 500 })
    h.start(1000)

    h.listeners.get('touchstart')()
    h.box.scrollHeight = 1800
    h.tick(3)

    expect(h.box.scrollTop).toBe(500)
    expect(h.listeners.size).toBe(0) // 듣던 것을 모두 놓습니다
  })

  it('정해진 시간이 지나면 스스로 놓는다', () => {
    const h = harness({ height: 500 })
    h.start(100)

    h.tick(10, 60) // 100ms 를 넘깁니다
    expect(h.listeners.size).toBe(0)

    h.box.scrollHeight = 1800
    h.tick(3)
    expect(h.box.scrollTop).toBe(500)
  })

  it('상자가 없으면 아무 일도 하지 않는다', () => {
    expect(() => pinToBottom(null)()).not.toThrow()
  })
})
