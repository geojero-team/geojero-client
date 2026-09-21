/**
 * 화면 틀(Screen)의 배율 — 폰에서는 **꽉 차게**, 데스크톱에서는 **폰처럼** 보이게.
 *
 * 화면은 전부 Figma 프레임 390×844 기준으로 그려져 있습니다. 그 비율을 지키면서 기기마다
 * 다르게 처리합니다.
 *
 *   폰(좁은 창)   — 폭에 맞춰 통째로 확대·축소합니다. 배율 = 창 폭 ÷ 390.
 *                   그래서 가로 412 폰이면 1.056배가 되어 좌우 여백 없이 꽉 찹니다.
 *                   세로는 창에 맡깁니다(Screen 의 height 가 배율로 나눠 받습니다) — 390:844 와
 *                   세로 비가 조금 달라도 지도·목록이 그 차이를 흡수합니다.
 *   데스크톱(넓은 창) — 390×844 프레임을 가운데 두고 **창에 맞춥니다**. 세로로 긴 창에서 화면이
 *                   늘어나지 않게 높이도 844로 잠급니다(Screen.module.css 의 미디어 쿼리).
 *
 * 2026-09-16 에 폰 규칙을 더했습니다. 전에는 배율 하한이 1이라, 폰에서는 390 을 넘는 폭이
 * 그대로 남아 좌우에 바닥색이 보였습니다. 브라우저에서는 티가 덜 나지만 앱(원스토어 TWA)으로
 * 띄우면 전체 화면이라 양옆 여백과 테두리 선이 그대로 드러납니다.
 *
 * ⚠️ 2026-09-21 에 **데스크톱의 배율 하한 1 을 없앴습니다**(사용자: "시작화면이 줌하면 줌 처리된다").
 * 브라우저 줌(Ctrl +/−)은 CSS 창을 그만큼 줄이는데, 하한에 걸려 배율이 안 줄면 844 설계가
 * **잘립니다** — 실측 1414×744 창에서 줌 150% 는 틀 높이 496, 200% 는 372 였습니다.
 * 다른 화면은 세로로 흐르는 목록이라 짧아져도 넘어가지만, 시작화면은 구도가 844 에 박혀 있어
 * 사진이 확대되고 글씨가 풀밭 위로 내려앉았습니다. 하한을 없애면 배율이 줌만큼 줄어
 * **화면에 보이는 크기와 구도가 줌과 상관없이 같습니다**(frameZoom.test.js 가 지킵니다).
 * 대가: 데스크톱에서 Ctrl + 로 글씨를 키울 수 없습니다 — 줌이 앱에 아무 효과가 없어집니다.
 * ⚠️ 남은 한계: 줌 250% 부터는 CSS 폭이 640 밑으로 떨어져 **폰 규칙**으로 넘어갑니다(폭에 맞춰 꽉).
 * 거기서는 다시 세로가 잘립니다 — 폰 규칙에 높이를 섞으면 진짜 폰에서 좌우 여백이 돌아오기 때문입니다(위).
 *
 * transform: scale 이 아니라 CSS zoom 을 씁니다. zoom 은 레이아웃 값을 바꾸므로 카카오 지도가
 * 실제로 커진 크기에 맞춰 타일을 그립니다(scale 이면 확대돼 흐려집니다).
 */
const FRAME_WIDTH = 390
const FRAME_HEIGHT = 844

/** 이 폭부터는 '폰 프레임을 보는 창'으로 다룹니다 — 태블릿·데스크톱. */
const WIDE_FROM = 640
/** 너무 키우면 폰 화면이라는 느낌이 사라지고 지도 타일도 성겨집니다. */
const MAX_ZOOM = 1.8

/** 창 크기 → 배율. 순수 함수라 테스트가 이것만 봅니다. */
export function zoomFor(width, height) {
  if (width < WIDE_FROM) return width / FRAME_WIDTH
  const fit = Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT)
  return Math.min(fit, MAX_ZOOM)
}

function apply() {
  const zoom = zoomFor(window.innerWidth, window.innerHeight)
  document.documentElement.style.setProperty('--frame-zoom', String(zoom))
}

export function startFrameZoom() {
  apply()
  window.addEventListener('resize', apply)
}
