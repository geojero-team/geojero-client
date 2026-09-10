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
 * onSettle({ startLeft, delta })은 손을 뗀 뒤 한 번 불립니다 — 한 장씩 넘기는 곳처럼
 * 멈출 자리를 직접 정해야 하는 곳에서 씁니다. startLeft는 끌기 시작한 스크롤 위치,
 * delta는 포인터가 움직인 거리(왼쪽으로 끌면 음수)입니다.
 */
export function useDragScroll(ref, onSettle) {
  const drag = useRef(null)
  const moved = useRef(false)

  const onPointerDown = (event) => {
    const el = ref.current
    // 터치는 브라우저 기본 동작이 더 낫습니다(관성·고무줄). 가로로 넘칠 게 없으면 잡지 않습니다.
    if (!el || event.pointerType === 'touch') return
    if (el.scrollWidth <= el.clientWidth) return
    /* 포인터 좌표는 뷰포트 기준인데 scrollLeft는 요소 로컬 기준이다. 이 앱은 데스크톱에서
       프레임에 CSS zoom(최대 1.8)을 걸기 때문에 둘의 단위가 다르다 — 그대로 빼면 화면이
       커서보다 배율만큼 빨리 움직인다. 실측: zoom 1.5에서 rect.width 585 / clientWidth 390.
       비율을 재서 나눠주면 zoom이 없을 땐 1이라 아무것도 달라지지 않는다. */
    const scale = el.clientWidth > 0 ? el.getBoundingClientRect().width / el.clientWidth : 1
    drag.current = { x: event.clientX, left: el.scrollLeft, dx: 0, scale }
    moved.current = false
    // 끄는 동안 스냅을 꺼둡니다. mandatory인 채로 scrollLeft를 직접 만지면 매 프레임
    // 스냅이 걸려 손을 따라오지 못합니다.
    el.style.scrollSnapType = 'none'
    el.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    const el = ref.current
    if (!drag.current || !el) return
    // 로컬 좌표로 환산해서 들고 다닌다 — onSettle이 clientWidth와 비교하기 때문이다.
    const dx = (event.clientX - drag.current.x) / drag.current.scale
    drag.current.dx = dx
    if (Math.abs(dx) > 3) moved.current = true
    el.scrollLeft = drag.current.left - dx
  }

  const end = () => {
    const el = ref.current
    if (!drag.current || !el) return
    const { left, dx } = drag.current
    drag.current = null
    onSettle?.({ startLeft: left, delta: dx })
    restoreSnap(el, Boolean(onSettle))
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

/**
 * 스냅을 도로 켭니다 — 단, onSettle이 스크롤을 옮기는 중이면 **멎은 뒤에** 켭니다.
 *
 * mandatory 스냅을 즉시 되살리면 브라우저가 '지금 위치에서 가장 가까운 장'으로 당겨버려,
 * onSettle이 고른 장으로 가던 부드러운 스크롤을 잡아먹습니다. 반 장도 안 끌었는데 다음
 * 장으로 넘기려 할 때 제자리로 튕겨 돌아오는 게 이 때문입니다.
 */
function restoreSnap(el, deferred) {
  if (!deferred) {
    el.style.scrollSnapType = ''
    return
  }
  let timer = null
  const done = () => {
    el.removeEventListener('scrollend', done)
    clearTimeout(timer)
    el.style.scrollSnapType = ''
  }
  // scrollend가 없는 브라우저(Safari 17.4 미만 등)를 위한 보험입니다.
  timer = setTimeout(done, 400)
  el.addEventListener('scrollend', done)
}
