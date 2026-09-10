/**
 * 판정 조건(출발지 / 날짜 / 출발 시각 / 귀가 시각).
 *
 * PROJECT_CONTEXT 6-①: 첫 진입은 빈 폼이 아니라 "이미 판정된 상태"여야 합니다.
 * 그래서 값은 물어보지 않고 아래 기본값으로 곧장 판정에 들어갑니다.
 *   - 날짜   : 오늘
 *   - 출발지 : 마지막으로 고른 터미널(localStorage), 없으면 부산서부
 *   - 시각   : 가장 빠른 첫차 07:00 → 23:00
 */

/**
 * 판정에 넣을 수 있는 출발 터미널.
 *
 * 여기 없는 터미널은 "아직 안 만든 것"이 아니라 **시간표를 확인하지 못한 곳**입니다.
 * 추정 시간표로 판정하면 막차를 놓치기 때문에 일부러 빼둡니다.
 * 백엔드가 시간표를 확보하는 대로 이 배열만 늘리면 됩니다.
 */
export const ORIGINS = [
  { code: 'BUSAN_SEOBU', label: '부산서부', region: '부산' },
  { code: 'SEOUL_NAMBU', label: '서울남부', region: '서울' },
  { code: 'TONGYEONG', label: '통영', region: '경남' },
]

export const ORIGIN_LABELS = Object.fromEntries(
  ORIGINS.map(({ code, label }) => [code, label]),
)

const ORIGIN_STORAGE_KEY = 'geojero.origin'
const DEFAULT_ORIGIN = 'BUSAN_SEOBU'

export function loadOrigin() {
  try {
    const saved = window.localStorage.getItem(ORIGIN_STORAGE_KEY)
    return saved && saved in ORIGIN_LABELS ? saved : DEFAULT_ORIGIN
  } catch {
    // 사파리 시크릿 모드 등 localStorage 접근이 막힌 환경
    return DEFAULT_ORIGIN
  }
}

export function saveOrigin(code) {
  try {
    window.localStorage.setItem(ORIGIN_STORAGE_KEY, code)
  } catch {
    // 저장 못 해도 판정 자체는 돌아가야 하므로 무시합니다.
  }
}

/** 로컬 타임존 기준 오늘 날짜. toISOString()은 UTC라 밤에 하루가 밀립니다. */
export function todayISO() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function defaultTripParams() {
  return {
    origin: loadOrigin(),
    date: todayISO(),
    departTime: '07:00',
    returnBy: '23:00',
  }
}

/* ── URL 왕복 ──────────────────────────────────────────────────────────────
   홈에서 확정한 조건이 지도까지 살아남아야 카드의 판정과 지도의 판정이 같은 조건이 됩니다.
   returnBy=null(막차까지)은 'last'로 적습니다. */

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function tripToSearch(trip, extra = {}) {
  return new URLSearchParams({
    ...extra,
    origin: trip.origin,
    date: trip.date,
    departTime: trip.departTime,
    returnBy: trip.returnBy ?? 'last',
  }).toString()
}

/** 쿼리에 없거나 형식이 틀린 값은 기본값으로 — 손상된 링크로 판정이 죽지 않게. */
export function tripFromSearch(params) {
  const base = defaultTripParams()
  const origin = params.get('origin')
  const date = params.get('date')
  const departTime = params.get('departTime')
  const returnBy = params.get('returnBy')
  return {
    origin: origin && origin in ORIGIN_LABELS ? origin : base.origin,
    date: date && DATE_RE.test(date) ? date : base.date,
    departTime: departTime && TIME_RE.test(departTime) ? departTime : base.departTime,
    returnBy:
      returnBy === 'last' ? null : returnBy && TIME_RE.test(returnBy) ? returnBy : base.returnBy,
  }
}

/** "?spots=5,2,7" → [5, 2, 7]. 없거나 깨졌으면 빈 배열. */
export function spotIdsFromSearch(params) {
  return (params.get('spots') ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
}

/* ── 시각 조정 ─────────────────────────────────────────────────────────────
   30분 단위로 올리고 내립니다. 시외버스 배차가 그보다 촘촘한 지역이 아니라
   10분 단위로 쪼개면 탭만 늘고 판정 결과는 거의 안 바뀝니다. */

export const TIME_STEP_MIN = 30
export const DEPART_RANGE = ['04:00', '13:00']
export const RETURN_RANGE = ['14:00', '23:30']

export function toMinutes(hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number)
  return hour * 60 + minute
}

export function toHHMM(minutes) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** 범위 밖으로는 나가지 않습니다. 끝에 닿았는지는 atLimit으로 확인하세요. */
export function shiftTime(hhmm, deltaMinutes, [min, max]) {
  const next = toMinutes(hhmm) + deltaMinutes
  return toHHMM(Math.min(Math.max(next, toMinutes(min)), toMinutes(max)))
}

export function atLimit(hhmm, direction, [min, max]) {
  return direction < 0
    ? toMinutes(hhmm) <= toMinutes(min)
    : toMinutes(hhmm) >= toMinutes(max)
}
