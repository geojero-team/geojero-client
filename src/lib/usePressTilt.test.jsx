import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { usePressTilt } from './usePressTilt'

/* 훅이라 컴포넌트 안에서만 부를 수 있습니다. 작은 버튼 하나를 그려 실제 포인터 이벤트를 보냅니다.
   jsdom 은 크기를 늘 0 으로 주므로 폭 300 · 높이 48 버튼이 화면 (0,0) 에 있다고 손으로 정합니다 —
   가운데는 (150, 24) 입니다. */
const BOX = { left: 0, top: 0, right: 300, bottom: 48, width: 300, height: 48, x: 0, y: 0 }

function Probe({ options, forwarded }) {
  const { attach, handlers } = usePressTilt({ ...options, forwardedRef: forwarded })
  return (
    <button type="button" data-testid="btn" ref={attach} {...handlers}>
      누르기
    </button>
  )
}

function setup(options, forwarded) {
  render(<Probe options={options} forwarded={forwarded} />)
  const el = screen.getByTestId('btn')
  el.getBoundingClientRect = () => BOX
  return el
}

const v = (el, name) => el.style.getPropertyValue(name)

describe('usePressTilt — 누르면 작아지며 누른 쪽으로 기운다', () => {
  it('가운데를 누르면 기울지 않고 작아지기만 한다', () => {
    const el = setup()
    fireEvent.pointerDown(el, { clientX: 150, clientY: 24 })

    expect(v(el, '--press-rx')).toBe('0deg')
    expect(v(el, '--press-ry')).toBe('0deg')
    expect(v(el, '--press-scale')).toBe('0.98')
  })

  it('오른쪽 끝을 누르면 오른쪽이 들어간다(rotateY 양수)', () => {
    const el = setup()
    fireEvent.pointerDown(el, { clientX: 300, clientY: 24 })

    expect(v(el, '--press-ry')).toBe('5deg')
    expect(v(el, '--press-rx')).toBe('0deg')
  })

  it('왼쪽 끝은 반대로 기운다', () => {
    const el = setup()
    fireEvent.pointerDown(el, { clientX: 0, clientY: 24 })

    expect(v(el, '--press-ry')).toBe('-5deg')
  })

  it('아래를 누르면 아래가 들어간다(rotateX 음수)', () => {
    const el = setup()
    fireEvent.pointerDown(el, { clientX: 150, clientY: 48 })

    expect(v(el, '--press-rx')).toBe('-5deg')
  })

  it('버튼 밖을 눌러도 가장자리 이상으로는 기울지 않는다', () => {
    const el = setup()
    fireEvent.pointerDown(el, { clientX: 9999, clientY: 9999 })

    expect(v(el, '--press-ry')).toBe('5deg')
    expect(v(el, '--press-rx')).toBe('-5deg')
  })

  it('놓으면 제자리로 돌아간다', () => {
    const el = setup()
    fireEvent.pointerDown(el, { clientX: 300, clientY: 48 })
    fireEvent.pointerUp(el)

    expect(v(el, '--press-rx')).toBe('0deg')
    expect(v(el, '--press-ry')).toBe('0deg')
    expect(v(el, '--press-scale')).toBe('1')
  })

  it('손가락이 밖으로 나가도 풀린다', () => {
    const el = setup()
    fireEvent.pointerDown(el, { clientX: 300, clientY: 24 })
    fireEvent.pointerLeave(el)

    expect(v(el, '--press-scale')).toBe('1')
  })

  it('기울기와 비율을 바꿔 쓸 수 있다 — 큰 카드는 덜 기울여야 출렁이지 않는다', () => {
    const el = setup({ maxTilt: 2, scale: 0.99 })
    fireEvent.pointerDown(el, { clientX: 300, clientY: 24 })

    expect(v(el, '--press-ry')).toBe('2deg')
    expect(v(el, '--press-scale')).toBe('0.99')
  })

  it('호출부 ref 도 함께 채운다 — 튜토리얼이 버튼 자리를 재야 한다', () => {
    const forwarded = createRef()
    const el = setup(undefined, forwarded)

    expect(forwarded.current).toBe(el)
  })
})
