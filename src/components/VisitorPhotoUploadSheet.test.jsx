import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VisitorPhotoUploadSheet from './VisitorPhotoUploadSheet'

vi.mock('../lib/api', () => ({ api: { uploadVisitorPhoto: vi.fn() } }))

/**
 * 손잡이를 끌어내리면 닫힌다 — 폰(카카오톡 인앱 브라우저) 실측 2026-09-13: 손잡이가 모양만 있는 막대라
 * 끌어도 시트가 그대로였다. 지도 스팟 시트(SpotSheet)는 되던 동작이다.
 */
function setup() {
  const onClose = vi.fn()
  const { container } = render(
    <VisitorPhotoUploadSheet poiId={3} spotName="조선해양문화관" onClose={onClose} onUploaded={vi.fn()} onSessionExpired={vi.fn()} />,
  )
  const handle = container.querySelector('[data-sheet-handle]')
  const sheet = screen.getByRole('dialog', { name: '사진 올리기' })
  return { onClose, handle, sheet }
}

const drag = (handle, from, to, end = 'pointerUp') => {
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: from })
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: to })
  fireEvent[end](handle, { pointerId: 1, clientY: to })
}

beforeEach(() => vi.clearAllMocks())

describe('올리기 시트 — 손잡이 끌어내리기', () => {
  it('손잡이는 폰에서 끌기를 브라우저 스크롤에 뺏기지 않는다(touch-action none)', () => {
    const { handle } = setup()
    expect(handle).not.toBeNull()
    expect(handle).toHaveStyle({ touchAction: 'none' })
  })

  it('충분히 끌어내리면 닫힌다', () => {
    const { handle, onClose } = setup()
    drag(handle, 100, 200)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('끄는 동안 시트가 손을 따라 내려오고, 조금만 끌다 놓으면 제자리로 돌아간다', () => {
    const { handle, sheet, onClose } = setup()
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 130 })
    expect(sheet.style.transform).toBe('translateY(30px)')

    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 130 })
    expect(onClose).not.toHaveBeenCalled()
    expect(sheet.style.transform).toBe('')
  })

  it('위로 끌면 시트가 올라가지 않고 닫히지도 않는다', () => {
    const { handle, sheet, onClose } = setup()
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 200 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 100 })
    expect(sheet.style.transform).toBe('')
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 100 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('브라우저가 끌기를 가져가면(pointercancel) 닫지 않고 제자리', () => {
    const { handle, sheet, onClose } = setup()
    drag(handle, 100, 220, 'pointerCancel')
    expect(onClose).not.toHaveBeenCalled()
    expect(sheet.style.transform).toBe('')
  })

  it('누르지 않고 움직이기만 하면 아무 일도 없다', () => {
    const { handle, sheet } = setup()
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 })
    expect(sheet.style.transform).toBe('')
  })
})
