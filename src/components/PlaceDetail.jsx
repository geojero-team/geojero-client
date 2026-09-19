import { ChevronDown, ChevronLeft, Clock, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PlaceMap from './PlaceMap'
import { PinIcon } from './SpotDetail'
import { t } from '../i18n'
import { api } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import { formatDistance } from '../lib/format'
import { splitHours } from '../lib/openHours'
import { loadVisibleSpots } from '../lib/spots'
import { usePhotoSwipe } from '../lib/usePhotoSwipe'
import styles from './PlaceDetail.module.css'

/**
 * 맛집 · 숙소 상세 — 화면(`/places/:placeId`)과 홈 지도 시트가 같이 쓴다(2026-09-19, 기준문서 §6 「맛집 · 숙소」). Figma 프레임은 아직 없다.
 * 스팟 상세(SpotDetail)와 같은 방식이다 — 둘로 나누면 한쪽만 고쳐진다.
 * 짜임(2026-09-19 사용자 — 숙소 앱 레퍼런스를 보고 다시 짬): 사진 → 이름 + 한 줄(종류 · 읍면) → 가기 전에 볼 것 →
 * 「위치」(지도 + 주소) → 「가까운 스팟」. 구획 사이는 굵은 회색 띠. 숙소 예약은 화면 아래 고정.
 *
 * - 사진은 **자르지 않는다**(object-fit: contain). 대부분 Type3 = 공공누리 제3유형(변경금지)이다(기준문서 §7).
 * - 글은 TourAPI 원문 그대로다. 서버가 `<br>` 만 줄바꿈으로 바꿔 주고 화면은 pre-line 으로 그린다.
 * - 이름 아래 한 줄: 숙소는 종류 · 등급(`category` — 「2성 호텔」 · 「콘도」, 호텔업 등급), 맛집은 대표 메뉴 + 주소의 읍면.
 * - 칩: 숙소 부대시설(`subfacility`) — 원문을 「/」로만 나눈다. 맛집 메뉴는 두지 않는다 — 사용자가 원한 건 **메뉴판 이미지**인데
 *   TourAPI 12곳 어디에도 없고(음식 메뉴 이미지는 백만석의 음식 사진 3장뿐), 취급 메뉴 글자 칩은 쓸모가 없다(2026-09-19 사용자).
 * - 맛집 영업시간은 본 시간 한 줄 + 쉬는 날, 준비시간 · 마지막 주문은 펼쳐 본다(HoursRow).
 * - 값이 없는 줄 · 구획은 그리지 않는다 — 빈 줄 · 빈 칸을 두지 않는다(절대규칙 3). 전화 · 주차 · 객실 수 · 정류장은 뺐다.
 * - **가까운 스팟**(서버 `nearSpots` — 5km 안에서 가까운 순으로 최대 3곳): 이 숙소 · 맛집을 거점으로 우리 스팟을 돈다는 것을 보여 준다.
 *   직선거리(TourAPI 좌표)만 적고, 버스로 갈지 걸어갈지는 스팟마다 「길찾기 ↗」(카카오맵 **대중교통**)가 답한다
 *   (「길찾기 직접 구현 — 카카오맵 딥링크로 위임」, 기준문서 §6 배제 표). 줄을 누르면 그 스팟 상세.
 * - 소개문(TourAPI overview)은 싣지 않는다 — 숙소는 호텔 자기 홍보 글이고, 맛집은 네이버 · 카카오도 첫 화면에 긴 소개글을 두지 않는다
 *   (둘 다 한 줄 · 세 줄 요약만 위에 둔다, 2026-09-19 확인). 원문은 고칠 수 없어 요약할 수도 없다(2026-09-19 사용자).
 * - 숙소 예약은 **여기어때 숙소 페이지**(`bookingUrl` — TourAPI 값이 아니라 서버가 들고 있는 값이라 관광정보가 실패해도 남는다).
 * - 출처는 사진 칸 안의 「출처 TourAPI」가 맡는다 — 맨 아래 출처 줄은 없다.
 */
export default function PlaceDetail({ placeId, onBack, onClose = null }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    api
      .place(placeId)
      .then((place) => {
        if (!cancelled) setState({ status: 'ready', place })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [placeId])

  /* 스크롤 칸과 예약 바를 나란히 돌려준다 — 부모(화면 · 시트)가 세로 flex 라 예약 바가 스크롤 밖 아래에 붙는다. */
  return (
    <>
      <div className={styles.scroll}>
        {state.status === 'ready' ? (
          <PlaceBody place={state.place} onBack={onBack} onClose={onClose} />
        ) : (
          <>
            <div className={styles.bar}>
              <BackButton onBack={onBack} />
            </div>
            <p className={styles.pending}>
              {state.status === 'error' ? t('placeDetail.loadFailed', { error: state.error }) : t('places.loading')}
            </p>
          </>
        )}
      </div>
      {state.status === 'ready' && state.place.kind === 'STAY' && state.place.bookingUrl && (
        <div className={styles.bookBar}>
          <a
            className={styles.book}
            href={state.place.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('placeDetail.bookAria', { name: state.place.name })}
          >
            {t('placeDetail.book')}
          </a>
        </div>
      )}
    </>
  )
}

function BackButton({ onBack, overPhoto = false }) {
  return (
    <button
      type="button"
      className={overPhoto ? styles.backOver : styles.back}
      onClick={onBack}
      aria-label={t('common.back')}
    >
      <ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" />
    </button>
  )
}

function PlaceBody({ place, onBack, onClose }) {
  const detail = place.detail ?? {}
  const ok = detail.source === 'TourAPI'
  const images = ok ? (detail.images ?? []) : []
  /* 가까운 스팟 사진 — 사진 · 분류는 스팟 목록(모듈 캐시, 스팟 탭에서 왔으면 이미 받아 둠)에서 꺼낸다.
     못 받으면 분류 자리그림이다 — 목록 · 지도를 막지 않는다. */
  const [spots, setSpots] = useState([])
  useEffect(() => {
    let cancelled = false
    loadVisibleSpots()
      .then((list) => {
        if (!cancelled) setSpots(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const nearSpots = (place.nearSpots ?? []).map((near) => {
    const listed = spots.find((spot) => spot.poiId === near.poiId)
    return { ...near, thumbnailUrl: listed?.thumbnailUrl ?? null, theme: listed?.theme }
  })
  const subtitle = [place.category, ok ? townOf(detail.address) : null].filter(Boolean).join(' · ')
  // 숙소 부대시설 칩 — TourAPI 원문을 「/」로만 나눈다. 맛집에는 메뉴 칩을 두지 않는다(아래 머리 주석).
  const tags = ok && place.kind === 'STAY' ? splitTags(detail.facilities) : []

  return (
    <>
      <Photos images={images} onBack={onBack} onClose={onClose} />

      <div className={styles.body}>
        <div className={styles.head}>
          <h1 className={styles.name}>{place.name}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {!ok && detail.source === 'FALLBACK' && (
          <p className={styles.fallback}>
            {t('placeDetail.fallback', {
              reason: detail.reason,
              time: formatChecked(detail.checkedAt),
            })}
          </p>
        )}

        {/* 가기 전에 볼 것 — 맛집 영업시간(+ 쉬는 날) / 숙소 체크인 · 체크아웃. 스팟 상세 613:3 과 같은 아이콘 줄. */}
        {ok && (
          <div className={styles.info}>
            {place.kind === 'FOOD' ? (
              <HoursRow openTime={detail.openTime} restDay={detail.restDay} />
            ) : (
              <InfoRow
                icon={<Icon of={Clock} />}
                main={
                  (detail.checkIn || detail.checkOut) &&
                  t('placeDetail.checkInOut', { in: detail.checkIn ?? '—', out: detail.checkOut ?? '—' })
                }
              />
            )}
          </div>
        )}

        {tags.length > 0 && (
          <ul className={styles.tags} aria-label={t('placeDetail.facilities')}>
            {tags.map((tag) => (
              <li key={tag} className={styles.tag}>
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHead}>{t('placeDetail.where')}</h2>
        {place.lat != null && place.lng != null && <PlaceMap place={place} spots={nearSpots} />}
        {ok && detail.address && (
          <div className={styles.info}>
            <InfoRow icon={<PinIcon />} main={detail.address} />
          </div>
        )}
      </section>

      {nearSpots.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>{t('placeDetail.nearSpots')}</h2>
          <ul className={styles.nearList}>
            {nearSpots.map((spot) => (
              <NearSpotItem key={spot.poiId} spot={spot} place={place} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/** 아이콘 20(요소로 받는다 — 스팟 상세 SVG 도, lucide 도) + 글. main 이 없으면(값 없음) 줄을 그리지 않는다. */
function InfoRow({ icon, main, sub }) {
  if (!main) return null
  return (
    <div className={styles.infoRow}>
      {icon}
      <span className={styles.infoText}>
        <span className={styles.infoMain}>{main}</span>
        {sub && <span className={styles.infoSub}>{sub}</span>}
      </span>
    </div>
  )
}

/** lucide 아이콘을 스팟 상세 Figma 아이콘(607:6 · 20px · 선 1.5)과 같은 굵기로 — absoluteStrokeWidth 라 크기와 상관없이 1.5px. */
function Icon({ of: Of }) {
  return <Of className={styles.infoIcon} size={20} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />
}

/** 가까운 스팟 한 줄 — [사진] 이름 / 직선 약 N   길찾기 ↗. 사진 · 이름 쪽을 누르면 그 스팟 상세,
 *  「길찾기 ↗」는 그 스팟에서 여기까지 카카오맵 대중교통 길찾기(웹 링크 형식 /link/by/traffic/). 좌표가 없으면 길찾기는 없다. */
function NearSpotItem({ spot, place }) {
  const canRoute = spot.lat != null && spot.lng != null && place.lat != null && place.lng != null
  return (
    <li className={styles.nearItem}>
      <Link className={styles.nearLink} to={`/spots/${spot.poiId}`}>
        <img className={styles.nearPhoto} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
        <span className={styles.nearText}>
          <span className={styles.nearName}>{spot.shortName}</span>
          <span className={styles.nearDist}>{t('placeDetail.straight', { dist: formatDistance(spot.distanceM) })}</span>
        </span>
      </Link>
      {canRoute && (
        <a
          className={styles.routeLink}
          href={`https://map.kakao.com/link/by/traffic/${encodeURIComponent(spot.shortName)},${spot.lat},${spot.lng}/${encodeURIComponent(place.name)},${place.lat},${place.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('placeDetail.routeAria', { from: spot.shortName, to: place.name })}
        >
          {t('placeDetail.route')}
        </a>
      )}
    </li>
  )
}

/** 「경상남도 거제시 일운면 거제대로 2752」 → 「일운면」. 거제시 바로 뒤가 읍 · 면 · 동이 아니면(도로명) 없다. */
function townOf(address) {
  return address?.match(/거제시\s+(\S+[읍면동])(?:\s|$)/)?.[1] ?? null
}

/**
 * 맛집 영업시간 — 본 시간 한 줄을 크게, 준비시간 · 마지막 주문은 펼쳐 본다(2026-09-19 사용자 「너무 길다」 — 네이버 · 카카오 장소 화면처럼).
 * 쉬는 날은 늘 보인다(쉬는 날 가면 헛걸음이다). 펼칠 것이 없으면 누르는 줄로 만들지 않는다. 「영업 중」 판단은 하지 않는다(lib/openHours).
 */
function HoursRow({ openTime, restDay }) {
  const [open, setOpen] = useState(false)
  const hours = splitHours(openTime)
  const rest = restDay ? t('places.restDay', { day: restDay }) : null
  if (!hours) return <InfoRow icon={<Icon of={Clock} />} main={rest} />
  const more = hours.details.length > 0
  return (
    <div className={styles.infoRow}>
      <Icon of={Clock} />
      <span className={styles.infoText}>
        {more ? (
          <button type="button" className={styles.hoursToggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span className={styles.infoMain}>{hours.main}</span>
            <ChevronDown
              className={open ? styles.hoursChevOpen : styles.hoursChev}
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className={styles.srOnly}>{t('placeDetail.hoursMore')}</span>
          </button>
        ) : (
          <span className={styles.infoMain}>{hours.main}</span>
        )}
        {open &&
          hours.details.map((detail) => (
            <span key={detail} className={styles.infoSub}>
              {detail}
            </span>
          ))}
        {rest && <span className={styles.infoSub}>{rest}</span>}
      </span>
    </div>
  )
}

/** TourAPI 부대시설 원문 「사우나 / 산책로 / 노래방」 → 칩. 글자는 바꾸지 않고 「/」로만 나눈다. */
function splitTags(value) {
  return (value ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
}

/** 사진 — 좌우로 넘기는 칸. 자르지 않는다(contain). 0장이면 그 사실을 적는다.
 *  onClose 를 주면(지도 시트를 펼쳤을 때) ‹ 맞은편에 ✕ — 스팟 상세와 같다.
 *  장수(왼쪽 아래) · 출처(오른쪽 아래)는 스팟 상세처럼 사진 칸 안에 띄운다(2026-09-19 사용자).
 *  사진 오른쪽 아래 모서리에 박힌 찍은 사람 표기(「© 네이버 블로그 깡지님」 등)는 칩보다 아래(모서리 몇 px)에 있어
 *  칩을 모서리에서 띄워 두면 가리지 않는다 — 캡처로 확인. Type3(변경금지) 사진에서 그걸 가리면 안 된다. */
function Photos({ images, onBack, onClose }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  // 넘기기는 스팟 상세와 같다 — 손가락 · 마우스 끌기 · ← → 키, 마지막 장에서 더 넘기면 첫 장(2026-09-19 사용자).
  const { handlers: swipe } = usePhotoSwipe(trackRef)
  const swipeable = images.length > 1
  const sync = () => {
    const track = trackRef.current
    if (track && track.clientWidth > 0) setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }
  return (
    <div className={styles.hero} data-hero="">
      {images.length > 0 ? (
        <div
          className={styles.track}
          ref={trackRef}
          onScroll={sync}
          {...(swipeable ? swipe : {})}
          tabIndex={swipeable ? 0 : undefined}
          role={swipeable ? 'group' : undefined}
          aria-label={swipeable ? t('spotDetail.photosLabel', { count: images.length }) : undefined}
        >
          {images.map((src) => (
            <img key={src} className={styles.slide} src={src} alt="" draggable="false" />
          ))}
        </div>
      ) : (
        <span className={styles.noPhoto}>{t('courses.noPhoto')}</span>
      )}
      <BackButton onBack={onBack} overPhoto />
      {onClose && (
        <button type="button" className={styles.closeOver} onClick={onClose} aria-label={t('common.close')}>
          <X size={20} strokeWidth={2.25} aria-hidden="true" />
        </button>
      )}
      {images.length > 0 && (
        <>
          {images.length > 1 && (
            <span className={styles.countChip}>
              {t('placeDetail.photoCount', { n: index + 1, total: images.length })}
            </span>
          )}
          <span className={styles.creditChip}>{t('spotDetail.credit')}</span>
        </>
      )}
    </div>
  )
}

/** 「2026-09-19T08:00:00Z」 → 「9/19 17:00」(한국 시간). 못 읽으면 원문 그대로. */
function formatChecked(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso ?? ''
  const kst = new Date(date.getTime() + 9 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
}
