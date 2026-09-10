import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import { ICON_PATHS } from '../lib/spotIcons'
import styles from './MapView.module.css'

/** 거제도 대략 중심. 스팟이 로드되면 setBounds로 자동 조정됩니다. */
const GEOJE_CENTER = { lat: 34.88, lng: 128.62 }
const INITIAL_LEVEL = 9

/** setBounds가 스팟 분포에 따라 과하게 당기거나 밀지 않도록 잠급니다. */
const MIN_FIT_LEVEL = 6
const MAX_FIT_LEVEL = 10

/**
 * 스팟만 딱 맞추면 남쪽에 빈 바다가 넓게 남고 거제 북쪽이 잘립니다.
 * 맞춘 뒤 시야를 이만큼 북쪽으로 밀어 섬이 화면을 채우게 합니다.
 */
const NORTH_NUDGE_PX = 76

/** 라벨 사이 최소 간격(px). 이보다 가까우면 뒤 순위 라벨을 숨깁니다. */
const LABEL_GAP = 4

/**
 * 마커 기하 — Figma 285:208 실측.
 * SpotMarker·StopMarker 모두 28×28이고 **원의 중심이 지리 좌표**입니다
 * (CustomOverlay xAnchor 0.5 / yAnchor 0.5). 꼬리·사진 핀은 쓰지 않습니다.
 *
 * 라벨은 마커 박스 기준 오른쪽 +30 / 위 +5에 붙습니다. 오른쪽이 막히면 왼쪽으로
 * 뒤집는데, 그때 간격은 Figma 실측대로 4px입니다(오른쪽 2px와 비대칭 — 원본 그대로).
 *
 * [주의] 아래 값을 바꾸면 MapView.module.css의 .pin / .pinLabel 치수도 같이 고쳐야
 * 이름표 충돌 계산이 어긋나지 않습니다.
 */
const MARKER_SIZE = 28
const MARKER_HALF = MARKER_SIZE / 2
const LABEL_HEIGHT = 18
const LABEL_TOP_INSET = 5
const LABEL_RIGHT_GAP = 30
const LABEL_LEFT_GAP = 4

/** 코스 경로 선 — Figma route-line(285:234) 2.5px 단선. 흰 casing 없음. */
const ROUTE_LINE_WEIGHT = 2.5

/** 코스 정류소 마커의 판정 톤. 성립은 기본(브랜드) — Figma StopMarker default. */
function toneClassOf(spot, isStop, showVerdict) {
  if (!isStop || !showVerdict) return null
  if (spot.verdict === 'NO') return styles.toneNo
  if (spot.verdict === 'UNKNOWN') return styles.toneUnknown
  return null
}

/**
 * 마커 하나. CustomOverlay는 DOM 엘리먼트를 그대로 받으므로 직접 만들어 넣습니다.
 *
 *   코스 정류소  StopMarker — brand 면 + 흰 번호 (미확인·불성립이면 테두리 톤)
 *   코스 밖 스팟 SpotMarker — 흰 면 + brand 테두리 + 카테고리 아이콘
 */
function createPinElement(spot, { order, tone }) {
  const isStop = order != null

  const element = document.createElement('button')
  element.type = 'button'
  element.className = [styles.pin, isStop ? styles.pinStop : styles.pinSpot, tone]
    .filter(Boolean)
    .join(' ')

  // 판정 3분법 — 미확인을 성립으로 읽지 않는다.
  const VERDICT_LABEL = { YES: '성립', NO: '불성립', UNKNOWN: '미확인' }
  const state = isStop && spot.verdict ? ` · ${VERDICT_LABEL[spot.verdict] ?? '미확인'}` : ''
  element.setAttribute('aria-label', `${spot.shortName ?? spot.name}${state}`)

  const dot = document.createElement('span')
  dot.className = styles.pinDot
  if (isStop) {
    dot.textContent = String(order)
  } else {
    dot.innerHTML =
      `<svg width="${MARKER_SIZE}" height="${MARKER_SIZE}" viewBox="0 0 28 28" aria-hidden="true">` +
      `<path d="${ICON_PATHS[spot.theme] ?? ICON_PATHS.VIEW}" fill="none" stroke="currentColor"` +
      ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  }

  const label = document.createElement('span')
  label.className = styles.pinLabel
  label.textContent = spot.shortName ?? spot.name

  element.append(dot, label)
  return { element, label }
}

/**
 * 라벨 겹침 정리.
 * 거제 남부에 스팟이 몰려 있어서 라벨을 전부 그리면 서로 잘립니다.
 * Figma 기본 배치는 마커 오른쪽이고, 막히면 왼쪽으로 뒤집습니다(바람의언덕이 그 예).
 * 양쪽 다 막히면 그 이름표만 숨깁니다 — 점 자체는 항상 보입니다.
 */
function updateLabelVisibility(map, pins, selectedId, topReserved = 0) {
  let projection
  try {
    projection = map.getProjection()
  } catch {
    return
  }
  if (!projection) return

  // 지도 가장자리에 걸친 이름표는 잘려서 못 읽습니다. 화면 안에 들어오는지도 봅니다.
  const node = map.getNode?.()
  const viewWidth = node?.offsetWidth ?? Infinity
  const viewHeight = node?.offsetHeight ?? Infinity

  const points = new Map()
  const occupied = []

  // 1) 마커가 먼저 자리를 차지합니다. 이름표가 남의 마커에 걸치면 둘 다 못 읽습니다.
  //    z축도 여기서 정합니다 — 화면 아래(남쪽) 마커가 위로 올라와 층이 읽힙니다.
  pins.forEach((pin) => {
    const point = projection.containerPointFromCoords(pin.overlay.getPosition())
    points.set(pin.spotId, point)

    const isSelected = pin.spotId === selectedId
    pin.overlay.setZIndex(isSelected ? 9999 : 100 + Math.round(point.y))

    occupied.push({
      owner: pin.spotId,
      left: point.x - MARKER_HALF,
      right: point.x + MARKER_HALF,
      top: point.y - MARKER_HALF,
      bottom: point.y + MARKER_HALF,
    })
  })

  // 2) 이름표를 우선순위대로 놓습니다. 코스 정류소가 코스 밖 스팟보다 먼저입니다.
  const rank = (pin) => (pin.spotId === selectedId ? 0 : pin.isStop ? 1 : 2)
  const ordered = [...pins].sort((a, b) => rank(a) - rank(b))

  ordered.forEach((pin) => {
    // opacity는 레이아웃에 영향이 없어서 숨긴 상태에서도 폭을 잴 수 있습니다.
    const width = pin.label.offsetWidth
    const point = points.get(pin.spotId)
    if (!point || width === 0) return

    const markerLeft = point.x - MARKER_HALF
    const top = point.y - MARKER_HALF + LABEL_TOP_INSET
    const boxAt = (left) => ({ left, right: left + width, top, bottom: top + LABEL_HEIGHT })

    const right = boxAt(markerLeft + LABEL_RIGHT_GAP)
    const left = boxAt(markerLeft - LABEL_LEFT_GAP - width)

    const fits = (box) =>
      !occupied.some(
        (other) =>
          other.owner !== pin.spotId &&
          box.left < other.right + LABEL_GAP &&
          box.right + LABEL_GAP > other.left &&
          box.top < other.bottom + LABEL_GAP &&
          box.bottom + LABEL_GAP > other.top,
      )

    const within = (box) =>
      box.left >= 0 &&
      box.right <= viewWidth &&
      box.top >= topReserved &&
      box.bottom <= viewHeight

    // 오른쪽 → 왼쪽 순으로 시도합니다.
    // 방금 탭한 스팟의 이름표는 자리가 없어도 보여줍니다. 숨겨버리면
    // "내가 뭘 눌렀는지"가 사라집니다. 나머지가 이걸 피해 가면 됩니다.
    const placement =
      [right, left].find((box) => within(box) && fits(box)) ??
      (pin.spotId === selectedId ? (within(right) ? right : left) : null)

    pin.label.classList.toggle(styles.pinLabelLeft, placement === left)
    pin.label.style.opacity = placement ? '1' : '0'
    pin.label.style.pointerEvents = placement ? '' : 'none'
    if (placement) occupied.push({ ...placement, owner: pin.spotId })
  })
}

/**
 * 모든 스팟이 한 화면에 들어오도록 맞춥니다.
 *
 * nudgeNorth는 섬 전체를 볼 때만 켭니다. 코스를 골라 몇 개만 볼 때 켜면
 * 딱 맞게 잡아둔 화면을 위로 밀어서 마지막 스팟이 밖으로 떨어집니다.
 */
function fitToSpots(kakao, map, spots, topReserved, nudgeNorth) {
  const points = spots.filter(
    (spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng),
  )
  if (points.length === 0) return

  const bounds = new kakao.maps.LatLngBounds()
  points.forEach((spot) => {
    bounds.extend(new kakao.maps.LatLng(spot.lat, spot.lng))
  })

  // setBounds의 여백은 "좌표" 기준입니다. 마커는 좌표를 중심으로 위아래 14px씩
  // 차지하므로 그만큼 + 숨 쉴 틈을 더해야 조건 칩 아래로 파고들지 않습니다.
  const topPadding = topReserved + MARKER_HALF + 12

  // (bounds, top, right, bottom, left)
  map.setBounds(bounds, topPadding, 56, 56, 56)

  const level = map.getLevel()
  if (level < MIN_FIT_LEVEL) map.setLevel(MIN_FIT_LEVEL)
  if (level > MAX_FIT_LEVEL) map.setLevel(MAX_FIT_LEVEL)

  if (!nudgeNorth) return

  // 화면 중심을 위로 옮긴 지점의 좌표 = 조금 더 북쪽. 줌은 건드리지 않습니다.
  try {
    const projection = map.getProjection()
    const center = projection.containerPointFromCoords(map.getCenter())
    map.setCenter(
      projection.coordsFromContainerPoint(
        new kakao.maps.Point(center.x, center.y - NORTH_NUDGE_PX),
      ),
    )
  } catch {
    // projection API가 없으면 맞춘 그대로 둡니다.
  }
}

export default function MapView({
  spots,
  selectedSpotId,
  onSelectSpot,
  onDeselect,
  routePath = null,
  showVerdict = true,
  orderBySpotId = null,
  topReserved = 16,
  compact = false, // 판정 결과의 200px 미리보기 — 줌 버튼을 숨깁니다
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const pinsRef = useRef([]) // [{ spotId, isStop, overlay, element, label }]
  const linesRef = useRef([])
  const liveRef = useRef({ onSelectSpot, onDeselect, selectedSpotId, topReserved, routePath })

  const [phase, setPhase] = useState('loading') // 'loading' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [retryToken, setRetryToken] = useState(0)

  // 지도 이벤트 리스너는 한 번만 붙이므로, 최신 값은 ref로 넘겨줍니다.
  useEffect(() => {
    liveRef.current = { onSelectSpot, onDeselect, selectedSpotId, topReserved, routePath }
  })

  // ── SDK 로드 + 지도 생성 ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    let cancelled = false

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !container) return

        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(GEOJE_CENTER.lat, GEOJE_CENTER.lng),
          level: INITIAL_LEVEL,
        })
        mapRef.current = map

        // 빈 곳을 탭하면 카드를 닫습니다.
        kakao.maps.event.addListener(map, 'click', () => {
          liveRef.current.onDeselect?.()
        })

        // 확대·이동이 끝날 때마다 라벨 겹침을 다시 계산합니다.
        kakao.maps.event.addListener(map, 'idle', () => {
          updateLabelVisibility(
            map,
            pinsRef.current,
            liveRef.current.selectedSpotId,
            liveRef.current.topReserved,
          )
        })

        setPhase('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setErrorMessage(error.message)
        setPhase('error')
      })

    return () => {
      cancelled = true
      pinsRef.current.forEach(({ overlay }) => overlay.setMap(null))
      pinsRef.current = []
      linesRef.current.forEach((line) => line.setMap(null))
      linesRef.current = []
      mapRef.current = null
      // kakao.maps.Map에는 destroy가 없어서, StrictMode 재마운트 시 지도가 겹치지
      // 않도록 컨테이너를 직접 비웁니다.
      if (container) container.innerHTML = ''
    }
  }, [retryToken])

  // ── 컨테이너 크기가 바뀌면 지도 다시 그리기 (시트가 열리며 지도가 줄 때 등) ──
  useEffect(() => {
    if (phase !== 'ready' || !containerRef.current) return

    const observer = new ResizeObserver(() => mapRef.current?.relayout())
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [phase])

  // ── 스팟 → 마커 동기화 ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (phase !== 'ready' || !map || spots.length === 0) return

    const kakao = window.kakao

    pinsRef.current = spots.map((spot) => {
      const order = orderBySpotId?.get(spot.spotId) ?? null
      const isStop = order != null
      const { element, label } = createPinElement(spot, {
        order,
        tone: toneClassOf(spot, isStop, showVerdict),
      })
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        liveRef.current.onSelectSpot?.(spot)
      })

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(spot.lat, spot.lng),
        content: element,
        // Figma: 28px 원의 중심이 지리 좌표입니다.
        xAnchor: 0.5,
        yAnchor: 0.5,
        clickable: true,
      })

      return { spotId: spot.spotId, isStop, overlay, element, label }
    })

    // 화면 맞추기는 아래 전용 이펙트가 합니다 — 시트 높이가 정해진 뒤에 맞춰야 해서.

    // 라벨이 실제로 그려진 다음에야 폭을 잴 수 있습니다.
    const frame = requestAnimationFrame(() =>
      updateLabelVisibility(
        map,
        pinsRef.current,
        liveRef.current.selectedSpotId,
        liveRef.current.topReserved,
      ),
    )

    return () => {
      cancelAnimationFrame(frame)
      pinsRef.current.forEach(({ overlay }) => overlay.setMap(null))
      pinsRef.current = []
    }
    // topReserved는 liveRef로 읽습니다 — 그 값 때문에 마커를 다시 만들 필요는 없습니다.
  }, [spots, phase, showVerdict, orderBySpotId])

  // ── 코스 경로 선 ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (phase !== 'ready' || !map) return
    if (!routePath || routePath.length < 2) return

    const kakao = window.kakao
    const path = routePath.map(({ lat, lng }) => new kakao.maps.LatLng(lat, lng))

    // Figma는 흰 casing 없는 2.5px 단선입니다(285:234). 마커 중심끼리 잇습니다.
    const line = new kakao.maps.Polyline({
      map,
      path,
      strokeWeight: ROUTE_LINE_WEIGHT,
      strokeColor: '#0069b3',
      strokeOpacity: 1,
      strokeStyle: 'solid',
    })
    linesRef.current = [line]

    return () => {
      linesRef.current.forEach((item) => item.setMap(null))
      linesRef.current = []
    }
  }, [routePath, phase])

  // ── 지도 영역이 바뀌면 다시 그리고, 필요하면 화면을 다시 맞춥니다 ───────
  //
  // 다시 맞추는 이유: 코스를 고르면 마커가 바뀌는 동시에 시트가 열립니다.
  // 마커가 생길 때 맞춰버리면 그건 시트가 열리기 전의 큰 지도 기준이라,
  // 곧이어 지도가 줄면서 아래쪽 마커들이 화면 밖으로 밀려납니다.
  // 단, 스팟을 탭해서 시트가 열린 경우는 그 스팟으로 이동한 상태이므로 맞추지 않습니다.
  //
  // routePath는 일부러 의존성에서 뺐습니다. fitToSpots는 코스가 아니라 **전체 스팟**에
  // 맞추므로 코스를 바꿔도 결과 화면은 같습니다. 그런데 다시 맞추면 사용자가 손으로
  // 옮겨둔 지도만 원위치로 튕깁니다 — 코스 카드를 넘길 때마다.
  useEffect(() => {
    const map = mapRef.current
    if (phase !== 'ready' || !map || spots.length === 0) return

    map.relayout()
    if (liveRef.current.selectedSpotId == null) {
      fitToSpots(window.kakao, map, spots, topReserved, liveRef.current.routePath === null)
    }
    updateLabelVisibility(
      map,
      pinsRef.current,
      liveRef.current.selectedSpotId,
      topReserved,
    )
  }, [spots, topReserved, phase])

  // ── 선택 상태를 마커에 반영 + 선택한 핀으로 이동 ────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (phase !== 'ready' || !map) return

    pinsRef.current.forEach(({ spotId, element }) => {
      element.classList.toggle(styles.pinSelected, spotId === selectedSpotId)
    })

    // z축과 이름표 배치는 여기서 한꺼번에 다시 계산합니다.
    updateLabelVisibility(map, pinsRef.current, selectedSpotId, topReserved)

    if (selectedSpotId == null) return
    const selected = pinsRef.current.find((pin) => pin.spotId === selectedSpotId)
    // 지도 영역이 시트만큼 줄어 있으므로 그냥 가운데로 보내면 됩니다.
    if (selected) map.panTo(selected.overlay.getPosition())
  }, [selectedSpotId, spots, phase, topReserved])

  const zoom = useCallback((delta) => {
    const map = mapRef.current
    if (!map) return
    map.setLevel(map.getLevel() + delta, { animate: true })
  }, [])

  const retry = useCallback(() => {
    setPhase('loading')
    setErrorMessage('')
    setRetryToken((token) => token + 1)
  }, [])

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.canvas} />

      {/* Figma 240:169/171 — 테두리 없는 36px 버튼 두 개, 8px 간격, 우측 12px */}
      {phase === 'ready' && !compact && (
        <div className={styles.controls} style={{ top: topReserved + 16 }}>
          <button
            type="button"
            className={styles.zoomButton}
            onClick={() => zoom(-1)}
            aria-label="확대"
          >
            +
          </button>
          <button
            type="button"
            className={styles.zoomButton}
            onClick={() => zoom(1)}
            aria-label="축소"
          >
            −
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div className={`${styles.overlayState} ${styles.stateLoading}`}>
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.stateText}>지도를 불러오는 중</p>
        </div>
      )}

      {phase === 'error' && (
        <div className={styles.overlayState}>
          <TriangleAlert
            size={28}
            className={styles.errorIcon}
            aria-hidden="true"
          />
          <p className={styles.stateTitle}>지도를 표시할 수 없습니다</p>
          <p className={styles.stateText}>{errorMessage}</p>
          <button type="button" className={styles.retryButton} onClick={retry}>
            <RotateCw size={16} aria-hidden="true" />
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}
