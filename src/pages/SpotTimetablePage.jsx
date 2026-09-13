import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { loadSpots } from '../lib/spots'
import styles from './SpotTimetablePage.module.css'

/**
 * 스팟 시간표 — Figma 02-2 `453:210` · `453:288` · `453:415`.
 *
 * 코스 상세에서 스팟을 누르면 여기로 옵니다. 코스가 "요약"이면 이 화면이 "근거"입니다 —
 * 우리가 적은 `55번 · 40분`이 어느 회차에서 나온 값인지 사용자가 직접 볼 수 있게 합니다.
 *
 * 두 가지를 숨기지 않습니다.
 *  1. **읽는 정류장이 다를 때** — 조선해양문화관은 신촌에서 내리지만 시간표는 지세포
 *     기준입니다. 숨기면 거짓말이 됩니다.
 *  2. **빈 결과의 이유** — 운행 없음 / 시각 미상 / 정류장 칸 없음을 갈라 말합니다.
 *     이유 없는 빈칸은 우리가 기준문서 §4에서 비판하는 것입니다(절대규칙 3).
 *
 * 2026-09-13: 다음 버스 카드 아래의 노선별 소요시간 줄(`고현터미널까지 약 20분 · 53번은 약 20분 · …`)을
 * 뺐습니다. 노선이 많은 스팟에서 한 문단이 되어 '다음 버스'가 묻혔습니다. 카드는 다음 버스 한 줄만 말합니다.
 */

/** 시각 문자열("HH:MM")을 분으로. 지난 차를 흐리게 하려면 비교가 필요합니다. */
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/** 오늘 날짜(로컬). 서버가 이 날짜로 요일을 판정합니다 — 주말이면 버스가 달라집니다. */
function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function nowHm() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 고현터미널 — 모든 코스의 출발·복귀 지점입니다. 스팟이 아니라서 poiId가 없습니다. */
const ORIGIN = '고현터미널'

/**
 * 방향 칩. 칩 하나가 "어디서 타서 어디로 가는가" 한 쌍입니다(2026-09-13, 두 개에서 네 개로).
 *
 *   next        이 스팟 → 코스의 다음 스팟
 *   fromNext    코스의 다음 스팟 → 이 스팟 (거꾸로)
 *   origin      이 스팟 → 고현터미널
 *   fromOrigin  고현터미널 → 이 스팟
 *
 * next·fromNext는 코스 상세에서 넘어와 다음 스팟(`to`)을 알 때만 있습니다. 시간표 탭에서
 * 들어오면 고현터미널 왕복 두 칩입니다. 모든 스팟에 같은 규칙입니다.
 *
 * ⚠️ 한때 `고현 → 스팟` 칩을 지웠습니다 — 그 칩만 남의 정류장(고현터미널) 시간표라 헷갈렸습니다.
 * 이번에 되살리면서 칩 아래 문구를 **타는 곳에 맞춰** 바꿉니다(`고현터미널에서 타요.`).
 */
function directionsFor(hasNext) {
  return hasNext ? ['next', 'fromNext', 'origin', 'fromOrigin'] : ['origin', 'fromOrigin']
}

/** 방향 → 서버 호출. fromNext는 **다음 스팟**의 시간표에서 목적지를 이 스팟으로 잡은 것입니다. */
function fetchDirection(dir, { poiId, nextId, date, after }) {
  if (dir === 'next') return api.spotDepartures(poiId, { date, after, toPoiId: nextId })
  if (dir === 'fromNext') return api.spotDepartures(nextId, { date, after, toPoiId: poiId })
  if (dir === 'fromOrigin') return api.spotDepartures(poiId, { date, after, from: 'origin' })
  return api.spotDepartures(poiId, { date, after })
}

export default function SpotTimetablePage() {
  const { poiId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // 날짜·시각을 쿼리로 덮어쓸 수 있게 둡니다 — 화면 확인과 회귀에 필요합니다.
  const date = searchParams.get('date') ?? today()
  const now = searchParams.get('now') ?? nowHm()
  // 코스의 다음 스팟 poiId. 코스 상세에서 넘어올 때만 붙습니다.
  const nextId = searchParams.get('to')
  const dirs = directionsFor(Boolean(nextId))
  const asked = searchParams.get('dir')
  const dir = dirs.includes(asked) ? asked : dirs[0]

  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  /* poiId → 짧은 이름. 칩 이름을 **응답과 떼어** 정합니다. 전에는 다음 스팟 칩 이름을
     응답의 `to`에서 읽었는데, 고현터미널 칩을 누르면 응답의 to가 고현터미널로 바뀌어
     **옆 칩 이름까지 '해금강 → 고현터미널'로 바뀌었습니다**(2026-09-13 버그). */
  const [names, setNames] = useState(() => new Map())

  useEffect(() => {
    let cancelled = false
    loadSpots().then((spots) => {
      if (cancelled) return
      setNames(new Map([...spots].map(([id, poi]) => [String(id), poi.shortName ?? poi.name])))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDirection(dir, { poiId, nextId, date, after: now })
      .then((data) => {
        if (!cancelled) setResult({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [poiId, nextId, dir, date, now])

  const d = result.data
  const dayLabel = t(d?.dayClass === 'HOLIDAY' ? 'courseDetail.holiday' : 'courseDetail.weekday')
  // 제목은 늘 **이 스팟**입니다. fromNext 응답은 다음 스팟 기준이라 응답 이름을 쓰면 제목이 바뀝니다.
  const spotFromResponse = dir === 'fromNext' ? '' : (d?.shortName ?? d?.name ?? '')
  const spot = names.get(String(poiId)) ?? spotFromResponse
  const nextFromResponse =
    dir === 'next' ? d?.to?.name : dir === 'fromNext' ? (d?.shortName ?? d?.name) : null
  const nextName = (nextId ? names.get(String(nextId)) : null) ?? nextFromResponse ?? ''

  const dirLabel = (k) => {
    if (k === 'next') return t('spotTime.dir', { from: spot, to: nextName })
    if (k === 'fromNext') return t('spotTime.dir', { from: nextName, to: spot })
    if (k === 'fromOrigin') return t('spotTime.dir', { from: ORIGIN, to: spot })
    return t('spotTime.dir', { from: spot, to: ORIGIN })
  }

  // to는 모든 칩에 남겨둡니다 — 고현터미널 칩을 눌렀다가 다음 스팟 칩으로 돌아올 수 있어야 합니다.
  const setDir = (next) => {
    const params = { dir: next, ...(date ? { date } : {}), ...(now ? { now } : {}) }
    if (nextId) params.to = nextId
    setSearchParams(params, { replace: true })
  }

  if (result.status !== 'ready') {
    return (
      <Screen data-api="GET /api/pois/{id}/departures">
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
            ←
          </button>
        </header>
        <p className={styles.notice}>
          {result.status === 'error'
            ? t('common.loadFailed', { error: result.error })
            : t('spotTime.loading')}
        </p>
      </Screen>
    )
  }

  // 시간대별로 묶습니다(07시 · 09시 …). 원문이 시간대로 뭉쳐 있어 읽기 쉬운 단위입니다.
  const byHour = []
  for (const dep of d.departures) {
    const h = Number(dep.depart.slice(0, 2))
    const last = byHour[byHour.length - 1]
    if (last && last.hour === h) last.items.push(dep)
    else byHour.push({ hour: h, items: [dep] })
  }

  const nowMin = toMin(now)
  const nextDepart = d.next?.depart ?? null

  return (
    <Screen data-api="GET /api/pois/{id}/departures">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ←
        </button>
        <h1 className={styles.title}>{spot}</h1>
        <span className={styles.dayPill}>{dayLabel}</span>
      </header>

      <div className={styles.scroll}>
        <div className={styles.body}>
          {/* 어디서 타는지. 내리는 곳과 시간표 기준이 다르면 그 사실을 함께 적습니다.
              고현터미널 → 스팟은 서버의 alightLabel이 **스팟 쪽** 정류장이라 그대로 쓰면
              "해금강 정류장에서 타요"가 됩니다 — 타는 곳은 고현터미널이므로 따로 적습니다. */}
          <p className={styles.board}>
            {dir === 'fromOrigin'
              ? t('spotTime.board', { stop: ORIGIN })
              : d.boardStop == null
              ? t('spotTime.emptyNoStop')
              : d.boardStopDiffers
                ? t('spotTime.boardDiffers', { alight: d.alightLabel, stop: d.boardStop })
                : t('spotTime.board', { stop: d.alightLabel ?? d.boardStop })}
          </p>

          {/* 방향 칩 — 코스에서 왔으면 다음 스팟 왕복 + 고현터미널 왕복 네 개, 아니면 고현터미널 왕복 둘. */}
          <div className={styles.dirs} role="group">
            {dirs.map((k) => (
              <button
                key={k}
                type="button"
                className={k === dir ? `${styles.dirChip} ${styles.dirOn}` : styles.dirChip}
                onClick={() => setDir(k)}
                aria-pressed={k === dir}
              >
                {dirLabel(k)}
              </button>
            ))}
          </div>

          {/* 다음 버스 한 줄만 말합니다(2026-09-13). 노선별 소요시간 줄은 뺐습니다 — 파일 머리 주석 참고. */}
          {d.count > 0 && (
            <div className={styles.nextCard}>
              <p className={styles.nextLine}>
                {d.next
                  ? t('spotTime.next', { time: d.next.depart, route: d.next.routeNo })
                  : t('spotTime.noNext')}
              </p>
            </div>
          )}

          {/* ★ 빈 결과의 이유. 셋을 갈라 말합니다. */}
          {d.count === 0 && (
            <div className={styles.empty}>
              {d.emptyReason === 'UNKNOWN_TIME' ? (
                <>
                  <p className={styles.emptyTitle}>
                    {t('spotTime.emptyUnknown', { routes: (d.unknownTimeRoutes ?? []).join('·') })}
                  </p>
                  <p className={styles.emptyText}>{t('spotTime.emptyUnknownHint')}</p>
                </>
              ) : d.emptyReason === 'NO_STOP_IN_TIMETABLE' ? (
                <>
                  <p className={styles.emptyTitle}>{t('spotTime.emptyNoStop')}</p>
                  <p className={styles.emptyText}>{t('spotTime.emptyNoStopHint')}</p>
                </>
              ) : (
                <p className={styles.emptyTitle}>{t('spotTime.emptyNoService')}</p>
              )}
            </div>
          )}

          {d.count > 0 && (
            <>
              <div className={styles.tableHead}>
                <h2 className={styles.tableTitle}>{t('spotTime.tableTitle', { day: dayLabel })}</h2>
                <p className={styles.tableSummary}>
                  {t('spotTime.summary', {
                    first: d.firstDeparture,
                    last: d.lastDeparture,
                    count: d.count,
                  })}
                </p>
              </div>

              <ul className={styles.hours}>
                {byHour.map((group) => (
                  <li key={group.hour} className={styles.hourRow}>
                    <span className={styles.hourLabel}>
                      {t('spotTime.hour', { h: String(group.hour).padStart(2, '0') })}
                    </span>
                    <span className={styles.hourItems}>
                      {group.items.map((dep) => {
                        const passed = toMin(dep.depart) < nowMin
                        const isNext = dep.depart === nextDepart
                        return (
                          <span key={`${dep.routeNo}-${dep.depart}`} className={styles.dep}>
                            <span className={passed ? styles.badgeDim : styles.badge}>
                              {dep.routeNo}
                            </span>
                            <span className={passed ? styles.timeDim : styles.time}>
                              {dep.depart}
                            </span>
                            {isNext && <span className={styles.nextTag}>{t('spotTime.nextTag')}</span>}
                          </span>
                        )
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className={styles.source}>
            {t('spotTime.source', { source: d.source, date: d.baseDate, day: dayLabel })}
          </p>
        </div>
      </div>
    </Screen>
  )
}
