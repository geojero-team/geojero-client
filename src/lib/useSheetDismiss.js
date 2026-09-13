import { useRef, useState } from 'react'

/** 이만큼 끌어내리면 닫습니다. SpotSheet 의 SNAP_THRESHOLD 와 같은 값 — 짧으면 손 떨림에도 닫히고, 길면 안 닫힙니다. */
export const DISMISS_THRESHOLD = 56

/**
 * 아래에서 올라오는 시트(올리기 시트 · 로그인 시트)의 손잡이를 끌어내리면 닫습니다.
 *
 * 2026-09-13 폰(카카오톡 인앱 브라우저)에서 잡았습니다 — 손잡이가 모양만 있는 막대라 끌어도 시트가
 * 그대로였습니다. 지도 스팟 시트(SpotSheet)는 되던 동작이라 같은 화면 안에서 손잡이 둘이 다르게 굴었습니다.
 *
 *   handleProps  손잡이에 펼칩니다. `touch-action: none` 을 **인라인으로** 붙입니다 — 이게 없으면 폰 브라우저가
 *                아래로 끄는 손가락을 스크롤·당겨서 새로고침으로 가져가고 pointercancel 을 보냅니다.
 *                시트마다 CSS 에 적으면 하나쯤 빠뜨리므로 훅이 직접 붙입니다
 *   sheetStyle   시트에 줍니다. 끄는 동안 손을 따라 내려오고(위로는 안 올라감), 놓으면 제자리입니다
 *
 * 누르기만 하면(끌지 않으면) 닫지 않습니다 — 올리기 시트에는 고른 사진과 캡션이 있어, 손잡이 근처를
 * 스치기만 해도 입력이 사라지면 안 됩니다. 키보드·마우스는 시트 밖(스크림 「닫기」)으로 닫습니다.
 */
export function useSheetDismiss(onDismiss) {
  const [offset, setOffset] = useState(0)
  const startY = useRef(null)

  const reset = (event) => {
    startY.current = null
    setOffset(0)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const handleProps = {
    'data-sheet-handle': '',
    style: { touchAction: 'none' },
    onPointerDown: (event) => {
      startY.current = event.clientY
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    onPointerMove: (event) => {
      if (startY.current == null) return
      setOffset(Math.max(0, event.clientY - startY.current))
    },
    onPointerUp: (event) => {
      if (startY.current == null) return
      const moved = event.clientY - startY.current
      reset(event)
      if (moved > DISMISS_THRESHOLD) onDismiss()
    },
    // 브라우저가 끌기를 가져갔습니다. 사용자가 놓은 게 아니므로 닫지 않습니다.
    onPointerCancel: (event) => {
      if (startY.current != null) reset(event)
    },
  }

  // 끄는 동안에는 전환 애니메이션을 끕니다 — 켜두면 손을 늦게 따라옵니다. 놓으면 CSS 전환으로 제자리에 돌아갑니다.
  const sheetStyle = offset > 0 ? { transform: `translateY(${offset}px)`, transition: 'none' } : undefined

  return { handleProps, sheetStyle }
}
