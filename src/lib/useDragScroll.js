import { useRef } from 'react'

/**
 * 마우스로 끌어서 가로 스크롤.
 *
 * **왜 필요한가**: 터치와 트랙패드는 브라우저가 알아서 가로로 밀어주지만, **마우스만
 * 있으면 가로 스크롤 컨테이너를 움직일 방법이 없습니다.** 스크롤바를 숨겨뒀고(디자인),
 * 휠은 세로입니다. 그래서 PC에서는 사진도 코스 카드도 한 장에 고정된 것처럼 보입니다.
 * 앱이 주 무대지만 공모전 심사는 PC 웹으로 봅니다.
 *
 * 쓰는 법:
 *   const ref = useRef(null)
 *   const drag = useDragScroll(ref)
 *   <div ref={ref} {...drag}>…</div>
 *
 * onSettle은 손을 뗀 뒤 한 번 불립니다 — 스냅 위치를 직접 맞춰야 하는 곳에서 씁니다.
 */
export function useDragScroll(ref, onSettle) {
  const drag = useRef(null)
  const moved = useRef(false)

  const onPointerDown = (event) => {
    const el = ref.current
    // 터치는 브라우저 기본 동작이 더 낫습니다(관성·고무줄). 가로로 넘칠 게 없으면 잡지 않습니다.
    if (!el || event.pointerType === 'touch') return
    if (el.scrollWidth <= el.clientWidth) return
    drag.current = { x: event.clientX, left: el.scrollLeft }
    moved.current = false
    // 끄는 동안 스냅을 꺼둡니다. mandatory인 채로 scrollLeft를 직접 만지면 매 프레임
    // 스냅이 걸려 손을 따라오지 못합니다.
    el.style.scrollSnapType = 'none'
    el.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    const el = ref.current
    if (!drag.current || !el) return
    const dx = event.clientX - drag.current.x
    if (Math.abs(dx) > 3) moved.current = true
    el.scrollLeft = drag.current.left - dx
  }

  const end = () => {
    const el = ref.current
    if (!drag.current || !el) return
    drag.current = null
    el.style.scrollSnapType = ''
    onSettle?.()
  }

  /* 끌고 나서 손을 떼면 그 자리의 카드가 '눌린' 것으로 처리됩니다 — 넘기려던 것뿐인데
     코스가 바뀌어 버립니다. 끌었으면 그 한 번의 클릭만 삼킵니다. */
  const onClickCapture = (event) => {
    if (!moved.current) return
    moved.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerCancel: end,
    onClickCapture,
  }
}
