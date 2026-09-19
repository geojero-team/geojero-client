import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import TerminalMap from './TerminalMap'
import VisitorPhotos from './VisitorPhotos'
import { t } from '../i18n'
import { loadSpotDetail } from '../lib/spots'
import { courseImage, onImageError } from '../lib/courseImage'
import { sentenceLines } from '../lib/format'
import { ICON_PATHS } from '../lib/spotIcons'
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
 * 판정 자체가 제품에서 빠졌고(기준문서 §9), 시각은 '시간표 보기'가 여는 화면이
 * 노선별로 말합니다. 스팟 하나만 두고 이동시간을 말할 수 없으니 맞는 분담입니다.
 *
 * '방문자 사진' 섹션은 소개 뒤에 둡니다(02-1 `264:227`의 `264:260` 자리 — 2026-09-13 필수 편입).
 * Figma의 '12장'·사진 타일 3개는 자리글이라 그리지 않고 서버가 준 장수만 그립니다 — 처음엔 17곳 전부
 * 0장이고 빈 상태(`268:531`)가 정상 화면입니다. TourAPI 사진(아래 hero)과는 호출·상태를 섞지 않습니다.
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
 * 주소 줄 핀 · 내리는 곳 버스 — Figma 607:6 · 607:12 내보낸 자산 그대로(20×20, stroke 1.5).
 * 색은 CSS(text/secondary)에서 받습니다. 버스는 원본의 조각 7개를 한 path 로 이었습니다(선 끝 round 는 조각마다 그대로).
 */
function PinIcon() {
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
  // 손가락 넘기기의 시작점 — 마지막 장에서 더 밀었는지 보려고 둡니다(아래 onTouchEnd).
  const touchRef = useRef(null)

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

  /* 다음 장 — 마지막 장이면 첫 장으로 돌아갑니다(2026-09-19 사용자: 「오른쪽으로 넘기면 다시 1로」).
     앞으로 가는 쪽만 돕니다. 첫 장에서 뒤로 넘기면 그대로 멈춥니다. */
  const goNext = (from) => {
    const track = trackRef.current
    if (!track) return
    goTo(from >= track.children.length - 1 ? 0 : from + 1)
  }

  /* 지금 몇 번째 장인지 — 스크롤 위치에서 바로 셉니다(state 는 한 박자 늦을 수 있습니다). */
  const currentIndex = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return 0
    return Math.round(track.scrollLeft / track.clientWidth)
  }

  /* 손가락은 브라우저가 넘겨 줍니다(관성·고무줄). 다만 **마지막 장에서는 더 밀 곳이 없어** 아무 일도 안 일어나므로,
     그 장에서 시작해 왼쪽으로 문턱(DRAG_STEP)보다 더 밀었으면 — 세로로 민 게 아니라면 — 첫 장으로 보냅니다. */
  const onTouchStart = (event) => {
    const touch = event.touches[0]
    const track = trackRef.current
    touchRef.current = touch && track
      ? { x: touch.clientX, y: touch.clientY, atLast: currentIndex() >= track.children.length - 1 }
      : null
  }

  const onTouchEnd = (event) => {
    const start = touchRef.current
    touchRef.current = null
    const touch = event.changedTouches[0]
    const track = trackRef.current
    if (!start?.atLast || !touch || !track) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (dx < -track.clientWidth * DRAG_STEP && Math.abs(dx) > Math.abs(dy)) goTo(0)
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
    if (past && delta < 0) goNext(from)
    else goTo(from + (past ? -1 : 0))
  })

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    if (event.key === 'ArrowRight') goNext(currentIndex())
    else goTo(currentIndex() - 1)
  }

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
          onTouchStart={swipeable ? onTouchStart : undefined}
          onTouchEnd={swipeable ? onTouchEnd : undefined}
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
        <div className={styles.titleCol}>
          <h1 className={styles.name}>{spot.shortName ?? spot.name}</h1>
          <p className={styles.category}>
            {isTerminal ? t('terminal.startPoint') : `${spot.region} · ${spot.category}`}
          </p>
        </div>

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
    </div>
  )
}
