/**
 * 홈 '최근에 본 코스' 상태 (2026-09-10 팀 결정).
 *   - 아직 코스 추천을 받은 적이 없다        → 홈 A: 최근 코스 섹션 자체를 숨김
 *   - 추천은 받았지만 코스를 열어본 적이 없다 → 홈 B: 빈 카드 '아직 본 코스가 없어요'
 *   - 코스를 하나라도 열어봤다               → 채워진 카드 (Figma 274:529)
 * 서버 저장(saved_trips)과는 별개인 기기 로컬 기록입니다.
 */

const RECOMMENDED_KEY = 'geojero.recommended'
const RECENT_KEY = 'geojero.recentCourse'

export function hasRecommendation() {
  try {
    return window.localStorage.getItem(RECOMMENDED_KEY) === '1'
  } catch {
    return false
  }
}

export function markRecommended() {
  try {
    window.localStorage.setItem(RECOMMENDED_KEY, '1')
  } catch {
    // 저장 못 해도 화면은 돌아가야 합니다.
  }
}

/** 형태가 맞지 않는 기록(손상·구버전)은 없는 것으로 — 홈이 죽으면 안 됩니다. */
export function loadRecentCourse() {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw)
    const valid =
      entry &&
      typeof entry.name === 'string' &&
      Array.isArray(entry.spotIds) &&
      typeof entry.date === 'string'
    return valid ? entry : null
  } catch {
    return null
  }
}

/** 코스를 열어본 순간 호출 — 추천을 받은 것이기도 하므로 함께 표시합니다. */
export function saveRecentCourse({ name, spotIds, verdict, date }) {
  try {
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify({ name, spotIds, verdict, date }),
    )
    window.localStorage.setItem(RECOMMENDED_KEY, '1')
  } catch {
    // 위와 같음
  }
}
