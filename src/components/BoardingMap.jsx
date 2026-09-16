import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../i18n'
import { courseImage, courseImageFallback } from '../lib/courseImage'
import { LINK_LINE } from '../lib/mapLine'
import { formatDistance } from '../lib/format'
import { distanceMeters } from '../lib/geo'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import styles from './BoardingMap.module.css'

/**
 * 타는 곳 — 스팟 시간표의 버스 칩, 다음 버스 카드 아래.
 *
 * 「학동 정류장에서 타요」만으로는 **어느 쪽 정류장인지** 모릅니다. 같은 이름 정류장이 길 양쪽에 있고,
 * 매미성처럼 스팟 이름과 정류장 이름이 다른 곳도 있습니다. 서버가 TAGO 좌표로 노선·방향에 맞는
 * 정류장을 골라 주고, 여기서는 그것을 접었다 펴는 카드로 보여줍니다.
 *
 * 2026-09-14 개정(Figma `530:231` 접힘 · `530:282` / `541:408` 펼침): 늘 펼쳐 두던 제목 + 지도 + 목록을
 * **접힌 카드 한 줄**(버스 아이콘 · 정류장 이름 · 거리 · 노선)로 바꿨습니다. 펼치면 지도 · (노선이 여럿이면) 목록 줄 · 길찾기.
 * 지도 핀은 노선 글자 알약에서 **버스 마커 + 아래 태그**(「55」 · 「55 +2」)로 바뀌었고, 출처 줄은 페이지 맨 아래로 갔습니다.
 *
 * 그림은 정류장 한 곳만 그렸습니다. 그 밖은 같은 규칙으로 넓혔습니다(디자인브리프 부록 G에 적음):
 *  · 정류장이 여럿(학동 55 학동 · 67-1 학동삼거리) — 한 이름으로 뭉개지 않고 「정류장 2곳 · 노선마다 타는 정류장이 달라요」,
 *    펼치면 정류장마다 목록 줄과 길찾기(버튼 하나로는 어디로 보낼지 정할 수 없습니다).
 *  · 노선 칩을 고르면(route) 그 노선의 정류장 · 예외 · 못 찍은 노선만 남깁니다.
 *  · 길 건너편에서 타는 편(매미성 32번 20:37)은 **접혀 있어도** 알립니다 — 그 편이 곧 「다음 버스」일 수 있습니다.
 *    타는 곳을 못 찍은 노선(맹종죽 37번)의 안내도 같은 이유로 접혀 있어도 보입니다.
 *
 * **지도는 펼칠 때 만듭니다.** 접힌 칸에서 만들면 크기가 0이라 화면 맞추기가 틀어지고, 대부분은 펼치지 않습니다.
 * 지도가 못 떠도 이름 · 거리 · 길찾기는 그대로 나옵니다(카카오 JS 키는 도메인 제한).
 * 거리는 두 점 사이 **직선**이라 화면에도 「직선 약 380m」라고 적고, 걷는 길은 「카카오맵으로 도보 길찾기」가 카카오맵에서 엽니다(2026-09-16).
 *
 * @param boarding 서버 departures 응답의 boarding { from, stops, exceptions, unresolved, source }.
 *                 from은 이 구간의 **출발 쪽**입니다(고현터미널 → 스팟이면 고현터미널).
 * @param route    노선 칩으로 고른 노선. 없으면 전체.
 * @param fromSpot 출발 쪽이 스팟일 때 그 스팟({ thumbnailUrl, theme }) — 지도에 점 + 이름 대신 **썸네일**(24px 원)을 찍습니다
 *                 (2026-09-15 사용자 결정: 글자 라벨이 카카오 지도 라벨과 겹쳐 두 번 말했고, 홈 지도의 사진 핀과 같은 모양이 맞다).
 *                 없으면(목록 실패 · 고현터미널 출발) 점 + 이름 그대로 — 거리만으론 방향을 모르니 기준점을 비우지 않습니다.
 */

/** 섬 전체가 아니라 정류장 몇 개를 보는 지도라 이보다 당기면 길 이름도 안 보이게 됩니다. */
const MIN_LEVEL = 3
const FIT_PADDING = 28
/** 이보다 가까우면 고현터미널 앞 정류장이라 거리·출발 자리가 같은 말을 두 번 합니다. */
const TERMINAL_NEAR_M = 30
/** 이 안이면 대표 정류장의 길 건너편으로 봅니다. */
const OPPOSITE_M = 50

/**
 * 마커 기하 — Figma 530:318: 버스 아이콘 28 + 간격 2 + 태그 21 = 51px, **좌표는 아이콘 가운데**(위에서 14px).
 * 마커끼리 가까우면 좌표는 옮기지 않고(위치가 정확하다는 전제) 겹친 마커만 비켜 답니다. 아래로 달 때는 앞 마커 박스
 * (좌표 기준 -14 ~ +37px) 밑 2px에서, 위로 달 때는 위 2px에서 끝나게 합니다.
 * yAnchor는 **자기 높이**의 비율이라 높이가 다른 출발 곳 점(9px)은 따로 계산합니다 — 마커 비율을 그대로 쓰면 7px만
 * 움직여 이름표가 마커를 덮었습니다(2026-09-14 리뷰).
 */
const MARKER_HEIGHT = 51
const ICON_CENTER = 14
const FROM_HEIGHT = 9
/** 출발 곳 썸네일 지름 — 버스 마커(28)가 주인공이라 그보다 작게. */
const FROM_THUMB = 24
const BELOW_TOP = MARKER_HEIGHT - ICON_CENTER + 2 // 좌표에서 비킨 박스 윗변까지
const ABOVE_BOTTOM = ICON_CENTER + 2 // 비킨 박스 아랫변에서 좌표까지
const anchorOf = (slot, height, center) =>
  slot === 'below' ? -BELOW_TOP / height : slot === 'above' ? (ABOVE_BOTTOM + height) / height : center / height
/** SDK가 투영을 주지 않을 때의 거리 기준. 길 건너편 정류장은 대표 핀에서 6~8m입니다(매미성·김영삼 생가 실측). */
const STACK_M = 25
/**
 * 태그 폭 어림(11px Bold 숫자·기호 ≈ 6.5px · 한글 ≈ 10px · 띄어쓰기 ≈ 3px + 좌우 여백·테두리 16px) — 겹침 상자용입니다.
 * 운영 실측 「55」 29 · 「4000」 42 · 「32 20:37」 62 · 「63번 외 1」 62 · 「23-1번 외 5」 72px(「55번 외 2」 541:451 에 한글이 들어왔다).
 */
const tagWidth = (text) =>
  Math.max(28, 16 + [...text].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? 10 : ch === ' ' ? 3 : 6.5), 0))
/** 출발 곳 이름표 폭 어림(11px Medium 한글 ≈ 11px) — 점 오른쪽 13px에서 시작합니다. */
const fromLabelWidth = (text) => 13 + text.length * 11
/**
 * 화면 맞추기 여백. 좌표는 아이콘 가운데라 마커 몸통이 위로 14px · 아래로 37px · 옆으로 태그 반 폭만큼 나옵니다.
 * 몸통을 넣지 않으면 가장자리 정류장의 태그가 칸 밖으로 잘리거나 카카오 축척 막대에 덮였습니다(운영 매미성, 2026-09-14).
 */
const FIT_TOP = FIT_PADDING + ICON_CENTER
const FIT_BOTTOM = FIT_PADDING + (MARKER_HEIGHT - ICON_CENTER)
const FIT_SIDE = FIT_PADDING + 31

/** 초기 중심(거제 대략 가운데). 곧바로 setBounds가 옮깁니다. */
const GEOJE_CENTER = { lat: 34.88, lng: 128.62 }

/** Figma BusMarker(530:319 · 530:303) — 하늘색 원 + 흰 테두리 + 채운 흰 버스. 크기만 다르고 같은 그림입니다. */
function busMarkerSvg(size) {
  const k = size / 28
  const n = (v) => +(v * k).toFixed(2)
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" aria-hidden="true">` +
    `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${(size - 2) / 2}" fill="#00A1FF" stroke="white" stroke-width="2"/>` +
    `<rect x="${n(7.84)}" y="${n(7.28)}" width="${n(12.32)}" height="${n(11.2)}" rx="${n(1.96)}" fill="white"/>` +
    `<rect x="${n(9.52)}" y="${n(8.68)}" width="${n(8.96)}" height="${n(3.36)}" fill="#00A1FF"/>` +
    `<circle cx="${n(10.22)}" cy="${n(18.62)}" r="${n(1.26)}" fill="white"/>` +
    `<circle cx="${n(17.78)}" cy="${n(18.62)}" r="${n(1.26)}" fill="white"/>` +
    '</svg>'
  )
}

/** 옆으로 비킬 때 상대 상자와 띄우는 간격(px). */
const SIDE_GAP = 2

/**
 * 한 칸(제자리 · 위 · 아래 · 왼쪽 · 오른쪽)에 달았을 때의 화면 상자(px)와 앵커. 마커는 태그 폭 × 51px, 출발 곳은 점 + 오른쪽 이름표.
 * 좌표(point)가 아이콘 가운데(출발 곳은 점 가운데)라는 anchorOf 규칙과 같은 기하입니다. 옆으로는 겹친 상대(hit) 상자 옆에 붙입니다.
 * 옆 이동은 **px(dx)** 로 돌려줍니다 — xAnchor(내용 폭의 비율)로 옮기면 태그 실제 폭이 어림과 다른 만큼 자리가 어긋납니다
 * (운영 거제씨월드 「63번 외 1」이 「4000」에 1px 걸쳤다, 2026-09-14 저녁).
 */
function placement(item, point, slot, hit) {
  const vertical = slot === 'above' || slot === 'below' ? slot : 'center'
  const yAnchor = anchorOf(vertical, item.height, item.center)
  const top = point.y - yAnchor * item.height
  if (item.kind === 'from') {
    const r = item.height / 2
    if (item.shape === 'thumb') {
      return { slot, dx: 0, yAnchor, box: { x0: point.x - r, x1: point.x + r, y0: top, y1: top + item.height } }
    }
    // 이름표(17px)가 점 가운데 높이에 걸립니다.
    return { slot, dx: 0, yAnchor, box: { x0: point.x - r, x1: point.x + r + item.width, y0: top + r - 8.5, y1: top + r + 8.5 } }
  }
  const w = Math.max(item.width, 28)
  const cx =
    slot === 'right' ? hit.box.x1 + SIDE_GAP + w / 2 : slot === 'left' ? hit.box.x0 - SIDE_GAP - w / 2 : point.x
  return { slot, dx: cx - point.x, yAnchor, box: { x0: cx - w / 2, x1: cx + w / 2, y0: top, y1: top + item.height } }
}

const intersects = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/**
 * 화면 좌표로 칸 고르기. 제자리가 먼저 찍힌 상자와 겹치지 않으면 제자리. 겹치면 **실제로 있는 쪽**으로 비킵니다 —
 * 겹친 상대보다 세로로 더 떨어졌으면 위·아래(북쪽이면 위)부터, 가로로 더 떨어졌으면 옆(동쪽이면 오른쪽)부터.
 * 비킨 상자도 다른 상자와 부딪히거나 지도 칸 밖이면 그 칸은 버립니다.
 *  · 방향을 보지 않고 번갈아 달면 북쪽 정류장이 남쪽에 그려졌습니다(고현터미널 → 김영삼 생가 2000번).
 *  · 비킨 뒤를 재지 않으면 「63 +1」이 신촌 마커에 부딪혔고(거제씨월드), 매미성 길 건너편 마커는 칸 밖으로 잘렸습니다.
 *  · 위·아래만 있으면 26m 떨어진 두 지세포(거의 같은 높이)가 비킬 곳이 없었습니다 — 옆으로 나란히 둡니다(운영, 2026-09-14).
 * 어느 칸도 깨끗하지 않으면 칸 안에 드는 칸 중 **가장 덜 겹치는** 칸(제자리는 늘 후보)입니다 — 비켜서 더 크게 덮으면 비키지 않은 것만 못합니다.
 */
function placeByBox(item, point, placed, mapSize) {
  const others = placed.filter((p) => p.box)
  const overlap = (box) =>
    others.reduce((sum, p) => {
      const w = Math.min(box.x1, p.box.x1) - Math.max(box.x0, p.box.x0)
      const h = Math.min(box.y1, p.box.y1) - Math.max(box.y0, p.box.y0)
      return w > 0 && h > 0 ? sum + w * h : sum
    }, 0)
  const inside = (box) =>
    (!mapSize.height || (box.y0 >= 0 && box.y1 <= mapSize.height)) && (!mapSize.width || (box.x0 >= 0 && box.x1 <= mapSize.width))

  const center = placement(item, point, 'center')
  const hit = others.find((p) => intersects(center.box, p.box))
  if (!hit) return center
  const dx = point.x - hit.point.x
  const dy = point.y - hit.point.y
  const vertical = dy < 0 ? ['above', 'below'] : ['below', 'above']
  const sideways = item.kind === 'from' ? [] : dx < 0 ? ['left', 'right'] : ['right', 'left']
  const order = Math.abs(dx) > Math.abs(dy) ? [...sideways, ...vertical] : [...vertical, ...sideways]
  const options = order.map((slot) => placement(item, point, slot, hit))
  const clean = options.find((o) => overlap(o.box) === 0 && inside(o.box))
  if (clean) return clean
  return [center, ...options.filter((o) => inside(o.box))].reduce((best, o) => (overlap(o.box) < overlap(best.box) ? o : best))
}

/** SDK가 투영을 주지 않을 때 — 거리로 겹침을 재고, 북쪽이면 위 · 그쪽을 이미 썼으면 반대쪽. */
function placeByDistance(item, placed) {
  const near = placed.filter((p) => distanceMeters(p.at, item.at) < STACK_M)
  let slot = 'center'
  if (near.length > 0) {
    const north = item.at.lat > near[0].at.lat
    const used = new Set(near.map((p) => p.slot))
    const [preferred, other] = north ? ['above', 'below'] : ['below', 'above']
    slot = !used.has(preferred) ? preferred : !used.has(other) ? other : preferred
  }
  return { slot, dx: 0, yAnchor: anchorOf(slot, item.height, item.center), box: null }
}

/** 고른 노선만 남깁니다. 서버가 노선마다 대표 정류장을 한 곳만 주므로 결과가 늘 정해집니다. */
function forRoute(boarding, route) {
  if (route == null) return boarding
  return {
    ...boarding,
    stops: boarding.stops.filter((s) => s.routes.includes(route)).map((s) => ({ ...s, routes: [route] })),
    exceptions: boarding.exceptions.filter((ex) => ex.routeNo === route),
    unresolved: boarding.unresolved.filter((u) => u.routeNo === route),
  }
}

/** 카드에 한 줄씩 서는 곳 — 대표 정류장(노선 묶음)과, 대표가 없는 노선의 편마다 정류장. */
function placesOf({ stops, exceptions }) {
  return [
    ...stops.map((s) => ({ key: s.nodeId, stop: s, badges: s.routes, split: false })),
    ...exceptions
      .filter((ex) => ex.mainNodeId == null)
      .map((ex) => ({ key: `${ex.routeNo}-${ex.depart}-${ex.nodeId}`, stop: ex, badges: [`${ex.routeNo} ${ex.depart}`], split: true })),
  ]
}

function routesText(routes) {
  return routes.length === 1
    ? t('boarding.routeOne', { route: routes[0] })
    : t('boarding.routeMore', { first: routes[0], count: routes.length - 1 })
}

function tagText(routes) {
  return routes.length === 1 ? routes[0] : t('boarding.pinMore', { first: routes[0], count: routes.length - 1 })
}

/**
 * 출발이 스팟이면 스팟 → 정류장 **도보** 길찾기를 바로 엽니다(2026-09-16 사용자 결정 — 우리 지도는 두 점 사이 직선만 알고
 * 길은 카카오가 그립니다. 우리가 선을 그려도 카카오맵 안에서 보는 것보다 정확할 수 없어 경로 API 는 넣지 않았습니다).
 * 고현터미널 출발은 전처럼 정류장만 넘깁니다 — 터미널 앞 30m 는 도보 안내가 뜻이 없습니다.
 */
function walkable(from) {
  return from.kind === 'SPOT' && from.lat != null && from.lng != null
}

/**
 * 카카오맵 웹 링크(apis.map.kakao.com/web/guide 「URL로 카카오맵 사용하기」). `/link/by/walk/출발/도착` 이 도보 길찾기,
 * `/link/to/도착` 은 목적지만. 카카오가 PC · 모바일 웹을 알아서 고르므로 앱 스킴(kakaomap://)은 쓰지 않습니다.
 * 도착 이름은 두 갈래 다 카드와 같은 「{이름} 정류장」입니다.
 */
function directionsUrl(from, stop) {
  const point = (name, { lat, lng }) => `${encodeURIComponent(name)},${lat},${lng}`
  const to = point(t('boarding.stopName', { name: stop.name }), stop)
  return walkable(from)
    ? `https://map.kakao.com/link/by/walk/${point(from.name, from)}/${to}`
    : `https://map.kakao.com/link/to/${to}`
}

function DirectionsLink({ from, stop, className }) {
  const walk = walkable(from)
  return (
    <a
      className={className}
      href={directionsUrl(from, stop)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        walk
          ? t('boarding.walkA11y', { place: from.name, name: stop.name })
          : t('boarding.directionsA11y', { name: stop.name })
      }
    >
      {t(walk ? 'boarding.walk' : 'boarding.directions')}
    </a>
  )
}

function markerElement(tag) {
  const element = document.createElement('span')
  element.className = styles.marker
  const icon = document.createElement('span')
  icon.className = styles.markerIcon
  icon.innerHTML = busMarkerSvg(28)
  const label = document.createElement('span')
  label.className = styles.markerTag
  label.textContent = tag
  element.append(icon, label)
  return element
}

function fromElement(name) {
  const element = document.createElement('span')
  element.className = styles.from
  const dot = document.createElement('span')
  dot.className = styles.fromDot
  const label = document.createElement('span')
  label.className = styles.fromLabel
  label.textContent = name
  element.append(dot, label)
  return element
}

/** 스팟 썸네일 — 홈 지도의 사진 핀과 같은 그림. 사진이 없거나(저작권 Type3) 링크가 죽으면 분류 자리그림입니다. */
function fromThumbElement(spot) {
  const element = document.createElement('span')
  element.className = styles.fromThumb
  const img = document.createElement('img')
  img.className = styles.fromThumbImg
  img.src = courseImage(spot)
  img.alt = ''
  img.draggable = false
  img.addEventListener('error', () => {
    const fallback = courseImageFallback(spot)
    if (img.src !== fallback) img.src = fallback
  })
  element.append(img)
  return element
}

/** 출발 곳 오버레이 항목 — 스팟이고 스팟 정보가 있으면 썸네일, 아니면 점 + 이름. 기하(높이 · 가운데)가 달라 겹침 계산도 따라갑니다. */
function fromItem(from, fromSpot) {
  if (from.kind === 'SPOT' && fromSpot) {
    return { at: from, content: fromThumbElement(fromSpot), kind: 'from', shape: 'thumb', width: FROM_THUMB, height: FROM_THUMB, center: FROM_THUMB / 2 }
  }
  return { at: from, content: fromElement(from.name), kind: 'from', shape: 'dot', width: fromLabelWidth(from.name), height: FROM_HEIGHT, center: FROM_HEIGHT / 2 }
}

/** 펼쳤을 때만 마운트되는 지도 — 접으면 사라집니다. */
function MapCanvas({ stops, exceptions, from, showFrom, fromSpot }) {
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
          level: MIN_LEVEL,
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

    // 1) 찍을 것을 모으고 2) 화면을 맞춘 뒤 3) 그 배율의 화면 좌표로 겹침을 잰다.
    //    미터(25m)로만 재면 운영 거제씨월드에서 26m 떨어진 두 지세포 핀이 몇 px 안에 겹쳐 4000 핀이 가려졌다(2026-09-14).
    const markerItem = (at, tag) => ({ at, content: markerElement(tag), kind: 'marker', width: tagWidth(tag), height: MARKER_HEIGHT, center: ICON_CENTER })
    const items = [
      ...stops.map((stop) => markerItem(stop, tagText(stop.routes))),
      ...exceptions.map((ex) => markerItem(ex, `${ex.routeNo} ${ex.depart}`)),
      ...(showFrom ? [fromItem(from, fromSpot)] : []),
    ].map((item) => ({ ...item, position: new kakao.maps.LatLng(item.at.lat, item.at.lng) }))

    // 출발 곳을 찍을 때만 잇습니다 — 고현터미널 앞(30m 안)은 두 점이 한 자리라 그을 선이 없습니다.
    // 예외 핀(길 건너편에서 타는 편)에는 긋지 않습니다 — 선이 여러 개 겹치면 어느 것이 내 정류장인지 흐려집니다.
    const links = showFrom
      ? stops.map(
          (stop) =>
            new kakao.maps.Polyline({
              map,
              path: [new kakao.maps.LatLng(from.lat, from.lng), new kakao.maps.LatLng(stop.lat, stop.lng)],
              ...LINK_LINE,
            }),
        )
      : []

    const bounds = new kakao.maps.LatLngBounds()
    items.forEach((item) => bounds.extend(item.position))
    map.setBounds(bounds, FIT_TOP, FIT_SIDE, FIT_BOTTOM, FIT_SIDE)
    if (map.getLevel() < MIN_LEVEL) map.setLevel(MIN_LEVEL)

    const projection = map.getProjection?.()
    const mapSize = { width: containerRef.current?.clientWidth ?? 0, height: containerRef.current?.clientHeight ?? 0 }
    const placed = []
    const overlays = items.map((item) => {
      const point = projection?.containerPointFromCoords(item.position)
      const { slot, dx, yAnchor, box } = point ? placeByBox(item, point, placed, mapSize) : placeByDistance(item, placed)
      placed.push({ at: item.at, point, slot, box })
      // 옆으로 비킨 만큼은 내용을 px 로 밀어 둡니다(앵커는 늘 가운데).
      if (dx) item.content.style.transform = `translateX(${Math.round(dx)}px)`
      return new kakao.maps.CustomOverlay({ map, position: item.position, content: item.content, xAnchor: 0.5, yAnchor })
    })

    return () => {
      overlays.forEach((overlay) => overlay.setMap(null))
      links.forEach((line) => line.setMap(null))
    }
  }, [phase, stops, exceptions, from, showFrom, fromSpot])

  // 지도는 이름 · 거리 · 길찾기와 같은 내용을 그림으로 보여줄 뿐이라 읽기 도구에서는 숨깁니다.
  return phase === 'error' ? (
    <p className={styles.mapFailed}>{t('boarding.mapFailed')}</p>
  ) : (
    <div ref={containerRef} className={styles.map} aria-hidden="true" />
  )
}

export default function BoardingMap({ boarding, route = null, fromSpot = null }) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()

  const { from, stops, exceptions, unresolved } = forRoute(boarding, route)
  const places = placesOf({ stops, exceptions })
  const isTerminal = from.kind === 'TERMINAL'
  const isNear = (meters) => isTerminal && meters < TERMINAL_NEAR_M
  const nearestM = Math.min(...[...stops, ...exceptions].map((p) => p.distanceM))
  const where = (stop) =>
    isNear(stop.distanceM)
      ? t('boarding.near', { place: from.name })
      : t('boarding.distance', { place: from.name, dist: formatDistance(stop.distanceM) })

  const withMain = exceptions.filter((ex) => ex.mainNodeId != null)
  const split = exceptions.filter((ex) => ex.mainNodeId == null)
  const splitRoutes = [...new Set(split.map((ex) => ex.routeNo))]
  const unresolvedRoutes = [...new Set(unresolved.map((u) => u.routeNo))]
  const unresolvedNote =
    unresolvedRoutes.length > 0 ? (
      <p className={styles.note}>{t('boarding.unresolved', { routes: unresolvedRoutes.join('·') })}</p>
    ) : null

  // 고른 노선의 타는 곳을 하나도 못 찍었으면 펼칠 것이 없습니다 — 이유 한 줄만.
  if (places.length === 0) {
    if (!unresolvedNote) return null
    return (
      <section className={styles.card} aria-label={t('boarding.title')}>
        {unresolvedNote}
      </section>
    )
  }

  const single = places.length === 1 ? places[0] : null
  const names = [...new Set(places.map((p) => p.stop.name))]
  const title = single || names.length === 1 ? t('boarding.stopName', { name: names[0] }) : t('boarding.stopsCount', { count: places.length })
  const line = single
    ? single.split || (open && single.badges.length === 1)
      ? where(single.stop)
      : open
        ? t('boarding.allHere', { routes: single.badges.join('·') })
        : t('boarding.summary', { where: where(single.stop), routes: routesText(single.badges) })
    : places.every((p) => p.split)
      ? t('boarding.perTrip')
      : t('boarding.perRoute')
  // 목록 줄: 정류장이 여럿이면 곳마다(길찾기 포함), 한 곳이면 노선이 여럿일 때만(541:452 — 노선 하나면 머리줄이 전부 말한다).
  const listed = single ? (single.badges.length > 1 ? [single] : []) : places

  return (
    <section className={styles.card} aria-label={t('boarding.title')}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={styles.headIcon}
          aria-hidden="true"
          // Figma BusMarker 26px(530:303)
          dangerouslySetInnerHTML={{ __html: busMarkerSvg(26) }}
        />
        <span className={styles.headText}>
          <span className={styles.headTitle}>{title}</span>
          <span className={styles.headLine}>{line}</span>
        </span>
        <span className={open ? styles.chevronOpen : styles.chevron} aria-hidden="true">
          {open ? '⌄' : '›'}
        </span>
      </button>

      {open && (
        <div id={bodyId} className={styles.body}>
          <MapCanvas
            stops={stops}
            exceptions={exceptions}
            from={from}
            showFrom={!(isTerminal && nearestM < TERMINAL_NEAR_M)}
            fromSpot={fromSpot}
          />

          {listed.length > 0 && (
            <ul className={styles.list}>
              {listed.map((place) => (
                <li key={place.key} className={styles.row}>
                  <span className={styles.rowName}>{t('boarding.stopName', { name: place.stop.name })}</span>
                  {/* 어디서 잰 거리인지 붙입니다 — 「약 310m」만으로는 기준을 모릅니다(2026-09-14 사용자 결정).
                      그림(541:456)은 이름 오른쪽에 「약 ○○m」였는데, 스팟 이름이 붙어 길어져 이름 아래 줄로 옮겼습니다. */}
                  <span className={styles.rowDistance}>{where(place.stop)}</span>
                  <span className={styles.badges}>
                    {place.badges.map((badge) => (
                      <span key={badge} className={styles.badge}>
                        {badge}
                      </span>
                    ))}
                  </span>
                  {!single && <DirectionsLink from={from} stop={place.stop} className={styles.rowDirections} />}
                </li>
              ))}
            </ul>
          )}

          {splitRoutes.map((r) => (
            <p key={r} className={styles.note}>
              {t('boarding.split', {
                route: r,
                list: split
                  .filter((ex) => ex.routeNo === r)
                  .map((ex) => t('boarding.splitItem', { time: ex.depart }))
                  .join(' · '),
              })}
            </p>
          ))}

          {single && <DirectionsLink from={from} stop={single.stop} className={styles.directions} />}
        </div>
      )}

      {/* 접혀 있어도 보이는 안내 둘 — 다음 버스가 이 편·이 노선일 수 있습니다.
          · 대표 정류장이 아닌 곳에서 타는 편(매미성 20:30에는 32번 20:37 길 건너편이 곧 다음 버스)
          · 타는 곳을 못 찍은 노선(맹종죽 10:32에는 37번이 다음 버스인데 카드가 와항마을만 말하면 거기서 타는 줄 안다) */}
      {unresolvedNote}
      {withMain.map((ex) => (
        <p key={`${ex.routeNo}-${ex.depart}-${ex.nodeId}`} className={styles.note}>
          {ex.gapM <= OPPOSITE_M
            ? t('boarding.opposite', { route: ex.routeNo, time: ex.depart })
            : t('boarding.otherStop', {
                route: ex.routeNo,
                time: ex.depart,
                name: ex.name,
                place: from.name,
                dist: formatDistance(ex.distanceM),
              })}
        </p>
      ))}
    </section>
  )
}
