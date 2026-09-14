import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import CourseMiniMap from '../components/CourseMiniMap'
import LoginSheet from '../components/LoginSheet'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, beginKakaoLogin } from '../lib/api'
import { getToken } from '../lib/session'
import { formatDuration } from '../lib/format'
import { loadSpots } from '../lib/spots'
import styles from './CourseDetailPage.module.css'

/**
 * 코스 상세 — Figma 09-14 개정 `532:318`(코스 이름 없음 · 폴백). 이전 판은 02-2 `446:929`.
 *
 * 이 화면이 이 서비스의 주장을 담습니다. 거제시 공식 앱은 코스에 `25분 / 13.0km`를 적고
 * **버스인지 자차인지 밝히지 않습니다**(기준문서 §5). 우리는 구간마다 **노선 번호와
 * 이동시간**을 적습니다 — `55번 · 40분`.
 *
 * 2026-09-13에 시각을 전부 뺐습니다(몇 시에 머물지는 사용자가 정한다 — 디자인브리프 부록 E).
 *
 * 2026-09-14 개정(Figma):
 *  · 머리에 **220px 지도**(번호 핀 + 고현터미널), 제목·권역·칩 둘(버스 합계 · 구간 수), 사진 없는 22px 번호 타임라인.
 *  · **제목은 늘 폴백(스팟 짧은 이름 체인)** 입니다. 코스 이름이 있는 그림(532:213 「몽돌에서 바람의언덕까지」)도 있지만
 *    서버 코스 name 은 23개 전부 줄임말 체인이고(「학동 · 기성관 · …」) 그중 「기성관」·「맹종죽테마파크」는 TourAPI
 *    정본 이름이 아닙니다(절대규칙 5). 그래서 name 대신 stops[].shortName 을 잇습니다.
 *  · **추정 구간에 「약」** 과 각주가 돌아왔습니다(9/13에 팀원 커밋이 뺀 각주를 그림이 되살렸다). 각주는 추정 구간이
 *    있는 코스에만 — 확정값뿐인 코스(3-03 등 6개)에 쓰면 정확한 분을 「짧다」고 말하게 됩니다.
 *  · 저장 버튼이 바닥 고정 바에서 본문 흐름으로 들어갔습니다.
 */

/** 출발·도착 노드(고현터미널) — Figma `terminal-bus` 자산 그대로(흰 원 + 브랜드 테두리 + 버스 선 그림 + 그림자). */
function TerminalIcon() {
  return (
    <svg className={styles.terminalIcon} width="26.125" height="26.125" viewBox="0 0 26.125 26.125" fill="none" aria-hidden="true">
      <defs>
        <filter id="course-terminal-shadow" x="0" y="0" width="26.125" height="26.125" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="0.6875" />
          <feGaussianBlur stdDeviation="1.03125" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
      <g filter="url(#course-terminal-shadow)">
        <circle cx="13.0625" cy="12.375" r="11" fill="white" />
        <circle cx="13.0625" cy="12.375" r="10.3125" stroke="#0069B3" strokeWidth="1.375" />
      </g>
      <path d="M15.6406 7.73438H10.4844C9.63006 7.73438 8.9375 8.42693 8.9375 9.28125V13.4062C8.9375 14.2606 9.63006 14.9531 10.4844 14.9531H15.6406C16.4949 14.9531 17.1875 14.2606 17.1875 13.4062V9.28125C17.1875 8.42693 16.4949 7.73438 15.6406 7.73438Z" stroke="#0069B3" strokeWidth="1.03125" />
      <path d="M8.9375 11.3438H17.1875" stroke="#0069B3" strokeWidth="1.03125" />
      <path d="M11 14.9531V16.5" stroke="#0069B3" strokeWidth="1.03125" strokeLinecap="round" />
      <path d="M15.125 14.9531V16.5" stroke="#0069B3" strokeWidth="1.03125" strokeLinecap="round" />
    </svg>
  )
}

function TerminalRow({ label }) {
  return (
    <div className={styles.stopRow}>
      <span className={styles.rail}>
        <TerminalIcon />
      </span>
      <span className={styles.terminalName}>{label}</span>
    </div>
  )
}

/** 구간 한 줄 — `55번 · 40분` · 추정이면 `55번 · 약 12분` · 같은 정류장이면 `같은 정류장 · 바로 이동`. */
function LegRow({ leg }) {
  const sameStop = leg.mode === 'SAME_STOP'
  const route = leg.rides?.[0]?.routeNo ?? ''
  const text = sameStop
    ? t('courseDetail.legSameStop')
    : t(leg.estimated ? 'courseDetail.legApprox' : 'courseDetail.leg', { route, min: leg.durationMin })

  return (
    <div className={styles.legRow}>
      <span className={styles.rail}>
        {/* 탄 구간은 선, 같은 정류장(타지 않음)은 점선 — 탄 것과 안 탄 것은 다릅니다. */}
        <span className={sameStop ? styles.lineDots : styles.line} />
      </span>
      <span className={styles.legText}>{text}</span>
    </div>
  )
}

/** 스팟 줄 — 22px 번호 배지 + 이름, 오른쪽 끝 「시간표 ›」. */
function StopRow({ stop, nextPoiId, onOpenTimetable }) {
  return (
    <div className={styles.stopRow} data-stop={stop.poiId}>
      <span className={styles.rail}>
        <span className={styles.badge}>{stop.seq}</span>
      </span>
      <span className={styles.stopName}>{stop.shortName ?? stop.name}</span>
      {/* 읽기 도구에는 스팟 이름까지 — 「시간표」 버튼이 서너 개라 이름이 없으면 어느 스팟인지 모릅니다. */}
      <button
        type="button"
        className={styles.timetableLink}
        onClick={() => onOpenTimetable(stop.poiId, nextPoiId)}
        aria-label={t('courseDetail.timetableA11y', { name: stop.shortName ?? stop.name })}
      >
        {t('courseDetail.timetable')} ›
      </button>
    </div>
  )
}

/** 방문 순서대로 권역을 한 번씩. 하나도 모르면 null — 빈 가운뎃점을 남기지 않습니다. */
function regionsOf(stops, pois) {
  const seen = []
  for (const stop of stops) {
    const region = pois.get(stop.poiId)?.region
    if (region && !seen.includes(region)) seen.push(region)
  }
  return seen.length > 0 ? seen.join('·') : null
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saveState, setSaveState] = useState({ status: 'idle', error: '' })

  useEffect(() => {
    let cancelled = false
    Promise.all([api.course(courseId), loadSpots()])
      .then(([data, pois]) => {
        if (cancelled) return
        const terminal = [...pois.values()].find((poi) => poi.kind === 'TERMINAL') ?? null
        setResult({
          status: 'ready',
          data: { ...data, regions: regionsOf(data.stops ?? [], pois), terminal },
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
   * 스팟 → 그 스팟의 버스 시간표. **다음 스팟을 함께 넘깁니다** — 학동 다음이 해금강이면 학동에서 필요한 것은
   * `학동 → 해금강` 시간표입니다. 마지막 스팟은 다음이 고현터미널(복귀)이라 넘길 것이 없습니다.
   *
   * 다음 구간이 **같은 정류장**(조선해양문화관 → 거제씨월드)이면 넘기지 않습니다. 넘기면 서버가 같은 정류장 사이
   * 버스를 찾다 NO_SERVICE 를 주고, 화면이 걸어가는 구간에 「이 날은 이 구간을 가는 버스가 없어요」를 씁니다.
   */
  const openTimetable = (poiId, nextPoiId) =>
    navigate(`/timetable/${poiId}${nextPoiId ? `?to=${nextPoiId}` : ''}`)

  /**
   * 저장 — 비로그인이면 시트를 먼저 띄웁니다(446:1112).
   *
   * 보내는 것은 {courseId, travelDate} 둘뿐입니다. 출발·복귀 시각은 코스에 박혀 있어 서버가 채웁니다.
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

  const header = (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
        {'‹  '}
        {t('courseDetail.back')}
      </button>
      {/* 어느 요일 시간표로 계산한 코스인지. 모르면(옛 코스 service null) 그리지 않습니다. */}
      {course?.service && (
        <span className={styles.dayPill}>
          {t(course.service === 'HOLIDAY' ? 'courseDetail.holiday' : 'courseDetail.weekday')}
        </span>
      )}
    </header>
  )

  if (result.status !== 'ready') {
    return (
      <Screen data-api="GET /api/courses/{id}">
        {header}
        <p className={styles.notice}>
          {result.status === 'error'
            ? t('common.loadFailed', { error: result.error })
            : t('courseDetail.loading')}
        </p>
      </Screen>
    )
  }

  const stops = course.stops ?? []
  const legs = course.legs ?? []
  const hasLegs = stops.length > 0 && legs.length > 0
  // 제목 체인은 스팟 이름을 쪼개지 않습니다(「해 / 금강」). 이름마다 한 덩어리로 묶고 가운뎃점은 앞 이름에 붙여,
  // 줄이 「· 거제씨월드」처럼 가운뎃점으로 시작하지 않게 합니다. 읽기 도구에는 「학동몽돌해변 · 해금강 · …」 그대로입니다.
  const names = stops.map((stop) => stop.shortName ?? stop.name)
  const chain = names.map((name, i) => (
    <Fragment key={`${i}-${name}`}>
      {i > 0 && ' '}
      <span className={styles.titleName}>{i < names.length - 1 ? `${name} ·` : name}</span>
    </Fragment>
  ))
  const hasEstimate = legs.some((leg) => leg.estimated)

  return (
    <Screen data-api="GET /api/courses/{id}">
      {header}

      <div className={styles.scroll}>
        {hasLegs && <CourseMiniMap stops={stops} terminal={course.terminal} />}

        <div className={styles.body}>
          {hasLegs && (
            <p className={styles.meta}>
              {course.regions
                ? t('courseDetail.meta', { regions: course.regions, count: stops.length })
                : t('courseDetail.metaCount', { count: stops.length })}
            </p>
          )}
          <h1 className={styles.title}>{hasLegs ? chain : course.name}</h1>

          {hasLegs ? (
            <>
              <p className={styles.subtitle}>{t('courseDetail.origin', { origin })}</p>

              <div className={styles.chips}>
                <span className={styles.chipBus}>
                  {t('courseDetail.busChip', { time: formatDuration(course.busMinTotal) })}
                </span>
                <span className={styles.chipLegs}>{t('courseDetail.legChip', { n: course.legCount ?? legs.length })}</span>
              </div>

              <div className={styles.timeline}>
                <TerminalRow label={t('courseDetail.departNode', { origin })} />
                {/* 구간과 스팟이 번갈아 옵니다. legs가 stops보다 하나 많습니다. */}
                {legs.map((leg, i) => (
                  <Fragment key={leg.seq}>
                    <LegRow leg={leg} />
                    {stops[i] && (
                      <StopRow
                        stop={stops[i]}
                        nextPoiId={legs[i + 1]?.mode === 'SAME_STOP' ? null : stops[i + 1]?.poiId}
                        onOpenTimetable={openTimetable}
                      />
                    )}
                  </Fragment>
                ))}
                <TerminalRow label={t('courseDetail.arriveNode', { origin })} />
              </div>

              <div className={styles.notes}>
                {hasEstimate && <p className={styles.estimatedNote}>{t('courseDetail.estimatedNote')}</p>}
                <p className={styles.note}>
                  {t('courseDetail.source', { source: course.source, date: course.baseDate })}
                </p>
                <p className={styles.note}>{t('courseDetail.originNote', { origin })}</p>
              </div>
            </>
          ) : (
            <p className={styles.subtitle}>{t('courseDetail.noLegs')}</p>
          )}

          {/* 저장 — 본문 흐름 안(532:420). 저장 직후에는 결과와 '내 일정 보기'로 바뀝니다(446:1120).
              구간이 없는 옛 코스는 출발·복귀 시각이 없어 서버가 늘 400을 주므로 버튼을 두지 않습니다. */}
          {hasLegs && (
            <div className={styles.saveArea}>
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
          )}
        </div>
      </div>

      <LoginSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onLogin={beginKakaoLogin}
      />
    </Screen>
  )
}
