import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import { courseImage, courseImageFallback } from '../lib/courseImage'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import { ICON_PATHS } from '../lib/spotIcons'
import styles from './PlaceMap.module.css'

/** 핀이 칸 가장자리에 붙지 않을 만큼.
 *  위아래를 넉넉히 주면 180px 칸에서 배율이 한 단계 더 빠진다(운영 캡처로 잡음 — 1.5km 가 축척 2km 로 보였다). */
const FIT_PADDING = { top: 32, right: 32, bottom: 32, left: 32 }
/** 두 곳이 아주 가까우면(맛집 · 스팟 120m) 골목 · 건물 윤곽까지 들어간다 — 주변 길이 보이는 배율(4)에서 멈춘다. 고현터미널 위치 지도와 같은 배율. */
const FIT_MIN_LEVEL = 4

/**
 * 맛집 · 숙소 상세의 위치 지도(2026-09-19 사용자) — 「어디 있나」와 「가까운 우리 스팟(최대 3곳)이 어느 쪽인가」를 한눈에.
 * 고현터미널 위치 지도(TerminalMap)처럼 **움직이지 않는** 지도다 — 페이지 스크롤 중에 손가락이 지도에 잡히지 않게.
 * 대신 칸 전체가 링크라 누르면 카카오맵에서 그곳을 크게 연다. 걷는 길 · 버스는 「가까운 스팟」의 「길찾기 ↗」가 맡는다.
 *
 * - 그곳 핀: 고현터미널 핀처럼 브랜드 면 + 흰 아이콘(맛집 수저 · 숙소 침대 — 분류 칩과 같은 그림). 이 화면의 주인공이다
 * - 스팟 핀: 타는 곳 지도의 출발 곳(부록 K)과 같은 24px 사진 원(이름표 없음 — 아래 목록이 말한다). 사진이 없거나 죽으면 분류 자리그림
 * - 선은 긋지 않는다 — 직선은 길로 읽힌다(부록 H 「09-16 — 코스 상세 지도」와 같은 판단)
 * - 지도 도구를 못 받으면 칸째 사라진다 — 빈 회색 칸을 남기지 않는다(주소 줄이 위치를 말한다)
 */
export default function PlaceMap({ place, spots = [] }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)
  // 지도를 다시 만드는 조건 — 핀에 쓰이는 값이 바뀔 때만(부모가 매번 새 배열을 넘겨도 다시 만들지 않는다).
  const pinsKey = JSON.stringify(spots.map((spot) => [spot.lat, spot.lng, spot.shortName, spot.thumbnailUrl, spot.theme]))
  const spotsRef = useRef(spots)
  useEffect(() => {
    spotsRef.current = spots
  })

  useEffect(() => {
    let cancelled = false
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !ref.current) return
        const here = new kakao.maps.LatLng(place.lat, place.lng)
        const map = new kakao.maps.Map(ref.current, {
          center: here,
          level: 4,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          keyboardShortcuts: false,
        })
        map.setZoomable(false)
        new kakao.maps.CustomOverlay({ map, position: here, content: placePin(place.kind), zIndex: 2 })
        const near = spotsRef.current.filter((spot) => spot.lat != null && spot.lng != null)
        if (near.length === 0) return
        const bounds = new kakao.maps.LatLngBounds()
        bounds.extend(here)
        for (const spot of near) {
          const there = new kakao.maps.LatLng(spot.lat, spot.lng)
          new kakao.maps.CustomOverlay({ map, position: there, content: spotPin(spot), zIndex: 1 })
          bounds.extend(there)
        }
        map.setBounds(bounds, FIT_PADDING.top, FIT_PADDING.right, FIT_PADDING.bottom, FIT_PADDING.left)
        if (map.getLevel() < FIT_MIN_LEVEL) map.setLevel(FIT_MIN_LEVEL)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [place.lat, place.lng, place.kind, pinsKey])

  if (failed) return null
  return (
    <a
      className={styles.frame}
      href={`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('placeDetail.mapAria', { name: place.name })}
    >
      <div ref={ref} className={styles.map} />
    </a>
  )
}

/** 브랜드 원 r=13 + 흰 테두리 2 = 28px(고현터미널 핀 501:213 과 같은 틀) 안에 흰 아이콘. 중심이 좌표에 온다. */
function placePin(kind) {
  const element = document.createElement('span')
  element.className = styles.placePin
  element.innerHTML =
    '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
    '<circle cx="14" cy="14" r="13" fill="#0069B3" stroke="white" stroke-width="2"/>' +
    `<path d="${ICON_PATHS[kind] ?? ''}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    '</svg>'
  return element
}

/** 24px 사진 원(타는 곳 지도의 출발 곳 썸네일 · 부록 K). 원의 중심이 좌표에 온다.
 *  이름표는 달지 않는다 — 바로 아래 「가까운 스팟」 목록이 같은 사진으로 이름을 말하고, 가까운 두 스팟(씨월드 · 조선해양문화관 113m)은 이름표가 서로 겹쳤다. */
function spotPin(spot) {
  const img = document.createElement('img')
  img.className = styles.spotPin
  img.src = courseImage(spot)
  img.alt = ''
  img.draggable = false
  img.addEventListener('error', () => {
    const fallback = courseImageFallback(spot)
    if (img.src !== fallback) img.src = fallback
  })
  return img
}
