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

/**
 * 311 -> "310m" · 1080 -> "1.1km" — 타는 곳의 직선거리(2026-09-14).
 * 서버 값은 좌표 사이 직선이라 걷는 길과 다릅니다. 1m 단위로 적으면 정확한 척하게 되어
 * 10m로 뭉개고, 「약」은 문구 쪽(boarding.*)이 붙입니다. 반올림이 1000m가 되면 km로 넘깁니다.
 */
export function formatDistance(meters) {
  const rounded = Math.round(meters / 10) * 10
  if (rounded < 1000) return t('format.distance.m', { m: rounded })
  return t('format.distance.km', { km: (meters / 1000).toFixed(1) })
}

/**
 * 소개문을 문장마다 한 줄로 — 스팟 상세(2026-09-15 사용자 요청 「문장 간 개행」).
 *
 * 글자는 **한 자도 바꾸지 않습니다.** TourAPI overview 는 원문 무수정이 공모전 조건입니다(서버 HttpTourApiGateway).
 * 바꾸는 건 공백뿐입니다 — 문장 끝(한글 뒤 . ? !, 뒤따르는 닫는 따옴표·괄호까지) 다음의 띄어쓰기를 줄바꿈으로.
 *  · 「입었다.섬도」처럼 마침표 뒤에 띄어쓰기가 없는 원문도 끊습니다
 *  · 숫자 뒤 점(1.5km)은 문장 끝이 아니라 끊지 않습니다 — 한글 뒤 점만 봅니다
 *  · 원문의 줄바꿈(「(출처 : …)」 앞 빈 줄)은 그대로, `<br>` 태그는 줄바꿈으로 둡니다
 * 화면은 `white-space: pre-line` 으로 그립니다.
 */
export function sentenceLines(text) {
  if (!text) return text
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/([가-힣][.?!]+['"’”)]*)[ \t]*(?=\S)/g, '$1\n')
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
