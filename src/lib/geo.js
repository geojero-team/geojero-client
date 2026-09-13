/**
 * 좌표 계산 — 카카오 SDK를 모르는 순수 함수(2026-09-14).
 *
 * 타는 곳 지도에서 핀끼리 얼마나 가까운지 재려고 둡니다. 서버가 주는 `distanceM`은 출발 자리에서
 * 정류장까지뿐이라, 핀과 핀 사이(길 건너편 정류장 6m 등)는 여기서 잽니다.
 * 컴포넌트 파일이 함수를 내보내면 fast refresh 규칙에 걸려 따로 뒀습니다.
 */

const EARTH_RADIUS_M = 6371008.8

/** 하버사인 직선거리(m). 수십 m~수 km라 구면 오차는 무시해도 됩니다. */
export function distanceMeters(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}
