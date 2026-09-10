/**
 * 데스크톱에서 폰 프레임을 창 크기에 맞춰 통째로 키웁니다.
 *
 * Figma 02-1 프레임은 390×844입니다. 이 비율을 지키면서 폭만 390으로 잠그면
 * 큰 모니터에서 화면이 손톱만 하게 보여 작업하기 어렵고, 반대로 높이를 창에 맡기면
 * 세로로 늘어나 Figma와 비율이 달라집니다. 그래서 프레임은 390×844로 두고
 * **배율만** 올립니다 — 안에 있는 것들의 상대 크기는 그대로입니다.
 *
 * transform: scale이 아니라 CSS zoom을 씁니다. zoom은 레이아웃 값을 바꾸므로
 * 카카오 지도가 실제로 커진 크기에 맞춰 타일을 그립니다(scale이면 확대돼 흐려집니다).
 *
 * 폰에서는 창이 390×844보다 작아 배율이 1 아래로 내려가는데, 그때는 적용하지
 * 않습니다. 폰은 지금처럼 폭에 맞춰 늘어나는 편이 맞습니다.
 */
const FRAME_WIDTH = 390
const FRAME_HEIGHT = 844

/** 너무 키우면 폰 화면이라는 느낌이 사라지고 지도 타일도 성겨집니다. */
const MAX_ZOOM = 1.8

function apply() {
  const fit = Math.min(
    window.innerWidth / FRAME_WIDTH,
    window.innerHeight / FRAME_HEIGHT,
  )
  const zoom = Math.min(Math.max(fit, 1), MAX_ZOOM)
  document.documentElement.style.setProperty('--frame-zoom', String(zoom))
}

export function startFrameZoom() {
  apply()
  window.addEventListener('resize', apply)
}
