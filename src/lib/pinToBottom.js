/* 사용자가 손을 대면 놓습니다. 끌기(touchstart · pointerdown) · 휠 · 키보드 모두 「내가 보겠다」는 뜻입니다. */
const USER_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown']

/**
 * 스크롤 상자를 잠깐 동안 맨 아래에 붙여 둡니다 — **내용이 더 그려져 높이가 늘어나도 따라갑니다.**
 *
 * 로그인하고 돌아와 저장이 이어질 때 씁니다. 한 프레임 뒤에 한 번만 내리면 그때의 높이까지만 가는데,
 * 코스 상세는 미니 지도와 스팟 사진이 그 뒤에 자리를 잡아 맨 아래가 다시 저 밑으로 밀려납니다
 * (2026-09-18 사용자: 「저장이 끝난 채로 화면 맨 아래로 가지 않고 있다」).
 *
 * 높이가 **변했을 때만** 다시 내립니다. 매 프레임 밀어 넣으면 사용자가 올리려 해도 손이 미끄러집니다.
 *
 * @param {Element | null} box 스크롤 상자(overflow-y 를 가진 바로 그 요소)
 * @param {{ ms?: number, raf?: (fn: () => void) => void, now?: () => number }} [options]
 * @returns {() => void} 그만두는 함수
 */
export function pinToBottom(box, options = {}) {
  if (!box) return () => {}

  const { ms = 1500, raf = (fn) => requestAnimationFrame(fn), now = () => Date.now() } = options
  const deadline = now() + ms

  let stopped = false
  let lastHeight = -1

  const release = () => {
    if (stopped) return
    stopped = true
    for (const type of USER_EVENTS) box.removeEventListener(type, release)
  }

  for (const type of USER_EVENTS) box.addEventListener(type, release)

  const step = () => {
    if (stopped) return
    if (box.scrollHeight !== lastHeight) {
      lastHeight = box.scrollHeight
      box.scrollTop = box.scrollHeight
    }
    if (now() >= deadline) {
      release()
      return
    }
    raf(step)
  }

  step()
  return release
}
