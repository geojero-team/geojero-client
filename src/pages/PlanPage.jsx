import { Fragment, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MAP_PATH } from '../components/BottomNav'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { fetchPlan } from '../data/mockPlan'
import { courseImage } from '../lib/courseImage'
import { formatDateDay } from '../lib/format'
import { markRecommended, saveRecentCourse } from '../lib/recentCourse'
import { ORIGIN_LABELS, spotIdsFromSearch, tripFromSearch, tripToSearch } from '../lib/tripParams'
import styles from './PlanPage.module.css'

/**
 * 일정 고르기 — Figma 285:67(전부 넣은 코스 N가지) / 285:148(전부는 못 감 · 한 곳씩 뺀 대안).
 *
 * 스팟 고르기에서 조건(?origin=&date=&departTime=&returnBy=)과 고른 스팟(?spots=)을 받아
 * 추천 코스 카드를 보여줍니다. 카드는 고르기만 하고, '이 코스로 지도 확인'에서 지도로 갑니다.
 * 여기 도착했다 = 코스 추천을 받았다 → 홈이 B 형태(최근 코스 섹션)로 바뀝니다.
 */

/** 추천 코스 카드 — Figma itinerary(285:85) / subset(285:166) */
function ItineraryCard({ route, spotsById, selected, onSelect }) {
  const spots = route.spotIds.map((id) => spotsById.get(id)).filter(Boolean)

  return (
    <button
      type="button"
      className={selected ? `${styles.card} ${styles.cardOn}` : styles.card}
      onClick={() => onSelect(route.routeId)}
      aria-pressed={selected}
    >
      <div className={styles.cardRow}>
        <span className={styles.time}>
          {route.departTime} → {route.arriveTime ?? '[미확인]'}
        </span>
        {route.recommended && <span className={styles.tag}>추천 · 막차 여유 가장 큼</span>}
        {route.excludedName && <span className={styles.excluded}>{route.excludedName} 빼면</span>}
      </div>

      <div className={styles.order}>
        {spots.map((spot, index) => (
          <Fragment key={spot.spotId}>
            {index > 0 && (
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            )}
            <span className={styles.stop}>
              <span className={styles.thumb}>
                <img className={styles.thumbImg} src={courseImage(spot)} alt="" />
                <span className={styles.num}>{index + 1}</span>
              </span>
              <span className={styles.stopName}>{spot.shortName}</span>
              {index === spots.length - 1 && (
                <span className={styles.lastBus}>막차 {route.lastBus ?? '[미확인]'}</span>
              )}
            </span>
          </Fragment>
        ))}
      </div>
    </button>
  )
}

export default function PlanPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [trip] = useState(() => tripFromSearch(searchParams))
  const [spotIds] = useState(() => spotIdsFromSearch(searchParams))
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    markRecommended()
    fetchPlan({ spotIds, ...trip })
      .then((data) => {
        if (!cancelled) setResult({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [spotIds, trip])

  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin
  const routes = result.data?.routes ?? []
  const state = result.data?.state ?? 'ALL'
  const spotsById = new Map((result.data?.spots ?? []).map((spot) => [spot.spotId, spot]))
  const picked = spotIds.map((id) => spotsById.get(id)).filter(Boolean)
  const selectedId = selected ?? routes[0]?.routeId ?? null
  const selectedRoute = routes.find((route) => route.routeId === selectedId) ?? null

  const editSpots = () =>
    navigate(`/spots/pick?${tripToSearch(trip, { selected: spotIds.join(',') })}`)

  // 지도는 고른 스팟 전체를 받고, 이 코스를 처음부터 펼쳐 보여줍니다(?route=).
  const openMap = () => {
    if (!selectedRoute) return
    saveRecentCourse({
      name: selectedRoute.name,
      spotIds: selectedRoute.spotIds,
      verdict: selectedRoute.verdict,
      date: trip.date,
    })
    navigate(
      `${MAP_PATH}?${tripToSearch(trip, { spots: spotIds.join(','), route: selectedRoute.routeId })}`,
    )
  }

  return (
    <Screen data-api="GET /api/routes">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack} aria-label="뒤로">
          ‹
        </button>
        <h1 className={styles.title}>일정 고르기</h1>
      </header>

      <div className={styles.scroll}>
        <div className={styles.body}>
          <h2 className={styles.headline}>
            사용자님의 일정에 맞춘 코스를
            <br />
            추천해드려요
          </h2>

          {result.status === 'ready' && (
            <p className={state === 'SUBSET' ? styles.stateWarn : styles.stateOk}>
              {state === 'SUBSET'
                ? `${picked.length}곳을 다 넣으면 막차를 놓쳐요. ${picked.length - 1}곳으로 짜봤어요.`
                : `총 코스 ${routes.length}가지`}
            </p>
          )}

          <p className={styles.condition}>
            {originLabel} · {formatDateDay(trip.date)} · {trip.departTime} 출발
          </p>

          {picked.length > 0 && (
            <div className={styles.picked}>
              {picked.map((spot) => (
                <span key={spot.spotId} className={styles.chip}>
                  <img className={styles.chipPhoto} src={courseImage(spot)} alt="" />
                  <span className={styles.chipName}>{spot.shortName}</span>
                </span>
              ))}
            </div>
          )}

          {result.status === 'error' ? (
            <p className={styles.notice}>불러오지 못했습니다 — {result.error}</p>
          ) : result.status === 'loading' ? (
            <p className={styles.notice}>코스를 짜는 중</p>
          ) : (
            routes.map((route) => (
              <ItineraryCard
                key={route.routeId}
                route={route}
                spotsById={spotsById}
                selected={route.routeId === selectedId}
                onSelect={setSelected}
              />
            ))
          )}

          <div className={styles.spacer} />

          {result.status === 'ready' && state === 'ALL' && (
            <p className={styles.caption}>순서와 머무는 시간은 버스 시간에 맞춰 정했어요</p>
          )}

          <div className={styles.actions}>
            <Button variant="secondary" onClick={editSpots} data-api="GET /api/spots">
              스팟 수정하기
            </Button>
            <Button onClick={openMap} disabled={!selectedRoute}>
              이 코스로 지도 확인
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  )
}
