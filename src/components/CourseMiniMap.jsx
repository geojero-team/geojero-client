import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import { distanceMeters } from '../lib/geo'
import { ORDER_LINE } from '../lib/mapLine'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import styles from './CourseMiniMap.module.css'

/**
 * 코스 상세 머리의 220px 지도 — Figma 09-14 확정 `547:206`(그림은 개정 `532:324`와 같음).
 *
 * 홈·코스 지도(MapView)를 쓰지 않은 이유: 그쪽은 28px 핀에 이름표가 늘 붙고, 섬 전체를 보는
 * 여백(위 76 · 옆 56px)으로 맞춥니다. 220px 칸에 넣으면 코스가 손톱만 해집니다. 여기는 요약이라
 * **번호 핀(24px)과 번호 없는 고현터미널 핀(22px)만** 찍고 이름표를 달지 않습니다 — 이름은 바로 아래 제목과 타임라인이 말합니다.
 *
 * 순서 선: 고현터미널 → 1 → … → n → 고현터미널을 한 선으로 잇습니다(2026-09-14 사용자 결정 — 그림에는 없음).
 * 코스 지도(MapView)의 선과 같은 2.5px 파란 단선이고, **버스 길이 아니라 방문 순서**입니다.
 *
 * 끌기 · 두 손가락 확대 · 더블탭 · +/- 버튼은 됩니다(2026-09-14 사용자 결정 — 디자인브리프 부록 H 「09-14 확정」 절). 처음엔 스크롤 페이지
 * 맨 위라 손가락이 걸릴까 봐 다 막았는데, 포개진 핀을 떼어 볼 방법이 없었습니다. **마우스 휠만 막습니다** — PC에서 휠이 지도에
 * 잡히면 페이지가 안 내려갑니다. 단 SDK 옵션 `scrollwheel:false`(= setZoomable)는 **휠과 두 손가락 확대를 한 스위치로** 묶어 두어
 * 쓰지 않고, 휠 이벤트를 바깥 칸에서 capture 로 먼저 받아 지도에 닿기 전에 멈춥니다(preventDefault 는 안 해서 페이지는 그대로 내려갑니다).
 * 폰에서 지도 위에서 시작한 스크롤이 지도에 잡히는 건 감수합니다(걸리면 「눌러서 풀기」로 바꿉니다).
 * 지도가 못 떠도 타임라인은 그대로라(카카오 JS 키는 도메인 제한) 칸에 한 줄만 적습니다.
 *
 * @param stops    코스 스팟 [{ seq, lat, lng }] — 방문 순서대로
 * @param terminal 고현터미널 좌표 { lat, lng } — /api/pois 의 TERMINAL 행. 없으면 스팟만.
 */

const FIT_PADDING = 32
/**
 * 화면에서 이보다 가까운 번호 핀은 한 핀에 번호를 합쳐 적습니다(「2·3」). 조선해양문화관과 거제씨월드는 113m라
 * 섬 절반을 담는 배율에서 1px 남짓 떨어져 한 핀이 다른 핀을 통째로 가립니다(코스 8개, 2026-09-14 리뷰).
 * 확대하면 떨어져 보이지만 처음 맞춘 배율에서는 합쳐야 읽힙니다. 16px는 홈 지도(mapPins CLUSTER_GAP)와 같은 기준입니다.
 */
const MERGE_PX = 16
/** SDK가 투영을 주지 않을 때의 거리 기준. */
const MERGE_M = 150
const GEOJE_CENTER = { lat: 34.88, lng: 128.62 }
const INITIAL_LEVEL = 9
/** SDK가 지도 안쪽 요소에서 듣는 휠 이벤트 셋 — 크롬·사파리는 옛 mousewheel 도 wheel 과 같이 냅니다. */
const WHEEL_EVENTS = ['wheel', 'mousewheel', 'DOMMouseScroll']
const stopWheel = (event) => event.stopPropagation()

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
    // 휠은 지도 칸(.root)에서 capture 로 먼저 받아 멈춥니다 — SDK 는 그 안쪽 요소에서 듣습니다. passive 라 스크롤 성능 경고도 없습니다.
    const root = container?.parentElement ?? null
    WHEEL_EVENTS.forEach((name) => root?.addEventListener(name, stopWheel, { capture: true, passive: true }))
    let cancelled = false
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !container) return
        kakaoRef.current = kakao
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(GEOJE_CENTER.lat, GEOJE_CENTER.lng),
          level: INITIAL_LEVEL,
        })
        // +/- 버튼 — PC에는 두 손가락이 없고 휠은 막았으니 확대할 길이 이것뿐입니다. RIGHT 는 오른쪽 **위**(SDK 문서)입니다.
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT)
        // SDK 확대·축소 버튼(과 로고 링크)은 읽기 도구에 숨긴 칸(aria-hidden) 안에 들어가므로 탭 순서에서 뺍니다 — 마우스·터치는 그대로.
        container.querySelectorAll('button, a').forEach((element) => {
          element.tabIndex = -1
        })
        mapRef.current = map
        setPhase('ready')
      })
      .catch(() => {
        if (!cancelled) setPhase('error')
      })
    return () => {
      cancelled = true
      mapRef.current = null
      WHEEL_EVENTS.forEach((name) => root?.removeEventListener(name, stopWheel, { capture: true }))
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

    // 순서 선. 고현터미널이 있으면 출발과 복귀 양 끝에 — 코스는 거기서 떠나 거기로 돌아옵니다.
    const ends = terminalPosition ? [terminalPosition] : []
    const path = [...ends, ...spots.map(({ position }) => position), ...ends]
    const line =
      path.length >= 2
        ? new kakao.maps.Polyline({
            map,
            path,
            ...ORDER_LINE,
          })
        : null

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

    return () => {
      line?.setMap(null)
      overlays.forEach((overlay) => overlay.setMap(null))
    }
  }, [phase, stops, terminal])

  return (
    <div className={styles.root}>
      {/* 지도는 타임라인과 같은 내용을 그림으로 보여줄 뿐이라 읽기 도구에서는 숨깁니다. */}
      <div ref={containerRef} className={styles.map} aria-hidden="true" />
      {phase === 'error' && <p className={styles.failed}>{t('boarding.mapFailed')}</p>}
    </div>
  )
}
