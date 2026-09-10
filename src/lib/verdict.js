/** 판정 3분법의 심각도. 미확인을 성립으로 올리지 않도록 비교는 항상 이 순서로 합니다. */
const SEVERITY = { NO: 0, UNKNOWN: 1, YES: 2 }

/** 가는 편·오는 편 중 판정이 나쁜 방향 — Figma DirTabs 설명 '기본 선택 = 판정이 나쁜 쪽'. 같으면 가는 편. */
export function worseDirection(outVerdict, backVerdict) {
  return (SEVERITY[backVerdict] ?? 1) < (SEVERITY[outVerdict] ?? 1) ? 'back' : 'out'
}
