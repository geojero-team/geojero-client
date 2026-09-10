/** 130 -> "2시간 10분" */
export function formatDuration(minutes) {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

/** 41200 -> "41,200원" */
export function formatCost(won) {
  if (won == null) return '—'
  return `${won.toLocaleString('ko-KR')}원`
}

/** "2026-09-07" -> "9/7" */
export function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split('-')
  return `${Number(month)}/${Number(day)}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 거제는 주말에 배차가 줄어서 평일/주말 구분이 판정에 직접 영향을 줍니다. */
export function isWeekend(isoDate) {
  const day = weekdayOf(isoDate)
  return day === 0 || day === 6
}

export function weekdayOf(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

/** "2026-09-07" -> "9/7(월) · 평일" */
export function formatDateLong(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number)
  const label = WEEKDAYS[weekdayOf(isoDate)]
  return `${month}/${day}(${label}) · ${isWeekend(isoDate) ? '주말' : '평일'}`
}

/** "2026-09-07" -> "9/7(월)" — 지도 조건 pill(Figma 240:168)은 요일까지만 씁니다. */
export function formatDateWeekday(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number)
  return `${month}/${day}(${WEEKDAYS[weekdayOf(isoDate)]})`
}

/** "2026-09-07" -> "9/7(월) 평일" — 일정 고르기 조건 줄(Figma 285:74)은 가운뎃점이 없습니다. */
export function formatDateDay(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number)
  return `${month}/${day}(${WEEKDAYS[weekdayOf(isoDate)]}) ${isWeekend(isoDate) ? '주말' : '평일'}`
}

export { WEEKDAYS }

/** 코스 테마 코드 -> 판정 조건 화면의 필터 라벨 */
export const THEME_LABELS = {
  VIEW: '언덕·전망',
  CRUISE: '유람선',
  BEACH: '해수욕장',
  GARDEN: '식물원',
  CASTLE: '성',
}
