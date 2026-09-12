import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import LoginSheet from '../components/LoginSheet'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, beginKakaoLogin } from '../lib/api'
import { getToken } from '../lib/session'
import { courseImage, onImageError } from '../lib/courseImage'
import { loadSpotPhotos, withPhotos } from '../lib/spots'
import styles from './CourseDetailPage.module.css'

/**
 * 코스 상세 — Figma 02-2 `446:929`.
 *
 * 이 화면이 이 서비스의 주장을 담습니다. 거제시 공식 앱은 코스에 `25분 / 13.0km`를 적고
 * **버스인지 자차인지 밝히지 않습니다**(기준문서 §5). 우리는 구간마다 **노선 번호와
 * 이동시간**을 적고, 그 숫자가 추정이면 추정이라고 말합니다.
 *
 * ★ 추정 표시가 이 화면의 핵심입니다. 원문 시간표에 정류장 칸이 없는 곳(도장포 등)은
 * 앞뒤 정류장 시각으로 감싼 값이고, 하차는 상한·승차는 하한이라 **버스를 놓치지 않는
 * 쪽으로만 틀립니다.** 이걸 확정 시각처럼 적으면 절대규칙 1을 어기는 것이고,
 * 반대로 빈칸으로 두면 §4에서 우리가 비판하는 '이유 없는 빈칸'이 됩니다.
 */

/** 출발·도착 노드(고현터미널) — 스팟이 아니라 터미널이라 사진 대신 아이콘입니다. */
function TerminalNode() {
  return (
    <span className={styles.terminal} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="4" width="14" height="12" rx="2" />
        <path d="M5 10h14M9 20v-4M15 20v-4" />
      </svg>
    </span>
  )
}

/** 구간 한 줄 — `55번 · 40분` 또는 `같은 정류장 · 바로 이동` */
function LegRow({ leg }) {
  const ride = leg.rides?.[0]
  const sameStop = leg.mode === 'SAME_STOP'

  return (
    <div className={styles.row}>
      <div className={styles.gutter}>
        <span className={sameStop ? styles.dots : styles.bar} />
      </div>
      <div className={styles.legContent}>
        <span className={sameStop ? styles.legTextDim : styles.legText}>
          {sameStop
            ? t('courseDetail.legSameStop')
            : t('courseDetail.leg', { route: ride?.routeNo ?? '', min: leg.durationMin })}
        </span>
        {/* 추정이면 배지를 답니다. 숫자만 보이면 확정으로 읽힙니다. */}
        {leg.estimated && <span className={styles.estBadge}>{t('courseDetail.estimated')}</span>}
      </div>
    </div>
  )
}

/** 스팟 노드 — 원형 사진 + 순번. 누르면 그 스팟의 시간표로 갑니다. */
function StopRow({ stop, onOpenTimetable }) {
  return (
    <div className={styles.row}>
      <div className={styles.gutter}>
        <span className={styles.barTop} />
        <span className={styles.barBottom} />
        <span className={styles.thumb}>
          <img className={styles.thumbImg} src={courseImage(stop)} alt="" onError={onImageError(stop)} />
          <span className={styles.num}>{stop.seq}</span>
        </span>
      </div>
      <div className={styles.stopContent}>
        <button
          type="button"
          className={styles.stopLine}
          onClick={() => onOpenTimetable(stop.poiId)}
        >
          <span className={styles.stopName}>{stop.shortName ?? stop.name}</span>
          <span className={styles.timetableLink}>{t('courseDetail.timetable')} ›</span>
        </button>
        <p className={styles.stay}>
          {stop.arriveAt} ~ {stop.leaveAt} · {t('courseDetail.stay', { min: stop.stayMin })}
        </p>
      </div>
    </div>
  )
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saveState, setSaveState] = useState({ status: 'idle', error: '' })

  useEffect(() => {
    let cancelled = false
    Promise.all([api.course(courseId), loadSpotPhotos()])
      .then(([data, photos]) => {
        if (cancelled) return
        setResult({
          status: 'ready',
          data: { ...data, stops: withPhotos(data.stops ?? [], photos) },
          error: '',
        })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [courseId])

  const course = result.data
  const origin = course?.originName ?? '고현터미널'
  // 카드 번호는 목록에서 넘겨받습니다 — 목록의 '코스 1'과 상세 헤더가 어긋나면 안 됩니다.
  const cardNo = searchParams.get('no') ?? '1'

  // 추정이 걸린 정류장 이름을 모아 각주에 적습니다. 배지만 달면 왜 추정인지 알 수 없습니다.
  const estimatedStops = [
    ...new Set(
      (course?.legs ?? []).flatMap((leg) =>
        (leg.rides ?? []).flatMap((ride) => [
          ride.boardEstimated ? ride.boardStop : null,
          ride.alightEstimated ? ride.alightStop : null,
        ]),
      ).filter(Boolean),
    ),
  ]

  const openTimetable = (poiId) => navigate(`/timetable/${poiId}`)

  /**
   * 저장 — 비로그인이면 시트를 먼저 띄웁니다(446:1112).
   *
   * 보내는 것은 {courseId, travelDate} 둘뿐입니다. 출발·복귀 시각은 코스에 박혀 있어
   * 서버가 채웁니다 — 판정 시절엔 사용자 입력이었고 고를 자리가 없어졌습니다.
   *
   * ⚠️ travelDate 는 **오늘**로 보냅니다. 코스 상세에 날짜 선택이 없어서입니다.
   * 코스가 평일 기준이므로 주말에 저장하면 그날 버스와 어긋납니다 —
   * 날짜 선택을 둘지는 디자인 결정이라 여기서 정하지 않았습니다(팀 확인 필요).
   */
  const save = () => {
    if (!getToken()) {
      setSheetOpen(true)
      return
    }
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const travelDate = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`

    setSaveState({ status: 'saving', error: '' })
    api
      .saveTrip({ courseId: Number(courseId), travelDate })
      .then(() => setSaveState({ status: 'saved', error: '' }))
      .catch((error) => setSaveState({ status: 'error', error: error.message }))
  }

  if (result.status !== 'ready') {
    return (
      <Screen data-api="GET /api/courses/{id}">
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
            ←
          </button>
        </header>
        <p className={styles.notice}>
          {result.status === 'error'
            ? t('common.loadFailed', { error: result.error })
            : t('courseDetail.loading')}
        </p>
      </Screen>
    )
  }

  return (
    <Screen data-api="GET /api/courses/{id}">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ←
        </button>
        <h1 className={styles.title}>
          {t('courseDetail.title', { n: cardNo, count: course.spotCount })}
        </h1>
        {/* 어느 요일 시간표로 계산한 코스인지. 주말은 버스가 달라 이 코스가 성립하지 않습니다. */}
        <span className={styles.dayPill}>
          {t(course.service === 'HOLIDAY' ? 'courseDetail.holiday' : 'courseDetail.weekday')}
        </span>
      </header>

      <div className={styles.scroll}>
        <div className={styles.summary}>
          <p className={styles.big}>{course.approxTotalText}</p>
          <p className={styles.range}>
            {t('courseDetail.range', { origin, legs: course.legCount })}
          </p>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>{t('courseDetail.hint')}</p>

          <div className={styles.timeline}>
            {/* 출발 */}
            <div className={styles.row}>
              <div className={styles.gutter}>
                <span className={styles.barBottom} />
                <TerminalNode />
              </div>
              <div className={styles.stopContent}>
                <span className={styles.stopName}>
                  {t('courseDetail.departNode', { origin })}
                </span>
                <p className={styles.stay}>{course.departAt}</p>
              </div>
            </div>

            {/* 구간과 스팟이 번갈아 옵니다. legs가 stops보다 하나 많습니다. */}
            {course.legs.map((leg, i) => (
              <Fragment key={leg.seq}>
                <LegRow leg={leg} />
                {course.stops[i] && (
                  <StopRow stop={course.stops[i]} onOpenTimetable={openTimetable} />
                )}
              </Fragment>
            ))}

            {/* 도착 */}
            <div className={styles.row}>
              <div className={styles.gutter}>
                <span className={styles.barTop} />
                <TerminalNode />
              </div>
              <div className={styles.stopContent}>
                <span className={styles.stopName}>
                  {t('courseDetail.arriveNode', { origin })}
                </span>
                <p className={styles.stay}>{course.returnAt}</p>
              </div>
            </div>
          </div>

          {/* ★ 추정 각주. 배지가 무슨 뜻인지 여기서만 말할 수 있습니다. */}
          {estimatedStops.length > 0 && (
            <p className={styles.estNote}>
              {t('courseDetail.estimatedNote', { stops: estimatedStops.join('·') })}
            </p>
          )}

          <p className={styles.source}>
            {t('courseDetail.source', { source: course.source, date: course.baseDate })}
          </p>
        </div>
      </div>

      {/* 하단 바 — 저장 직후에는 결과와 '내 일정 보기'로 바뀝니다(446:1120). */}
      <div className={styles.bottomBar}>
        {saveState.status === 'saved' ? (
          <div className={styles.savedRow}>
            <span className={styles.savedText}>{t('courseDetail.saved')}</span>
            <button type="button" className={styles.savedLink} onClick={() => navigate('/my')}>
              {t('courseDetail.savedGo')} ›
            </button>
          </div>
        ) : (
          <>
            {saveState.status === 'error' && (
              <p className={styles.saveError}>
                {t('courseDetail.saveFailed', { error: saveState.error })}
              </p>
            )}
            <Button onClick={save} disabled={saveState.status === 'saving'}>
              {t(saveState.status === 'saving' ? 'courseDetail.saving' : 'courseDetail.save')}
            </Button>
          </>
        )}
      </div>

      <LoginSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onLogin={beginKakaoLogin}
      />
    </Screen>
  )
}
