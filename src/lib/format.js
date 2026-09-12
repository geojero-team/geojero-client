import { t } from '../i18n'

/** 130 -> "2시간 10분" */
export function formatDuration(minutes) {
  if (minutes == null) return t('format.empty')
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return t('format.duration.minute', { minutes: m })
  if (m === 0) return t('format.duration.hour', { hours: h })
  return t('format.duration.hourMinute', { hours: h, minutes: m })
}

/** 41200 -> "41,200원" — 자릿수 구분은 아직 ko-KR 고정입니다(쓰는 곳 없음). */
export function formatCost(won) {
  if (won == null) return t('format.empty')
  return t('format.cost', { amount: won.toLocaleString('ko-KR') })
}

/** "2026-09-07" -> "9/7" */
export function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split('-')
  return t('format.date.short', { month: Number(month), day: Number(day) })
}

const WEEKDAYS = [
  t('weekday.sun'),
  t('weekday.mon'),
  t('weekday.tue'),
  t('weekday.wed'),
  t('weekday.thu'),
  t('weekday.fri'),
  t('weekday.sat'),
]

/** 평일/주말 라벨 — 날짜 서식 세 개가 같이 씁니다. */
function dayTypeLabel(isoDate) {
  return t(isWeekend(isoDate) ? 'format.dayType.weekend' : 'format.dayType.weekday')
}

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
  return t('format.date.long', {
    month,
    day,
    weekday: WEEKDAYS[weekdayOf(isoDate)],
    dayType: dayTypeLabel(isoDate),
  })
}

/** "2026-09-14" -> "9월 14일(월)" — 저장 목록 카드(Figma 380:259)만 이 꼴을 씁니다. */
export function formatMonthDay(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number)
  return t('format.date.monthDay', { month, day, weekday: WEEKDAYS[weekdayOf(isoDate)] })
}

/** "2026-09-07" -> "9/7(월)" — 지도 조건 pill(Figma 240:168)은 요일까지만 씁니다. */
export function formatDateWeekday(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number)
  return t('format.date.weekday', { month, day, weekday: WEEKDAYS[weekdayOf(isoDate)] })
}

/** "2026-09-07" -> "9/7(월) 평일" — 일정 고르기 조건 줄(Figma 285:74)은 가운뎃점이 없습니다. */
export function formatDateDay(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number)
  return t('format.date.day', {
    month,
    day,
    weekday: WEEKDAYS[weekdayOf(isoDate)],
    dayType: dayTypeLabel(isoDate),
  })
}

export { WEEKDAYS }

/** 코스 테마 코드 -> 판정 조건 화면의 필터 라벨 */
export const THEME_LABELS = {
  VIEW: t('theme.VIEW'),
  CRUISE: t('theme.CRUISE'),
  BEACH: t('theme.BEACH'),
  GARDEN: t('theme.GARDEN'),
  CASTLE: t('theme.CASTLE'),
  HISTORY: t('theme.HISTORY'),
  EXHIBIT: t('theme.EXHIBIT'),
}
