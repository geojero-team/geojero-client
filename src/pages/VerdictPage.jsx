import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import DirTabs from '../components/DirTabs'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import {
  ModeBusIcon,
  ModeShipIcon,
  NodeBusIcon,
  NodeShipIcon,
  NodeStartIcon,
} from '../components/TimelineIcons'
import { fetchVerdict } from '../data/mockPlan'
import { formatDateLong, formatDuration } from '../lib/format'
import { ORIGIN_LABELS, spotIdsFromSearch, tripFromSearch } from '../lib/tripParams'
import { worseDirection } from '../lib/verdict'
import styles from './VerdictPage.module.css'

/**
 * 판정 결과 — Figma 268:295(네이버형).
 *
 * 헤더·하단바는 고정, 지도(200)·summary·방향 탭·타임라인은 스크롤합니다.
 * 코스는 URL(/verdict/:routeId?origin=&date=&departTime=&returnBy=&spots=)로 다시 만들 수 있어
 * 새로고침해도 같은 판정이 나옵니다.
 *
 * Figma의 '청룡8길 5 → 부산서부 · 카카오맵 길찾기' 외부 구간은 출발 주소 입력을 전제하는데
 * 조건은 터미널 3종뿐이라(기준문서 §6 진입 가이드 버림) 넣지 않고, 제목도 터미널명으로 씁니다.
 */

const NODE_ICONS = { start: NodeStartIcon, bus: NodeBusIcon, ship: NodeShipIcon }
const MODE_ICONS = { bus: ModeBusIcon, ship: ModeShipIcon }

/** 승차 정류장의 회차 카드 — Figma trips-card(268:397). '더보기'는 전체 회차를 펼칩니다. */
function TripsCard({ trips }) {
  const [expanded, setExpanded] = useState(false)
  const items = expanded && trips.all ? trips.all : trips.items

  return (
    <div className={styles.trips}>
      {items.map((item) => (
        <div key={`${item.time}-${item.note}`} className={styles.trip}>
          <span className={styles.routeBadge}>
            {trips.routeNo}
            <span aria-hidden="true">›</span>
          </span>
          <span className={styles.tripTime}>{item.time}</span>
          <span className={styles.tripNote}>{item.note}</span>
        </div>
      ))}
      {trips.all && (
        <button
          type="button"
          className={styles.more}
          onClick={() => setExpanded((prev) => !prev)}
          data-api="GET /api/routes/{routeNo}/timetable"
        >
          {expanded ? `${trips.routeNo}번 시간표 접기` : `${trips.routeNo}번 시간표 더보기`}
          <span className={styles.moreChevron} aria-hidden="true">
            {expanded ? '⌃' : '›'}
          </span>
        </button>
      )}
    </div>
  )
}

/** 구간 행 — 차량(bar)·도보/대기(dots). 경유 정류장이 있으면 '⌄'로 펼칩니다. */
function LegRow({ row }) {
  const [expanded, setExpanded] = useState(false)
  const expandable = Boolean(row.stops)

  return (
    <div className={styles.row}>
      <div className={styles.gutter}>
        <span className={row.style === 'bar' ? styles.bar : styles.dots} />
      </div>
      <div className={styles.legContent}>
        {expandable ? (
          <button
            type="button"
            className={styles.legToggle}
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {row.text} {expanded ? '⌃' : '⌄'}
          </button>
        ) : (
          <p className={styles.legText}>{row.text}</p>
        )}
        {expanded && (
          <ul className={styles.passed}>
            {row.stops.map((stop) => (
              <li key={stop.name} className={styles.passedItem}>
                <span>{stop.name}</span>
                <span>{stop.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** 정류장 행 — 거터의 막대·점은 이웃 구간 행의 종류를 따릅니다(Figma 268:351~460). */
function StopRow({ row, prev, next }) {
  const Icon = NODE_ICONS[row.node] ?? NodeBusIcon
  const barAbove = prev?.kind === 'leg' && prev.style === 'bar'
  const barBelow = next?.kind === 'leg' && next.style === 'bar'
  const dotAbove = prev?.kind === 'leg' && prev.style === 'dots'
  const dotsBelow = next?.kind === 'leg' && next.style === 'dots'
  const tone =
    row.tone === 'no' ? styles.nodeNo : row.node === 'ship' ? styles.nodeDim : styles.nodeBrand

  return (
    <div className={styles.row}>
      <div className={styles.gutter}>
        {barAbove && <span className={styles.barTop} />}
        {barBelow && <span className={styles.barBottom} />}
        {dotAbove && <span className={styles.dotTop} />}
        {dotsBelow && <span className={styles.dotsBottom} />}
        <Icon className={`${styles.node} ${tone}`} />
      </div>

      <div className={styles.stopContent}>
        <div className={styles.stopLine}>
          <span className={styles.stopName}>{row.name}</span>
          <span className={row.dim ? styles.actionDim : styles.action}>{row.action}</span>
          {row.time && (
            <span
              className={row.tone === 'no' ? styles.timeNo : row.dim ? styles.timeDim : styles.time}
            >
              {row.time}
            </span>
          )}
        </div>
        {row.trips && <TripsCard trips={row.trips} />}
        {row.note && (
          <p className={row.tone === 'no' ? styles.noteNo : styles.note}>
            {row.note}
            {row.link && (
              <>
                {' · '}
                <a className={styles.link} href={row.link.href} target="_blank" rel="noreferrer">
                  {row.link.label}
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export default function VerdictPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { routeId } = useParams()
  const [searchParams] = useSearchParams()

  const [trip] = useState(() => tripFromSearch(searchParams))
  const [spotIds] = useState(() => spotIdsFromSearch(searchParams))
  const [dir, setDir] = useState(null) // 'out' | 'back' | null(= 판정이 나쁜 쪽)
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    fetchVerdict({ routeId, spotIds, ...trip })
      .then((data) => {
        if (cancelled) return
        setResult({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [routeId, spotIds, trip])

  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  const data = result.data
  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin

  // 지도: 좌표가 [미확인]인 스팟(명사)은 찍지 않고, 방문 순서대로 선을 잇습니다.
  const mapSpots = useMemo(
    () =>
      (data?.spots ?? []).filter((spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng)),
    [data],
  )
  const orderBySpotId = useMemo(
    () => new Map(mapSpots.map((spot, index) => [spot.spotId, index + 1])),
    [mapSpots],
  )
  const routePath = useMemo(
    () => (mapSpots.length >= 2 ? mapSpots.map(({ lat, lng }) => ({ lat, lng })) : null),
    [mapSpots],
  )

  const activeDir = data
    ? (dir ?? worseDirection(data.directions.out.verdict, data.directions.back.verdict))
    : 'out'
  const rows = data?.directions[activeDir].rows ?? []

  return (
    <Screen data-api="POST /api/courses/{courseId}/judge">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack} aria-label="뒤로">
          ←
        </button>
        <h1 className={styles.title}>
          {originLabel} → 거제{data ? ` · ${data.route.name}` : ''}
        </h1>
        <span className={styles.datePill}>{formatDateLong(trip.date)}</span>
      </header>

      <div className={styles.scroll}>
        {result.status === 'error' && (
          <p className={styles.notice}>불러오지 못했습니다 — {result.error}</p>
        )}
        {result.status === 'loading' && <p className={styles.notice}>판정하는 중</p>}

        {data && (
          <>
            <div className={styles.map}>
              <MapView
                compact
                spots={mapSpots}
                selectedSpotId={null}
                routePath={routePath}
                orderBySpotId={orderBySpotId}
                showVerdict
              />
            </div>

            {/* summary(268:303) */}
            <section className={styles.summary}>
              <p className={styles.big}>
                {data.summary.totalMin != null ? formatDuration(data.summary.totalMin) : '[미확인]'}
              </p>
              <p className={styles.range}>
                {data.summary.departTime} - {data.summary.arriveTime ?? '[미확인]'} ·{' '}
                {data.summary.legCount}구간 · 돌아오는 막차 {data.summary.lastReturnBus ?? '[미확인]'}
              </p>
              <div className={styles.modes}>
                {data.summary.modes.map((mode, index) => {
                  const Icon = MODE_ICONS[mode.kind] ?? ModeBusIcon
                  return (
                    <Fragment key={`${mode.label}-${index}`}>
                      {index > 0 && (
                        <span className={styles.modeSep} aria-hidden="true">
                          ›
                        </span>
                      )}
                      <span className={mode.dim ? `${styles.mode} ${styles.modeDim}` : styles.mode}>
                        <span className={styles.modeIcon}>
                          <Icon />
                        </span>
                        {mode.label}
                      </span>
                    </Fragment>
                  )
                })}
              </div>
              {data.summary.check && (
                <p className={styles.check}>
                  <span className={styles.checkMark} aria-hidden="true">
                    ?
                  </span>
                  {data.summary.check.text}
                  {data.summary.check.link && (
                    <a
                      className={styles.link}
                      href={data.summary.check.link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {data.summary.check.link.label}
                    </a>
                  )}
                </p>
              )}
            </section>

            <div className={styles.divider} />

            <div className={styles.body}>
              <DirTabs
                value={activeDir}
                verdicts={{
                  out: data.directions.out.verdict,
                  back: data.directions.back.verdict,
                }}
                onChange={setDir}
              />

              <div className={styles.timeline}>
                {rows.map((row, index) =>
                  row.kind === 'leg' ? (
                    <LegRow key={index} row={row} />
                  ) : (
                    <StopRow key={index} row={row} prev={rows[index - 1]} next={rows[index + 1]} />
                  ),
                )}
              </div>

              <p className={styles.source}>
                출처 {data.source} · {data.baseDate}
              </p>
            </div>
          </>
        )}
      </div>

      {/* bottom-bar(268:472) — 고정. '저장'은 비로그인이라 disabled 외형이지만 눌립니다(로그인 시트는 다음 단계). */}
      <div className={styles.bottomBar}>
        <div className={styles.barCol}>
          <p className={styles.arrivalLine}>
            {data ? `${data.arrival.time ?? '[미확인]'} ${data.arrival.originLabel} 도착` : '판정하는 중'}
          </p>
          <p className={styles.saveHint}>일정을 저장하실 수 있어요</p>
        </div>
        <Button
          variant="disabled"
          className={styles.save}
          onClick={() => navigate('/my')}
          disabled={!data}
          data-api="POST /api/saved-trips"
        >
          저장
        </Button>
      </div>
    </Screen>
  )
}
