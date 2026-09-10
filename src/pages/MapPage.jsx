import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import ConditionEditor from '../components/ConditionEditor'
import ConditionHeader from '../components/ConditionHeader'
import CourseSheet from '../components/CourseSheet'
import MapView from '../components/MapView'
import RouteBar from '../components/RouteBar'
import Screen from '../components/Screen'
import SpotSheet from '../components/SpotSheet'
import { fetchPlan, fetchSpots } from '../data/mockPlan'
import { markRecommended, saveRecentCourse } from '../lib/recentCourse'
import { saveOrigin, tripFromSearch, tripToSearch } from '../lib/tripParams'
import styles from './MapPage.module.css'

/**
 * 조건을 연달아 만질 때(시각 스테퍼 등) 매 탭마다 판정을 부르지 않도록 잠깐 묶습니다.
 * 목 데이터일 땐 티가 안 나지만 실제 API가 붙으면 이게 없으면 요청이 튑니다.
 */
const REJUDGE_DEBOUNCE_MS = 200

/**
 * 지도 위쪽에서 비워둬야 하는 높이 = 떠 있는 조건 칩이 차지하는 자리.
 * MapView가 여기에 마커 높이를 더해서 실제 여백을 계산합니다.
 */
const TOP_RESERVED_BROWSE = 16
const TOP_RESERVED_PLANNED = 62

/** "?spots=5,2,7" → [5, 2, 7] */
function parseSpotIds(value) {
  if (!value) return null
  const ids = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter(Number.isInteger)
  return ids.length > 0 ? ids : null
}

/**
 * 지도 화면 — 두 가지 상태를 가집니다.
 *
 *   둘러보기   스팟을 아직 안 고른 채 탭바로 바로 들어온 경우.
 *             전체 스팟을 보여주되 조건 칩도 판정색도 쓰지 않습니다.
 *             판정을 하지 않았는데 성립/불성립 색을 칠하면 거짓말이 됩니다.
 *
 *   판정       스팟 고르기에서 넘어온 경우(?spots=...).
 *             조건 칩 + 판정색 + 추천 코스 버튼 줄이 함께 나옵니다.
 *
 * 판정 상태 안에서 추천 코스를 고르면 그 코스의 스팟만 남고 선으로 이어집니다.
 */
export default function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const requestedSpotIds = useMemo(
    () => parseSpotIds(searchParams.get('spots')),
    [searchParams],
  )
  const planned = requestedSpotIds !== null

  // 홈에서 넘어온 조건(?date=&departTime=&returnBy=)을 우선하고, 없으면 기본값.
  const [trip, setTrip] = useState(() => tripFromSearch(searchParams))
  const [editing, setEditing] = useState(null) // 'origin' | 'date' | 'time' | null
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })

  // 일정 고르기에서 고른 코스(?route=)는 처음부터 펼쳐진 채로 시작합니다.
  const [activeRouteId, setActiveRouteId] = useState(
    () => Number(searchParams.get('route')) || null,
  )
  const [selectedSpotId, setSelectedSpotId] = useState(null)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [routeBarHeight, setRouteBarHeight] = useState(0)

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
          if (!cancelled)
            setResult({ status: 'error', data: null, error: error.message })
        })
    }, REJUDGE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [planned, requestedSpotIds, trip])

  // 조건이 바뀌면 이전 판정 결과는 더 이상 맞지 않습니다. 열려 있던 카드와 코스는 닫고,
  // 지도의 핀은 새 결과가 올 때까지 그대로 두어 화면이 깜빡이지 않게 합니다.
  const updateTrip = useCallback((patch) => {
    if (patch.origin) saveOrigin(patch.origin)
    setSelectedSpotId(null)
    setActiveRouteId(null)
    setResult((prev) => ({ ...prev, status: 'loading' }))
    setTrip((prev) => ({ ...prev, ...patch }))
  }, [])

  // 좌표가 [미확인]인 스팟(명사해수욕장)은 지도에 찍지 않습니다.
  const allSpots = useMemo(
    () =>
      (result.data?.spots ?? []).filter(
        (spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng),
      ),
    [result.data],
  )
  const routes = useMemo(() => result.data?.routes ?? [], [result.data])

  const activeRoute =
    routes.find((route) => route.routeId === activeRouteId) ?? null

  // 코스를 고르면 그 코스의 스팟만, 방문 순서대로 남깁니다.
  const visibleSpots = useMemo(() => {
    if (!activeRoute) return allSpots
    return activeRoute.spotIds
      .map((id) => allSpots.find((spot) => spot.spotId === id))
      .filter(Boolean)
  }, [activeRoute, allSpots])

  const orderBySpotId = useMemo(() => {
    if (!activeRoute) return null
    return new Map(visibleSpots.map((spot, index) => [spot.spotId, index + 1]))
  }, [activeRoute, visibleSpots])

  const routePath = useMemo(() => {
    if (!activeRoute || visibleSpots.length < 2) return null
    return visibleSpots.map(({ lat, lng }) => ({ lat, lng }))
  }, [activeRoute, visibleSpots])

  const selectedSpot =
    visibleSpots.find((spot) => spot.spotId === selectedSpotId) ?? null

  const handleSelectSpot = useCallback(
    (spot) => setSelectedSpotId(spot.spotId),
    [],
  )
  const handleDeselect = useCallback(() => setSelectedSpotId(null), [])

  // 코스를 바꾸면 열려 있던 스팟 카드는 닫습니다. 그 스팟이 새 코스엔 없을 수 있습니다.
  const handleSelectRoute = useCallback((routeId) => {
    setSelectedSpotId(null)
    setActiveRouteId(routeId)
  }, [])

  // 스팟 카드가 코스 카드보다 우선입니다 — 방금 탭한 걸 보여줘야 하니까요.
  const showSpotSheet = selectedSpot !== null
  const showCourseSheet = !showSpotSheet && activeRoute !== null
  const openSheetHeight = showSpotSheet || showCourseSheet ? sheetHeight : 0

  // 둘러보기 안내는 카드가 뜨면 자리를 비켜줍니다. 둘이 겹칠 자리가 아닙니다.
  const showBrowseNotice =
    !planned && result.status === 'ready' && !showSpotSheet

  return (
    <Screen data-api={planned ? 'GET /api/routes' : 'GET /api/spots'}>
      <MapView
        spots={visibleSpots}
        selectedSpotId={selectedSpotId}
        onSelectSpot={handleSelectSpot}
        onDeselect={handleDeselect}
        routePath={routePath}
        showVerdict={planned}
        orderBySpotId={orderBySpotId}
        topReserved={planned ? TOP_RESERVED_PLANNED : TOP_RESERVED_BROWSE}
        bottomInset={openSheetHeight + routeBarHeight}
      />

      {/* 조건을 안 고른 상태에서는 조건 칩을 띄우지 않습니다. 보여줄 조건이 없습니다. */}
      {planned && <ConditionHeader trip={trip} onEdit={setEditing} />}

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

      {showSpotSheet && (
        <SpotSheet
          spot={selectedSpot}
          showVerdict={planned}
          stackOffset={routeBarHeight}
          onClose={handleDeselect}
          onOpenDetail={() => navigate(`/spots/${selectedSpot.spotId}`)}
          onHeightChange={setSheetHeight}
        />
      )}

      {showCourseSheet && (
        <CourseSheet
          route={activeRoute}
          spotCount={visibleSpots.length}
          stackOffset={routeBarHeight}
          onClose={() => setActiveRouteId(null)}
          onOpenVerdict={() => {
            saveRecentCourse({
              name: activeRoute.name,
              spotIds: activeRoute.spotIds,
              verdict: activeRoute.verdict,
              date: trip.date,
            })
            navigate(
              `/verdict/${activeRoute.routeId}?${tripToSearch(trip, { spots: requestedSpotIds.join(',') })}`,
            )
          }}
          onHeightChange={setSheetHeight}
        />
      )}

      {planned && (
        <RouteBar
          routes={routes}
          activeRouteId={activeRouteId}
          onSelect={handleSelectRoute}
          onHeightChange={setRouteBarHeight}
        />
      )}

      <ConditionEditor
        field={editing}
        trip={trip}
        onChange={updateTrip}
        onClose={() => setEditing(null)}
      />

      <BottomNav />
    </Screen>
  )
}
