/*
 * 스팟 시트 peek 높이 — SpotSheet.jsx 에서 옮겼습니다(2026-09-13). 지도를 줄이는 쪽(HomePage·CourseMapPage)과
 * 시트가 같은 값을 써야 해서 내보내는데, 컴포넌트 파일이 함수를 내보내면 fast refresh 규칙에 걸려 따로 뒀습니다.
 */

/**
 * peek 높이(px) = 손잡이 24 + 위 4 + 이름 32 + 분류 20 + 8 + 사진 140 + 아래 16.
 *
 * 지도를 이만큼 줄이는 쪽에서도 같은 값이 필요합니다 — 지도가 그대로면 `panTo`가 핀을
 * **시트에 가려진 자리**로 옮깁니다. 그래서 상수를 내보냅니다(값이 두 군데서 갈리면
 * 핀이 시트 경계에 걸립니다). 844 화면에서 지도가 536px 남습니다.
 */
export const PEEK_HEIGHT = 244

/**
 * 고현터미널 peek 높이 = 손잡이 24 + 위 4 + 이름 32 + 출발 지점 20 + 아래 16.
 * 터미널은 TourAPI 장소가 아니라 사진이 없습니다 — 자리그림으로 140px 을 채우면 없는 사진을 약속합니다.
 */
const TERMINAL_PEEK_HEIGHT = 96

/** 시트 peek 높이. */
export function peekHeightOf(spot) {
  return spot?.kind === 'TERMINAL' ? TERMINAL_PEEK_HEIGHT : PEEK_HEIGHT
}
