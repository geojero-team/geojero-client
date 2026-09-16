import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import { distanceMeters } from '../lib/geo'
import { courseImage, courseImageFallback } from '../lib/courseImage'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import styles from './CourseMiniMap.module.css'

/**
 * 코스 상세 머리의 300px 지도 — 자리는 Figma 09-14 확정 `547:206`, 모양은 2026-09-16 사용자 결정(디자인브리프 부록 H 「09-16 — 코스 상세 지도」).
 *
 * 이 지도가 답하는 질문은 하나입니다 — **「이 코스는 섬 어디를 도나, 스팟들이 서로 어떻게 놓여 있나.」**
 * 순서와 버스는 바로 아래 타임라인이, 길은 카카오맵이 말합니다. 그래서:
 *  · **틀은 스팟에만 맞춥니다.** 고현터미널은 23개 코스 전부 같은 출발점이라 지도에서 새 정보가 없는데, 그 15km 를 틀에 넣으면
 *    정작 코스가 구석에 손톱만 해지고 핀이 겹쳤습니다(09-14 모양). 터미널 마커도 찍지 않습니다 — 타임라인 양 끝이 「고현터미널 출발 · 도착」을 말합니다.
 *    스팟이 붙어 있는 코스는 배율이 골목까지 들어가지 않게 `FIT_MIN_LEVEL` 로 물립니다(처음 맞출 때만 — 사용자가 확대하는 건 막지 않습니다).
 *  · **핀은 타임라인 줄과 같은 사진 원 + 왼쪽 위 번호 배지**(지도에서는 한 단계 작은 32 · 18 — `PIN` 주석). 사진이 이름 노릇을 해서 지도와 목록을 오갈 일이 줄고,
 *    카카오 지도의 국도 방패(파란 원 + 흰 숫자)와 헷갈리지 않습니다. 사진은 /api/pois 대표 사진, 없으면 분류 자리그림(`lib/courseImage`).
 *  · **순서 선은 긋지 않습니다.** 09-14에 「터미널 → 1 → … → 터미널」 한 선을 넣었고 09-16 아침에 점선으로 바꿨는데, 점선이어도 지도 위의 선은
 *    경로로 읽혔고(학동 → 해금강이 바다를 건넌다) 터미널 가는 줄과 오는 줄이 포개졌습니다. 순서는 번호 배지가 말합니다.
 *    (코스 비교 지도 MapView 의 선은 배경 스팟 사이에서 코스를 가려내는 일이 있어 그대로입니다.)
 *
 * 끌기 · 두 손가락 확대 · 더블탭 · +/- 버튼은 됩니다(2026-09-14 사용자 결정 — 디자인브리프 부록 H 「09-14 확정」 절). 처음엔 스크롤 페이지
 * 맨 위라 손가락이 걸릴까 봐 다 막았는데, 포개진 핀을 떼어 볼 방법이 없었습니다. **마우스 휠만 막습니다** — PC에서 휠이 지도에
 * 잡히면 페이지가 안 내려갑니다. 단 SDK 옵션 `scrollwheel:false`(= setZoomable)는 **휠과 두 손가락 확대를 한 스위치로** 묶어 두어
 * 쓰지 않고, 휠 이벤트를 바깥 칸에서 capture 로 먼저 받아 지도에 닿기 전에 멈춥니다(preventDefault 는 안 해서 페이지는 그대로 내려갑니다).
 * 폰에서 지도 위에서 시작한 스크롤이 지도에 잡히는 건 감수합니다(걸리면 「눌러서 풀기」로 바꿉니다).
 * 지도가 못 떠도 타임라인은 그대로라(카카오 JS 키는 도메인 제한) 칸에 한 줄만 적습니다.
 *
 * @param stops 코스 스팟 [{ seq, lat, lng, theme, thumbnailUrl }] — 방문 순서대로. 사진 · 분류는 타임라인 줄과 같은 값
 */

/**
 * 사진 핀 지름. 번호 배지(18px)는 왼쪽 위로 2px 걸쳐 나갑니다.
 * 타임라인 줄(CourseDetailPage `.thumb`)은 40인데 지도에서는 **32**입니다(2026-09-16 사용자 결정) — 목록에서는 사진 옆에 글자가 있지만
 * 지도에서는 사진이 지도를 가립니다. 40이면 4-03(매미성 → 양지암 → 씨월드 → 학동)에서 2·3 핀이 거의 닿았습니다.
 * 홈 지도의 사진 핀(28)보다는 한 단계 큽니다 — 여기서는 사진이 이름 노릇을 해야 하고, 28이면 합친 배지(「1·2」)가 사진을 거의 덮습니다.
 */
const PIN = 32
/** 핀 몸통이 잘리지 않게 사진 반지름 + 배지가 걸치는 2px 에 여백 16 을 더 둡니다. */
const FIT_PADDING = PIN / 2 + 2 + 16
/**
 * 스팟에 맞춘 배율이 이보다 가까우면(숫자가 작을수록 가깝다) 여기서 멈춥니다. 카카오 5레벨은 축척 막대 약 250m — 스팟이 서로 몇백 m 안에
 * 붙은 코스(도장포유람선 · 바람의언덕은 도보 1분)에서 골목 배율로 들어가 동네만 보이는 것을 막습니다. 처음 맞출 때만 — 사용자 확대는 자유입니다.
 */
const FIT_MIN_LEVEL = 5
/**
 * 화면에서 이보다 가까운 사진 핀은 한 핀에 번호를 합쳐 적습니다(「2·3」). 조선해양문화관과 거제씨월드는 113m라
 * 섬 절반을 담는 배율에서 1px 남짓 떨어져 한 핀이 다른 핀을 통째로 가립니다(코스 8개, 2026-09-14 리뷰).
 * 확대하면 떨어져 보이지만 처음 맞춘 배율에서는 합쳐야 읽힙니다. 사진이 서로 4분의 1 넘게 가리면(가운데 거리가 지름의 4분의 3 안) 합칩니다.
 */
const MERGE_PX = (PIN * 3) / 4
/** SDK가 투영을 주지 않을 때의 거리 기준. */
const MERGE_M = 150
const GEOJE_CENTER = { lat: 34.88, lng: 128.62 }
const INITIAL_LEVEL = 9
/** SDK가 지도 안쪽 요소에서 듣는 휠 이벤트 셋 — 크롬·사파리는 옛 mousewheel 도 wheel 과 같이 냅니다. */
const WHEEL_EVENTS = ['wheel', 'mousewheel', 'DOMMouseScroll']
const stopWheel = (event) => event.stopPropagation()

/** 사진 핀 — 타임라인 줄과 같은 그림(사진 원 + 왼쪽 위 번호 배지, 지도용으로 한 단계 작게 + 흰 테두리 2 · 그림자). 사진이 없거나 링크가 죽으면 분류 자리그림. */
function pin(stop, label) {
  const element = document.createElement('span')
  element.className = styles.pin
  const img = document.createElement('img')
  img.className = styles.photo
  img.src = courseImage(stop)
  img.alt = ''
  img.draggable = false
  img.addEventListener('error', () => {
    const fallback = courseImageFallback(stop)
    if (img.src !== fallback) img.src = fallback
  })
  const badge = document.createElement('span')
  badge.className = styles.badge
  badge.textContent = label
  element.append(img, badge)
  return element
}

export default function CourseMiniMap({ stops }) {
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
    if (spots.length === 0) return

    // 스팟에만 맞춥니다 — 고현터미널은 틀에 넣지 않습니다(머리 주석).
    const bounds = new kakao.maps.LatLngBounds()
    spots.forEach(({ position }) => bounds.extend(position))
    map.setBounds(bounds, FIT_PADDING, FIT_PADDING, FIT_PADDING, FIT_PADDING)
    if (map.getLevel() < FIT_MIN_LEVEL) map.setLevel(FIT_MIN_LEVEL)

    // 맞춘 배율의 화면 좌표로 포개지는 핀을 묶습니다.
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

    // 묶인 핀은 앞 스팟의 사진에 번호를 합쳐 적습니다(「2·3」).
    const overlays = groups.map(
      (g) =>
        new kakao.maps.CustomOverlay({ map, position: g.position, content: pin(g.stop, g.seqs.join('·')), xAnchor: 0.5, yAnchor: 0.5 }),
    )

    return () => {
      overlays.forEach((overlay) => overlay.setMap(null))
    }
  }, [phase, stops])

  return (
    <div className={styles.root}>
      {/* 지도는 타임라인과 같은 내용을 그림으로 보여줄 뿐이라 읽기 도구에서는 숨깁니다. */}
      <div ref={containerRef} className={styles.map} aria-hidden="true" />
      {phase === 'error' && <p className={styles.failed}>{t('boarding.mapFailed')}</p>}
    </div>
  )
}
