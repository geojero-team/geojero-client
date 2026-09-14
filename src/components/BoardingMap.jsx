import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../i18n'
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
 *
 * @param boarding 서버 departures 응답의 boarding { from, stops, exceptions, unresolved, source }.
 *                 from은 이 구간의 **출발 쪽**입니다(고현터미널 → 스팟이면 고현터미널).
 * @param route    노선 칩으로 고른 노선. 없으면 전체.
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
const BELOW_TOP = MARKER_HEIGHT - ICON_CENTER + 2 // 좌표에서 비킨 박스 윗변까지
const ABOVE_BOTTOM = ICON_CENTER + 2 // 비킨 박스 아랫변에서 좌표까지
const anchorOf = (slot, height, center) =>
  slot === 'below' ? -BELOW_TOP / height : slot === 'above' ? (ABOVE_BOTTOM + height) / height : center / height
/** 지도 화면 좌표로 잴 때 — 마커 폭(태그 「32 20:37」 ≈ 60px) · 높이(51 + 2px). */
const STACK_PX_X = 60
const STACK_PX_Y = MARKER_HEIGHT + 2
/** SDK가 투영을 주지 않을 때의 거리 기준. 길 건너편 정류장은 대표 핀에서 6~8m입니다(매미성·김영삼 생가 실측). */
const STACK_M = 25

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

function directionsUrl({ name, lat, lng }) {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`
}

function DirectionsLink({ stop, className }) {
  return (
    <a
      className={className}
      href={directionsUrl(stop)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('boarding.directionsA11y', { name: stop.name })}
    >
      {t('boarding.directions')}
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

/** 펼쳤을 때만 마운트되는 지도 — 접으면 사라집니다. */
function MapCanvas({ stops, exceptions, from, showFrom }) {
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
    const marker = { height: MARKER_HEIGHT, center: ICON_CENTER }
    const items = [
      ...stops.map((stop) => ({ at: stop, content: markerElement(tagText(stop.routes)), ...marker })),
      ...exceptions.map((ex) => ({ at: ex, content: markerElement(`${ex.routeNo} ${ex.depart}`), ...marker })),
      ...(showFrom ? [{ at: from, content: fromElement(from.name), height: FROM_HEIGHT, center: FROM_HEIGHT / 2 }] : []),
    ].map((item) => ({ ...item, position: new kakao.maps.LatLng(item.at.lat, item.at.lng) }))

    const bounds = new kakao.maps.LatLngBounds()
    items.forEach((item) => bounds.extend(item.position))
    map.setBounds(bounds, FIT_PADDING, FIT_PADDING, FIT_PADDING, FIT_PADDING)
    if (map.getLevel() < MIN_LEVEL) map.setLevel(MIN_LEVEL)

    const projection = map.getProjection?.()
    const placed = []
    const overlays = items.map((item) => {
      const point = projection?.containerPointFromCoords(item.position)
      // 먼저 찍힌 핀(대표 핀이 먼저입니다) 중 겹치는 것이 있으면 비킵니다. 방향은 **실제로 있는 쪽** — 북쪽이면 위,
      // 남쪽(또는 같은 높이)이면 아래. 그쪽을 이미 다른 핀이 썼으면 반대쪽. 방향을 보지 않고 번갈아 달면
      // 북쪽 정류장이 남쪽에 그려졌습니다(고현터미널 → 김영삼 생가 2000번, 2026-09-14 리뷰).
      const near = placed.filter((p) =>
        point && p.point
          ? Math.abs(p.point.x - point.x) < STACK_PX_X && Math.abs(p.point.y - point.y) < STACK_PX_Y
          : distanceMeters(p.at, item.at) < STACK_M,
      )
      let slot = 'center'
      if (near.length > 0) {
        const ref = near[0]
        const north = point && ref.point ? point.y < ref.point.y : item.at.lat > ref.at.lat
        const used = new Set(near.map((p) => p.slot))
        const [preferred, other] = north ? ['above', 'below'] : ['below', 'above']
        slot = !used.has(preferred) ? preferred : !used.has(other) ? other : preferred
      }
      placed.push({ at: item.at, point, slot })
      const yAnchor = anchorOf(slot, item.height, item.center)
      return new kakao.maps.CustomOverlay({ map, position: item.position, content: item.content, xAnchor: 0.5, yAnchor })
    })

    return () => overlays.forEach((overlay) => overlay.setMap(null))
  }, [phase, stops, exceptions, from, showFrom])

  // 지도는 이름 · 거리 · 길찾기와 같은 내용을 그림으로 보여줄 뿐이라 읽기 도구에서는 숨깁니다.
  return phase === 'error' ? (
    <p className={styles.mapFailed}>{t('boarding.mapFailed')}</p>
  ) : (
    <div ref={containerRef} className={styles.map} aria-hidden="true" />
  )
}

export default function BoardingMap({ boarding, route = null }) {
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
  const shortWhere = (stop) =>
    isNear(stop.distanceM) ? t('boarding.near', { place: from.name }) : t('boarding.distanceOnly', { dist: formatDistance(stop.distanceM) })

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
        ? t('boarding.sameStop', { count: single.badges.length })
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
          />

          {listed.length > 0 && (
            <ul className={styles.list}>
              {listed.map((place) => (
                <li key={place.key} className={styles.row}>
                  <span className={styles.rowHead}>
                    <span className={styles.rowName}>{t('boarding.stopName', { name: place.stop.name })}</span>
                    <span className={styles.rowDistance}>{shortWhere(place.stop)}</span>
                  </span>
                  <span className={styles.badges}>
                    {place.badges.map((badge) => (
                      <span key={badge} className={styles.badge}>
                        {badge}
                      </span>
                    ))}
                  </span>
                  {!single && <DirectionsLink stop={place.stop} className={styles.rowDirections} />}
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

          {single && <DirectionsLink stop={single.stop} className={styles.directions} />}
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
                dist: formatDistance(ex.distanceM),
              })}
        </p>
      ))}
    </section>
  )
}
