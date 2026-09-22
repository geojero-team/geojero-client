import { ChevronDown, ChevronLeft, Clock, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LikeCount from './LikeCount'
import LoginSheet from './LoginSheet'
import NineTasteBadge from './NineTasteBadge'
import PlaceMap from './PlaceMap'
import ScreenPortal from './ScreenPortal'
import { PinIcon } from './SpotDetail'
import VisitorPhotos from './VisitorPhotos'
import { t } from '../i18n'
import { api, beginKakaoLogin, beginKakaoLoginTo } from '../lib/api'
import { clearSession, getToken } from '../lib/session'
import { courseImage, onImageError } from '../lib/courseImage'
import { formatDistance } from '../lib/format'
import { splitHours } from '../lib/openHours'
import { loadVisibleSpots } from '../lib/spots'
import { usePhotoSwipe } from '../lib/usePhotoSwipe'
import styles from './PlaceDetail.module.css'

/**
 * 맛집 · 숙소 · 카페 상세 — 화면(`/places/:placeId`)과 홈 지도 시트가 같이 쓴다(2026-09-19 · 카페 09-20, 기준문서 §6). Figma 프레임은 아직 없다.
 * 스팟 상세(SpotDetail)와 같은 방식이다 — 둘로 나누면 한쪽만 고쳐진다.
 * 짜임(2026-09-19 사용자 — 숙소 앱 레퍼런스를 보고 다시 짬): 사진 → 이름 + 한 줄(종류) → 가기 전에 볼 것 →
 * 「위치」(지도 + 주소) → 「가까운 스팟」. 구획 사이는 굵은 회색 띠. 숙소 예약은 화면 아래 고정.
 *
 * - 사진은 **자르지 않는다**(object-fit: contain). 대부분 Type3 = 공공누리 제3유형(변경금지)이다(기준문서 §7).
 * - 글은 TourAPI 원문 그대로다. 서버가 `<br>` 만 줄바꿈으로 바꿔 주고 화면은 pre-line 으로 그린다.
 * - 이름 아래 한 줄: 숙소는 종류 · 등급(`category` — 「2성 호텔」 · 「콘도」, 호텔업 등급), 맛집 · 카페는 대표 메뉴.
 *   읍면은 2026-09-20 에 뺐다(사용자) — 바로 아래 「위치」에 주소 전문이 있어 같은 말을 두 번 했다.
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
/**
 * @param inUrl `/places/:placeId` 화면이면 참 — 로그인하고 돌아올 자리를 주소에 실을 수 있습니다(`?like=1` · `?upload=1`).
 *              홈 지도 시트는 주소를 바꾸지 않으므로(부록 E) 거짓이고, 그때는 그 자리에서 로그인 시트를 띄웁니다.
 */
export default function PlaceDetail({ placeId, onBack, onClose = null, inUrl = false }) {
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
          <PlaceBody place={state.place} placeId={placeId} onBack={onBack} onClose={onClose} inUrl={inUrl} />
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

function PlaceBody({ place, placeId, onBack, onClose, inUrl }) {
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
  /* 하트(2026-09-22 사용자 · 서버 V51) — 스팟 상세와 **같은 규칙**이다(부록 Q).
     값은 상세(likeCount · liked)에서 오고, 누른 뒤에는 서버 응답으로 덮는다. **누르는 것만 로그인**이다 —
     비로그인이면 로그인 시트를 띄우고, 돌아올 주소에 ?like=1 을 실어 복귀하면 이어서 누른다
     (방문자 사진의 ?upload=1 과 같은 방식). 지도 시트(inUrl 아님)는 주소를 바꾸지 않으므로 그 자리에서
     시트를 띄우고 /places/{id}?like=1 로 돌려보낸다 — 지도로는 돌아오지 않는다(기준문서 §6). */
  const likeCountId = useId()
  const [like, setLike] = useState(null)
  const [likeBusy, setLikeBusy] = useState(false)
  const [likeFailed, setLikeFailed] = useState(false)
  const [likeLogin, setLikeLogin] = useState(false)
  const [autoLike, setAutoLike] = useState('idle')
  const [searchParams, setSearchParams] = useSearchParams()
  const likeInUrl = inUrl && searchParams.get('like') === '1'
  const hasToken = Boolean(getToken())

  const settleLike = useCallback(
    (promise) =>
      promise
        .then((res) => {
          setLike({ likeCount: res.likeCount, liked: Boolean(res.liked) })
          return true
        })
        .catch((error) => {
          if (error.status === 401) {
            clearSession()
            return false
          }
          setLikeFailed(true)
          return true
        }),
    [],
  )

  /* ?like=1 로 돌아왔고 토큰이 있으면 저절로 누른다. 상태는 콜백에서만 바꾼다(react-hooks/set-state-in-effect). */
  useEffect(() => {
    if (!likeInUrl || !hasToken || autoLike !== 'idle') return
    let cancelled = false
    settleLike(api.likePlace(placeId)).then((sessionOk) => {
      if (cancelled) return
      setAutoLike('done')
      if (sessionOk) setSearchParams(withLikeParam(false), { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [likeInUrl, hasToken, autoLike, placeId, settleLike, setSearchParams])

  const likeCount = like?.likeCount ?? place.likeCount ?? null
  const liked = like?.liked ?? Boolean(place.liked)
  const autoLiking = likeInUrl && hasToken && autoLike === 'idle'
  const likeLoginOpen = inUrl ? likeInUrl && !hasToken : likeLogin
  const askLikeLogin = () =>
    inUrl ? setSearchParams(withLikeParam(true), { replace: true }) : setLikeLogin(true)
  const closeLikeLogin = () =>
    inUrl ? setSearchParams(withLikeParam(false), { replace: true }) : setLikeLogin(false)
  const loginForLike = () =>
    inUrl ? beginKakaoLogin() : beginKakaoLoginTo('/places/' + placeId + '?like=1')

  const toggleLike = () => {
    setLikeFailed(false)
    if (!getToken()) {
      askLikeLogin()
      return
    }
    setLikeBusy(true)
    settleLike(liked ? api.unlikePlace(placeId) : api.likePlace(placeId))
      .then((sessionOk) => {
        if (!sessionOk) askLikeLogin()
      })
      .finally(() => setLikeBusy(false))
  }

  /* 읍면은 붙이지 않습니다(2026-09-20 사용자) — 바로 아래 「위치」에 주소 전문이 있어 같은 말을 두 번 했습니다. */
  const subtitle = place.category
  // 숙소 부대시설 칩 — TourAPI 원문을 「/」로만 나눈다. 맛집에는 메뉴 칩을 두지 않는다(아래 머리 주석).
  const tags = ok && place.kind === 'STAY' ? splitTags(detail.facilities) : []

  return (
    <>
      <Photos images={images} onBack={onBack} onClose={onClose} />

      <div className={styles.body}>
        <div className={styles.head}>
          {/* 이름이 왼쪽, 하트가 오른쪽 끝 — 스팟 상세와 같은 자리다(2026-09-22 · 부록 Q).
              수는 버튼 안에 붙는다 — 저장이 아니라 추천이라 누르는 곳과 수가 바뀌는 곳이 같아야 한다. */}
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{place.name}</h1>
            {likeCount != null && (
              <button
                type="button"
                className={liked ? `${styles.like} ${styles.likeOn}` : styles.like}
                onClick={toggleLike}
                disabled={likeBusy || autoLiking}
                aria-pressed={liked}
                aria-label={t(liked ? 'spotLike.unlike' : 'spotLike.like')}
                aria-describedby={likeCountId}
              >
                <LikeCount
                  id={likeCountId}
                  count={likeCount}
                  size={16}
                  filled={liked}
                  className={styles.likeCount}
                />
              </button>
            )}
          </div>
          {/* 거제 9미(2026-09-20) — 상세는 자리가 넓어 배지 옆에 어느 음식인지를 거제시 원문 이름 그대로 적습니다. */}
          <NineTasteBadge place={place} withNames />
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {/* 실패 한 줄 — 0 과 실패는 다른 답이라 수를 지우지 않고 따로 말한다(절대규칙 3). */}
          {likeFailed && (
            <p className={styles.likeNotice} role="status">
              {t('spotLike.failed')}
            </p>
          )}
        </div>

        {!ok && detail.source === 'FALLBACK' && (
          <p className={styles.fallback}>
            {t('placeDetail.fallback', {
              reason: detail.reason,
              time: formatChecked(detail.checkedAt),
            })}
          </p>
        )}

        {/* 가기 전에 볼 것 — 맛집 · 카페는 영업시간(+ 쉬는 날) / 숙소는 체크인 · 체크아웃. 스팟 상세 613:3 과 같은 아이콘 줄. */}
        {ok && (
          <div className={styles.info}>
            {place.kind === 'FOOD' || place.kind === 'CAFE' ? (
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

      {/* 방문자 사진(2026-09-22 사용자 · 서버 V51) — 스팟 상세와 같은 조각 · 같은 표다.
          처음엔 0장이고 그 화면이 정상이다(부록 F). */}
      <section className={styles.section}>
        <VisitorPhotos placeId={placeId} spotName={place.name} uploadInUrl={inUrl} />
      </section>

      {likeLoginOpen && (
        <ScreenPortal>
          <LoginSheet
            open
            onClose={closeLikeLogin}
            onLogin={loginForLike}
            title={t('spotLike.loginTitle')}
          />
        </ScreenPortal>
      )}
    </>
  )
}

/** 주소의 ?like=1 을 켜고 끄는 updater — 다른 파라미터(?upload=1)는 건드리지 않는다(SpotDetail 과 같은 방식). */
function withLikeParam(on) {
  return (prev) => {
    const next = new URLSearchParams(prev)
    if (on) next.set('like', '1')
    else next.delete('like')
    return next
  }
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
