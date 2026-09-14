import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import BoardingMap from '../components/BoardingMap'
import FerryTimetable from '../components/FerryTimetable'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { formatDuration } from '../lib/format'
import { loadSpots } from '../lib/spots'
import styles from './SpotTimetablePage.module.css'

/**
 * 스팟 시간표 — Figma 02-2 `453:210` · `453:288` · `453:415`.
 *
 * 코스 상세에서 스팟을 누르면 여기로 옵니다. 코스가 "요약"이면 이 화면이 "근거"입니다 —
 * 우리가 적은 `55번 · 40분`이 어느 회차에서 나온 값인지 사용자가 직접 볼 수 있게 합니다.
 *
 * 두 가지를 숨기지 않습니다.
 *  1. **읽는 정류장이 다를 때** — 조선해양문화관은 신촌에서 내리지만 시간표는 지세포
 *     기준입니다. 숨기면 거짓말이 됩니다.
 *  2. **빈 결과의 이유** — 운행 없음 / 시각 미상 / 정류장 칸 없음을 갈라 말합니다.
 *     이유 없는 빈칸은 우리가 기준문서 §4에서 비판하는 것입니다(절대규칙 3).
 *
 * 2026-09-13: 다음 버스 카드 아래의 노선별 소요시간 줄(`고현터미널까지 약 20분 · 53번은 약 20분 · …`)을
 * 뺐습니다. 노선이 많은 스팟에서 한 문단이 되어 '다음 버스'가 묻혔습니다. 카드는 다음 버스 한 줄만 말합니다.
 *
 * 2026-09-14: **배 칩**이 들어왔습니다(Figma 프레임 없음 — 사용자 결정). 배를 먼저 묻고, 그 답으로 칩을
 * 정한 뒤에야 버스를 묻습니다 — 외도보타니아는 버스 정류장이 없어 배 칩만 있고, 버스를 먼저 부르면
 * 칩이 버스 → 배로 깜빡이며 바뀝니다.
 *
 * 2026-09-14 개정(Figma `530:213` · `530:282` · `541:213` · `541:327` · `541:408`) — 버스 칩:
 *  · 순서: 타는 문장 → 방향 칩 → **다음 버스 카드**(「약 28분 뒤 · 시간표 기준」) → **타는 곳 카드**(접힘) →
 *    「평일 시간표」 → 노선 칩 → 한 편에 한 줄 → 맨 아래 출처 두 줄(시각 BIS · 정류소 좌표 TAGO).
 *  · 노선이 둘 이상이면 **노선 칩**. 고르면 그 노선 편만 보이고 요약 · 소요시간 · 다음 버스 · 타는 곳이 그 노선을 따릅니다.
 *  · 지난 편을 흐리지 않습니다(그림 그대로). 다음 편만 진한 글자 + 「다음」.
 *  · ★ 그림에 없는 것 — **출발 시각이 추정인 편**(departEstimated, 도장포 · 대금교차로 등 원문 칸이 없는 정류장)은
 *    추정이라고 말합니다(절대규칙 1 · 디자인브리프 부록 G 「지켜야 할 것」). 전부 추정이면 표 위 한 줄, 섞이면 그 편에 「추정」.
 *    estimated 가 아니라 departEstimated 를 봅니다 — 고현 → 바람의언덕 06:25는 도착만 추정이고 출발은 원문 칸입니다.
 */

/** 시각 문자열("HH:MM")을 분으로. 지난 차를 흐리게 하려면 비교가 필요합니다. */
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/**
 * 오늘 날짜 · 지금 시각 — **한국 시간** 기준입니다. 서버가 이 날짜로 요일을 판정하고(주말이면 버스가 달라집니다)
 * 시간표도 한국 시각입니다. 기기 시간대를 따르면 해외에서 여행 전에 볼 때 이미 떠난 버스를 「다음」이라고 합니다
 * (2026-09-14 리뷰). 배 응답의 asOf도 Asia/Seoul 입니다.
 */
const KST = 'Asia/Seoul'

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function nowHm() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: KST, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
}

/** 「약 N분 뒤」를 따라가게 하는 간격. 분 단위 문구라 30초면 늦어도 반 분입니다. */
const CLOCK_MS = 30 * 1000

/** 고현터미널 — 모든 코스의 출발·복귀 지점입니다. 스팟이 아니라서 poiId가 없습니다. */
const ORIGIN = '고현터미널'

/**
 * 방향 칩. 칩 하나가 "어디서 타서 어디로 가는가" 한 쌍입니다(2026-09-13, 두 개에서 네 개로).
 *
 *   next        이 스팟 → 코스의 다음 스팟
 *   fromNext    코스의 다음 스팟 → 이 스팟 (거꾸로)
 *   origin      이 스팟 → 고현터미널
 *   fromOrigin  고현터미널 → 이 스팟
 *
 * next·fromNext는 코스 상세에서 넘어와 다음 스팟(`to`)을 알 때만 있습니다. 시간표 탭에서
 * 들어오면 고현터미널 왕복 두 칩입니다. 모든 스팟에 같은 규칙입니다.
 *
 * ⚠️ 한때 `고현 → 스팟` 칩을 지웠습니다 — 그 칩만 남의 정류장(고현터미널) 시간표라 헷갈렸습니다.
 * 이번에 되살리면서 칩 아래 문구를 **타는 곳에 맞춰** 바꿉니다(`고현터미널에서 타요.`).
 *
 * 배 칩(2026-09-14)은 `dock:{dockCode}`입니다.
 *   · 버스 정류장이 없는 스팟(외도보타니아) — 배로 닿는 선착장마다 한 칩, 버스 칩 없음.
 *     배가 하나도 없으면 칩이 비지 않게 버스 칩으로 돌아갑니다.
 *   · 선착장 스팟(도장포유람선) — 버스 칩 뒤에 그 선착장 배 시간표 칩.
 *   · 다음 스팟이 배로만 가는 곳이면 next 칩이 배를 그리고 fromNext는 없습니다 — 배는 왕복이라
 *     "외도 → 이 스팟" 편이 따로 없습니다.
 */
const NO_FERRY = { hasBusStop: true, toIsFerryDestination: false, ferries: [] }

function directionsFor({ hasNext, ferry }) {
  const f = ferry ?? NO_FERRY
  const dockDir = (x) => `dock:${x.dock.dockCode}`
  if (!f.hasBusStop) {
    const docks = f.ferries.filter((x) => x.relation === 'DESTINATION').map(dockDir)
    if (docks.length > 0) return docks
  }
  const bus = !hasNext
    ? ['origin', 'fromOrigin']
    : f.toIsFerryDestination
      ? ['next', 'origin', 'fromOrigin']
      : ['next', 'fromNext', 'origin', 'fromOrigin']
  return [...bus, ...f.ferries.filter((x) => x.relation === 'DOCK').map(dockDir)]
}

/** 다음 스팟이 배로만 가는 곳인데 이 스팟 근처 선착장이 원문에 없을 때. 빈 칸이 아니라 이유를 말합니다. */
const NO_DOCK = 'NO_DOCK'

/** 칩 → 그릴 배. null이면 버스 칩입니다. */
function ferryFor(dir, ferry) {
  const f = ferry ?? NO_FERRY
  if (dir.startsWith('dock:')) {
    return f.ferries.find((x) => x.relation !== 'TOWARD' && x.dock.dockCode === dir.slice(5)) ?? null
  }
  if (dir === 'next' && f.toIsFerryDestination) return f.ferries.find((x) => x.relation === 'TOWARD') ?? NO_DOCK
  return null
}

/**
 * 버스 응답이 **어느 요청의 답인지**. 칩을 바꾼 직후에는 앞 칩의 답이 아직 state에 남아 있어,
 * 그대로 그리면 새 칩 아래에 길 건너편 정류장 핀·다른 방향의 다음 버스가 나옵니다(2026-09-14 리뷰).
 * 키가 다르면 그 답은 없는 것으로 보고 불러오는 중으로 그립니다.
 *
 * 흐르는 시계는 키에 넣지 않습니다(주소의 now만 넣습니다). 넣으면 분이 바뀐 뒤 노선 칩만 눌러도 키가 어긋나
 * 표 전체가 「불러오는 중」으로 사라지고 펼쳐 둔 타는 곳 카드가 접혔습니다(2026-09-14 리뷰). 다음 버스는
 * 응답의 하루치 departures에서 지금 시각으로 고르므로 다시 물을 필요가 없습니다.
 */
const busRequestKey = ({ dir, poiId, nextId, date, nowParam }) => [dir, poiId, nextId, date, nowParam].join('|')

const BUS_LOADING = { key: null, status: 'loading', data: null, error: '' }

/** 방향 → 서버 호출. fromNext는 **다음 스팟**의 시간표에서 목적지를 이 스팟으로 잡은 것입니다. */
function fetchDirection(dir, { poiId, nextId, date, after }) {
  if (dir === 'next') return api.spotDepartures(poiId, { date, after, toPoiId: nextId })
  if (dir === 'fromNext') return api.spotDepartures(nextId, { date, after, toPoiId: poiId })
  if (dir === 'fromOrigin') return api.spotDepartures(poiId, { date, after, from: 'origin' })
  return api.spotDepartures(poiId, { date, after })
}

export default function SpotTimetablePage() {
  const { poiId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // 날짜·시각을 쿼리로 덮어쓸 수 있게 둡니다 — 화면 확인과 회귀에 필요합니다.
  const date = searchParams.get('date') ?? today()
  const nowParam = searchParams.get('now')
  // 주소에 now가 없으면 흐르는 시계 — 「약 N분 뒤」 · 「다음」 태그가 화면을 켜 둔 동안 따라갑니다.
  const [clock, setClock] = useState(nowHm)
  useEffect(() => {
    if (nowParam) return
    const tick = () => setClock(nowHm())
    const timer = setInterval(tick, CLOCK_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [nowParam])
  const now = nowParam ?? clock
  // 코스의 다음 스팟 poiId. 코스 상세에서 넘어올 때만 붙습니다.
  const nextId = searchParams.get('to')

  /* 배 — 칩을 정하는 답이라 먼저 묻습니다. 선착장이 전부 한 응답에 있어 칩을 바꿔도 다시 묻지 않습니다.
     실패해도 버스는 막지 않습니다(ferryData가 null이면 지금까지의 버스 칩). */
  const [ferry, setFerry] = useState({ status: 'loading', data: null, error: '' })
  const ferryData = ferry.status === 'ready' ? ferry.data : null
  const dirs = directionsFor({ hasNext: Boolean(nextId), ferry: ferryData })
  const asked = searchParams.get('dir')
  const dir = dirs.includes(asked) ? asked : dirs[0]
  const chipFerry = ferry.status === 'loading' ? null : ferryFor(dir, ferryData)
  const busChip = ferry.status !== 'loading' && chipFerry == null

  const [result, setResult] = useState(BUS_LOADING)
  /* 노선 칩. 방향마다 노선이 달라(바람의언덕 → 고현 55뿐, 고현 → 바람의언덕 55 · 55-1) 방향을 바꾸면 「전체」로 돌아갑니다.
     키에 now를 넣지 않습니다 — 주소에 now가 없으면 분이 바뀔 때마다 키가 달라져 고른 칩이 풀립니다. */
  const [routePick, setRoutePick] = useState({ key: null, route: null })
  const routeKey = [dir, poiId, nextId, date].join('|')
  /* poiId → 짧은 이름. 칩 이름을 **응답과 떼어** 정합니다. 전에는 다음 스팟 칩 이름을
     응답의 `to`에서 읽었는데, 고현터미널 칩을 누르면 응답의 to가 고현터미널로 바뀌어
     **옆 칩 이름까지 '해금강 → 고현터미널'로 바뀌었습니다**(2026-09-13 버그). */
  const [names, setNames] = useState(() => new Map())

  useEffect(() => {
    let cancelled = false
    loadSpots().then((spots) => {
      if (cancelled) return
      setNames(new Map([...spots].map(([id, poi]) => [String(id), poi.shortName ?? poi.name])))
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 버스와 같은 date·now를 넘깁니다 — 한 화면에서 버스와 배가 "오늘"을 다르게 보지 않게.
  useEffect(() => {
    let cancelled = false
    api
      .spotFerries(poiId, { date, after: nowParam ?? nowHm(), toPoiId: nextId })
      .then((data) => {
        if (!cancelled) setFerry({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setFerry({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [poiId, nextId, date, nowParam])

  // 버스는 버스 칩일 때만 묻습니다. 배 칩에 버스를 물으면 외도(`toPoiId=5`)처럼 서버가 400을 줍니다.
  useEffect(() => {
    if (!busChip) return
    let cancelled = false
    const key = busRequestKey({ dir, poiId, nextId, date, nowParam })
    fetchDirection(dir, { poiId, nextId, date, after: nowParam ?? nowHm() })
      .then((data) => {
        if (!cancelled) setResult({ key, status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ key, status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [poiId, nextId, dir, date, nowParam, busChip])

  // 지금 칩의 요청에 대한 답만 씁니다. 배 칩이거나 답이 아직이면 d가 null입니다.
  const bus = result.key === busRequestKey({ dir, poiId, nextId, date, nowParam }) ? result : BUS_LOADING
  const d = busChip && bus.status === 'ready' ? bus.data : null
  const dayLabel = t(d?.dayClass === 'HOLIDAY' ? 'courseDetail.holiday' : 'courseDetail.weekday')
  // 제목은 늘 **이 스팟**입니다. fromNext 응답은 다음 스팟 기준이라 응답 이름을 쓰면 제목이 바뀝니다.
  // 배 칩이면 버스 응답이 없어 배 응답의 이름을 씁니다(배는 늘 이 스팟 기준으로 묻습니다).
  const spotFromResponse = dir === 'fromNext' ? null : (d?.shortName ?? d?.name ?? null)
  const spot = names.get(String(poiId)) ?? spotFromResponse ?? ferryData?.shortName ?? ''
  const nextFromResponse =
    dir === 'next' ? d?.to?.name : dir === 'fromNext' ? (d?.shortName ?? d?.name) : null
  const nextName = (nextId ? names.get(String(nextId)) : null) ?? nextFromResponse ?? ''

  const dirLabel = (k) => {
    if (k.startsWith('dock:')) {
      const f = ferryFor(k, ferryData)
      return t(f.relation === 'DOCK' ? 'ferry.dockChip' : 'ferry.dirToSpot', { dock: f.dock.shortName, spot })
    }
    if (k === 'next') return t('spotTime.dir', { from: spot, to: nextName })
    if (k === 'fromNext') return t('spotTime.dir', { from: nextName, to: spot })
    if (k === 'fromOrigin') return t('spotTime.dir', { from: ORIGIN, to: spot })
    return t('spotTime.dir', { from: spot, to: ORIGIN })
  }

  // to는 모든 칩에 남겨둡니다 — 고현터미널 칩을 눌렀다가 다음 스팟 칩으로 돌아올 수 있어야 합니다.
  // date·now는 **주소에 원래 있었을 때만** 옮깁니다. 계산한 기본값(오늘·지금)을 박으면 탭을 나중에
  // 다시 열었을 때 그 시계에 멈춰, 배 오늘 줄에 떠난 배가 남고 「오늘」이 지난 날짜에 붙습니다.
  const setDir = (next) => {
    const params = { dir: next }
    if (searchParams.get('date')) params.date = searchParams.get('date')
    if (searchParams.get('now')) params.now = searchParams.get('now')
    if (nextId) params.to = nextId
    setSearchParams(params, { replace: true })
  }

  // 배 답이 오기 전에만 화면 전체를 비웁니다 — 버스 칩을 먼저 그렸다가 배 칩으로 바뀌면 깜빡입니다.
  // 배 답이 정해진 뒤에는 제목·칩을 늘 그리고, 버스를 불러오는 중·실패는 칩 아래에 적습니다.
  // 버스 실패가 화면 전체를 덮으면 칩이 사라져 배 칩으로 돌아갈 길이 없어집니다.
  if (ferry.status === 'loading') {
    return (
      <Screen data-api="GET /api/pois/{id}/departures">
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
            ←
          </button>
        </header>
        <p className={styles.notice}>{t('spotTime.loading')}</p>
      </Screen>
    )
  }

  // ── 버스 표 ─────────────────────────────────────────────────────────────
  // 배 칩이면 d가 null이라 아래 버스 조각(다음 버스·타는 곳·빈 결과·표·출처)은 그리지 않습니다.
  const nowMin = toMin(now)
  const routes = d?.byRoute ?? []
  const picked = routePick.key === routeKey ? routePick.route : null
  const route = routes.some((r) => r.routeNo === picked) ? picked : null
  const routeSummary = routes.find((r) => r.routeNo === route) ?? null
  const shown = (d?.departures ?? []).filter((x) => route == null || x.routeNo === route)
  // 다음 버스 = 보이는 편 중 지금 이후 첫 편(서버 next 와 같은 규칙). 노선을 고르면 그 노선입니다.
  // 서버 next 를 쓰지 않는 이유: 요청할 때의 시각에 묶여 시계가 흘러도 따라가지 않습니다.
  const nextDep = shown.find((x) => toMin(x.depart) >= nowMin) ?? null
  const isNext = (x) => nextDep != null && x.routeNo === nextDep.routeNo && x.depart === nextDep.depart

  // 「몇 분 뒤」는 오늘을 볼 때만 — 다른 날짜를 주소로 열었으면 지금 시각과 무관합니다(now를 주소로 주면 그 시각이 지금).
  const dateParam = searchParams.get('date')
  const showsNow = nowParam != null || dateParam == null || dateParam === today()
  const minutesLeft = nextDep ? toMin(nextDep.depart) - nowMin : null
  const when =
    minutesLeft == null ? null : minutesLeft <= 0 ? t('spotTime.soon') : t('spotTime.inTime', { time: formatDuration(minutesLeft) })
  // 근거: 출발이 추정이면 추정, 원문 칸이면 시간표 기준. 서버가 departEstimated를 안 주면(옛 서버) 근거를 단정하지 않습니다.
  const basis =
    nextDep?.departEstimated === true
      ? t('spotTime.basisEstimated')
      : nextDep?.departEstimated === false
        ? t('spotTime.basisTimetable')
        : null
  const nextSub = showsNow && when ? (basis ? t('spotTime.nextSub', { when, basis }) : when) : null

  const estimatedCount = shown.filter((x) => x.departEstimated).length
  const allEstimated = shown.length > 0 && estimatedCount === shown.length
  const someEstimated = estimatedCount > 0 && !allEstimated

  // 노선을 고르면 소요시간 줄. 그 노선 편 중 하나라도 승차·하차가 앞뒤 정류장으로 감싼 값이면 소요시간도 추정입니다
  // (고현 → 바람의언덕 55번 「약 50분」은 도장포 도착이 추정). 출발만 보는 departEstimated가 아니라 estimated를 봅니다.
  const duration =
    routeSummary?.durationMin == null
      ? null
      : routeSummary.durationVaries && routeSummary.durationMinLow != null
        ? t('spotTime.durationRange', { low: routeSummary.durationMinLow, high: routeSummary.durationMin })
        : t('spotTime.duration', { min: routeSummary.durationMin })
  const durationText =
    duration && shown.some((x) => x.estimated) ? t('spotTime.durationEstimated', { duration }) : duration

  const summary = routeSummary
    ? t('spotTime.summaryRoute', { route: routeSummary.routeNo, count: routeSummary.count })
    : routes.length > 1
      ? t('spotTime.summaryCount', { count: d?.count })
      : t('spotTime.summary', { first: d?.firstDeparture, last: d?.lastDeparture, count: d?.count })

  return (
    <Screen data-api="GET /api/pois/{id}/departures">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
          ←
        </button>
        <h1 className={styles.title}>{spot}</h1>
        {/* 배에는 평일/휴일 구분이 없습니다 — 날짜마다 원문이 있습니다. 버스 답이 오기 전에도
            그리지 않습니다(평일인지 휴일인지는 서버가 날짜로 정합니다). */}
        {d && <span className={styles.dayPill}>{dayLabel}</span>}
      </header>

      <div className={styles.scroll}>
        <div className={styles.body}>
          {/* 어디서 타는지. 내리는 곳과 시간표 기준이 다르면 그 사실을 함께 적습니다.
              고현터미널 → 스팟은 서버의 alightLabel이 **스팟 쪽** 정류장이라 그대로 쓰면
              "해금강 정류장에서 타요"가 됩니다 — 타는 곳은 고현터미널이므로 따로 적습니다.
              배 칩은 선착장 문장을 FerryTimetable이 칩 아래에 적습니다. */}
          {d && (
            <p className={styles.board}>
              {dir === 'fromOrigin'
                ? t('spotTime.board', { stop: ORIGIN })
                : d.boardStop == null
                ? t('spotTime.emptyNoStop')
                : d.boardStopDiffers
                  ? t('spotTime.boardDiffers', { alight: d.alightLabel, stop: d.boardStop })
                  : t('spotTime.board', { stop: d.alightLabel ?? d.boardStop })}
            </p>
          )}

          {/* 배를 못 받아도 버스는 그대로 — 배 칩이 있었을지 모른다는 사실만 한 줄로 알립니다. */}
          {ferry.status === 'error' && (
            <p className={styles.board}>{t('ferry.loadFailed', { error: ferry.error })}</p>
          )}

          {/* 방향 칩 — 코스에서 왔으면 다음 스팟 왕복 + 고현터미널 왕복 네 개, 아니면 고현터미널 왕복 둘.
              그림(530:291)은 둘째 칩 이름을 말줄임으로 잘랐지만 칩 이름이 곧 구간이라 자르지 않고 가로로 넘깁니다. */}
          <div className={styles.dirs} role="group">
            {dirs.map((k) => (
              <button
                key={k}
                type="button"
                className={k === dir ? `${styles.dirChip} ${styles.dirOn}` : styles.dirChip}
                onClick={() => setDir(k)}
                aria-pressed={k === dir}
              >
                {dirLabel(k)}
              </button>
            ))}
          </div>

          {busChip && bus.status !== 'ready' && (
            <p className={styles.busStatus}>
              {bus.status === 'error' ? t('common.loadFailed', { error: bus.error }) : t('spotTime.loading')}
            </p>
          )}

          {chipFerry === NO_DOCK && (
            <div className={`${styles.empty} ${styles.block}`} data-api="GET /api/pois/{id}/ferries">
              <p className={styles.emptyTitle}>{t('ferry.noDock', { spot, to: nextName })}</p>
              <p className={styles.emptyText}>{t('ferry.noDockHint', { to: nextName })}</p>
            </div>
          )}

          {chipFerry && chipFerry !== NO_DOCK && (
            <div className={styles.block}>
              <FerryTimetable ferry={chipFerry} asOf={ferryData.asOf} days={ferryData.days} />
            </div>
          )}

          {/* 다음 버스 카드(530:297) — 가운데 20px + 둘째 줄 「약 28분 뒤 · 시간표 기준」. */}
          {d?.count > 0 && (
            <div className={styles.nextCard}>
              <p className={styles.nextLine}>
                {nextDep
                  ? t('spotTime.next', { time: nextDep.depart, route: nextDep.routeNo })
                  : route
                    ? t('spotTime.noNextRoute', { route })
                    : t('spotTime.noNext')}
              </p>
              {nextSub && <p className={styles.nextSub}>{nextSub}</p>}
            </div>
          )}

          {/* 타는 곳 — 버스 칩만, 다음 버스 카드 아래(530:300). 노선 칩을 고르면 그 노선의 정류장만. */}
          {d?.boarding && (
            <div className={styles.boarding}>
              <BoardingMap boarding={d.boarding} route={route} />
            </div>
          )}

          {/* ★ 빈 결과의 이유. 셋을 갈라 말합니다. */}
          {d?.count === 0 && (
            <div className={`${styles.empty} ${styles.block}`}>
              {d.emptyReason === 'UNKNOWN_TIME' ? (
                <>
                  <p className={styles.emptyTitle}>
                    {t('spotTime.emptyUnknown', { routes: (d.unknownTimeRoutes ?? []).join('·') })}
                  </p>
                  <p className={styles.emptyText}>{t('spotTime.emptyUnknownHint')}</p>
                </>
              ) : d.emptyReason === 'NO_STOP_IN_TIMETABLE' ? (
                <>
                  <p className={styles.emptyTitle}>{t('spotTime.emptyNoStop')}</p>
                  <p className={styles.emptyText}>{t('spotTime.emptyNoStopHint')}</p>
                </>
              ) : (
                <p className={styles.emptyTitle}>{t('spotTime.emptyNoService')}</p>
              )}
            </div>
          )}

          {d?.count > 0 && (
            <>
              <div className={styles.tableHead}>
                <h2 className={styles.tableTitle}>{t('spotTime.tableTitle', { day: dayLabel })}</h2>
                <p className={styles.tableSummary}>{summary}</p>
              </div>

              {/* 노선 칩(541:361) — 노선이 둘 이상일 때만. 넘치면 방향 칩처럼 가로로 넘깁니다. */}
              {routes.length > 1 && (
                <div className={styles.routes} role="group">
                  <button
                    type="button"
                    className={route == null ? `${styles.routeChip} ${styles.routeOn}` : styles.routeChip}
                    aria-pressed={route == null}
                    onClick={() => setRoutePick({ key: routeKey, route: null })}
                  >
                    {t('spotTime.routeAll', { count: d.count })}
                  </button>
                  {routes.map((r) => (
                    <button
                      key={r.routeNo}
                      type="button"
                      className={r.routeNo === route ? `${styles.routeChip} ${styles.routeOn}` : styles.routeChip}
                      aria-pressed={r.routeNo === route}
                      onClick={() => setRoutePick({ key: routeKey, route: r.routeNo })}
                    >
                      {t('spotTime.routeChip', { route: r.routeNo, count: r.count })}
                    </button>
                  ))}
                </div>
              )}

              {/* 소요시간 줄(541:370) — 노선을 골랐을 때만. 「전체」에서 섞어 한 값을 내면 실제로 운행하지 않는 값이 됩니다. */}
              {durationText && (
                <p className={styles.duration}>
                  {durationText}
                </p>
              )}

              {(allEstimated || someEstimated) && (
                <p className={styles.estimatedNote}>
                  {t(allEstimated ? 'spotTime.estimatedAll' : 'spotTime.estimatedSome')}
                </p>
              )}

              {/* 한 편에 한 줄(530:333). 시(時)는 그 시의 첫 줄에만 적습니다. */}
              <ul className={styles.rows}>
                {shown.map((x, i) => {
                  const hour = x.depart.slice(0, 2)
                  const firstOfHour = i === 0 || shown[i - 1].depart.slice(0, 2) !== hour
                  const next = isNext(x)
                  return (
                    <li key={`${x.routeNo}-${x.depart}`} className={styles.row}>
                      <span className={styles.hourLabel}>{firstOfHour ? t('spotTime.hour', { h: hour }) : ''}</span>
                      <span className={styles.badge}>{x.routeNo}</span>
                      <span className={next ? styles.timeNext : styles.time}>{x.depart}</span>
                      {next && <span className={styles.nextTag}>{t('spotTime.nextTag')}</span>}
                      {someEstimated && x.departEstimated && (
                        <span className={styles.estimatedTag}>{t('spotTime.estimatedTag')}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {/* 출처 — 맨 아래 두 줄(530:365). 정류소 좌표 줄은 타는 곳이 있을 때만 원천이 있습니다. */}
          {d && (
            <div className={styles.sources}>
              <p className={styles.source}>{t('spotTime.sourceTime', { source: d.source, date: d.baseDate })}</p>
              {d.boarding?.source && <p className={styles.source}>{d.boarding.source}</p>}
            </div>
          )}
        </div>
      </div>
    </Screen>
  )
}
