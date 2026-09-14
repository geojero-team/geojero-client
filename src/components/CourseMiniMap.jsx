import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import { distanceMeters } from '../lib/geo'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import styles from './CourseMiniMap.module.css'

/**
 * 코스 상세 머리의 220px 지도 — Figma 09-14 개정 `532:324`.
 *
 * 홈·코스 지도(MapView)를 쓰지 않은 이유: 그쪽은 28px 핀에 이름표가 늘 붙고, 섬 전체를 보는
 * 여백(위 76 · 옆 56px)으로 맞춥니다. 220px 칸에 넣으면 코스가 손톱만 해집니다. 여기는 요약이라
 * **번호 핀(24px)과 번호 없는 고현터미널 핀(22px)만** 찍고 이름표를 달지 않습니다 — 이름은 바로 아래 제목과 타임라인이 말합니다.
 *
 * 끌기·확대는 막습니다. 스크롤하는 페이지 한가운데 있어 손가락이 지도에 걸리면 페이지가 안 내려갑니다.
 * 지도가 못 떠도 타임라인은 그대로라(카카오 JS 키는 도메인 제한) 칸에 한 줄만 적습니다.
 *
 * @param stops    코스 스팟 [{ seq, lat, lng }]
 * @param terminal 고현터미널 좌표 { lat, lng } — /api/pois 의 TERMINAL 행. 없으면 스팟만.
 */

const FIT_PADDING = 32
/**
 * 화면에서 이보다 가까운 번호 핀은 한 핀에 번호를 합쳐 적습니다(「2·3」). 조선해양문화관과 거제씨월드는 113m라
 * 섬 절반을 담는 배율에서 1px 남짓 떨어져 한 핀이 다른 핀을 통째로 가립니다(코스 8개, 2026-09-14 리뷰).
 * 끌기·확대를 막아 두어 사용자가 떼어 볼 방법도 없습니다. 16px는 홈 지도(mapPins CLUSTER_GAP)와 같은 기준입니다.
 */
const MERGE_PX = 16
/** SDK가 투영을 주지 않을 때의 거리 기준. */
const MERGE_M = 150
const GEOJE_CENTER = { lat: 34.88, lng: 128.62 }
const INITIAL_LEVEL = 9

function pin(className, text) {
  const element = document.createElement('span')
  element.className = className
  element.textContent = text
  return element
}

export default function CourseMiniMap({ stops, terminal }) {
  const containerRef = useRef(null)
  const kakaoRef = useRef(null)
  const mapRef = useRef(null)
  const [phase, setPhase] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    const container = containerRef.current
    let cancelled = false
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !container) return
        kakaoRef.current = kakao
        mapRef.current = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(GEOJE_CENTER.lat, GEOJE_CENTER.lng),
          level: INITIAL_LEVEL,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        })
        setPhase('ready')
      })
      .catch(() => {
        if (!cancelled) setPhase('error')
      })
    return () => {
      cancelled = true
      mapRef.current = null
      // kakao.maps.Map에는 destroy가 없습니다 — StrictMode 재마운트에 지도가 겹치지 않게 비웁니다(MapView와 같음).
      if (container) container.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    const kakao = kakaoRef.current
    const map = mapRef.current
    if (phase !== 'ready' || !kakao || !map) return

    const valid = (at) => at && Number.isFinite(at.lat) && Number.isFinite(at.lng)
    const spots = stops.filter(valid).map((stop) => ({ stop, position: new kakao.maps.LatLng(stop.lat, stop.lng) }))
    const terminalPosition = valid(terminal) ? new kakao.maps.LatLng(terminal.lat, terminal.lng) : null
    if (spots.length === 0 && !terminalPosition) return

    const bounds = new kakao.maps.LatLngBounds()
    if (terminalPosition) bounds.extend(terminalPosition)
    spots.forEach(({ position }) => bounds.extend(position))
    map.setBounds(bounds, FIT_PADDING, FIT_PADDING, FIT_PADDING, FIT_PADDING)

    // 맞춘 배율의 화면 좌표로 포개지는 번호 핀을 묶습니다.
    const projection = map.getProjection?.()
    const groups = []
    for (const { stop, position } of spots) {
      const point = projection?.containerPointFromCoords(position)
      const group = groups.find((g) =>
        point && g.point
          ? Math.hypot(g.point.x - point.x, g.point.y - point.y) < MERGE_PX
          : distanceMeters(g.stop, stop) < MERGE_M,
      )
      if (group) group.seqs.push(stop.seq)
      else groups.push({ stop, position, point, seqs: [stop.seq] })
    }

    // 고현터미널을 먼저 찍습니다 — 번호 핀이 겹치면 번호가 위에 보이게.
    const items = [
      ...(terminalPosition ? [{ position: terminalPosition, content: pin(styles.terminal, '') }] : []),
      ...groups.map((g) => ({ position: g.position, content: pin(styles.stop, g.seqs.join('·')) })),
    ]
    const overlays = items.map(
      ({ position, content }) => new kakao.maps.CustomOverlay({ map, position, content, xAnchor: 0.5, yAnchor: 0.5 }),
    )

    return () => overlays.forEach((overlay) => overlay.setMap(null))
  }, [phase, stops, terminal])

  return (
    <div className={styles.root}>
      {/* 지도는 타임라인과 같은 내용을 그림으로 보여줄 뿐이라 읽기 도구에서는 숨깁니다. */}
      <div ref={containerRef} className={styles.map} aria-hidden="true" />
      {phase === 'error' && <p className={styles.failed}>{t('boarding.mapFailed')}</p>}
    </div>
  )
}
