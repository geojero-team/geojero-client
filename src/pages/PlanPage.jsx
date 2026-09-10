import { Fragment, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MAP_PATH } from '../components/BottomNav'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { fetchPlan } from '../data/mockPlan'
import { courseImage } from '../lib/courseImage'
import { formatDateDay } from '../lib/format'
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
          {route.departTime} → {route.arriveTime}
        </span>
        {route.recommended && <span className={styles.tag}>{t('plan.recommended')}</span>}
        {route.excludedName && (
          <span className={styles.excluded}>
            {t('plan.excluded', { name: route.excludedName })}
          </span>
        )}
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
              {index === spots.length - 1 && route.lastBus && (
                <span className={styles.lastBus}>{t('course.lastBus', { time: route.lastBus })}</span>
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
  // 고른 스팟 중 '불성립'으로 **확인된** 것만 이유를 밝힙니다. 고르지 않은 곳의
  // 불성립은 화면에 내보내지 않습니다(2026-09-10 결정).
  const blockedPicks = picked.filter((spot) => spot.verdict === 'NO' && spot.reason)
  const selectedId = selected ?? routes[0]?.routeId ?? null
  const selectedRoute = routes.find((route) => route.routeId === selectedId) ?? null

  const editSpots = () =>
    navigate(`/spots/pick?${tripToSearch(trip, { selected: spotIds.join(',') })}`)

  // 지도는 고른 스팟 전체를 받고, 이 코스를 처음부터 펼쳐 보여줍니다(?route=).
  const openMap = () => {
    if (!selectedRoute) return
    navigate(
      `${MAP_PATH}?${tripToSearch(trip, { spots: spotIds.join(','), route: selectedRoute.routeId })}`,
    )
  }

  return (
    <Screen data-api="GET /api/routes">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack} aria-label={t('common.back')}>
          ‹
        </button>
        <h1 className={styles.title}>{t('plan.title')}</h1>
      </header>

      <div className={styles.scroll}>
        <div className={styles.body}>
          <h2 className={styles.headline}>
            {t('plan.headline1')}
            <br />
            {t('plan.headline2')}
          </h2>

          {result.status === 'ready' && routes.length > 0 && (
            <p className={state === 'SUBSET' ? styles.stateWarn : styles.stateOk}>
              {state === 'SUBSET'
                ? t('plan.stateSubset', {
                    picked: picked.length,
                    kept: picked.length - 1,
                  })
                : t('plan.stateAll', { count: routes.length })}
            </p>
          )}

          <p className={styles.condition}>
            {t('plan.condition', {
              origin: originLabel,
              date: formatDateDay(trip.date),
              depart: trip.departTime,
            })}
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
            <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
          ) : result.status === 'loading' ? (
            <p className={styles.notice}>{t('plan.loading')}</p>
          ) : routes.length === 0 ? (
            /* 성립한 코스만 보여줍니다 — 짤 수 있는 조합이 없으면 비웁니다.
               "안 된다"가 아니라 "안내할 수 있는 게 없다"입니다. 없는 근거로
               불성립이라 단정하지 않기 위해 문구를 나눕니다. */
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{t('noRoutes.title')}</p>
              {blockedPicks.map((spot) => (
                <p key={spot.spotId} className={styles.emptyReason}>
                  {t('noRoutes.blocked', {
                    name: spot.shortName ?? spot.name,
                    reason: spot.reason,
                  })}
                </p>
              ))}
              <p className={styles.emptyText}>
                {t(blockedPicks.length > 0 ? 'noRoutes.blockedHint' : 'noRoutes.text')}
              </p>
            </div>
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

          {result.status === 'ready' && state === 'ALL' && routes.length > 0 && (
            <p className={styles.caption}>{t('plan.caption')}</p>
          )}

          <div className={styles.actions}>
            <Button variant="secondary" onClick={editSpots} data-api="GET /api/spots">
              {t('plan.editSpots')}
            </Button>
            <Button onClick={openMap} disabled={!selectedRoute}>
              {t('plan.openMap')}
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  )
}
