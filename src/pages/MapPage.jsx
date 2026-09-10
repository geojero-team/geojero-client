import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import ConditionPill from '../components/ConditionPill'
import ConditionSheet from '../components/ConditionSheet'
import CourseStrip from '../components/CourseStrip'
import MapView from '../components/MapView'
import PinSheet from '../components/PinSheet'
import Screen from '../components/Screen'
import { fetchPlan, fetchSpots } from '../data/mockPlan'
import { formatDuration } from '../lib/format'
import { markRecommended, saveRecentCourse } from '../lib/recentCourse'
import {
  saveOrigin,
  spotIdsFromSearch,
  tripFromSearch,
  tripToSearch,
} from '../lib/tripParams'
import styles from './MapPage.module.css'

/**
 * 조건을 연달아 만질 때 매 탭마다 판정을 부르지 않도록 잠깐 묶습니다.
 * 목 데이터일 땐 티가 안 나지만 실제 API가 붙으면 이게 없으면 요청이 튑니다.
 */
const REJUDGE_DEBOUNCE_MS = 200

/**
 * 지도 위쪽에서 비워둬야 하는 높이 = 떠 있는 조건 알약이 차지하는 자리.
 * MapView가 여기에 마커 반지름을 더해서 실제 여백을 계산합니다.
 * 판정 상태의 56 = 알약 top 16 + 높이 40 (Figma 240:167).
 */
const TOP_RESERVED_BROWSE = 16
const TOP_RESERVED_PLANNED = 56

/**
 * 지도 화면 — Figma 285:208(코스 선택) · 240:164(핀 요약).
 *
 *   둘러보기   스팟을 아직 안 고른 채 탭바로 바로 들어온 경우.
 *             전체 스팟을 보여주되 조건 알약도 판정색도 쓰지 않습니다.
 *             판정을 하지 않았는데 성립/불성립 색을 칠하면 거짓말이 됩니다.
 *
 *   판정       일정 고르기에서 넘어온 경우(?spots=…&route=…).
 *             조건 알약 + 코스 카드 스트립이 함께 나옵니다.
 *
 * Figma에서 지도·시트·탭바는 같은 세로 흐름의 형제입니다. 시트는 지도 위에 뜨지 않고
 * 지도를 밀어냅니다 — 지도 562 / 시트 218 / 탭바 64.
 */
export default function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const requestedSpotIds = useMemo(
    () => spotIdsFromSearch(searchParams),
    [searchParams],
  )
  const planned = requestedSpotIds.length > 0

  // 일정 고르기에서 넘어온 조건과 코스를 그대로 이어받습니다.
  const [trip, setTrip] = useState(() => tripFromSearch(searchParams))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  const [activeRouteId, setActiveRouteId] = useState(
    () => Number(searchParams.get('route')) || null,
  )
  const [selectedSpotId, setSelectedSpotId] = useState(null)

  // 판정 상태로 들어왔다 = 코스 추천을 받았다. 홈 '최근에 본 코스' 섹션이 열립니다.
  useEffect(() => {
    if (planned) markRecommended()
  }, [planned])

  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(() => {
      const request = planned
        ? fetchPlan({ spotIds: requestedSpotIds, ...trip })
        : fetchSpots()

      request
        .then((data) => {
          if (!cancelled) setResult({ status: 'ready', data, error: '' })
        })
        .catch((error) => {
          if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
        })
    }, REJUDGE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [planned, requestedSpotIds, trip])

  // 조건이 바뀌면 이전 판정 결과는 더 이상 맞지 않습니다. 열려 있던 카드는 닫고,
  // 지도의 핀은 새 결과가 올 때까지 그대로 두어 화면이 깜빡이지 않게 합니다.
  const applyConditions = useCallback((next) => {
    if (next.origin) saveOrigin(next.origin)
    setSelectedSpotId(null)
    setResult((prev) => ({ ...prev, status: 'loading' }))
    setTrip(next)
    setSheetOpen(false)
  }, [])

  // 좌표가 [미확인]인 스팟(명사해수욕장)은 지도에 찍지 않습니다.
  const spots = useMemo(
    () =>
      (result.data?.spots ?? []).filter(
        (spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng),
      ),
    [result.data],
  )
  const routes = useMemo(() => result.data?.routes ?? [], [result.data])
  const spotsById = useMemo(
    () => new Map((result.data?.spots ?? []).map((spot) => [spot.spotId, spot])),
    [result.data],
  )

  // Figma는 코스가 항상 하나 골라져 있는 상태를 그립니다. 넘어온 코스가 없으면 첫 코스.
  const activeRoute =
    routes.find((route) => route.routeId === activeRouteId) ?? routes[0] ?? null

  // 코스를 골라도 코스 밖 스팟은 지도에서 사라지지 않습니다(Figma 285:208).
  // 코스에 든 곳만 번호를 답니다 — 번호가 붙은 핀이 StopMarker가 됩니다.
  const orderBySpotId = useMemo(() => {
    if (!activeRoute) return null
    const onMap = activeRoute.spotIds.filter((id) =>
      spots.some((spot) => spot.spotId === id),
    )
    return new Map(onMap.map((id, index) => [id, index + 1]))
  }, [activeRoute, spots])

  const routePath = useMemo(() => {
    if (!activeRoute) return null
    const ordered = activeRoute.spotIds
      .map((id) => spots.find((spot) => spot.spotId === id))
      .filter(Boolean)
    return ordered.length >= 2 ? ordered.map(({ lat, lng }) => ({ lat, lng })) : null
  }, [activeRoute, spots])

  const selectedSpot = spots.find((spot) => spot.spotId === selectedSpotId) ?? null
  const selectedIsStop = Boolean(selectedSpot && orderBySpotId?.has(selectedSpot.spotId))

  const handleSelectSpot = useCallback((spot) => setSelectedSpotId(spot.spotId), [])
  const handleDeselect = useCallback(() => setSelectedSpotId(null), [])

  // 코스를 바꾸면 열려 있던 핀 카드는 닫습니다. 그 스팟이 새 코스엔 없을 수 있습니다.
  const handleSelectRoute = useCallback((routeId) => {
    setSelectedSpotId(null)
    setActiveRouteId(routeId)
  }, [])

  const openVerdict = useCallback(
    (route) => {
      saveRecentCourse({
        name: route.name,
        spotIds: route.spotIds,
        verdict: route.verdict,
        date: trip.date,
      })
      navigate(
        `/verdict/${route.routeId}?${tripToSearch(trip, { spots: requestedSpotIds.join(',') })}`,
      )
    },
    [navigate, trip, requestedSpotIds],
  )

  const entry = result.data?.entry
  const showBrowseNotice = !planned && result.status === 'ready' && selectedSpot === null

  return (
    <Screen data-api={planned ? 'GET /api/routes' : 'GET /api/spots'}>
      <div className={styles.mapArea}>
        <MapView
          spots={spots}
          selectedSpotId={selectedSpotId}
          onSelectSpot={handleSelectSpot}
          onDeselect={handleDeselect}
          routePath={routePath}
          showVerdict={planned}
          orderBySpotId={orderBySpotId}
          topReserved={planned ? TOP_RESERVED_PLANNED : TOP_RESERVED_BROWSE}
        />

        {/* 조건을 안 고른 상태에서는 알약을 띄우지 않습니다. 보여줄 조건이 없습니다. */}
        {planned && <ConditionPill trip={trip} onEdit={() => setSheetOpen(true)} />}

        {/* 진입 태그 — 고현 터미널 좌표가 [미확인]이라 마커 대신 지도 위 고정 칩입니다.
            백엔드 stops 테이블에 좌표가 들어오면 Figma대로 '1 고현' 마커로 옮깁니다. */}
        {planned && entry?.rideMin != null && (
          <span className={styles.entryTag}>
            ⚑ {entry.originLabel}에서 {formatDuration(entry.rideMin)}
          </span>
        )}

        {result.status === 'loading' && result.data && (
          <p
            className={styles.pending}
            style={{ '--top-offset': planned ? '62px' : '16px' }}
          >
            다시 판정하는 중
          </p>
        )}

        {result.status === 'error' && (
          <p
            className={styles.error}
            style={{ '--top-offset': planned ? '62px' : '16px' }}
          >
            불러오지 못했습니다 — {result.error}
          </p>
        )}

        {showBrowseNotice && (
          <div className={styles.browseNotice}>
            <p className={styles.browseTitle}>거제 주요 스팟입니다.</p>
            <p className={styles.browseText}>
              가고 싶은 곳과 시간을 홈을 통해 정하면, 코스를 안내해드려요.
            </p>
          </div>
        )}
      </div>

      {/* 핀을 누르면 요약 시트가 코스 스트립 자리를 대신 차지합니다(Figma 240:164). */}
      {selectedSpot ? (
        <PinSheet
          kind={selectedIsStop ? 'course' : 'spot'}
          spot={selectedSpot}
          route={activeRoute}
          showVerdict={planned}
          onClose={handleDeselect}
          onOpen={() =>
            selectedIsStop
              ? openVerdict(activeRoute)
              : navigate(`/spots/${selectedSpot.spotId}`)
          }
        />
      ) : (
        planned && (
          <CourseStrip
            routes={routes}
            spotsById={spotsById}
            activeRouteId={activeRoute?.routeId ?? null}
            onSelect={handleSelectRoute}
            onOpenVerdict={openVerdict}
          />
        )
      )}

      <ConditionSheet
        open={sheetOpen}
        trip={trip}
        onClose={() => setSheetOpen(false)}
        onSubmit={applyConditions}
      />

      <BottomNav />
    </Screen>
  )
}
