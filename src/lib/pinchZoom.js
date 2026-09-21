/**
 * 손가락 확대(pinch)를 막습니다 — 2026-09-21 사용자.
 *
 * 앱은 390 폭 틀을 창에 맞춰 통째로 키우므로(lib/frameZoom) 더 확대해 봐야 잘린 부분만 보입니다.
 * 시작화면이 1.8배로 확대돼 일부만 보이는 것을 사용자가 잡아냈습니다.
 *
 * **막는 곳이 셋이고 셋이 한 쌍입니다.** 앞의 둘만으로는 폰에서 여전히 확대됐습니다(사용자 실기기 확인):
 *   ① `index.html` viewport 의 `maximum-scale=1, user-scalable=no` — 안드로이드 크롬이 지킵니다.
 *      ⚠️ **아이폰 사파리는 무시합니다**(iOS 10~ — 애플이 일부러 그렇게 뒀습니다).
 *   ② `index.css` 의 `touch-action: pan-x pan-y` — 안드로이드의 두 손가락 확대·더블탭 확대를 막습니다.
 *      ⚠️ **아이폰 사파리는 페이지 확대를 이걸로 막지 않습니다.**
 *   ③ 여기 — 이벤트로 막습니다. 아이폰 사파리가 듣는 유일한 길이고,
 *      안드로이드 크롬의 **「강제로 확대/축소 사용 설정」**(설정 > 접근성, 켜면 viewport 를 덮어씁니다)도 이걸로 걸립니다.
 *
 * ⚠️ **카카오 지도 확대는 그대로입니다.** `preventDefault()` 는 **브라우저의 기본 확대**만 취소하고,
 * 이벤트가 다른 처리기에 가는 것을 막지 않습니다 — 지도의 확대는 카카오가 터치 좌표를 읽어
 * 직접 그리는 것이라 여기 걸리지 않습니다(지도 칸에는 `touch-action: none` 이 따로 걸려 있습니다).
 *
 * **한 손가락은 건드리지 않습니다** — 목록 스크롤 · 지도 끌기 · 시트 끌기가 그대로여야 합니다.
 *
 * 대가: 저시력 사용자가 손가락으로 글씨를 키울 수 없습니다(WCAG 1.4.4). 2026-09-21 사용자 결정(안 A).
 */
export function startPinchZoomBlock(target = document) {
  const stop = (e) => e.preventDefault()

  // 아이폰 사파리 전용(표준 아님) — 두 손가락 확대가 시작 · 진행될 때 옵니다.
  target.addEventListener('gesturestart', stop, { passive: false })
  target.addEventListener('gesturechange', stop, { passive: false })

  // 손가락이 둘 이상이면 확대 제스처입니다. passive: false 가 없으면 preventDefault 가 무시됩니다.
  target.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches?.length > 1) e.preventDefault()
    },
    { passive: false },
  )
}
