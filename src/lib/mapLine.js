/**
 * 지도 위에 우리가 긋는 선 — **전부 직선이고 실제 길이 아닙니다.**
 *
 * 그래서 실선을 쓰지 않습니다(2026-09-16 사용자 결정). 실선은 「이 길로 간다」로 읽히는데
 * 코스 순서 선은 학동 → 해금강처럼 **바다를 가로지르고**, 타는 곳 선은 두 점 사이 직선일 뿐입니다.
 * 걷는 길 · 버스 길은 카카오맵이 그립니다(카드의 「카카오맵으로 도보 길찾기」).
 *
 * 색은 **진회색**입니다. 파랑은 바다 · 카카오 라벨 · 우리 버스 마커와 같은 계열이라 선이 묻혔고,
 * 마커(파랑)와 거제 9경(주황)이 뜻을 가진 색이라 선까지 색을 가지면 지도에서 색이 셋으로 싸웁니다.
 * (Figma `285:234`는 2.5px 파란 실선입니다 — 디자인브리프 부록 H 「09-16」에 이탈로 적었습니다.)
 */
const STRAIGHT_COLOR = '#344054'
const STRAIGHT_OPACITY = 0.85

/** 타는 곳 지도 — 출발 곳 ↔ 정류장. 선이 짧아 점선 간격도 짧게. */
export const LINK_LINE = {
  strokeWeight: 2,
  strokeColor: STRAIGHT_COLOR,
  strokeOpacity: STRAIGHT_OPACITY,
  strokeStyle: 'shortdash',
}

/** 코스 지도 · 코스 상세 미니맵 — 고현터미널 → 1 → … → n → 고현터미널 방문 순서. 선이 길어 점선 간격을 길게. */
export const ORDER_LINE = {
  strokeWeight: 2.5,
  strokeColor: STRAIGHT_COLOR,
  strokeOpacity: STRAIGHT_OPACITY,
  strokeStyle: 'dash',
}
