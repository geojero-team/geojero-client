import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import LikeCount from './LikeCount'
import LoginSheet from './LoginSheet'
import ScreenPortal from './ScreenPortal'
import TerminalMap from './TerminalMap'
import VisitorPhotos from './VisitorPhotos'
import { t } from '../i18n'
import { api, beginKakaoLogin, beginKakaoLoginTo } from '../lib/api'
import { clearSession, getToken } from '../lib/session'
import { loadSpotDetail, patchSpot } from '../lib/spots'
import { courseImage, onImageError } from '../lib/courseImage'
import { sentenceLines } from '../lib/format'
import { ICON_PATHS } from '../lib/spotIcons'
import { usePhotoSwipe } from '../lib/usePhotoSwipe'
import styles from './SpotDetail.module.css'

/**
 * 스팟 상세의 내용 — Figma 02-2 `446:1160` (02-1 `264:227`과 기능 같음 · v2 방문자 사진 뺌).
 *
 * 2026-09-13에 `SpotDetailPage`에서 떼어냈습니다. 같은 내용이 **두 자리**에 들어가야 해서입니다.
 *   · `/spots/:spotId` — 스팟 탭 목록에서 누르면 열리는 화면 (뒤로 버튼 있음)
 *   · 지도의 스팟 시트 — 핀을 누르면 아래에서 올라오고, 끌어올리면 이 내용이 그대로 나옴
 * 시트에는 자기 손잡이와 닫기가 있으므로 `onBack`을 주지 않습니다 — 그러면 ‹ 버튼이
 * 그려지지 않습니다. 버튼 두 개가 같은 일을 하면 어느 게 뭘 닫는지 알 수 없습니다.
 *
 * 판정 요소가 **없습니다** — 배지도 막차도 소요시간도 이 프레임엔 그려져 있지 않습니다.
 * 판정 자체가 제품에서 빠졌고(기준문서 §9), 시각은 '시간표 보기'가 여는 화면이
 * 노선별로 말합니다. 스팟 하나만 두고 이동시간을 말할 수 없으니 맞는 분담입니다.
 *
 * '방문자 사진' 섹션은 소개 뒤에 둡니다(02-1 `264:227`의 `264:260` 자리 — 2026-09-13 필수 편입).
 * Figma의 '12장'·사진 타일 3개는 자리글이라 그리지 않고 서버가 준 장수만 그립니다 — 처음엔 17곳 전부
 * 0장이고 빈 상태(`268:531`)가 정상 화면입니다. TourAPI 사진(아래 hero)과는 호출·상태를 섞지 않습니다.
 */

/**
 * count-chip 사진 아이콘 — Figma 264:239 내보낸 자산 그대로입니다.
 *
 * 박스는 12×10인데 stroke가 사방으로 0.7px씩 넘칩니다(원본의 inset -7% / -5.83%).
 */
function PhotoCountIcon() {
  return (
    <span className={styles.countIcon} aria-hidden="true">
      <svg width="13.4" height="11.4" viewBox="0 0 13.4 11.4" fill="none">
        <path
          d="M0.7 8.7L4.7 4.7L7.7 7.7L9.7 5.7L12.7 8.7M0.7 0.7H12.7V10.7H0.7V0.7ZM9.2 3.2C9.2 3.75 8.75 4.2 8.2 4.2C7.65 4.2 7.2 3.75 7.2 3.2C7.2 2.65 7.65 2.2 8.2 2.2C8.75 2.2 9.2 2.65 9.2 3.2Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/**
 * 주소 줄 핀 · 내리는 곳 버스 — Figma 607:6 · 607:12 내보낸 자산 그대로(20×20, stroke 1.5).
 * 색은 CSS(text/secondary)에서 받습니다. 버스는 원본의 조각 7개를 한 path 로 이었습니다(선 끝 round 는 조각마다 그대로).
 * 핀은 맛집 · 숙소 상세(PlaceDetailPage)의 주소 줄도 씁니다.
 */
export function PinIcon() {
  return (
    <svg className={styles.infoIcon} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.6667 8.33333C16.6667 13.3333 10 18.3333 10 18.3333C10 18.3333 3.33333 13.3333 3.33333 8.33333C3.33333 6.56522 4.03571 4.86953 5.28595 3.61929C6.5362 2.36905 8.23189 1.66667 10 1.66667C11.7681 1.66667 13.4638 2.36905 14.714 3.61929C15.9643 4.86953 16.6667 6.56522 16.6667 8.33333Z M10 10.8333C11.3807 10.8333 12.5 9.71405 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.71405 8.61929 10.8333 10 10.8333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BusIcon() {
  return (
    <svg className={styles.infoIcon} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.66667 5V10 M12.5 5V10 M1.66667 10H18 M15 15H17.5C17.5 15 17.9167 13.5833 18.1667 12.6667C18.25 12.3333 18.3333 12 18.3333 11.6667C18.3333 11.3333 18.25 11 18.1667 10.6667L17 6.5C16.75 5.66667 15.9167 5 15 5H3.33333C2.89131 5 2.46738 5.17559 2.15482 5.48816C1.84226 5.80072 1.66667 6.22464 1.66667 6.66667V15H4.16667 M5.83333 16.6667C6.75381 16.6667 7.5 15.9205 7.5 15C7.5 14.0795 6.75381 13.3333 5.83333 13.3333C4.91286 13.3333 4.16667 14.0795 4.16667 15C4.16667 15.9205 4.91286 16.6667 5.83333 16.6667Z M7.5 15H11.6667 M13.3333 16.6667C14.2538 16.6667 15 15.9205 15 15C15 14.0795 14.2538 13.3333 13.3333 13.3333C12.4129 13.3333 11.6667 14.0795 11.6667 15C11.6667 15.9205 12.4129 16.6667 13.3333 16.6667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * 정류장이 없는 외도보타니아의 선착장 줄 — 그림에 없어 정한 것. 분류 칩·지도 핀의 유람선 아이콘(lib/spotIcons CRUISE, Figma SpotMarker)을
 * 같은 20px 칸에 넣습니다. 그 패스는 28 칸의 6~22 안에 그려져 있어 그 영역만 잘라 씁니다.
 */
function FerryIcon() {
  return (
    <svg className={styles.infoIcon} width="20" height="20" viewBox="6 6 16 16" fill="none" aria-hidden="true">
      <path d={ICON_PATHS.CRUISE} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 주소의 `?like=1` 을 켜고 끄는 updater — 다른 파라미터(방문자 사진의 `?upload=1`)는 건드리지 않습니다. */
const withLikeParam = (on) => (prev) => {
  const next = new URLSearchParams(prev)
  if (on) next.set('like', '1')
  else next.delete('like')
  return next
}

/**
 * @param poiId   서버 poi_id. 주소의 :spotId가 곧 이 값입니다
 * @param seed    목록에서 이미 아는 것(이름·권역·분류). 있으면 사진을 기다리는 동안에도
 *                제목이 먼저 뜹니다 — 시트는 누른 즉시 이름이 보여야 합니다
 * @param onBack  주면 사진 위에 ‹ 버튼을 그립니다
 * @param onClose 주면 사진 위 ‹ 맞은편에 ✕ 를 그립니다 — 지도 시트를 펼쳤을 때(2026-09-19). 시트의 ✕ 가
 *                시트 맨 위에 걸쳐 잘려 보였고, 스크롤하면 ‹ 는 올라가는데 ✕ 만 떠 있었습니다
 * @param uploadInUrl  `/spots/:id` 화면이면 참 — 방문자 사진 올리기 뜻을 주소(`?upload=1`)에 둡니다.
 *                지도 시트는 주소를 바꾸지 않으므로 주지 않습니다
 */
export default function SpotDetail({ poiId, seed = null, onBack = null, onClose = null, uploadInUrl = false }) {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(null)
  // 고현터미널 위치 지도를 못 띄웠으면 자리그림으로 되돌립니다(TerminalMap).
  const [mapFailed, setMapFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const trackRef = useRef(null)
  // 넘기기(손가락 · 마우스 · 키, 마지막 장 → 첫 장) — 맛집 · 숙소 상세와 같이 씁니다.
  const { goTo, handlers: swipe } = usePhotoSwipe(trackRef)

  /* poiId 가 바뀌면 **부모가 key 로 다시 마운트**합니다(`key={poiId}`). 그래서 여기서
     앞 스팟의 사진 번호·더보기 상태를 지울 필요가 없습니다 — effect 안에서 setState 를
     하면 react-hooks/set-state-in-effect 에 걸리고, 그 규칙이 맞습니다. */
  useEffect(() => {
    let cancelled = false
    loadSpotDetail(poiId).then((data) => {
      if (!cancelled) setLoaded(data)
    })
    return () => {
      cancelled = true
    }
  }, [poiId])

  /* ── 하트(2026-09-21 사용자 결정 · Figma 프레임 없음 — 디자인브리프 부록 Q) ──
     값은 상세(likeCount · liked)에서 오고, 누른 뒤에는 서버 응답으로 덮습니다(like). 목록 캐시도 같이 고쳐(patchSpot)
     뒤로 갔을 때 카드의 수와 「추천순」이 맞습니다. **누르는 것만 로그인**입니다 — 비로그인이면 로그인 시트를 띄우고,
     돌아올 주소에 `?like=1` 을 실어 복귀하면 이어서 누릅니다(방문자 사진의 `?upload=1` 과 같은 방식).
     지도 시트(uploadInUrl 아님)는 주소를 바꾸지 않으므로 `/spots/{id}?like=1` 로 돌려보냅니다 — 지도로는 돌아오지 않습니다(기준문서 §6). */
  const likeCountId = useId()
  const [like, setLike] = useState(null) // { likeCount, liked } — 서버 응답으로 덮은 값. null 이면 spot 값 그대로
  const [likeBusy, setLikeBusy] = useState(false)
  const [likeFailed, setLikeFailed] = useState(false)
  const [likeLogin, setLikeLogin] = useState(false) // 지도 시트 호스트의 로그인 시트(주소를 안 쓰는 쪽)
  const [autoLike, setAutoLike] = useState('idle') // 'idle' | 'done' — ?like=1 복귀에서 한 번만 누릅니다
  const [searchParams, setSearchParams] = useSearchParams()
  const likeInUrl = uploadInUrl && searchParams.get('like') === '1'
  const hasToken = Boolean(getToken())

  /* 응답 하나로 화면과 목록 캐시를 같이 고칩니다. 401 이면 세션을 지우고 false — 부른 쪽이 로그인 시트를 띄웁니다.
     그 밖의 실패는 한 줄로 알리고(0 과 실패는 다른 답) 수는 그대로 둡니다. */
  const settleLike = useCallback(
    (promise) =>
      promise
        .then((res) => {
          const patch = { likeCount: res.likeCount, liked: Boolean(res.liked) }
          setLike(patch)
          patchSpot(poiId, patch)
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
    [poiId],
  )

  /* ?like=1 로 돌아왔고 토큰이 있으면 저절로 누릅니다. 상태는 콜백에서만 바꿉니다(react-hooks/set-state-in-effect — VisitorPhotos 와 같은 방식). */
  useEffect(() => {
    if (!likeInUrl || !hasToken || autoLike !== 'idle') return
    let cancelled = false
    settleLike(api.likeSpot(poiId)).then((sessionOk) => {
      if (cancelled) return
      // 다시 그리면 hasToken 을 다시 읽습니다 — 401 이었으면 거짓이 되어 로그인 시트가 뜨고, ?like=1 은 남겨 두어
      // 다시 로그인하면 이어서 누릅니다.
      setAutoLike('done')
      if (sessionOk) setSearchParams(withLikeParam(false), { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [likeInUrl, hasToken, autoLike, poiId, settleLike, setSearchParams])

  const openTimetable = () => navigate(`/timetable/${poiId}`)

  // seed가 있으면 로딩 중에도 제목·분류를 그립니다. 둘 다 없을 때만 안내만 둡니다.
  const spot = loaded ?? seed
  if (!spot) {
    return <p className={styles.pending}>{t('spotDetail.loading')}</p>
  }

  // 사진은 TourAPI 런타임 호출값입니다(detail.images — 대표가 첫 장, 저작권은 서버가 거름).
  // 장수 칩·인디케이터는 두 장 이상일 때만 띄웁니다 — 없는 장수를 적지 않습니다.
  // 출처 칩은 실제 TourAPI 응답일 때만 답니다(자체 소개문 폴백이면 출처가 다릅니다).
  const isTerminal = spot.kind === 'TERMINAL'
  /* 시간표로 가는 줄(613:11) — 내리는 곳 / 정류장이 없는 외도보타니아는 배를 타는 선착장 넷 / 둘 다 모르면(옛 응답) 「시간표 보기」만 남깁니다.
     고현터미널은 줄이 없습니다(2026-09-13 사용자 결정 — 터미널에서 가는 버스는 각 스팟 시간표의 「고현터미널 → 스팟」이 말합니다). */
  const docks = spot.ferryDocks ?? []
  const stopRow = isTerminal
    ? null
    : spot.alightLabel
      ? {
          icon: <BusIcon />,
          main: t('spotDetail.alight', { label: spot.alightLabel }),
          sub: spot.boardStopDiffers && spot.timetableStop
            ? t('spotDetail.timetableBasis', { stop: spot.timetableStop })
            : null,
        }
      : docks.length > 0
        ? { icon: <FerryIcon />, main: t('spotDetail.docks', { docks: docks.join(' · ') }), sub: null }
        : { icon: <BusIcon />, main: t('spotDetail.openTimetable'), sub: null }
  const photos = spot.photos ?? []
  const hasPhotos = photos.length > 0
  const fromTourApi = spot.overviewSource === 'TourAPI'
  // 사진이 없으면 폴백 그림 한 장을 같은 트랙에 태웁니다 — 분기를 둘로 늘리지 않습니다.
  const slides = hasPhotos ? photos : [courseImage(spot)]
  // 한 장뿐이면 넘길 것도 셀 것도 없습니다. 안내를 붙이면 없는 동작을 약속하게 됩니다.
  const swipeable = photos.length > 1
  // 고현터미널은 사진이 없는 곳이라 사진 자리에 위치 지도를 둡니다(2026-09-19 사용자 결정). 좌표가 없거나 지도가 못 뜨면 자리그림.
  const showTerminalMap = isTerminal && !hasPhotos && spot.lat != null && spot.lng != null && !mapFailed

  /* 하트 — 고현터미널은 화면 스팟이 아니라 없습니다(서버도 404). 값이 없으면(옛 응답) 버튼을 그리지 않습니다 —
     값 없이 하트만 남기지 않습니다(절대규칙 3). 0 은 값이라 「♡ 0」으로 그립니다. */
  const likeCount = like?.likeCount ?? spot.likeCount ?? null
  const liked = like?.liked ?? Boolean(spot.liked)
  const showLike = !isTerminal && likeCount != null
  const autoLiking = likeInUrl && hasToken && autoLike === 'idle'
  const likeLoginOpen = uploadInUrl ? likeInUrl && !hasToken : likeLogin

  const askLikeLogin = () =>
    uploadInUrl ? setSearchParams(withLikeParam(true), { replace: true }) : setLikeLogin(true)
  const closeLikeLogin = () =>
    uploadInUrl ? setSearchParams(withLikeParam(false), { replace: true }) : setLikeLogin(false)
  const loginForLike = () => (uploadInUrl ? beginKakaoLogin() : beginKakaoLoginTo(`/spots/${poiId}?like=1`))

  const toggleLike = () => {
    setLikeFailed(false)
    if (!getToken()) {
      askLikeLogin()
      return
    }
    setLikeBusy(true)
    settleLike(liked ? api.unlikeSpot(poiId) : api.likeSpot(poiId))
      .then((sessionOk) => {
        if (!sessionOk) askLikeLogin()
      })
      .finally(() => setLikeBusy(false))
  }

  /* 스크롤 위치로 현재 장을 셉니다. 스크롤 이벤트마다 setState가 불리지만 값이 같으면
     React가 리렌더를 걸러주므로, 장이 바뀌는 순간에만 실제로 다시 그려집니다. */
  const syncIndex = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setPhotoIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <div className={styles.scroll}>
      <div className={styles.hero}>
        {showTerminalMap ? (
          <TerminalMap
            lat={spot.lat}
            lng={spot.lng}
            name={spot.shortName ?? spot.name}
            onFail={() => setMapFailed(true)}
          />
        ) : (
          /* 좌우 스와이프(264:228). 스냅이라 관성·고무줄이 브라우저 기본 그대로입니다. */
        <div
          ref={trackRef}
          className={styles.track}
          onScroll={swipeable ? syncIndex : undefined}
          {...swipe}
          onTouchStart={swipeable ? swipe.onTouchStart : undefined}
          onTouchEnd={swipeable ? swipe.onTouchEnd : undefined}
          tabIndex={swipeable ? 0 : undefined}
          role={swipeable ? 'group' : undefined}
          aria-label={
            swipeable ? t('spotDetail.photosLabel', { count: photos.length }) : undefined
          }
        >
          {slides.map((url, index) => (
            <img
              key={url}
              className={styles.slide}
              src={url}
              alt=""
              draggable="false"
              loading={index === 0 ? 'eager' : 'lazy'}
              onError={onImageError(spot)}
            />
          ))}
        </div>
        )}

        {onBack && (
          <button
            type="button"
            className={styles.back}
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={20} strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}

        {swipeable && (
          <>
            <span className={styles.countChip}>
              <PhotoCountIcon />
              {photoIndex + 1} / {photos.length}
            </span>
            {/* 모양은 Figma 264:231 그대로지만 누를 수 있게 했습니다 — 마우스만 쓰는
                사람에게는 이게 가장 눈에 띄는 조작 수단입니다. */}
            <span className={styles.dots}>
              {photos.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  className={index === photoIndex ? styles.dotOn : styles.dot}
                  aria-label={t('spotDetail.goToPhoto', { n: index + 1 })}
                  aria-current={index === photoIndex}
                  onClick={() => goTo(index)}
                />
              ))}
            </span>
          </>
        )}

        {hasPhotos && fromTourApi && (
          <span className={styles.creditChip}>{t('spotDetail.credit')}</span>
        )}
      </div>

      <div className={styles.body}>
        {/* 제목 줄 — 이름 · 「권역 · 분류」가 왼쪽, 하트가 오른쪽 끝(2026-09-21 저녁 · 부록 Q 「자리를 고쳤다」).
            배민 가게 상세 · 카카오 숙소예약이 같은 자리다. **수는 버튼 안**에 붙는다 —
            우리 하트는 내 목록에 담는 저장이 아니라 **추천**이라, 유튜브 좋아요 · 네이버 공감처럼
            누르는 곳과 수가 바뀌는 곳이 같아야 한다(2026-09-21 사용자 결정 A).
            권역 줄은 분류만 말한다 — 분류와 지표는 성격이 달라 한 줄에 섞지 않는다. */}
        <div className={styles.titleCol}>
          <div className={styles.titleMain}>
            <h1 className={styles.name}>{spot.shortName ?? spot.name}</h1>
            <p className={styles.category}>
              {isTerminal ? t('terminal.startPoint') : `${spot.region} · ${spot.category}`}
            </p>
          </div>
          {showLike && (
            <button
              type="button"
              className={liked ? `${styles.like} ${styles.likeOn}` : styles.like}
              onClick={toggleLike}
              disabled={likeBusy || autoLiking}
              aria-pressed={liked}
              aria-label={t(liked ? 'spotLike.unlike' : 'spotLike.like')}
              aria-describedby={likeCountId}
              data-api="PUT /api/pois/{id}/like"
            >
              <LikeCount id={likeCountId} count={likeCount} size={16} filled={liked} className={styles.likeCount} />
            </button>
          )}
        </div>
        {/* 실패 한 줄은 제목 줄 아래 — 0 과 실패는 다른 답이라 수를 지우지 않고 따로 말합니다. */}
        {likeFailed && (
          <p className={styles.likeNotice} role="status">
            {t('spotLike.failed')}
          </p>
        )}

        {/* 주소 · 내리는 곳(613:3, 2026-09-14 밤). 주소는 TourAPI addr1 런타임 값 그대로, 내리는 곳은 V18 alight_label.
            둘째 줄은 내리는 정류장과 시간표를 읽는 정류장이 다를 때만(씨월드 — 신촌에서 내리고 시각은 지세포).
            **내리는 곳 줄은 줄 전체가 시간표로 가는 버튼**(613:11, 오른쪽 ›)이고 「시간표 보기」 버튼은 없어졌습니다.
            값이 없으면 그 줄을 그리지 않습니다 — 아이콘만 남는 빈 줄이 곧 '이유 없는 빈칸'입니다. */}
        {(spot.address || stopRow) && (
          <div className={styles.info} data-info="">
            {spot.address && (
              <div className={styles.infoRow}>
                <PinIcon />
                <p className={styles.infoMain}>{spot.address}</p>
              </div>
            )}
            {stopRow && (
              <button
                type="button"
                className={styles.infoRowTap}
                onClick={openTimetable}
                data-api="GET /api/pois/{id}/departures"
              >
                {stopRow.icon}
                <span className={styles.infoText}>
                  <span className={styles.infoMain}>{stopRow.main}</span>
                  {stopRow.sub && <span className={styles.infoSub}>{stopRow.sub}</span>}
                  {/* 읽기 도구용 — 줄의 글만으로는 누르면 시간표가 열린다는 걸 알 수 없습니다. */}
                  {stopRow.main !== t('spotDetail.openTimetable') && (
                    <span className={styles.srOnly}>{t('spotDetail.openTimetable')}</span>
                  )}
                </span>
                <span className={styles.infoChev} aria-hidden="true">
                  ›
                </span>
              </button>
            )}
          </div>
        )}

        {/* 소개 — 두 칸입니다(2026-09-15 사용자 결정).
              · 요약: 우리가 쓴 2~3문장(서버 pois.summary · V29 Claude 초안). 맨 위, 본문색.
              · 원문: TourAPI overview. 글자는 수정·요약하지 않습니다(공모전 조건 — 원문 무수정). 5줄로 접고 「더보기」.
            둘 다 문장마다 줄만 바꿉니다(lib/format sentenceLines, CSS pre-line).
            둘 다 없으면(서버가 안 떠 있으면) 이 덩어리 자체를 그리지 않습니다. */}
        {(spot.summary || spot.overview) && (
          <section className={styles.intro}>
            <h2 className={styles.introHead}>{t('spotDetail.introHead')}</h2>
            {spot.summary && <p className={styles.summary}>{sentenceLines(spot.summary)}</p>}
            {spot.overview && (
              <>
                <p className={expanded ? styles.overviewFull : styles.overview}>
                  {sentenceLines(spot.overview)}
                </p>
                {!expanded && (
                  <button
                    type="button"
                    className={styles.more}
                    onClick={() => setExpanded(true)}
                  >
                    {t('common.more')}
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {/* 방문자 사진(264:260) — 올린 사람의 사진입니다. 위 hero의 TourAPI 사진과 칸·호출이 따로입니다. */}
        <VisitorPhotos
          poiId={poiId}
          spotName={spot.shortName ?? spot.name}
          uploadInUrl={uploadInUrl}
        />
      </div>

      {/* 하트의 로그인 시트 — 지도 시트 안에 갇히지 않게 화면 프레임에 그립니다(방문자 사진과 같은 ScreenPortal). */}
      {likeLoginOpen && (
        <ScreenPortal>
          <LoginSheet open onClose={closeLikeLogin} onLogin={loginForLike} title={t('spotLike.loginTitle')} />
        </ScreenPortal>
      )}
    </div>
  )
}
