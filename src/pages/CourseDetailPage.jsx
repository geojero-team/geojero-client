import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import CourseMiniMap from '../components/CourseMiniMap'
import LoginSheet from '../components/LoginSheet'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, beginKakaoLogin } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import { formatDistance } from '../lib/format'
import { courseTitle } from '../lib/courseTitle'
import { getToken } from '../lib/session'
import { formatDuration } from '../lib/format'
import { loadSpots, regionsOf } from '../lib/spots'
import styles from './CourseDetailPage.module.css'

/**
 * 코스 상세 — Figma 09-14 확정 `547:200`(썸네일 · 제목 + 스팟 체인). 이전 판은 개정 `532:318`, 그 전은 02-2 `446:929`.
 *
 * 이 화면이 이 서비스의 주장을 담습니다. 거제시 공식 앱은 코스에 `25분 / 13.0km`를 적고
 * **버스인지 자차인지 밝히지 않습니다**(기준문서 §5). 우리는 구간마다 **노선 번호와
 * 이동시간**을 적습니다 — `55번 · 40분`.
 *
 * 2026-09-13에 시각을 전부 뺐습니다(몇 시에 머물지는 사용자가 정한다 — 디자인브리프 부록 E).
 *
 * 2026-09-14 개정 → 확정(Figma):
 *  · 머리에 지도(끌기·확대 됨), 권역, 제목, 스팟 체인, 칩 둘(버스 합계 · **버스 타는 횟수** — 그림의 「4구간」은 곳 수로 읽혀 2026-09-16 에 「버스 4번」으로 바꿨습니다).
 *    → 2026-09-16 지도를 **300px · 스팟에만 맞춤 · 사진 핀 · 선 없음**으로 바꿨습니다(사용자 결정 — `CourseMiniMap` 머리 주석 · 디자인브리프 부록 H).
 *  · **제목은 규칙으로 짓습니다 — 「{첫 스팟}에서 {끝 스팟}까지」**(2026-09-14 사용자 결정). 그림의 「몽돌에서 바람의언덕까지」는
 *    사람이 지은 이름인데 코스 23개에 그런 이름이 없고, 서버 코스 name 은 전부 줄임말 체인이라(「학동 · 기성관 · …」,
 *    「기성관」·「맹종죽테마파크」는 TourAPI 정본 이름이 아님 — 절대규칙 5) 쓰지 않습니다.
 *    → 2026-09-14 저녁 서버 `title`(V28 · 대표 코스 10개)이 생겨 **있으면 그것을 먼저** 씁니다(`lib/courseTitle` — 코스 추천 카드와 같은 규칙).
 *    체인(「학동몽돌해변 · 해금강 · 바람의언덕」)은 제목 아래 부제로 — 그래서 가운데 스팟도 빠지지 않습니다.
 *    그림에 있던 「고현터미널에서 출발해 고현터미널로 돌아와요」 문장은 확정 그림에서 빠졌습니다(타임라인 양 끝과 각주가 같은 말을 합니다).
 *  · 타임라인 스팟 줄은 **40px 둥근 사진 + 왼쪽 위 20px 번호**. 사진은 /api/pois 대표 사진(코스 API는 사진을 주지 않는다 — TourAPI
 *    장애에 코스 조회가 묶이지 않게), 없으면 분류 자리그림(저작권 Type3 로 0장인 스팟은 버그가 아니라 사실 — 기준문서 §5).
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

/** 내리는 곳 줄 앞 버스 — 스팟 상세(부록 J)의 Figma `607:12` 자산과 같은 그림, 여기서는 14px. 색은 CSS 에서 받습니다. */
function StopBusIcon() {
  return (
    <svg className={styles.alightIcon} width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
 * 「{정류장}에서 내려 직선 약 210m」 — 없으면 null.
 *
 * 버스가 내려주는 곳은 스팟이 아니라 정류장이다. 이 줄이 없으면 「33번 · 약 45분」이 「45분 뒤 매미성 도착」으로 읽히는데,
 * 매미성은 대금교차로 정류장에서 직선 210m, 해금강은 1.1km 다(2026-09-16 사용자 결정).
 * 이름은 그 구간이 **실제로 내리는 정류장**이라 스팟이 말하는 내리는 곳과 다를 수 있다(씨월드는 코스가 지세포에서 내린다).
 * 거리를 모르면 이름만 적는다 — 값 없이 「직선 약」만 남기지 않는다(절대규칙 3).
 */
function alightSentence(alight) {
  if (!alight?.stop) return null
  const stop = alight.stop.endsWith('종점') ? alight.stop : t('courseDetail.stopName', { stop: alight.stop })
  return alight.distanceM == null
    ? t('courseDetail.alight', { stop })
    : t('courseDetail.alightWithDistance', { stop, dist: formatDistance(alight.distanceM) })
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

  // 내리는 곳은 **구간 줄**에 답니다(2026-09-16 사용자 결정). 스팟 이름 아래에 두면 스팟의 부제처럼 읽혀
  // 「대금교차로」가 무엇인지 알 수 없었습니다 — 여기 있으면 「이 버스가 끝나는 곳」이 됩니다.
  const alightText = alightSentence(leg.alight)

  return (
    <div className={styles.legRow}>
      <span className={styles.rail}>
        {/* 탄 구간은 선, 같은 정류장(타지 않음)은 점선 — 탄 것과 안 탄 것은 다릅니다. */}
        <span className={sameStop ? styles.lineDots : styles.line} />
      </span>
      <span className={styles.legLines}>
        <span className={styles.legText}>{text}</span>
        {alightText && (
          <span className={styles.alight}>
            <StopBusIcon />
            {alightText}
          </span>
        )}
      </span>
    </div>
  )
}

/** 스팟 줄 — 40px 둥근 사진(왼쪽 위에 20px 번호) + 이름, 오른쪽 끝 「시간표 ›」(547:247). */
function StopRow({ stop, nextPoiId, onOpenTimetable }) {
  return (
    <div className={styles.stopRow} data-stop={stop.poiId}>
      <span className={styles.rail}>
        <span className={styles.thumb}>
          {/* 이름이 바로 옆에 있어 사진은 장식입니다. 링크가 죽으면 자리그림으로. */}
          <img className={styles.thumbImage} src={courseImage(stop)} alt="" onError={onImageError(stop)} />
          <span className={styles.badge}>{stop.seq}</span>
        </span>
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

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saveState, setSaveState] = useState({ status: 'idle', error: '' })
  // 이미 내 일정에 있는 코스인지 — 있으면 저장 버튼 대신 「이미 저장한 코스예요」(2026-09-15 사용자 요청: 중복 저장 막기).
  const [alreadySaved, setAlreadySaved] = useState(false)

  /* 로그인했을 때만 묻습니다. 못 받으면(만료 · 서버 장애) 버튼을 그대로 두고, 눌렀을 때 서버가 409로 한 번 더 막습니다. */
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    api
      .savedTrips()
      .then((trips) => {
        if (!cancelled && (trips ?? []).some((trip) => trip.courseId === Number(courseId))) setAlreadySaved(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [courseId])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.course(courseId), loadSpots()])
      .then(([data, pois]) => {
        if (cancelled) return
        // 대표 사진은 목록(/api/pois)에만 있습니다. 못 받았거나(빈 Map) 없으면 null — 자리그림으로 떨어집니다.
        const stops = (data.stops ?? []).map((stop) => ({ ...stop, thumbnailUrl: pois.get(stop.poiId)?.imageUrl ?? null }))
        setResult({
          status: 'ready',
          data: { ...data, stops, regions: regionsOf(stops, pois) },
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
      // 409 — 이미 저장한 코스(다른 탭 · 다른 기기에서 저장했거나 목록을 못 받았을 때). 오류가 아니라 저장된 상태로 보입니다.
      .catch((error) =>
        setSaveState(error.status === 409 ? { status: 'already', error: '' } : { status: 'error', error: error.message }),
      )
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
  // 스팟 체인은 이름을 쪼개지 않습니다(「해 / 금강」). 이름마다 한 덩어리로 묶고 가운뎃점은 앞 이름에 붙여,
  // 줄이 「· 거제씨월드」처럼 가운뎃점으로 시작하지 않게 합니다. 읽기 도구에는 「학동몽돌해변 · 해금강 · …」 그대로입니다.
  const names = stops.map((stop) => stop.shortName ?? stop.name)
  const chain = names.map((name, i) => (
    <Fragment key={`${i}-${name}`}>
      {i > 0 && ' '}
      <span className={styles.chainName}>{i < names.length - 1 ? `${name} ·` : name}</span>
    </Fragment>
  ))
  // 제목 — 서버 title 이 있으면 그것, 없으면 「학동몽돌해변에서 바람의언덕까지」. 한 곳뿐이면 이름 그대로(체인).
  const title = courseTitle(course.title, names) ?? chain
  const hasEstimate = legs.some((leg) => leg.estimated)

  return (
    <Screen data-api="GET /api/courses/{id}">
      {header}

      <div className={styles.scroll}>
        {hasLegs && <CourseMiniMap stops={stops} />}

        <div className={styles.body}>
          {hasLegs && (
            <p className={styles.meta}>
              {course.regions
                ? t('courseDetail.meta', { regions: course.regions, count: stops.length })
                : t('courseDetail.metaCount', { count: stops.length })}
            </p>
          )}
          <h1 className={styles.title}>{hasLegs ? title : course.name}</h1>

          {hasLegs ? (
            <>
              <p className={styles.subtitle}>{chain}</p>

              <div className={styles.chips}>
                <span className={styles.chipBus}>
                  {t('courseDetail.busChip', { time: formatDuration(course.busMinTotal) })}
                </span>
                {/* 서버 legCount 는 같은 정류장 구간까지 세므로(4-09 는 5) 버스를 타는 구간만 다시 셉니다 — 타임라인의 버스 줄 개수와 같은 값. */}
                <span className={styles.chipLegs}>{t('courseDetail.legChip', { n: legs.filter((leg) => leg.mode === 'BUS').length })}</span>
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
                {/* 걷는 시간은 어느 원문에도 없다 — 없는 것을 없다고 말한다(2026-09-16 사용자 결정). */}
                <p className={styles.estimatedNote}>{t('courseDetail.walkNote')}</p>
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
              {saveState.status === 'saved' || saveState.status === 'already' || alreadySaved ? (
                <div className={styles.savedRow}>
                  <span className={styles.savedText}>
                    {t(saveState.status === 'saved' ? 'courseDetail.saved' : 'courseDetail.alreadySaved')}
                  </span>
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
