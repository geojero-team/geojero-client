import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../i18n'
import { formatDistance } from '../lib/format'
import { distanceMeters } from '../lib/geo'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import styles from './BoardingMap.module.css'

/**
 * 타는 곳 — 스팟 시간표의 버스 칩 아래(2026-09-14 · Figma 프레임 없음, 사용자 결정).
 *
 * 「학동 정류장에서 타요」만으로는 **어느 쪽 정류장인지** 모릅니다. 같은 이름 정류장이 길 양쪽에 있고,
 * 매미성처럼 스팟 이름과 정류장 이름이 다른 곳도 있습니다. 서버가 TAGO 좌표로 노선·방향에 맞는
 * 정류장을 골라 주고, 여기서는 그것을 작은 지도와 목록으로 보여줍니다.
 *
 * **지도가 못 떠도 목록은 나옵니다.** 카카오 JS 키는 도메인 제한이라 로컬·jsdom에서는 SDK가 없고,
 * 길찾기는 카카오맵 링크가 대신합니다(우리는 '시간'을 소유하고 '길'은 카카오가 그립니다 — 기준문서 §6).
 *
 * @param boarding  서버 departures 응답의 boarding { from, stops, exceptions, unresolved, source }.
 *                  from은 이 구간의 **출발 쪽**입니다(고현터미널 → 스팟이면 고현터미널).
 */

/** 섬 전체가 아니라 정류장 몇 개를 보는 지도라 이보다 당기면 길 이름도 안 보이게 됩니다. */
const MIN_LEVEL = 3
const FIT_PADDING = 28
/** 이보다 가까우면 고현터미널 앞 정류장이라 거리·출발 자리가 같은 말을 두 번 합니다. */
const TERMINAL_NEAR_M = 30
/** 이 안이면 대표 정류장의 길 건너편으로 봅니다. */
const OPPOSITE_M = 50
/**
 * 핀이 이보다 가까우면 글자가 포개집니다. 길 건너편 정류장은 대표 핀에서 6~8m, 편마다 다른
 * 정류장끼리도 8m 남짓이라(매미성·김영삼 생가 실측) 가장 당긴 배율에서도 핀 글자가 겹칩니다.
 * 좌표는 옮기지 않고(위치가 정확하다는 전제) 겹친 핀만 점의 아래 · 위로 번갈아 답니다.
 * 핀 높이가 20~23px이라 0.5에 달린 핀(위아래 10px)과 떨어지려면 절반을 넘겨 -0.6 / 1.6입니다.
 */
const STACK_M = 25
/** 지도 화면 좌표로 잴 때(SDK가 투영을 줄 때) — 핀 글자 폭(노선 두어 개 ≈ 65px)·높이(≈ 22px)만큼. */
const STACK_PX_X = 72
const STACK_PX_Y = 24
const ANCHOR_CENTER = 0.5
const ANCHOR_BELOW = -0.6
const ANCHOR_ABOVE = 1.6

/** 초기 중심(거제 대략 가운데). 곧바로 setBounds가 옮깁니다. */
const GEOJE_CENTER = { lat: 34.88, lng: 128.62 }

/** 핀 노선 글자 — 셋까지 늘어놓고, 넘으면 첫 노선 + 나머지 수. 핀이 길어지면 이웃 핀을 덮습니다. */
function routesLabel(routes) {
  return routes.length > 3
    ? t('boarding.routesMore', { first: routes[0], count: routes.length - 1 })
    : routes.join(' · ')
}

function directionsUrl({ name, lat, lng }) {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`
}

/** CustomOverlay는 DOM을 그대로 받습니다. */
function pinElement(text, className) {
  const element = document.createElement('span')
  element.className = className
  element.textContent = text
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

function StopRow({ stop, badges, place, showDistance }) {
  return (
    <li className={styles.stop}>
      <div className={styles.stopHead}>
        <span className={styles.stopName}>{t('boarding.stopName', { name: stop.name })}</span>
        {badges.map((badge) => (
          <span key={badge} className={styles.badge}>
            {badge}
          </span>
        ))}
      </div>
      <div className={styles.stopMeta}>
        {showDistance && (
          <span className={styles.distance}>
            {t('boarding.distance', { place, dist: formatDistance(stop.distanceM) })}
          </span>
        )}
        <a
          className={styles.directions}
          href={directionsUrl(stop)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('boarding.directionsA11y', { name: stop.name })}
        >
          {t('boarding.directions')}
        </a>
      </div>
    </li>
  )
}

export default function BoardingMap({ boarding }) {
  const containerRef = useRef(null)
  const kakaoRef = useRef(null)
  const mapRef = useRef(null)
  const [phase, setPhase] = useState('loading') // 'loading' | 'ready' | 'error'
  const titleId = useId()

  const { from, stops, exceptions, unresolved } = boarding
  const isTerminal = from.kind === 'TERMINAL'
  const nearestM = Math.min(...[...stops, ...exceptions].map((p) => p.distanceM))
  const showDistance = (meters) => !(isTerminal && meters < TERMINAL_NEAR_M)

  // ── SDK 로드 + 지도 한 번 만들기 ────────────────────────────────────────
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

  // ── 핀 + 화면 맞추기. 칩을 바꾸면 boarding이 바뀌어 핀만 다시 찍습니다. ───────
  useEffect(() => {
    const kakao = kakaoRef.current
    const map = mapRef.current
    if (phase !== 'ready' || !kakao || !map) return

    // 1) 찍을 것을 모으고 2) 화면을 맞춘 뒤 3) 그 배율의 화면 좌표로 겹침을 잰다.
    //    처음엔 미터(25m)로 쟀는데, 운영 거제씨월드에서 26m 떨어진 두 지세포 핀이 몇 px 안에 겹쳐 4000 핀이 가려졌다(2026-09-14).
    const items = [
      ...stops.map((stop) => ({ at: stop, content: pinElement(routesLabel(stop.routes), styles.pinMain) })),
      ...exceptions.map((ex) => ({ at: ex, content: pinElement(`${ex.routeNo} ${ex.depart}`, styles.pinException) })),
      ...(isTerminal && nearestM < TERMINAL_NEAR_M ? [] : [{ at: from, content: fromElement(from.name) }]),
    ].map((item) => ({ ...item, position: new kakao.maps.LatLng(item.at.lat, item.at.lng) }))

    const bounds = new kakao.maps.LatLngBounds()
    items.forEach((item) => bounds.extend(item.position))
    map.setBounds(bounds, FIT_PADDING, FIT_PADDING, FIT_PADDING, FIT_PADDING)
    if (map.getLevel() < MIN_LEVEL) map.setLevel(MIN_LEVEL)

    const projection = map.getProjection?.()
    const placed = []
    const overlays = items.map((item) => {
      const point = projection?.containerPointFromCoords(item.position)
      // 먼저 찍힌 핀(대표 핀이 먼저입니다) 중 겹치는 것의 수로 높이를 정합니다: 0 제자리, 홀수 아래, 짝수 위.
      const near = placed.filter((p) =>
        point && p.point
          ? Math.abs(p.point.x - point.x) < STACK_PX_X && Math.abs(p.point.y - point.y) < STACK_PX_Y
          : distanceMeters(p.at, item.at) < STACK_M,
      ).length
      const yAnchor = near === 0 ? ANCHOR_CENTER : near % 2 === 1 ? ANCHOR_BELOW : ANCHOR_ABOVE
      placed.push({ at: item.at, point })
      return new kakao.maps.CustomOverlay({ map, position: item.position, content: item.content, xAnchor: 0.5, yAnchor })
    })

    return () => overlays.forEach((overlay) => overlay.setMap(null))
  }, [phase, stops, exceptions, from, isTerminal, nearestM])

  // 대표 핀이 있는 예외는 문장 하나, 대표 핀이 없는 노선(편마다 다름)은 노선별로 묶은 문장 + 편마다 목록 줄.
  const withMain = exceptions.filter((ex) => ex.mainNodeId != null)
  const split = exceptions.filter((ex) => ex.mainNodeId == null)
  const splitRoutes = [...new Set(split.map((ex) => ex.routeNo))]
  const unresolvedRoutes = [...new Set(unresolved.map((u) => u.routeNo))]

  return (
    <section className={styles.root} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t('boarding.title')}
      </h2>

      {/* 지도는 목록과 같은 내용을 그림으로 보여줄 뿐이라 읽기 도구에서는 숨깁니다. */}
      {phase === 'error' ? (
        <p className={styles.note}>{t('boarding.mapFailed')}</p>
      ) : (
        <div ref={containerRef} className={styles.map} aria-hidden="true" />
      )}

      <ul className={styles.stops}>
        {stops.map((stop) => (
          <StopRow
            key={stop.nodeId}
            stop={stop}
            badges={stop.routes}
            place={from.name}
            showDistance={showDistance(stop.distanceM)}
          />
        ))}
        {split.map((ex) => (
          <StopRow
            key={`${ex.routeNo}-${ex.depart}-${ex.nodeId}`}
            stop={ex}
            badges={[`${ex.routeNo} ${ex.depart}`]}
            place={from.name}
            showDistance={showDistance(ex.distanceM)}
          />
        ))}
      </ul>

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

      {splitRoutes.map((route) => (
        <p key={route} className={styles.note}>
          {t('boarding.split', {
            route,
            list: split
              .filter((ex) => ex.routeNo === route)
              .map((ex) => t('boarding.splitItem', { time: ex.depart }))
              .join(' · '),
          })}
        </p>
      ))}

      {unresolvedRoutes.length > 0 && (
        <p className={styles.note}>{t('boarding.unresolved', { routes: unresolvedRoutes.join('·') })}</p>
      )}

      <p className={styles.source}>{t('boarding.source', { source: boarding.source })}</p>
    </section>
  )
}
