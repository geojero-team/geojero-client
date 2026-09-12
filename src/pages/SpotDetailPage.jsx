import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { loadSpotDetail } from '../lib/spots'
import { courseImage, onImageError } from '../lib/courseImage'
import { useDragScroll } from '../lib/useDragScroll'
import styles from './SpotDetailPage.module.css'

/**
 * 스팟 상세 — Figma 02-2 446:1160 (02-1 264:227과 기능 같음 · v2 방문자 사진 뺌).
 *
 * ⚠️ 02-1의 버튼은 '일정에 담기'였고 스팟 고르기로 보냈습니다. 판정을 빼며 그 화면이
 * 없어져(2026-09-12) 버튼이 조용히 홈으로 떨어지고 있었습니다 — '버스 시간표 보기'로
 * 바꿨습니다. 조건(출발지·날짜)을 쿼리로 이어받던 코드도 함께 없앴습니다.
 *
 * 390×754, 탭바 없음(push 화면). hero 260 + body 두 덩어리입니다.
 *
 * 판정 요소가 **없습니다** — 배지도 막차도 소요시간도 이 프레임엔 그려져 있지 않습니다.
 * 판정 자체가 제품에서 빠졌고(기준문서 §9), 시각은 '버스 시간표 보기'가 여는 화면이
 * 노선별로 말합니다. 스팟 하나만 두고 이동시간을 말할 수 없으니 맞는 분담입니다.
 *
 * Figma의 '방문자 사진' 섹션은 넣지 않았습니다 — 노트가 스스로 v2라고 적고 있고,
 * '12장'과 사진 타일 3개는 지금 없는 것을 있는 것처럼 그리게 됩니다.
 */

/**
 * count-chip 사진 아이콘 — Figma 264:239 내보낸 자산 그대로입니다.
 *
 * 박스는 12×10인데 stroke가 사방으로 0.7px씩 넘칩니다(원본의 inset -7% / -5.83%).
 * 그래서 바깥 상자와 그림을 따로 두고 그림만 -0.7px 밀어 원본 기하를 지킵니다.
 */
/** 한 장 너비의 몇 %를 끌어야 다음 장으로 넘길지. */
const DRAG_STEP = 0.15

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

export default function SpotDetailPage() {
  const { spotId: poiId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [spot, setSpot] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const trackRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadSpotDetail(poiId).then((data) => {
      if (!cancelled) setSpot(data)
    })
    return () => {
      cancelled = true
    }
  }, [poiId])

  // 새 탭으로 바로 열었을 때 뒤로 갈 곳이 없으면 홈으로 보냅니다.
  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  /**
   * '버스 시간표 보기' — 02-1에서는 '일정에 담기'였고 스팟 고르기(/spots/pick)로 보냈습니다.
   * 판정을 빼면서 그 화면이 없어졌고(2026-09-12) 버튼이 조용히 홈으로 떨어지고 있었습니다.
   * 새 흐름에서 스팟 상세가 할 수 있는 일은 그 스팟의 버스 시간표를 여는 것입니다.
   *
   * 2026-09-12에 이 화면도 목에서 서버로 옮겼으므로 주소의 :spotId가 곧 서버 poi_id입니다.
   */
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

  if (!spot) {
    return (
      <Screen data-api="GET /api/pois/{poiId}">
        <p className={styles.pending}>{t('spotDetail.loading')}</p>
      </Screen>
    )
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
    <Screen data-api="GET /api/pois/{poiId}">
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

          <button
            type="button"
            className={styles.back}
            onClick={goBack}
            aria-label={t('common.back')}
          >
            ‹
          </button>

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

          <Button
            onClick={openTimetable}
            data-api="GET /api/spots"
          >
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
    </Screen>
  )
}
