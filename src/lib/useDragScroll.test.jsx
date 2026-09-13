import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useDragScroll } from './useDragScroll'

// 가로로 넘치는 줄 안에 누를 수 있는 버튼이 있는 모양 — 방문자 사진 줄이 이렇다.
function Strip({ onTile }) {
  const ref = useRef(null)
  const drag = useDragScroll(ref)
  return (
    <div ref={ref} data-testid="strip" {...drag}>
      <button type="button" onClick={onTile}>타일</button>
    </div>
  )
}

function setup() {
  const onTile = vi.fn()
  render(<Strip onTile={onTile} />)
  const strip = screen.getByTestId('strip')
  // jsdom은 레이아웃이 없어 넘침을 직접 만든다
  Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 800 })
  Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 350 })
  // 화면 너비도 jsdom은 0이다 — 그대로 두면 zoom 배율이 0이 되어 1px만 움직여도 끌기로 잡힌다
  strip.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 350, bottom: 96, width: 350, height: 96 })
  strip.setPointerCapture = vi.fn()
  return { strip, onTile, tile: screen.getByRole('button', { name: '타일' }) }
}

describe('useDragScroll — 누르기와 끌기를 가른다', () => {
  // Chrome 실측(2026-09-13): 누르는 순간 줄이 포인터를 잡으면 pointerup·click 대상이
  // 안쪽 버튼이 아니라 줄(DIV)이 되어, 마우스로 누른 사진 타일이 열리지 않았다.
  it('누르기만 하면 포인터를 잡지 않는다', () => {
    const { strip, tile } = setup()
    fireEvent.pointerDown(tile, { pointerId: 1, pointerType: 'mouse', clientX: 100 })
    expect(strip.setPointerCapture).not.toHaveBeenCalled()
  })

  it('3px 넘게 끌면 그때 포인터를 잡는다', () => {
    const { strip, tile } = setup()
    fireEvent.pointerDown(tile, { pointerId: 7, pointerType: 'mouse', clientX: 100 })
    fireEvent.pointerMove(strip, { pointerId: 7, pointerType: 'mouse', clientX: 102 })
    expect(strip.setPointerCapture).not.toHaveBeenCalled()
    fireEvent.pointerMove(strip, { pointerId: 7, pointerType: 'mouse', clientX: 90 })
    fireEvent.pointerMove(strip, { pointerId: 7, pointerType: 'mouse', clientX: 80 })
    expect(strip.setPointerCapture).toHaveBeenCalledTimes(1)
    expect(strip.setPointerCapture).toHaveBeenCalledWith(7)
  })

  it('끌지 않고 누른 클릭은 안쪽 버튼에 그대로 간다', () => {
    const { tile, onTile } = setup()
    fireEvent.pointerDown(tile, { pointerId: 1, pointerType: 'mouse', clientX: 100 })
    fireEvent.pointerUp(tile, { pointerId: 1, pointerType: 'mouse', clientX: 100 })
    fireEvent.click(tile)
    expect(onTile).toHaveBeenCalledTimes(1)
  })

  it('끌고 난 뒤의 클릭 한 번은 삼킨다', () => {
    const { strip, tile, onTile } = setup()
    fireEvent.pointerDown(tile, { pointerId: 1, pointerType: 'mouse', clientX: 100 })
    fireEvent.pointerMove(strip, { pointerId: 1, pointerType: 'mouse', clientX: 60 })
    fireEvent.pointerUp(strip, { pointerId: 1, pointerType: 'mouse', clientX: 60 })
    fireEvent.click(tile)
    expect(onTile).not.toHaveBeenCalled()
  })
})
