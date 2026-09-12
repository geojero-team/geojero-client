import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import styles from './SpotTimetablePage.module.css'

/**
 * 스팟 시간표 — Figma 02-2 `453:210` · `453:288` · `453:415`.
 *
 * 코스 상세에서 스팟을 누르면 여기로 옵니다. 코스가 "요약"이면 이 화면이 "근거"입니다 —
 * 우리가 적은 `55번 · 40분`이 어느 회차에서 나온 값인지 사용자가 직접 볼 수 있게 합니다.
 *
 * 세 가지를 숨기지 않습니다.
 *  1. **소요시간의 폭** — 같은 노선·방향인데도 2~5분 흔들립니다(같은 회차가 50번대와
 *     60번대 시트에 다르게 실린 탓). 한 값으로 뭉개지 않고 `약 40~43분`으로 적습니다.
 *  2. **읽는 정류장이 다를 때** — 조선해양문화관은 신촌에서 내리지만 시간표는 지세포
 *     기준입니다. 숨기면 거짓말이 됩니다.
 *  3. **빈 결과의 이유** — 운행 없음 / 시각 미상 / 정류장 칸 없음을 갈라 말합니다.
 *     이유 없는 빈칸은 우리가 기준문서 §4에서 비판하는 것입니다(절대규칙 3).
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

/** 노선별 소요시간 한 조각 — 흔들리면 폭으로, 상수면 한 값으로. */
function durationText(route) {
  if (route.durationMin == null) return null
  return route.durationVaries
    ? t('spotTime.minRange', { low: route.durationMinLow, high: route.durationMin })
    : t('spotTime.min', { min: route.durationMin })
}

export default function SpotTimetablePage() {
  const { poiId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // 날짜·시각을 쿼리로 덮어쓸 수 있게 둡니다 — 화면 확인과 회귀에 필요합니다.
  const date = searchParams.get('date') ?? today()
  const now = searchParams.get('now') ?? nowHm()
  /**
   * 어디로 가는 시간표인가.
   *
   * ⚠️ 2026-09-13에 방향의 뜻이 바뀌었습니다(팀 결정). 전에는 `스팟 → 고현` / **`고현 → 스팟`**
   * 두 칩이었는데, 뒤쪽을 지웠습니다. **그 칩만 남의 정류장 시간표였습니다** — 학동몽돌해변
   * 화면인데 고현터미널에서 출발하는 버스를 보여줬습니다. 이 화면은 "이 스팟에서 타는 버스"고,
   * 코스에서 학동 다음이 해금강이면 필요한 것은 **학동 → 해금강**입니다.
   *
   *   to   코스의 다음 스팟 poiId. 코스 상세에서 넘어올 때만 붙습니다
   *   dir  next(다음 스팟) | origin(고현터미널로 복귀). to가 없으면 origin 하나뿐입니다
   */
  const toPoiId = searchParams.get('to')
  const dir = searchParams.get('dir') ?? (toPoiId ? 'next' : 'origin')

  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    api
      .spotDepartures(poiId, {
        date,
        after: now,
        // toPoiId를 안 주면 서버가 고현터미널을 목적지로 잡습니다(복귀 방향).
        toPoiId: dir === 'next' ? toPoiId : undefined,
      })
      .then((data) => {
        if (!cancelled) setResult({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [poiId, date, now, dir, toPoiId])

  const d = result.data
  const dayLabel = t(d?.dayClass === 'HOLIDAY' ? 'courseDetail.holiday' : 'courseDetail.weekday')
  const spot = d?.shortName ?? d?.name ?? ''
  const origin = '고현터미널'

  // to는 두 칩 모두에 남겨둡니다 — 복귀 칩을 눌렀다가 다시 돌아올 수 있어야 합니다.
  const setDir = (next) => {
    const params = { dir: next, ...(date ? { date } : {}), ...(now ? { now } : {}) }
    if (toPoiId) params.to = toPoiId
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
  const main = d.byRoute?.[0]
  const others = (d.byRoute ?? []).slice(1)

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
          {/* 어디서 타는지. 내리는 곳과 시간표 기준이 다르면 그 사실을 함께 적습니다. */}
          <p className={styles.board}>
            {d.boardStop == null
              ? t('spotTime.emptyNoStop')
              : d.boardStopDiffers
                ? t('spotTime.boardDiffers', { alight: d.alightLabel, stop: d.boardStop })
                : t('spotTime.board', { stop: d.alightLabel ?? d.boardStop })}
          </p>

          {/* 방향 칩 — 둘 다 **이 스팟에서 출발하는** 버스입니다.
              코스에서 왔으면 `다음 스팟`이 기본이고, `고현터미널`은 복귀편입니다.
              코스 없이 시간표 탭에서 들어오면 갈 곳이 정해지지 않아 복귀편 하나만 둡니다. */}
          <div className={styles.dirs} role="group">
            {toPoiId && (
              <button
                type="button"
                className={dir === 'next' ? `${styles.dirChip} ${styles.dirOn}` : styles.dirChip}
                onClick={() => setDir('next')}
                aria-pressed={dir === 'next'}
              >
                {t('spotTime.toSpot', { spot, to: d.to?.name ?? '' })}
              </button>
            )}
            <button
              type="button"
              className={dir === 'origin' ? `${styles.dirChip} ${styles.dirOn}` : styles.dirChip}
              onClick={() => setDir('origin')}
              aria-pressed={dir === 'origin'}
            >
              {t('spotTime.toOrigin', { spot, origin })}
            </button>
          </div>

          {/* 다음 버스 + 노선별 소요시간. 노선을 섞어 평균을 내지 않습니다 — 실제로
              운행하지 않는 값이 나옵니다(engine.md). */}
          {d.count > 0 && (
            <div className={styles.nextCard}>
              <p className={styles.nextLine}>
                {d.next
                  ? t('spotTime.next', { time: d.next.depart, route: d.next.routeNo })
                  : t('spotTime.noNext')}
              </p>
              {main && (
                <p className={styles.durLine}>
                  {t('spotTime.duration', {
                    to: d.to?.name ?? origin,
                    min: durationText(main),
                  })}
                  {others
                    .filter((r) => r.durationMin != null)
                    .map((r) => (
                      <span key={r.routeNo}>
                        {' · '}
                        {t('spotTime.durationMore', { route: r.routeNo, min: durationText(r) })}
                      </span>
                    ))}
                </p>
              )}
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
