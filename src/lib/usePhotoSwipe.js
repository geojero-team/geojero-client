import { useRef } from 'react'
import { useDragScroll } from './useDragScroll'

/** 한 장 너비의 몇 %를 끌어야 다음 장으로 넘길지. */
const DRAG_STEP = 0.15

/**
 * 사진 칸 넘기기 — 스팟 상세와 맛집 · 숙소 상세가 같이 씁니다(둘로 나누면 한쪽만 고쳐집니다).
 *
 * - 손가락은 브라우저가 넘겨 줍니다(스냅 · 관성 · 고무줄). 마우스는 useDragScroll 로 끌고, ← → 키도 됩니다.
 * - **마지막 장에서 더 넘기면 첫 장으로** 돌아갑니다(2026-09-19 사용자: 「오른쪽으로 넘기면 다시 1로」).
 *   앞으로 가는 쪽만 돕니다 — 첫 장에서 뒤로 넘기면 그대로 멈춥니다.
 *
 * 쓰는 법:
 *   const trackRef = useRef(null)
 *   const { goTo, handlers } = usePhotoSwipe(trackRef)
 *   <div ref={trackRef} {...handlers}>…</div>
 *
 * 장 수는 트랙의 자식 수로 셉니다.
 */
export function usePhotoSwipe(trackRef) {
  // 손가락 넘기기의 시작점 — 마지막 장에서 더 밀었는지 보려고 둡니다(아래 onTouchEnd).
  const touchRef = useRef(null)

  /* 몇 번째 장으로 보낼지. 범위 밖이면 양 끝에 멈춥니다. */
  const goTo = (index) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(index, track.children.length - 1))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
  }

  /* 다음 장 — 마지막 장이면 첫 장으로 돌아갑니다. */
  const goNext = (from) => {
    const track = trackRef.current
    if (!track) return
    goTo(from >= track.children.length - 1 ? 0 : from + 1)
  }

  /* 지금 몇 번째 장인지 — 스크롤 위치에서 바로 셉니다(state 는 한 박자 늦을 수 있습니다). */
  const currentIndex = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return 0
    return Math.round(track.scrollLeft / track.clientWidth)
  }

  /* 손가락은 브라우저가 넘겨 줍니다. 다만 **마지막 장에서는 더 밀 곳이 없어** 아무 일도 안 일어나므로,
     그 장에서 시작해 왼쪽으로 문턱(DRAG_STEP)보다 더 밀었으면 — 세로로 민 게 아니라면 — 첫 장으로 보냅니다. */
  const onTouchStart = (event) => {
    const touch = event.touches[0]
    const track = trackRef.current
    touchRef.current = touch && track
      ? { x: touch.clientX, y: touch.clientY, atLast: currentIndex() >= track.children.length - 1 }
      : null
  }

  const onTouchEnd = (event) => {
    const start = touchRef.current
    touchRef.current = null
    const touch = event.changedTouches[0]
    const track = trackRef.current
    if (!start?.atLast || !touch || !track) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (dx < -track.clientWidth * DRAG_STEP && Math.abs(dx) > Math.abs(dy)) goTo(0)
  }

  /* 한 번 끌면 **한 장만** 넘어갑니다.
     끌린 거리를 그대로 스크롤에 주기 때문에, 세 장 너비를 끌면 세 장이 지나갑니다.
     그래서 멈출 자리를 거리가 아니라 방향으로 정합니다 — 문턱을 넘겨 끌었으면 그쪽으로
     한 장, 아니면 제자리. 끄는 동안 스냅을 꺼두므로 브라우저가 맞춰주지 않습니다. */
  const dragHandlers = useDragScroll(trackRef, ({ startLeft, delta }) => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const from = Math.round(startLeft / track.clientWidth)
    const past = Math.abs(delta) > track.clientWidth * DRAG_STEP
    if (past && delta < 0) goNext(from)
    else goTo(from + (past ? -1 : 0))
  })

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    if (event.key === 'ArrowRight') goNext(currentIndex())
    else goTo(currentIndex() - 1)
  }

  return { goTo, handlers: { onTouchStart, onTouchEnd, onKeyDown, ...dragHandlers } }
}
