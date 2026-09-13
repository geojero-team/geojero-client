import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import LoginSheet from '../components/LoginSheet'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, beginKakaoLogin } from '../lib/api'
import { getToken } from '../lib/session'
import { courseImage, onImageError } from '../lib/courseImage'
import { formatDuration } from '../lib/format'
import { loadSpotPhotos, withPhotos } from '../lib/spots'
import styles from './CourseDetailPage.module.css'

/**
 * 코스 상세 — Figma 02-2 `446:929`.
 *
 * 이 화면이 이 서비스의 주장을 담습니다. 거제시 공식 앱은 코스에 `25분 / 13.0km`를 적고
 * **버스인지 자차인지 밝히지 않습니다**(기준문서 §5). 우리는 구간마다 **노선 번호와
 * 이동시간**을 적습니다 — `55번 · 40분`.
 *
 * ⚠️ 2026-09-13에 **시각을 전부 뺐습니다**(팀 결정). 전에는 구간마다 `11:45 ~ 13:45 ·
 * 120분 머물러요`와 `시각 추정` 배지가 붙었습니다. 뺀 이유: 몇 시에 도착해 얼마나
 * 머무를지는 **사용자가 정하는 것**이고, 우리가 답하는 것은 *"어느 버스로 몇 분"*입니다.
 * 시각을 우리가 박아두면 그 코스를 그 시각에만 쓸 수 있는 것처럼 읽힙니다.
 *
 * ⚠️ 같은 날 **추정 각주도 뺐습니다**(팀 결정). "도장포 정류장은 원문 시간표에 칸이 없어…"
 * 문장이 타임라인 아래에 붙어 있었는데, 화면을 읽는 사람에게는 설명이 아니라 경고문으로
 * 읽혔습니다. 추정 여부는 API(leg.estimated · rides[].boardEstimated)에 그대로 남아 있습니다.
 * 빈 자리만큼 스팟 사진을 키웠습니다(44 → 56px).
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

  // legRow — 화면이 남으면 구간 줄이 늘어나 타임라인이 저장 버튼 위까지 찹니다.
  return (
    <div className={`${styles.row} ${styles.legRow}`}>
      <div className={styles.gutter}>
        <span className={sameStop ? styles.dots : styles.bar} />
      </div>
      <div className={styles.legContent}>
        <span className={sameStop ? styles.legTextDim : styles.legText}>
          {sameStop
            ? t('courseDetail.legSameStop')
            : t('courseDetail.leg', { route: ride?.routeNo ?? '', min: leg.durationMin })}
        </span>
      </div>
    </div>
  )
}

/** 스팟 노드 — 원형 사진 + 순번. 누르면 그 스팟의 시간표로 갑니다. */
function StopRow({ stop, nextPoiId, onOpenTimetable }) {
  return (
    <div className={styles.row}>
      <div className={`${styles.gutter} ${styles.gutterStop}`}>
        <span className={styles.barTop} />
        <span className={styles.barBottom} />
        <span className={styles.thumb}>
          <img className={styles.thumbImg} src={courseImage(stop)} alt="" onError={onImageError(stop)} />
          <span className={styles.num}>{stop.seq}</span>
        </span>
      </div>
      <div className={`${styles.stopContent} ${styles.stopContentSpot}`}>
        <button
          type="button"
          className={styles.stopLine}
          onClick={() => onOpenTimetable(stop.poiId, nextPoiId)}
        >
          <span className={styles.stopName}>{stop.shortName ?? stop.name}</span>
          <span className={styles.timetableLink}>{t('courseDetail.timetable')} ›</span>
        </button>
      </div>
    </div>
  )
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
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

  /**
   * 스팟 → 그 스팟의 버스 시간표.
   *
   * **다음 스팟을 함께 넘깁니다.** 학동 다음이 해금강이면 사용자가 학동에서 필요한 것은
   * `학동 → 해금강` 시간표입니다 — 전에는 아무것도 안 넘겨서 늘 `학동 → 고현터미널`이
   * 열렸습니다. 마지막 스팟은 다음이 고현터미널(복귀)이라 넘길 것이 없습니다.
   */
  const openTimetable = (poiId, nextPoiId) =>
    navigate(`/timetable/${poiId}${nextPoiId ? `?to=${nextPoiId}` : ''}`)

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
        {/* '코스 1 · 3곳'이던 제목을 '코스'로 줄였습니다(2026-09-13). 번호는 목록에서의 순서라
            내 일정처럼 목록 밖에서 들어오면 뜻이 없고, 스팟 수는 타임라인이 이미 보여줍니다. */}
        <h1 className={styles.title}>{t('courseDetail.title')}</h1>
        {/* 어느 요일 시간표로 계산한 코스인지. 주말은 버스가 달라 이 코스가 성립하지 않습니다. */}
        <span className={styles.dayPill}>
          {t(course.service === 'HOLIDAY' ? 'courseDetail.holiday' : 'courseDetail.weekday')}
        </span>
      </header>

      <div className={styles.scroll}>
        <div className={styles.summary}>
          {/* 헤드라인도 경과 시간에서 **버스 이동시간**으로 바꿨습니다(2026-09-13).
              `약 8시간 30분`은 510분 중 버스가 114분이고 나머지가 머무는 시간이라,
              우리가 답한다고 한 것("어느 버스로 몇 분")과 다른 숫자였습니다. */}
          <p className={styles.big}>
            {t('courses.busTotal', { time: formatDuration(course.busMinTotal) })}
          </p>
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
              </div>
            </div>

            {/* 구간과 스팟이 번갈아 옵니다. legs가 stops보다 하나 많습니다. */}
            {course.legs.map((leg, i) => (
              <Fragment key={leg.seq}>
                <LegRow leg={leg} />
                {course.stops[i] && (
                  <StopRow
                    stop={course.stops[i]}
                    nextPoiId={course.stops[i + 1]?.poiId}
                    onOpenTimetable={openTimetable}
                  />
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
              </div>
            </div>
          </div>

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
