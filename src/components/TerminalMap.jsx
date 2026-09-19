import { useEffect, useRef } from 'react'
import { t } from '../i18n'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import { TERMINAL_MARKER_SVG } from './mapPins'
import styles from './TerminalMap.module.css'

/**
 * 고현터미널 상세의 사진 자리 — 터미널은 TourAPI 사진이 없는 곳이라 자리그림 대신 「어디 있나」를 보여 줍니다
 * (2026-09-19 사용자 결정). 움직이지 않는 지도에 홈 지도와 같은 파란 버스 핀 하나입니다.
 *
 * 끌기 · 확대를 막고 손가락도 받지 않습니다(pointer-events: none) — 시트 안이라 위아래로 끌면 상세가 스크롤돼야 합니다.
 * 지도 도구를 못 받으면 onFail 을 부르고 부모가 자리그림으로 되돌립니다 — 빈 칸을 남기지 않습니다.
 */
export default function TerminalMap({ lat, lng, name, onFail }) {
  const ref = useRef(null)
  // 부모가 매번 새 함수를 넘겨도 지도를 다시 만들지 않습니다.
  const onFailRef = useRef(onFail)
  useEffect(() => {
    onFailRef.current = onFail
  })

  useEffect(() => {
    let cancelled = false
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !ref.current) return
        const center = new kakao.maps.LatLng(lat, lng)
        const map = new kakao.maps.Map(ref.current, {
          center,
          level: 4,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          keyboardShortcuts: false,
        })
        map.setZoomable(false)
        const pin = document.createElement('span')
        pin.className = styles.pin
        pin.innerHTML = TERMINAL_MARKER_SVG
        new kakao.maps.CustomOverlay({ map, position: center, content: pin })
      })
      .catch(() => {
        if (!cancelled) onFailRef.current?.()
      })
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  return <div ref={ref} className={styles.map} role="img" aria-label={t('terminal.mapLabel', { name })} />
}
