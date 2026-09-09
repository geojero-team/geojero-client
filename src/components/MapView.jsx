import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, RotateCw, TriangleAlert } from 'lucide-react'
import { courseImage, courseImageFallback } from '../lib/courseImage'
import { loadKakaoMaps } from '../lib/kakaoLoader'
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
 * 마커 기하 — 아래 값은 전부 "좌표(꼬리 끝)"에서 잰 거리입니다.
 * CustomOverlay를 yAnchor:1로 붙여서 꼬리 끝이 실제 지점에 꽂힙니다.
 * MapView.module.css의 .pin / .pinBody / .pinTail 치수와 맞물려 있습니다.
 */
const MARKER_HALF_WIDTH = 22
const MARKER_TOP_FROM_ANCHOR = 48
const SELECTED_SCALE = 1.12

/** 이름표 위치. CSS의 top:58px(아래) / bottom:50px(위)과 맞물립니다. */
const LABEL_BELOW_FROM_ANCHOR = 2
const LABEL_ABOVE_FROM_ANCHOR = 50

/** 코스 경로 선. 흰 테두리를 깔아야 지도 위에서 선이 묻히지 않습니다. */
const ROUTE_LINE_WEIGHT = 6
const ROUTE_CASING_WEIGHT = 11

/** 마커 하나. CustomOverlay는 DOM 엘리먼트를 그대로 받으므로 직접 만들어 넣습니다. */
function createPinElement(spot, { showVerdict, order }) {
  const element = document.createElement('button')
  element.type = 'button'

  // 조건이 정해지지 않았으면 판정도 없습니다. 그럴 땐 색으로 말하지 않습니다.
  const tone = !showVerdict
    ? styles.pinNeutral
    : spot.verdict === 'NO'
      ? styles.pinNo
      : styles.pinYes
  element.className = `${styles.pin} ${tone}`

  // 판정 3분법 — 미확인을 성립으로 읽지 않는다.
  const VERDICT_LABEL = { YES: '성립', NO: '불성립' }
  const state = !showVerdict ? '' : ` · ${VERDICT_LABEL[spot.verdict] ?? '미확인'}`
  element.setAttribute('aria-label', `${spot.shortName ?? spot.name}${state}`)

  const body = document.createElement('span')
  body.className = styles.pinBody

  const photo = document.createElement('img')
  photo.src = courseImage(spot)
  photo.alt = ''
  photo.decoding = 'async'
  // 백엔드 썸네일 링크가 깨져도 지도에 빈 칸이 생기지 않게 테마 그림으로 되돌립니다.
  photo.addEventListener(
    'error',
    () => {
      photo.src = courseImageFallback(spot)
    },
    { once: true },
  )
  body.append(photo)

  // 꼬리 끝이 실제 좌표입니다. 몸통이 그 위에 떠 있어서 겹쳐도 층이 보입니다.
  const tail = document.createElement('span')
  tail.className = styles.pinTail

  const label = document.createElement('span')
  label.className = styles.pinLabel
  label.textContent = spot.shortName ?? spot.name

  element.append(body, tail, label)

  // 코스를 고른 상태에서만 방문 순서를 답니다. 선만으로는 어디가 시작인지 모릅니다.
  if (order != null) {
    const badge = document.createElement('span')
    badge.className = styles.pinOrder
    badge.textContent = String(order)
    element.append(badge)
  }

  return { element, label }
}

/**
 * 라벨 겹침 정리.
 * 거제 남부에 스팟이 몰려 있어서 라벨을 전부 그리면 서로 잘립니다.
 * 선택된 핀 > 성립 > 불성립 순으로 자리를 먼저 주고, 부딪히는 라벨만 숨깁니다.
 * (점 자체는 항상 보입니다 — 숨기는 건 이름표뿐입니다)
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

  // 1) 마커 몸통이 먼저 자리를 차지합니다. 이름표가 남의 마커에 걸치면 둘 다 못 읽습니다.
  //    겸사겸사 z축도 여기서 정합니다 — 화면 아래(남쪽) 마커가 위로 올라오면
  //    겹쳤을 때 카드가 포개진 것처럼 보여서 어느 게 앞인지 읽힙니다.
  pins.forEach((pin) => {
    const point = projection.containerPointFromCoords(pin.overlay.getPosition())
    points.set(pin.spotId, point)

    const isSelected = pin.spotId === selectedId
    const scale = isSelected ? SELECTED_SCALE : 1
    pin.overlay.setZIndex(isSelected ? 9999 : 100 + Math.round(point.y))

    occupied.push({
      owner: pin.spotId,
      left: point.x - MARKER_HALF_WIDTH * scale,
      right: point.x + MARKER_HALF_WIDTH * scale,
      top: point.y - MARKER_TOP_FROM_ANCHOR * scale,
      bottom: point.y,
    })
  })

  // 2) 이름표를 우선순위대로 놓습니다. 아래가 막히면 위로 뒤집고,
  //    그래도 안 되면 그 이름표만 숨깁니다.
  const rank = (pin) =>
    pin.spotId === selectedId ? 0 : pin.verdict === 'NO' ? 2 : 1
  const ordered = [...pins].sort((a, b) => rank(a) - rank(b))

  ordered.forEach((pin) => {
    // opacity는 레이아웃에 영향이 없어서 숨긴 상태에서도 폭을 잴 수 있습니다.
    const width = pin.label.offsetWidth
    const height = pin.label.offsetHeight
    const point = points.get(pin.spotId)
    if (!point || width === 0) return

    const boxAt = (above) => ({
      left: point.x - width / 2,
      right: point.x + width / 2,
      top: above
        ? point.y - LABEL_ABOVE_FROM_ANCHOR - height
        : point.y + LABEL_BELOW_FROM_ANCHOR,
      bottom: above
        ? point.y - LABEL_ABOVE_FROM_ANCHOR
        : point.y + LABEL_BELOW_FROM_ANCHOR + height,
    })

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

    const below = boxAt(false)
    const above = boxAt(true)

    // 아래 → 위 순으로 시도합니다.
    // 방금 탭한 스팟의 이름표는 자리가 없어도 보여줍니다. 숨겨버리면
    // "내가 뭘 눌렀는지"가 사라집니다. 나머지가 이걸 피해 가면 됩니다.
    const placement =
      [below, above].find((box) => within(box) && fits(box)) ??
      (pin.spotId === selectedId ? (within(below) ? below : above) : null)

    pin.label.classList.toggle(styles.pinLabelAbove, placement === above)
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

  // setBounds의 여백은 "좌표"를 기준으로 잡힙니다. 그런데 마커 몸통은 좌표에서
  // 위로 48px 솟아 있어서, 여백을 헤더 높이만큼만 주면 몸통이 헤더를 파고듭니다.
  // 마커 높이 + 숨 쉴 틈까지 더해야 실제로 안 겹칩니다.
  const topPadding = topReserved + MARKER_TOP_FROM_ANCHOR + 12

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
  bottomInset = 0,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const pinsRef = useRef([]) // [{ spotId, verdict, overlay, element, label }]
  const linesRef = useRef([])
  const liveRef = useRef({ onSelectSpot, onDeselect, selectedSpotId, topReserved })

  const [phase, setPhase] = useState('loading') // 'loading' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [retryToken, setRetryToken] = useState(0)

  // 지도 이벤트 리스너는 한 번만 붙이므로, 최신 값은 ref로 넘겨줍니다.
  useEffect(() => {
    liveRef.current = { onSelectSpot, onDeselect, selectedSpotId, topReserved }
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

  // ── 컨테이너 크기가 바뀌면 지도 다시 그리기 (모바일 주소창 접힘 등) ─────
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
      const { element, label } = createPinElement(spot, {
        showVerdict,
        order: orderBySpotId?.get(spot.spotId) ?? null,
      })
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        liveRef.current.onSelectSpot?.(spot)
      })

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(spot.lat, spot.lng),
        content: element,
        // 박스 아래 가운데(= 꼬리 끝)를 좌표에 맞춥니다.
        xAnchor: 0.5,
        yAnchor: 1,
        clickable: true,
      })

      return {
        spotId: spot.spotId,
        verdict: spot.verdict,
        overlay,
        element,
        label,
      }
    })

    // 화면 맞추기는 아래 전용 이펙트가 합니다 — 카드 높이가 정해진 뒤에 맞춰야 해서.

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

    // 흰 선을 깔고 그 위에 브랜드색 선을 올립니다. 지도 위에서 선이 묻히지 않게.
    const casing = new kakao.maps.Polyline({
      map,
      path,
      strokeWeight: ROUTE_CASING_WEIGHT,
      strokeColor: '#ffffff',
      strokeOpacity: 0.95,
      strokeStyle: 'solid',
    })
    const line = new kakao.maps.Polyline({
      map,
      path,
      strokeWeight: ROUTE_LINE_WEIGHT,
      strokeColor: '#0069b3',
      strokeOpacity: 0.95,
      strokeStyle: 'solid',
    })
    linesRef.current = [casing, line]

    return () => {
      linesRef.current.forEach((item) => item.setMap(null))
      linesRef.current = []
    }
  }, [routePath, phase])

  // ── 지도 영역이 바뀌면 다시 그리고, 필요하면 화면을 다시 맞춥니다 ───────
  //
  // 카드가 지도를 덮으면 카카오 로고·축척이 가려지고 핀도 안 보입니다.
  // 지도 컨테이너 자체를 줄이면 로고가 카드 위로 올라옵니다.
  //
  // 다시 맞추는 이유: 코스를 고르면 마커가 바뀌는 동시에 카드가 열립니다.
  // 마커가 생길 때 맞춰버리면 그건 카드가 열리기 전의 큰 지도 기준이라,
  // 곧이어 지도가 줄면서 아래쪽 마커들이 화면 밖으로 밀려납니다.
  // 단, 스팟을 탭해서 카드가 열린 경우는 그 스팟으로 이동한 상태이므로 맞추지 않습니다.
  useEffect(() => {
    const map = mapRef.current
    if (phase !== 'ready' || !map || spots.length === 0) return

    map.relayout()
    if (liveRef.current.selectedSpotId == null) {
      fitToSpots(window.kakao, map, spots, topReserved, routePath === null)
    }
    updateLabelVisibility(
      map,
      pinsRef.current,
      liveRef.current.selectedSpotId,
      topReserved,
    )
  }, [spots, bottomInset, topReserved, phase, routePath])

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
    // 지도 영역이 카드만큼 줄어 있으므로 그냥 가운데로 보내면 됩니다.
    if (selected) map.panTo(selected.overlay.getPosition())
  }, [selectedSpotId, spots, phase, topReserved])

  const zoom = useCallback((delta) => {
    const map = mapRef.current
    if (!map) return
    map.setLevel(map.getLevel() + delta, { animate: true })
  }, [])

  const fitAll = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    fitToSpots(window.kakao, map, spots, topReserved, routePath === null)
  }, [spots, topReserved, routePath])

  const retry = useCallback(() => {
    setPhase('loading')
    setErrorMessage('')
    setRetryToken((token) => token + 1)
  }, [])

  return (
    <div className={styles.root}>
      <div
        ref={containerRef}
        className={styles.canvas}
        style={{ bottom: bottomInset }}
      />

      {phase === 'ready' && (
        <div className={styles.controls} style={{ top: topReserved + 10 }}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={fitAll}
            aria-label="전체 보기"
          >
            <Maximize2 size={18} aria-hidden="true" />
          </button>
          <div className={styles.zoomGroup}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => zoom(-1)}
              aria-label="확대"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => zoom(1)}
              aria-label="축소"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
          </div>
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
