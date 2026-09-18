/**
 * 한 줄에 맞추기 — 제목이 어정쩡하게 넘칠 때 **글자만 조금 줄여** 한 줄로 앉힙니다(2026-09-18 사용자 결정).
 *
 * 코스 상세 제목이 「파도가 몽돌을 굴리는 소리 따라」처럼 마지막 줄에 두세 글자만 남기고 넘어갔습니다.
 * 두 줄을 고르게 나누는 방법(text-wrap: balance)도 있지만, 사용자는 **한 줄인 것이 더 중요하다**고 정했습니다.
 *
 * 재는 방법: 한 줄로 폈을 때 필요한 폭(scrollWidth)과 쓸 수 있는 폭(clientWidth)의 비율만큼 글자를 줄입니다.
 * 글자 폭은 크기에 거의 비례하므로 한 번만 재면 됩니다 — 1px 씩 줄여 보는 반복이 필요 없습니다.
 *
 * **최소 크기가 있습니다.** 거기까지 줄여도 한 줄에 못 들어가면 **두 줄로 되돌립니다** —
 * 읽기 어려운 크기로 한 줄을 만드는 것은 목적이 아닙니다.
 *
 * DOM 을 직접 고칩니다(상태를 쓰지 않습니다) — 화면이 다시 그려질 이유가 없는 일이고,
 * 이펙트 안에서 상태를 바꾸면 연쇄 렌더가 됩니다(react-hooks/set-state-in-effect).
 *
 * @param el  제목 요소. 블록이어야 합니다(clientWidth 가 쓸 수 있는 폭이 됩니다)
 * @param max 기본 글자 크기(px)
 * @param min 여기까지만 줄입니다(px)
 */
export function fitOneLine(el, { max, min }) {
  if (!el) return

  el.style.whiteSpace = 'nowrap'
  el.style.fontSize = `${max}px`

  const available = el.clientWidth
  const needed = el.scrollWidth
  // 잴 수 없는 곳(테스트·화면 밖)이거나 이미 한 줄에 들어가면 그대로 둡니다.
  if (!available || !needed || needed <= available) return

  const fitted = Math.floor(max * (available / needed))
  if (fitted >= min) {
    el.style.fontSize = `${fitted}px`
    return
  }

  el.style.fontSize = `${min}px`
  el.style.whiteSpace = 'normal'
}
