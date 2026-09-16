import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus, RotateCw, TriangleAlert } from 'lucide-react'
import { t } from '../i18n'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import { ORDER_LINE } from '../lib/mapLine'
import { createPinElement, updateLabelVisibility } from './mapPins'
import styles from './MapView.module.css'

/** 거제도 대략 중심. 스팟이 로드되면 setBounds로 자동 조정됩니다. */
const GEOJE_CENTER = { lat: 34.88, lng: 128.62 }
const INITIAL_LEVEL = 9

/** setBounds가 스팟 분포에 따라 과하게 당기거나 밀지 않도록 잠급니다. */
const MIN_FIT_LEVEL = 6
const MAX_FIT_LEVEL = 10

/** 겹친 핀을 탭했을 때 당길 배율 단계. 2단계면 250m가 40px 넘게 벌어집니다. */
const CLUSTER_ZOOM_STEP = 2

/**
 * 화면 맞추기 여백(px). 38e0255의 배율을 그대로 씁니다.
 *
 * 마커 기하에서 나온 값이 아니라 "이만큼 띄워야 거제가 제일 잘 읽힌다"는 프레이밍
 * 값입니다. 마커를 28px 원으로 바꾸면서 이걸 마커 높이로 다시 계산했더니 지도가
 * 당겨져서 남쪽 스팟이 안내 카드에 가렸습니다. 마커 모양이 바뀌어도 이 값은 둡니다.
 */
const FIT_TOP_EXTRA = 60
const FIT_PADDING = 56

/** 코스 경로 선 — Figma route-line(285:234) 2.5px 단선. 흰 casing 없음. */

/**
 * 모든 스팟이 한 화면에 들어오도록 맞춥니다.
 *
 * 예전에는 맞춘 뒤 시야를 76px 남쪽으로 밀었습니다(NORTH_NUDGE). 창 높이를 그대로
 * 쓰던 시절엔 아래에 여유가 있어 괜찮았지만, 프레임을 844로 잠근 뒤로는 그 보정 때문에
 * 남쪽 스팟(해금강·도장포)이 둘러보기 안내 카드 뒤로 들어갔습니다.
 * 배율은 38e0255 그대로 두고 보정만 뺐습니다.
 */
function fitToSpots(kakao, map, spots, topReserved) {
  const points = spots.filter(
    (spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng),
  )
  if (points.length === 0) return

  const bounds = new kakao.maps.LatLngBounds()
  points.forEach((spot) => {
    bounds.extend(new kakao.maps.LatLng(spot.lat, spot.lng))
  })

  // (bounds, top, right, bottom, left)
  map.setBounds(bounds, topReserved + FIT_TOP_EXTRA, FIT_PADDING, FIT_PADDING, FIT_PADDING)

  const level = map.getLevel()
  if (level < MIN_FIT_LEVEL) map.setLevel(MIN_FIT_LEVEL)
  if (level > MAX_FIT_LEVEL) map.setLevel(MAX_FIT_LEVEL)
}

export default function MapView({
  spots,
  selectedSpotId,
  onSelectSpot,
  onDeselect,
  routePath = null,
  orderBySpotId = null,
  /**
   * 화면을 맞출 때 기준이 되는 스팟. 생략하면 `spots` 전체입니다.
   *
   * 코스 지도에서 갈라집니다 — 핀은 **17곳 전부** 찍고(코스 밖도 보여야 합니다) 화면은
   * **코스 스팟에만** 맞춥니다. 둘을 같이 쓰면 섬 전체로 줌아웃돼 정작 보려던 코스가
   * 손톱만 해집니다. 코스가 주제고 나머지는 배경입니다.
   */
  fitSpots = null,
  topReserved = 16,
  compact = false, // 판정 결과의 200px 미리보기 — 줌 버튼을 숨깁니다
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const pinsRef = useRef([]) // [{ spotId, isStop, overlay, element, label }]
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
      const { element, label, badge, isTerminal, isNineScenic } = createPinElement(spot, { order })
      const position = new kakao.maps.LatLng(spot.lat, spot.lng)

      element.addEventListener('click', (event) => {
        event.stopPropagation()
        // 다른 스팟을 덮고 있으면 고르기 전에 갈라 보여줍니다. 가려진 쪽은 탭할
        // 방법이 아예 없으므로, 여기서 확대하지 않으면 영영 닿지 못합니다.
        if (Number(element.dataset.covered) > 0) {
          map.setLevel(Math.max(1, map.getLevel() - CLUSTER_ZOOM_STEP), {
            anchor: position,
          })
          return
        }
        liveRef.current.onSelectSpot?.(spot)
      })

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content: element,
        // Figma: 28px 원의 중심이 지리 좌표입니다.
        xAnchor: 0.5,
        yAnchor: 0.5,
        clickable: true,
      })

      return { spotId: spot.spotId, isStop, isTerminal, isNineScenic, overlay, element, label, badge }
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
  }, [spots, phase, orderBySpotId])

  // ── 코스 경로 선 ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (phase !== 'ready' || !map) return
    if (!routePath || routePath.length < 2) return

    const kakao = window.kakao
    const path = routePath.map(({ lat, lng }) => new kakao.maps.LatLng(lat, lng))

    // 마커 중심끼리 잇습니다. Figma(285:234)는 2.5px 파란 실선인데 점선 · 진회색으로 바꿨습니다 — 버스 길이 아니라
    // 우리가 이은 방문 순서이고 학동 → 해금강처럼 바다를 가로지릅니다(lib/mapLine).
    const line = new kakao.maps.Polyline({
      map,
      path,
      ...ORDER_LINE,
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
      fitToSpots(window.kakao, map, fitSpots ?? spots, topReserved)
    }
    updateLabelVisibility(
      map,
      pinsRef.current,
      liveRef.current.selectedSpotId,
      topReserved,
    )
  }, [spots, fitSpots, topReserved, phase])

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

      {/* 확대·축소 — 한 덩어리로 묶었습니다(2026-09-13). 전에는 36px 버튼 두 개가 8px 떨어져
          따로 떠 있었습니다(Figma 240:169/171). 같은 일을 하는 두 버튼이 갈라져 보여서,
          흰 면 하나에 구분선으로 나눴습니다. 색·그림자는 기존 토큰 그대로입니다. */}
      {phase === 'ready' && !compact && (
        <div className={styles.controls} style={{ top: topReserved + 16 }}>
          <button
            type="button"
            className={styles.zoomButton}
            onClick={() => zoom(-1)}
            aria-label={t('map.zoomIn')}
          >
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className={styles.zoomDivider} aria-hidden="true" />
          <button
            type="button"
            className={styles.zoomButton}
            onClick={() => zoom(1)}
            aria-label={t('map.zoomOut')}
          >
            <Minus size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div className={`${styles.overlayState} ${styles.stateLoading}`}>
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.stateText}>{t('map.loading')}</p>
        </div>
      )}

      {phase === 'error' && (
        <div className={styles.overlayState}>
          <TriangleAlert
            size={28}
            className={styles.errorIcon}
            aria-hidden="true"
          />
          <p className={styles.stateTitle}>{t('map.errorTitle')}</p>
          <p className={styles.stateText}>{errorMessage}</p>
          <button type="button" className={styles.retryButton} onClick={retry}>
            <RotateCw size={16} aria-hidden="true" />
            {t('map.retry')}
          </button>
        </div>
      )}
    </div>
  )
}
