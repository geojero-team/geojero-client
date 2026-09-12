import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import { t } from '../i18n'
import { loadSpotDetail } from '../lib/spots'
import { courseImage, onImageError } from '../lib/courseImage'
import { useDragScroll } from '../lib/useDragScroll'
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
 * 판정 자체가 제품에서 빠졌고(기준문서 §9), 시각은 '버스 시간표 보기'가 여는 화면이
 * 노선별로 말합니다. 스팟 하나만 두고 이동시간을 말할 수 없으니 맞는 분담입니다.
 *
 * Figma의 '방문자 사진' 섹션은 넣지 않았습니다 — 노트가 스스로 v2라고 적고 있고,
 * '12장'과 사진 타일 3개는 지금 없는 것을 있는 것처럼 그리게 됩니다.
 */

/** 한 장 너비의 몇 %를 끌어야 다음 장으로 넘길지. */
const DRAG_STEP = 0.15

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
 * @param poiId   서버 poi_id. 주소의 :spotId가 곧 이 값입니다
 * @param seed    목록에서 이미 아는 것(이름·권역·분류). 있으면 사진을 기다리는 동안에도
 *                제목이 먼저 뜹니다 — 시트는 누른 즉시 이름이 보여야 합니다
 * @param onBack  주면 사진 위에 ‹ 버튼을 그립니다. 시트에서는 주지 않습니다
 */
export default function SpotDetail({ poiId, seed = null, onBack = null }) {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const trackRef = useRef(null)

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

  const openTimetable = () => navigate(`/timetable/${poiId}`)

  /* 몇 번째 장으로 보낼지. 장 수를 트랙의 자식에서 읽습니다 — 아래 slides보다 먼저
     정의되어야 하기 때문입니다(훅은 조기 반환 앞에 와야 합니다). */
  const goTo = (index) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(index, track.children.length - 1))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
  }

  /* 한 번 끌면 **한 장만** 넘어갑니다.
     끌린 거리를 그대로 스크롤에 주기 때문에, 세 장 너비를 끌면 세 장이 지나갑니다.
     그래서 멈출 자리를 거리가 아니라 방향으로 정합니다 — 문턱을 넘겨 끌었으면 그쪽으로
     한 장, 아니면 제자리. 끄는 동안 스냅을 꺼두므로 브라우저가 맞춰주지 않습니다. */
  const dragHandlers = useDragScroll(trackRef, ({ startLeft, delta }) => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const from = Math.round(startLeft / track.clientWidth)
    const past = Math.abs(delta) > track.clientWidth * DRAG_STEP
    goTo(from + (past ? (delta < 0 ? 1 : -1) : 0))
  })

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    goTo(photoIndex + (event.key === 'ArrowRight' ? 1 : -1))
  }

  // seed가 있으면 로딩 중에도 제목·분류를 그립니다. 둘 다 없을 때만 안내만 둡니다.
  const spot = loaded ?? seed
  if (!spot) {
    return <p className={styles.pending}>{t('spotDetail.loading')}</p>
  }

  // 사진은 TourAPI 런타임 호출값입니다(detail.images — 대표가 첫 장, 저작권은 서버가 거름).
  // 장수 칩·인디케이터는 두 장 이상일 때만 띄웁니다 — 없는 장수를 적지 않습니다.
  // 출처 칩은 실제 TourAPI 응답일 때만 답니다(자체 소개문 폴백이면 출처가 다릅니다).
  const photos = spot.photos ?? []
  const hasPhotos = photos.length > 0
  const fromTourApi = spot.overviewSource === 'TourAPI'
  // 사진이 없으면 폴백 그림 한 장을 같은 트랙에 태웁니다 — 분기를 둘로 늘리지 않습니다.
  const slides = hasPhotos ? photos : [courseImage(spot)]
  // 한 장뿐이면 넘길 것도 셀 것도 없습니다. 안내를 붙이면 없는 동작을 약속하게 됩니다.
  const swipeable = photos.length > 1

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
        {/* 좌우 스와이프(264:228). 스냅이라 관성·고무줄이 브라우저 기본 그대로입니다. */}
        <div
          ref={trackRef}
          className={styles.track}
          onScroll={swipeable ? syncIndex : undefined}
          {...dragHandlers}
          onKeyDown={onKeyDown}
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

        {onBack && (
          <button
            type="button"
            className={styles.back}
            onClick={onBack}
            aria-label={t('common.back')}
          >
            ‹
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
        <div className={styles.titleCol}>
          <h1 className={styles.name}>{spot.shortName ?? spot.name}</h1>
          <p className={styles.category}>
            {spot.region} · {spot.category}
          </p>
        </div>

        <Button onClick={openTimetable} data-api="GET /api/pois/{id}/departures">
          {t('spotDetail.openTimetable')}
        </Button>

        {/* 소개는 TourAPI overview 원문입니다. 수정·요약하지 않습니다(저작권).
            서버가 안 떠 있으면 이 덩어리 자체를 그리지 않습니다. */}
        {spot.overview && (
          <section className={styles.intro}>
            <h2 className={styles.introHead}>{t('spotDetail.introHead')}</h2>
            <p className={expanded ? styles.overviewFull : styles.overview}>
              {spot.overview}
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
          </section>
        )}
      </div>
    </div>
  )
}
