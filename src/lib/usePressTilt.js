import { useRef } from 'react'

/** 기울기 최대 각(도). 더 크면 버튼이 눌리는 게 아니라 흔들리는 것처럼 보입니다. */
const MAX_TILT = 5

/** 눌렀을 때 줄어드는 비율. 전체 폭 버튼이라 0.98 만 줄여도 양 끝이 3~4px 움직여 충분히 읽힙니다. */
const PRESS_SCALE = 0.98

const clamp = (n) => Math.max(-1, Math.min(1, n))

/**
 * 누르면 **살짝 작아지면서 누른 쪽으로 기웁니다** — 손가락 아래가 들어가는 촉감(2026-09-19 사용자 요청).
 *
 * 기울기는 CSS 만으로 못 합니다. `:active` 는 "눌렸다"만 알 뿐 **어디를** 눌렀는지 모르기 때문입니다.
 * 그래서 포인터 좌표로 가운데에서 얼마나 치우쳤는지를 재어 CSS 변수로 넣고, 그리는 일은 CSS 가 합니다.
 *
 * 상태(useState)를 쓰지 않고 DOM 에 직접 씁니다 — 누를 때마다 렌더가 도는 것을 막습니다
 * (lib/fitOneLine 과 같은 방법).
 *
 * 쓰는 쪽 CSS 는 이 세 변수를 읽습니다. 기본값이 있어 훅을 안 써도 모양이 깨지지 않습니다.
 *   --press-rx     위아래 기울기   --press-ry  좌우 기울기   --press-scale  줄어드는 비율
 *
 * **작은 것에는 쓰지 않습니다**(칩 · 아이콘 버튼 · 탭바 · 목록 줄). 작고 자주 눌리는 것이 기울면
 * 시선이 흔들리고 앱이 느려 보입니다. 이 앱의 누름 반응은 「색은 전부, 움직임은 주인공만」입니다.
 *
 * `attach` 는 **콜백**입니다(ref 객체가 아닙니다). 요소를 붙잡는 일과 호출부 ref 를 함께 채우는 일을
 * 모두 훅 안에서 합니다 — 컴포넌트에서 `press.ref.current = node` 로 손대면 React 컴파일러가
 * 「훅이 돌려준 값을 밖에서 고치지 말라」고 막습니다(2026-09-19 린트).
 *
 * 이름을 `ref` 로 두지 않은 것도 같은 규칙 때문입니다. `react-hooks/refs` 는 **`ref` 라는 이름의 속성**을
 * 무조건 ref 로 보고 렌더 중에 읽는 것을 막습니다 — `{ ref, handlers }` 를 돌려주면 같이 딸려 있는
 * `handlers` 를 펼치는 것까지 오류가 됩니다.
 *
 * @param {{ maxTilt?: number, scale?: number, forwardedRef?: object|Function }} [options]
 *        forwardedRef — 호출부가 따로 ref 를 받아야 할 때(Tutorial 이 버튼 자리를 재려고 넘깁니다).
 * @returns {{ attach: Function, handlers: object }} attach 는 기울일 요소의 ref 에, handlers 는 그대로 펼칩니다
 */
export function usePressTilt({ maxTilt = MAX_TILT, scale = PRESS_SCALE, forwardedRef } = {}) {
  const node = useRef(null)

  const attach = (el) => {
    node.current = el
    // 호출부 ref 도 같이 채웁니다 — 하나만 붙이면 다른 하나가 조용히 사라집니다.
    if (typeof forwardedRef === 'function') forwardedRef(el)
    else if (forwardedRef) forwardedRef.current = el
  }

  const write = (rx, ry, s) => {
    const el = node.current
    if (!el) return
    el.style.setProperty('--press-rx', `${rx}deg`)
    el.style.setProperty('--press-ry', `${ry}deg`)
    el.style.setProperty('--press-scale', String(s))
  }

  const press = (event) => {
    const el = node.current
    if (!el) return
    const box = el.getBoundingClientRect()
    // 잴 수 없는 곳(화면 밖)에서는 기울이지 않고 줄이기만 합니다.
    if (!box.width || !box.height) {
      write(0, 0, scale)
      return
    }
    // 가운데를 0, 가장자리를 ±1 로 봅니다.
    const dx = clamp((event.clientX - (box.left + box.width / 2)) / (box.width / 2))
    const dy = clamp((event.clientY - (box.top + box.height / 2)) / (box.height / 2))
    /* 누른 쪽이 **들어가야** 합니다(2026-09-19 화면으로 확인 — 오른쪽을 누르면 오른쪽 끝이 좁아집니다).
       rotateY 가 양수면 오른쪽이 뒤로 가므로 오른쪽을 누르면(dx > 0) 그대로 양수를 씁니다.
       rotateX 는 양수면 위쪽이 뒤로 가므로, 아래를 누르면(dy > 0) 아래가 들어가게 부호를 뒤집습니다. */
    write(-dy * maxTilt, dx * maxTilt, scale)
  }

  const release = () => write(0, 0, 1)

  return {
    attach,
    handlers: {
      onPointerDown: press,
      onPointerUp: release,
      onPointerCancel: release,
      // 누른 채로 손가락이 버튼 밖으로 나가면 눌림이 풀립니다 — 그때 제자리로 돌려놓습니다.
      onPointerLeave: release,
    },
  }
}
