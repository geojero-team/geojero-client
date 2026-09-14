import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
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

    // 고현터미널을 먼저 찍습니다 — 번호 핀이 겹치면 번호가 위에 보이게.
    const items = [
      ...(terminal ? [{ at: terminal, content: pin(styles.terminal, '') }] : []),
      ...stops.map((stop) => ({ at: stop, content: pin(styles.stop, String(stop.seq)) })),
    ].filter(({ at }) => Number.isFinite(at.lat) && Number.isFinite(at.lng))
    if (items.length === 0) return

    const bounds = new kakao.maps.LatLngBounds()
    const overlays = items.map(({ at, content }) => {
      const position = new kakao.maps.LatLng(at.lat, at.lng)
      bounds.extend(position)
      return new kakao.maps.CustomOverlay({ map, position, content, xAnchor: 0.5, yAnchor: 0.5 })
    })
    map.setBounds(bounds, FIT_PADDING, FIT_PADDING, FIT_PADDING, FIT_PADDING)

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
