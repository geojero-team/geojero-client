import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../i18n'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import { ICON_PATHS } from '../lib/spotIcons'
import styles from './BoardingMap.module.css'

/**
 * 선착장 「타는 곳」 카드 — 배 칩(외도 유람선 · 도선)의 다음 배 카드 아래(2026-09-15 사용자 결정 · Figma 프레임 없음).
 *
 * 버스 칩의 타는 곳 카드(BoardingMap)와 **같은 모양 · 같은 CSS**입니다: 접힌 머리줄(아이콘 · 이름 · 주소 · 꺾쇠)을 누르면
 * 지도와 「카카오맵으로 길찾기」가 열립니다. 버스와 다른 점은 셋입니다.
 *  · 선착장은 한 곳이고 노선이 없어 지도 태그에 선착장 이름을 답니다. 아이콘은 버스 대신 배(분류 칩의 유람선 그림)입니다.
 *  · 스팟에서의 거리는 쓰지 않습니다 — 외도 · 섬 스팟에서 선착장까지는 바다 건너라 직선거리가 뜻이 없습니다. 대신 주소입니다.
 *  · 예약센터가 선착장 근처라고 적은 문장(바람의언덕 「도보 1분거리」)은 접혀 있어도 보입니다.
 *
 * 좌표(서버 V32)는 TourAPI 등록값 또는 운항사 주소의 카카오 주소 검색값입니다. 없으면 펼칠 것이 없어 이름 · 주소만 둡니다.
 * 지도는 펼칠 때 만듭니다(BoardingMap 과 같은 이유 — 접힌 칸에서 만들면 크기가 0입니다).
 */

/** 마커 기하 — BoardingMap 과 같습니다: 아이콘 28 + 간격 2 + 태그 21 = 51px, 좌표는 아이콘 가운데. */
const MARKER_HEIGHT = 51
const ICON_CENTER = 14
/** 선착장 하나를 보는 지도 — 앞바다와 마을 길이 함께 보이는 배율. */
const LEVEL = 4

/** 배 마커 — 버스 마커(BoardingMap busMarkerSvg)와 같은 하늘색 원 + 흰 테두리에, 분류 칩 · 지도 핀의 유람선 그림(흰 선). */
function boatMarkerSvg(size) {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="none" aria-hidden="true">` +
    '<rect x="1" y="1" width="26" height="26" rx="13" fill="#00A1FF" stroke="white" stroke-width="2"/>' +
    `<path d="${ICON_PATHS.CRUISE}" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    '</svg>'
  )
}

function markerElement(name) {
  const element = document.createElement('span')
  element.className = styles.marker
  const icon = document.createElement('span')
  icon.className = styles.markerIcon
  icon.innerHTML = boatMarkerSvg(28)
  const tag = document.createElement('span')
  tag.className = styles.markerTag
  tag.textContent = name
  element.append(icon, tag)
  return element
}

/** 펼쳤을 때만 마운트되는 지도. 지도가 못 떠도 이름 · 주소 · 길찾기는 그대로입니다(카카오 JS 키는 도메인 제한). */
function DockMap({ name, lat, lng }) {
  const containerRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    let cancelled = false
    let overlay = null
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !container) return
        const position = new kakao.maps.LatLng(lat, lng)
        const map = new kakao.maps.Map(container, { center: position, level: LEVEL })
        overlay = new kakao.maps.CustomOverlay({
          map,
          position,
          content: markerElement(name),
          xAnchor: 0.5,
          yAnchor: ICON_CENTER / MARKER_HEIGHT,
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      overlay?.setMap(null)
      // kakao.maps.Map에는 destroy가 없습니다 — StrictMode 재마운트에 지도가 겹치지 않게 비웁니다(BoardingMap과 같음).
      if (container) container.innerHTML = ''
    }
  }, [name, lat, lng])

  // 지도는 이름 · 주소 · 길찾기와 같은 내용을 그림으로 보여줄 뿐이라 읽기 도구에서는 숨깁니다.
  return failed ? (
    <p className={styles.mapFailed}>{t('boarding.mapFailed')}</p>
  ) : (
    <div ref={containerRef} className={styles.map} aria-hidden="true" />
  )
}

/**
 * @param name     선착장 짧은 이름(도장포 · 구조라) — 화면은 「{name} 선착장」
 * @param address  운항사 주소 원문
 * @param lat,lng  선착장 좌표. 둘 중 하나라도 없으면 지도 · 길찾기 없이 이름 · 주소만
 * @param note     접혀 있어도 보이는 한 줄(예약센터 인용 등)
 */
export default function DockCard({ name, address, lat = null, lng = null, note = null }) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const title = t('boat.dockName', { name })
  const mappable = lat != null && lng != null

  const head = (
    <>
      <span
        className={styles.headIcon}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: boatMarkerSvg(26) }}
      />
      <span className={styles.headText}>
        <span className={styles.headTitle}>{title}</span>
        {address && <span className={styles.headLine}>{address}</span>}
      </span>
    </>
  )

  return (
    <section className={styles.card} aria-label={t('boarding.title')}>
      {mappable ? (
        <button
          type="button"
          className={styles.head}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          {head}
          <span className={open ? styles.chevronOpen : styles.chevron} aria-hidden="true">
            {open ? '⌄' : '›'}
          </span>
        </button>
      ) : (
        <div className={`${styles.head} ${styles.headStatic}`}>{head}</div>
      )}

      {open && mappable && (
        <div id={bodyId} className={styles.body}>
          <DockMap name={name} lat={lat} lng={lng} />
          <a
            className={styles.directions}
            href={`https://map.kakao.com/link/to/${encodeURIComponent(title)},${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('boat.directionsA11y', { name })}
          >
            {t('boarding.directions')}
          </a>
        </div>
      )}

      {note && <p className={styles.note}>{note}</p>}
    </section>
  )
}
