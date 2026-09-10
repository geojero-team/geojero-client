import { api } from '../lib/api'
import { formatDuration } from '../lib/format'
import { ORIGIN_LABELS, toHHMM, toMinutes } from '../lib/tripParams'
import { loadSpotImages, resolvePoiId } from './poiIndex'

/**
 * 목 데이터 — 화면이 쓰는 네 덩어리
 *
 *   spots[]    지도·목록에 찍히는 관광지                       fetchSpots
 *   courses[]  홈 '오늘 버스로 되는 코스'(큐레이션)            fetchCourses
 *   routes[]   고른 스팟으로 짠 추천 코스 = 일정 고르기 카드     fetchPlan
 *   verdict    코스 하나의 판정 결과(가는 편·오는 편 타임라인)   fetchVerdict
 *
 * 실제 API가 나오면 fetch* 안의 주석만 풀면 됩니다.
 * 화면 코드는 이 파일 밖에서 목 데이터를 알지 못하게 유지하세요.
 *
 * 숫자 규칙 — 기준문서(§2 55번 시간표 · §3 진입·해상)에 있는 값만 씁니다. 없는 값은
 * '[미확인]'으로 내보내고 그 구간의 판정은 UNKNOWN으로 둡니다. 성립으로 추정하지 않습니다.
 *
 * [백엔드와 맞출 것]
 *  1) 판정은 POST /api/courses/{id}/judge → JudgeRes { feasible, dayClass, legs[{ok, depart, arrive, reason}], alerts }.
 *     정류장 출발편은 GET /api/stops/{stop}/departures?to=&date=&after=, 시간표는 GET /api/routes/{no}/timetable?date=.
 *     아래 타임라인 rows는 그 셋을 엮은 화면용 형태입니다 — Phase 6 어댑터가 같은 형태로 변환합니다.
 *  2) 추천 코스 순위·부분집합('○○ 빼면') 규칙은 서버가 정합니다. 여기 규칙은 화면 확인용입니다.
 *  3) 좌표는 TourAPI 실측(geojero data/seed/pois.json). 확정 좌표는 백엔드 POI 테이블 기준으로 교체.
 */

const SPOTS = [
  // Figma 233:378 순서. 좌표는 TourAPI 실측(geojero data/seed/pois.json, 2026-09-06).
  // notice = 조건과 무관한 사실(기준문서 §2·§3).
  //
  // **지금 어느 화면도 그리지 않습니다.** 2026-09-10 결정("고른 것만 이유를 준다")으로
  // 목록의 둘째 줄을 뺐기 때문입니다. 값은 남겨둡니다 — 외도의 '당일 확인'은 기준문서
  // §6이 유지하라고 한 유람선 안내(당일 확인 링크)의 근거이고, 그 자리는 판정 결과의
  // check-line(Figma 268:295 'check-line (미확인일 때만)')입니다. 링크 문구·URL이
  // 정해지면 여기서 그쪽으로 옮깁니다.
  spot(2, '바람의언덕', 'VIEW', '언덕·전망', '남부권', 34.7440458, 128.6633111),
  spot(8, '도장포', 'CRUISE', '유람선', '남부권', 34.7421508, 128.6626096),
  spot(1, '해금강', 'VIEW', '언덕·전망', '남부권', 34.7333, 128.6839),
  spot(7, '학동', 'BEACH', '해수욕장', '남부권', 34.774752, 128.641498),
  // Figma 내부 불일치: 목록(233:378)은 '식물원', 고르기(285:419)는 '식물원 · 유람선' — 최신 프레임을 따름
  // 지도에 '외도'로만 적으면 섬 이름으로 읽혀, 카카오 지도가 같은 자리에 찍는
  // '외도보타니아'와 다른 곳처럼 보입니다. 공식 명칭(서버 poi_name)과 맞춥니다.
  spot(6, '외도보타니아', 'GARDEN', '식물원 · 유람선', '동부권', 34.7694723, 128.7113921, {
    kind: 'UNKNOWN',
    text: '당일 확인',
  }),
  // 좌표 [미확인] — 지도에는 찍히지 않음
  spot(9, '명사해수욕장', 'BEACH', '해수욕장', '남부권', null, null, {
    kind: 'NO',
    text: '오늘 버스로 안 돼요',
  }),
  spot(4, '매미성', 'CASTLE', '성', '북부권', 34.9682131, 128.7050934),
  spot(5, '거제식물원', 'GARDEN', '식물원', '서부권', 34.8568211, 128.5780987),
]

function spot(spotId, name, theme, category, region, lat, lng, notice = null) {
  return { spotId, name, shortName: name, theme, category, region, thumbnailUrl: null, lat, lng, notice }
}

/**
 * 스팟별 판정. 조건(출발지·날짜·시각)이 정해졌을 때만 붙습니다.
 * 매미성·거제식물원은 기준문서 §9 미해결 항목(하차 정류소·운영 재개)이라 미확인입니다.
 */
const SPOT_VERDICTS = {
  1: { verdict: 'YES', summary: '왕복 5시간 20분 · 머무는 시간 1시간 40분' },
  2: { verdict: 'YES', summary: '왕복 4시간 50분 · 머무는 시간 2시간' },
  4: { verdict: 'UNKNOWN', summary: null, reason: '매미성 하차 정류소 미확인 (BIS 정류소검색 대금·시방)' },
  5: { verdict: 'UNKNOWN', summary: null, reason: '거제식물원 운영 재개 상태 미확인' },
  6: {
    verdict: 'UNKNOWN',
    summary: null,
    reason: '외도유람선은 매일 출항 시각이 달라요 · 당일 확인',
  },
  7: { verdict: 'YES', summary: '왕복 5시간 · 머무는 시간 1시간 20분' },
  8: { verdict: 'YES', summary: null },
  9: {
    verdict: 'NO',
    summary: null,
    reason: '도로 유실로 명사해수욕장앞 우회 중 (53·53-1 해당 구간 이용 불가)',
  },
}

/* ── 시각 도우미 ─────────────────────────────────────────────────────────── */

const UNKNOWN = '[미확인]'
const TIME_RE = /^\d{2}:\d{2}$/
const isTime = (value) => TIME_RE.test(value ?? '')
const addMin = (hhmm, minutes) => toHHMM(toMinutes(hhmm) + minutes)
const diffMin = (from, to) => toMinutes(to) - toMinutes(from)

const SEVERITY = { NO: 0, UNKNOWN: 1, YES: 2 }
/** 여러 판정 중 가장 나쁜 것. 미확인을 성립으로 올리지 않습니다. */
const worst = (...verdicts) =>
  verdicts.reduce((acc, v) => ((SEVERITY[v] ?? 1) < (SEVERITY[acc] ?? 1) ? v : acc), 'YES')

/* ── 55번 (고현 ↔ 해금강) — 기준문서 §2. 1일 6회, 주말 동일 ──────────────── */

const BUS_55_OUT = [
  { run: 1, 고현: '06:25', 학동: '07:05', 해금강: '07:15' },
  // 바람의언덕 10:04는 §3 '부산발 당일치기' 확인 코스에서 — 2회차에만 있습니다.
  { run: 2, 고현: '09:05', 학동: '09:45', 해금강: '09:55', 바람의언덕: '10:04' },
  { run: 3, 고현: '11:05', 학동: '11:45', 해금강: '11:55' },
  { run: 4, 고현: '13:05', 학동: '13:45', 해금강: '13:55' },
  { run: 5, 고현: '17:05', 학동: '17:45', 해금강: '17:55' },
  { run: 6, 고현: '19:15', 학동: '19:55', 해금강: '20:05' },
]

/* 복귀(해금강발) 6회, 학동 +10분. 고현 도착은 막차(20:55)만 기준문서에 있습니다. */
const BUS_55_BACK = ['07:35', '12:48', '14:48', '16:38', '18:48', '20:05'].map((time, i) => ({
  run: i + 1,
  해금강: time,
  학동: addMin(time, 10),
}))
const BUS_55_BACK_LAST_ARRIVAL = '20:55'

/** 돌아오는 막차 — 버스 정류장 기준. 해금강 20:05, 학동 20:15(§2). 그 밖 정류장은 [미확인]. */
const LAST_BUS_BY_STOP = { 해금강: '20:05', 학동: '20:15' }
const lastBusOf = (spot) => (spot ? (LAST_BUS_BY_STOP[ACCESS[spot.spotId]?.stop] ?? null) : null)

/** 남부 해안 순서(학동 → 바람의언덕 → 도장포 → 해금강). 이 안의 스팟만 순서를 정할 수 있습니다. */
const SOUTH_ORDER = [7, 2, 8, 1]

/**
 * 스팟별 접근 — 어느 노선의 어느 정류장으로 가는지 (기준문서 §2 주요 노선).
 *   trips  55번이 아닌 노선의 고현발 시각 (기준문서에 있는 것만)
 *   ship   버스 하차 뒤 유람선 구간 (시간표 박제 금지 → 당일 확인 링크)
 */
const ACCESS = {
  7: { routeNo: '55', stop: '학동', via: null },
  1: { routeNo: '55', stop: '해금강', via: '학동 경유' },
  2: { routeNo: '55', stop: '바람의언덕', via: '학동 · 해금강 경유' },
  8: { routeNo: '55', stop: '도장포', via: '학동 · 해금강 경유' },
  6: {
    routeNo: '55',
    stop: '해금강',
    via: '학동 경유',
    ship: { name: '외도유람선', note: '외도유람선 · 매일 달라요', href: 'https://oedocruise.com/cruiseinfo/course/' },
  },
  // 30번대 매미성 회랑 — 고현발 매시 :32, 약 17회 (§2)
  4: { routeNo: '30', stop: '매미성', via: '장목 방면', trips: [{ time: '매시 :32', note: '고현발 · 약 17회' }] },
  // 50-2 거제식물원 7회 — 고현발 07:35~19:35, 격 2시간 (§2)
  5: {
    routeNo: '50-2',
    stop: '거제식물원',
    via: null,
    trips: ['07:35', '09:35', '11:35', '13:35', '15:35', '17:35', '19:35'].map((time, i) => ({
      time,
      note: `${i + 1}회차`,
    })),
  },
  // 53·53-1 — 도로 유실로 명사해수욕장앞 우회 중 (§2)
  9: { routeNo: '53', stop: '명사해수욕장앞', via: null, blocked: true },
}

/* ── 출발 터미널 (기준문서 §3) ──────────────────────────────────────────── */

const ORIGIN_INFO = {
  // 사상 07:00 → 고현 08:20 (1시간 20분) / 고현 → 부산서부 06:10부터 20분 간격, 21:10 → 22:30
  BUSAN_SEOBU: { rideMin: 80, returnDepart: '21:10', returnNote: '20분 간격 · 티머니 예매', returnArrive: '22:30' },
  // 고현 → 서울남부 20회 05:00~22:00. 소요 시간·도착 시각은 [미확인]
  SEOUL_NAMBU: { rideMin: null, returnDepart: '22:00', returnNote: '상행 막차 · 버스타고 예매', returnArrive: null },
  // 통영 ↔ 고현 진입 22회, 상행은 현장 발권 위주. 시각 [미확인]
  TONGYEONG: { rideMin: null, returnDepart: null, returnNote: null, returnArrive: null },
}

/* ── 타임라인 행 ─────────────────────────────────────────────────────────
   stop: { kind:'stop', node:'start'|'bus'|'ship', name, action, time, dim?, tone?, note?, link?, trips? }
   leg : { kind:'leg', style:'bar'|'dots', text, stops? }   bar = 차량 구간, dots = 도보·대기 */

const stopRow = (node, name, action, time, extra = {}) => ({ kind: 'stop', node, name, action, time, ...extra })
const legRow = (style, text, extra = {}) => ({ kind: 'leg', style, text, ...extra })

function pushShipRows(rows, access, spotName) {
  if (!access.ship) return
  rows.push(legRow('dots', '선착장 이동'))
  rows.push(
    stopRow('ship', access.stop, '승선', '출항 시각 미확인', {
      dim: true,
      note: access.ship.note,
      link: { label: '운항 캘린더 ›', href: access.ship.href },
    }),
  )
  rows.push(legRow('dots', `${spotName} 왕복`))
  rows.push(stopRow('ship', access.stop, '하선', UNKNOWN, { dim: true }))
}

/**
 * 기준문서 §3 '성립 확인된 코스'가 확인해 준 스팟 사이 연결.
 *
 * 55번은 해금강을 지난 뒤에 바람의언덕에 서기 때문에(2회차 09:55 해금강 → 10:04
 * 바람의언덕) 버스로는 바람의언덕 → 해금강이 이어지지 않습니다. §3의 부산발 당일치기와
 * 외도 풀코스는 이 구간을 도장포 유람선으로 잇고 성립을 확인했습니다.
 * 시각(막배 15:30 출항 · 2시간 50분 · 18:20 복귀)은 전부 §3 원문 값입니다.
 */
const CONFIRMED_SHIP_LEG = {
  from: ['바람의언덕', '도장포'],
  to: '해금강',
  board: '15:30',
  arrive: '18:20',
  pier: '도장포',
  boardNote: '도장포 유람선 막배 · 해금강 코스',
  cruiseText: '해금강 유람 · 2시간 50분',
}

/**
 * §2 55번 표에서 fromStop을 afterTime 이후에 지나 toStop에도 서는 첫 회차.
 * 없으면 null — 그때는 시각을 지어내지 않습니다.
 *
 * 회차마다 경로가 달라서(55번은 6회 중 바람의언덕이 2회차 하나뿐) 노선만 보고
 * 이으면 틀립니다. 회차 단위로 찾는 이유입니다.
 */
function nextLegOn55(fromStop, toStop, afterTime) {
  if (!isTime(afterTime)) return null
  for (const run of BUS_55_OUT) {
    const board = run[fromStop]
    const arrive = run[toStop]
    if (
      isTime(board) &&
      isTime(arrive) &&
      toMinutes(board) > toMinutes(afterTime) &&
      toMinutes(arrive) > toMinutes(board)
    ) {
      return { board, arrive }
    }
  }
  return null
}

/** 가는 편: 출발 터미널 → 고현 → 첫 스팟(→ 다음 스팟들). 시각을 모르는 행이 하나라도 있으면 미확인. */
function buildOut(spots, trip) {
  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin
  const info = ORIGIN_INFO[trip.origin] ?? {}
  const rows = []
  let verdict = worst(...spots.map((s) => SPOT_VERDICTS[s.spotId]?.verdict ?? 'UNKNOWN'))
  let reason = spots.map((s) => SPOT_VERDICTS[s.spotId]?.reason).find(Boolean) ?? null

  rows.push(stopRow('start', originLabel, '출발', trip.departTime))
  const arrive = info.rideMin != null ? addMin(trip.departTime, info.rideMin) : null
  rows.push(legRow('bar', `시외버스 · ${info.rideMin != null ? formatDuration(info.rideMin) : `소요 시간 ${UNKNOWN}`}`))
  rows.push(stopRow('bus', '고현', '하차', arrive ?? UNKNOWN, { dim: !arrive }))
  if (!arrive) verdict = worst(verdict, 'UNKNOWN')

  const first = spots[0]
  const access = ACCESS[first.spotId]

  if (access.blocked) {
    rows.push(legRow('dots', `${access.routeNo}·${access.routeNo}-1번 우회 중`))
    rows.push(stopRow('bus', access.stop, '도착', '이용 불가', { dim: true, tone: 'no', note: reason }))
    return { verdict: 'NO', reason, rows }
  }

  const runs =
    access.routeNo === '55'
      ? BUS_55_OUT.map((r) => ({ run: r, time: r.고현, note: `${r.run}회차`, stopTime: r[access.stop] ?? null }))
      : access.trips.map((t) => ({ ...t, stopTime: null }))
  const available = runs.filter((r) => !isTime(r.time) || !arrive || toMinutes(r.time) >= toMinutes(arrive))
  const chosen = available[0] ?? null
  const wait = arrive && chosen && isTime(chosen.time) ? diffMin(arrive, chosen.time) : null
  rows.push(legRow('dots', wait != null ? `같은 터미널 · 대기 ${wait}분` : '같은 터미널'))

  if (!chosen) {
    const last = runs[runs.length - 1].time
    reason = `${access.routeNo}번 막차(${last}) 이후 고현 도착`
    rows.push(stopRow('bus', '고현', '승차', UNKNOWN, { dim: true, tone: 'no', note: reason }))
    return { verdict: 'NO', reason, rows }
  }

  rows.push(
    stopRow('bus', '고현', '승차', null, {
      trips: {
        routeNo: access.routeNo,
        items: available.slice(0, 2).map((r, i) => ({
          time: r.time,
          note: i === 0 && access.routeNo === '55' ? `${r.note} · 해금강행` : r.note,
        })),
        all: runs.length > 2 ? runs.map((r) => ({ time: r.time, note: r.note })) : null,
      },
    }),
  )

  const duration = chosen.stopTime && isTime(chosen.time) ? diffMin(chosen.time, chosen.stopTime) : null
  const passed =
    access.routeNo === '55' && chosen.run
      ? ['학동', '해금강']
          .filter((name) => name !== access.stop && chosen.run[name])
          .map((name) => ({ name, time: chosen.run[name] }))
      : []
  rows.push(
    legRow(
      'bar',
      [access.via ?? `${access.routeNo}번`, duration != null ? formatDuration(duration) : `소요 시간 ${UNKNOWN}`].join(' · '),
      { stops: duration != null && passed.length > 0 ? passed : null },
    ),
  )
  rows.push(stopRow('bus', access.stop, '하차', chosen.stopTime ?? UNKNOWN, { dim: !chosen.stopTime }))
  if (!chosen.stopTime) verdict = worst(verdict, 'UNKNOWN')
  pushShipRows(rows, access, first.shortName)

  // 다음 스팟 — 같은 55번 위라면 §2 표에서 다음 회차를 찾아 잇습니다.
  // 못 찾으면(회차가 그 정류소를 안 서거나 노선이 다르면) 미확인으로 두고,
  // 그 코스는 목록에서 빠집니다. 없는 시각을 지어내지 않습니다.
  let atStop = access.stop
  let atTime = chosen.stopTime
  for (const next of spots.slice(1)) {
    const nextAccess = ACCESS[next.spotId]
    const leg = nextAccess.routeNo === '55' ? nextLegOn55(atStop, nextAccess.stop, atTime) : null
    const ship =
      CONFIRMED_SHIP_LEG.from.includes(atStop) &&
      nextAccess.stop === CONFIRMED_SHIP_LEG.to &&
      isTime(atTime) &&
      toMinutes(atTime) <= toMinutes(CONFIRMED_SHIP_LEG.board)

    if (ship) {
      rows.push(legRow('dots', `${CONFIRMED_SHIP_LEG.pier} 선착장 이동`))
      rows.push(
        stopRow('ship', CONFIRMED_SHIP_LEG.pier, '승선', CONFIRMED_SHIP_LEG.board, {
          note: CONFIRMED_SHIP_LEG.boardNote,
        }),
      )
      rows.push(legRow('dots', CONFIRMED_SHIP_LEG.cruiseText))
      rows.push(stopRow('ship', nextAccess.stop, '하선', CONFIRMED_SHIP_LEG.arrive))
      atStop = nextAccess.stop
      atTime = CONFIRMED_SHIP_LEG.arrive
    } else if (leg) {
      rows.push(legRow('bar', `55번 · ${atStop} ${leg.board} 승차`))
      rows.push(stopRow('bus', nextAccess.stop, '하차', leg.arrive))
      atStop = nextAccess.stop
      atTime = leg.arrive
    } else {
      rows.push(legRow('dots', '이동'))
      rows.push(stopRow('bus', nextAccess.stop, '도착', UNKNOWN, { dim: true }))
      verdict = worst(verdict, 'UNKNOWN')
    }

    pushShipRows(rows, nextAccess, next.shortName)
  }

  return { verdict, reason, rows }
}

/** 오는 편: 마지막 스팟 막차 → 고현 → 출발 터미널. 귀환 시각 검사는 서버(CourseJudgeService)와 같은 문구. */
function buildBack(spots, trip) {
  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin
  const info = ORIGIN_INFO[trip.origin] ?? {}
  const last = spots[spots.length - 1]
  const access = ACCESS[last.spotId]
  const rows = []
  let verdict = 'YES'
  let reason = null
  let gohyeon = null

  if (access.stop === '해금강' || access.stop === '학동') {
    const runs = BUS_55_BACK.map((r) => ({ time: r[access.stop], note: `${r.run}회차` }))
    const lastRun = runs[runs.length - 1]
    rows.push(
      stopRow('bus', access.stop, '승차', null, {
        trips: {
          routeNo: '55',
          items: runs.slice(-2).map((r, i, arr) => ({ ...r, note: i === arr.length - 1 ? `${r.note} · 막차` : r.note })),
          all: runs,
        },
      }),
    )
    gohyeon = BUS_55_BACK_LAST_ARRIVAL
    rows.push(legRow('bar', `55번 · ${formatDuration(diffMin(lastRun.time, gohyeon))}`))
    rows.push(stopRow('bus', '고현', '하차', gohyeon))
  } else {
    rows.push(stopRow('bus', access.stop, '승차', UNKNOWN, { dim: true, note: `${access.routeNo}번 막차 ${UNKNOWN}` }))
    rows.push(legRow('dots', '이동'))
    rows.push(stopRow('bus', '고현', '하차', UNKNOWN, { dim: true }))
    verdict = 'UNKNOWN'
  }

  if (info.returnDepart) {
    const wait = gohyeon ? diffMin(gohyeon, info.returnDepart) : null
    rows.push(legRow('dots', wait != null ? `같은 터미널 · 대기 ${wait}분` : '같은 터미널'))
    rows.push(
      stopRow('bus', '고현', '승차', null, {
        trips: { routeNo: '시외', items: [{ time: info.returnDepart, note: `${originLabel}행 · ${info.returnNote}` }], all: null },
      }),
    )
  } else {
    rows.push(legRow('dots', '같은 터미널'))
    rows.push(stopRow('bus', '고현', '승차', UNKNOWN, { dim: true, note: `${originLabel}행 시간표 ${UNKNOWN}` }))
    verdict = 'UNKNOWN'
  }

  rows.push(legRow('bar', `시외버스 · ${info.rideMin != null ? formatDuration(info.rideMin) : `소요 시간 ${UNKNOWN}`}`))
  if (!info.returnArrive) verdict = worst(verdict, 'UNKNOWN')

  // 귀환 검사: 조건의 복귀 시각(막차까지 = null)보다 늦게 도착하면 불성립
  if (trip.returnBy && info.returnArrive && toMinutes(info.returnArrive) > toMinutes(trip.returnBy)) {
    verdict = 'NO'
    reason = `귀환 ${trip.returnBy} 이전 ${originLabel} 도착 불가 (도착 ${info.returnArrive})`
  }
  rows.push(
    stopRow('start', originLabel, '도착', info.returnArrive ?? UNKNOWN, {
      dim: !info.returnArrive,
      tone: verdict === 'NO' ? 'no' : undefined,
      note: reason,
    }),
  )

  return { verdict, reason, rows }
}

/* ── 추천 코스(일정 고르기 카드) ─────────────────────────────────────────── */

/** source는 사진을 얹은 목록을 넘기기 위한 자리입니다 — 코스 카드도 같은 사진을 씁니다. */
function pickSpots(spotIds, source = SPOTS) {
  if (!spotIds?.length) return source
  return spotIds.map((id) => source.find((s) => s.spotId === id)).filter(Boolean)
}

/**
 * 같은 스팟의 방문 순서 후보 두 가지. 남부 해안 스팟끼리는 해안 순서, 그 밖은 고른 순서를 첫째로 두고,
 * 둘째는 출발점을 한 칸 미룬 순서(Figma 285:67: 학동→바람의언덕→해금강 / 바람의언덕→해금강→학동).
 */
function orderings(spots) {
  if (spots.length <= 1) return [spots]
  const allSouth = spots.every((s) => SOUTH_ORDER.includes(s.spotId))
  const forward = allSouth
    ? [...spots].sort((a, b) => SOUTH_ORDER.indexOf(a.spotId) - SOUTH_ORDER.indexOf(b.spotId))
    : spots
  return [forward, [...forward.slice(1), forward[0]]]
}

/**
 * 고른 스팟 → 추천 코스 카드.
 *   ALL     전부 넣은 코스 N가지 (Figma 285:67)
 *   SUBSET  전부는 못 감 → 한 곳씩 뺀 대안 2가지 (Figma 285:148)
 * 목의 판단 규칙: 남부 55번 선상 밖 스팟이 섞인 3곳 이상은 하루에 다 못 돈다고 봅니다.
 */
function buildItineraries(picked, trip) {
  const others = picked.filter((s) => !SOUTH_ORDER.includes(s.spotId))
  const subset = picked.length >= 3 && others.length > 0
  const sets = subset
    ? [
        { spots: picked.slice(1), excluded: picked[0] },
        { spots: picked.slice(0, -1), excluded: picked[picked.length - 1] },
      ]
    : orderings(picked).map((spots) => ({ spots, excluded: null }))
  const info = ORIGIN_INFO[trip.origin] ?? {}
  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin

  const judged = sets.map(({ spots, excluded }) => {
      const out = buildOut(spots, trip)
      const back = buildBack(spots, trip)
      const last = spots[spots.length - 1]
      const lastBus = lastBusOf(last)
      const lastStopName = ACCESS[last?.spotId]?.stop ?? null
      // 지도 핀 요약의 막차 박스(Figma 240:191). 세 값이 다 있을 때만 — 지어내지 않습니다.
      const lastRide =
        lastBus && info.returnDepart && info.returnArrive
          ? {
              board: `${lastBus} ${lastStopName}발 고현행 탑승`,
              arrive: `고현 ${BUS_55_BACK_LAST_ARRIVAL} 도착 · ${originLabel}행 ${info.returnDepart}~${info.returnArrive}`,
            }
          : null
      return {
        excludedSpotId: excluded?.spotId ?? null,
        excludedName: excluded?.shortName ?? null,
        name: spots.map((s) => s.shortName).join(' · '),
        spotIds: spots.map((s) => s.spotId),
        verdict: worst(out.verdict, back.verdict),
        reason: out.reason ?? back.reason ?? null,
        departTime: trip.departTime,
        arriveTime: info.returnArrive ?? null,
        lastBus,
        lastStopName,
        lastRide,
      }
  })

  // 성립한 코스만 내보냅니다(2026-09-10 결정 — 사용자 경험).
  // 미확인은 목록에서 빠지고, 남는 게 없으면 화면이 '안내할 코스가 없어요'를 띄웁니다.
  // routeId는 거르고 난 뒤에 매깁니다 — 번호에 구멍이 생기면 /verdict/:routeId가 어긋납니다.
  return {
    state: subset ? 'SUBSET' : 'ALL',
    routes: judged
      .filter((route) => route.verdict === 'YES')
      .map((route, index) => ({
        ...route,
        routeId: index + 1,
        rank: index + 1,
        recommended: !subset && index === 0,
      })),
  }
}

/**
 * 홈의 "오늘 버스로 되는 코스" — 미리 만들어둔 큐레이션 코스입니다.
 * 사용자가 고른 스팟으로 짜는 routes와 달리, 조건만 있으면 바로 보여줍니다.
 *
 * [백엔드와 맞출 것] Figma의 CourseCard2는 스팟이 여러 개일 때 카드 둘째 줄에
 * "● 바람의언덕 · ● 학동몽돌해변"처럼 **스팟별 판정**을 찍으라고 돼 있어서,
 * 코스 안 스팟의 이름과 verdict가 필요합니다. 지금은 목에만 넣어뒀고, 명세에 추가해야 합니다.
 */
const COURSES = [
  {
    courseId: 1,
    name: '부산발 당일치기 · 해금강',
    shortName: '해금강',
    theme: 'VIEW',
    region: '남부권',
    thumbnailUrl: null,
    spotIds: [1],
    spots: [{ spotId: 1, shortName: '해금강' }],
  },
  {
    // 기준문서 §3 '성립 확인된 코스' 1번 — 이 서비스의 대표 사례입니다.
    courseId: 2,
    name: '바람의언덕 · 해금강',
    shortName: '바람의언덕',
    theme: 'VIEW',
    region: '남부권',
    thumbnailUrl: null,
    spotIds: [2, 1],
    spots: [
      { spotId: 2, shortName: '바람의언덕' },
      { spotId: 1, shortName: '해금강' },
    ],
  },
  {
    courseId: 3,
    name: '학동 · 해금강',
    shortName: '학동',
    theme: 'BEACH',
    region: '남부권',
    thumbnailUrl: null,
    spotIds: [7, 1],
    spots: [
      { spotId: 7, shortName: '학동' },
      { spotId: 1, shortName: '해금강' },
    ],
  },
  {
    courseId: 4,
    name: '학동 흑진주몽돌',
    shortName: '학동',
    theme: 'BEACH',
    region: '남부권',
    thumbnailUrl: null,
    spotIds: [7],
    spots: [{ spotId: 7, shortName: '학동' }],
  },
]

/**
 * 큐레이션 코스도 **일정 고르기와 같은 경로**로 판정합니다.
 *
 * 전에는 코스에 판정을 따로 적어두고 스팟 판정으로 계산했는데, 그러면 같은 조합에
 * 홈은 성립 · 일정 고르기는 미확인이라는 서로 다른 답이 나왔습니다. 출처는 하나여야
 * 합니다. 백엔드가 붙으면 이 자리는 POST /api/courses/{id}/judge로 바뀝니다.
 */
function judgeCourse(course, trip) {
  const spots = course.spotIds.map((id) => SPOTS.find((spot) => spot.spotId === id)).filter(Boolean)
  const out = buildOut(spots, trip)
  const back = buildBack(spots, trip)
  const last = spots[spots.length - 1]
  return {
    ...course,
    spots: course.spots.map((entry) => ({
      ...entry,
      verdict: SPOT_VERDICTS[entry.spotId]?.verdict ?? 'UNKNOWN',
    })),
    verdict: worst(out.verdict, back.verdict),
    reason: out.reason ?? back.reason ?? null,
    summary: `${trip.departTime} 출발 · 돌아오는 막차 ${lastBusOf(last) ?? UNKNOWN}`,
  }
}

const MOCK_DELAY_MS = 250
const SOURCE = { source: '거제시 BIS 원문', baseDate: '2026-08-18' }
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

/**
 * 조건 없이 지도만 둘러보는 경우 — 스팟 목록만 돌려줍니다.
 * 판정을 안 했으므로 verdict가 없고, 마커도 판정색을 쓰지 않습니다.
 */
/**
 * 목 스팟에 서버 사진을 얹습니다.
 *
 * 스팟의 정체(spotId·분류·좌표)는 아직 목이 쥐고 있습니다 — 판정·코스 조립이 전부 그
 * spotId에 묶여 있어서, 서버 poi_id로 갈아끼우면 화면이 통째로 흔들립니다. 사진만 먼저
 * 서버 것으로 바꿉니다. 사진이 없는 스팟은 손대지 않아 기존 자리 그림이 그대로 남습니다.
 */
async function withPhotos(spots) {
  const images = await loadSpotImages()
  if (images.size === 0) return spots

  return spots.map((spot) => {
    const url = images.get(spot.spotId)
    return url ? { ...spot, thumbnailUrl: url } : spot
  })
}

// eslint-disable-next-line no-unused-vars
export async function fetchSpots({ theme, q } = {}) {
  // const query = new URLSearchParams({ ...(theme && { theme }), ...(q && { q }) })
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/spots?${query}`)
  // if (!res.ok) throw new Error(`스팟을 불러오지 못했습니다 (${res.status})`)
  // return res.json()

  const spots = await withPhotos(SPOTS)
  return { spots: theme ? spots.filter((spot) => spot.theme === theme) : spots, ...SOURCE }
}

/**
 * 스팟을 고르고 넘어온 경우 — 고른 스팟 + 그 조합으로 짠 추천 코스.
 * spotIds가 비어 있으면 전부 고른 것으로 칩니다.
 */
export async function fetchPlan({ spotIds, ...trip }) {
  // const query = new URLSearchParams({
  //   origin, date, departTime, returnBy, spots: spotIds.join(','),
  // })
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/routes?${query}`)
  // if (!res.ok) throw new Error(`판정에 실패했습니다 (${res.status})`)
  // return res.json()

  const withImages = await withPhotos(SPOTS)
  const picked = pickSpots(spotIds, withImages)
  const info = ORIGIN_INFO[trip.origin] ?? {}
  return {
    arrivalTime: info.rideMin != null ? addMin(trip.departTime, info.rideMin) : null,
    // 지도 진입 태그 '⚑ 부산서부에서 1시간 20분'. 소요 시간을 모르는 터미널은 태그를 띄우지 않습니다.
    entry: { originLabel: ORIGIN_LABELS[trip.origin] ?? trip.origin, rideMin: info.rideMin ?? null },
    // 지도는 고르지 않은 스팟도 아이콘 핀으로 계속 보여줍니다(Figma 285:208).
    // 무엇을 골랐는지는 routes[].spotIds가 말합니다.
    pickedSpotIds: picked.map((spot) => spot.spotId),
    spots: withImages.map((spot) => ({ ...spot, ...SPOT_VERDICTS[spot.spotId] })),
    ...buildItineraries(picked, trip),
    ...SOURCE,
  }
}

/**
 * 판정 결과 — 코스 하나의 가는 편·오는 편 타임라인. 코스 번호는 같은 스팟·조건이면 같습니다.
 */
export async function fetchVerdict({ routeId, spotIds, ...trip }) {
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/courses/${routeId}/judge`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ date, arrivalTime, returnTime }),
  // })
  // if (!res.ok) throw new Error(`판정에 실패했습니다 (${res.status})`)
  // return adaptJudgeRes(await res.json())

  await delay()
  const picked = pickSpots(spotIds)
  const { routes } = buildItineraries(picked, trip)
  const route = routes.find((r) => r.routeId === Number(routeId))
  if (!route) throw new Error('코스를 찾을 수 없습니다')

  const spots = route.spotIds.map((id) => ({ ...SPOTS.find((s) => s.spotId === id), ...SPOT_VERDICTS[id] }))
  const out = buildOut(spots, trip)
  const back = buildBack(spots, trip)
  const info = ORIGIN_INFO[trip.origin] ?? {}
  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin

  const shipSpot = spots.find((s) => ACCESS[s.spotId].ship)
  const firstAccess = ACCESS[spots[0].spotId]
  const lastAccess = ACCESS[spots[spots.length - 1].spotId]
  const modes = [
    { kind: 'bus', label: '시외', dim: false },
    { kind: 'bus', label: firstAccess.routeNo, dim: false },
    ...(shipSpot ? [{ kind: 'ship', label: ACCESS[shipSpot.spotId].ship.name, dim: true }] : []),
    { kind: 'bus', label: lastAccess.stop === '해금강' || lastAccess.stop === '학동' ? '55' : lastAccess.routeNo, dim: false },
    { kind: 'bus', label: '시외', dim: false },
  ]

  const unknownReason = spots.map((s) => SPOT_VERDICTS[s.spotId]?.reason).find(Boolean) ?? null
  const check = shipSpot
    ? {
        text: `${ACCESS[shipSpot.spotId].ship.name} 출항 시각은 당일 확인`,
        link: { label: '운항 캘린더 ›', href: ACCESS[shipSpot.spotId].ship.href },
      }
    : worst(out.verdict, back.verdict) === 'UNKNOWN'
      ? { text: unknownReason ?? '시각을 확인하지 못한 구간이 있어요', link: null }
      : null

  return {
    route: { ...route, verdict: worst(out.verdict, back.verdict), reason: out.reason ?? back.reason ?? route.reason },
    spots,
    summary: {
      totalMin: info.returnArrive ? diffMin(trip.departTime, info.returnArrive) : null,
      departTime: trip.departTime,
      arriveTime: info.returnArrive ?? null,
      legCount: modes.length,
      lastReturnBus: route.lastBus,
      modes,
      check,
    },
    directions: { out, back },
    arrival: { time: info.returnArrive ?? null, originLabel },
    ...SOURCE,
  }
}

/** 자리표시자 화면들이 이름 정도는 보여줄 수 있게 열어둔 조회용 헬퍼입니다. */
/**
 * 스팟 상세 — 이름·분류는 목에서, 소개(overview)와 사진은 **서버 실호출**로 받습니다.
 *
 * TourAPI overview는 런타임 호출값이라 목에 넣을 수 없습니다(원문 수정 금지 · 저작권).
 * 서버가 아직 안 떠 있으면 소개·사진 없이 이름과 분류만 나옵니다 — 지어내지 않습니다.
 * 서버 응답은 PoiController.PoiDetailRes 모양입니다.
 */
export async function fetchSpotDetail(spotId) {
  const base = findMockSpot(spotId)
  if (!base) return null

  // 서버가 없거나 그 스팟을 모를 때 그리는 모양. 지어내지 않고 비웁니다.
  const withoutServer = {
    ...base,
    overview: null,
    overviewSource: null,
    photos: [],
    checkUrl: null,
    lastDeparture: null,
  }

  try {
    // spotId를 poi_id로 넘기면 안 됩니다 — 두 번호는 서로 다릅니다(poiIndex 참고).
    const poiId = await resolvePoiId(spotId)
    if (poiId == null) return withoutServer

    const data = await api.poi(poiId)
    // detail.source가 'TourAPI'가 아니면 자체 소개문(intro_text) 폴백입니다 —
    // 그때는 '출처 TourAPI' 칩을 달면 안 됩니다.
    const detail = data.detail ?? {}
    // detail.images는 대표 사진이 첫 장이고 저작권(Type3)은 서버가 이미 걸렀습니다.
    // imageUrl 폴백은 클라이언트가 서버보다 먼저 배포됐을 때를 위한 것입니다.
    const images = Array.isArray(detail.images) ? detail.images.filter(Boolean) : []
    return {
      ...base,
      overview: detail.overview ?? null,
      overviewSource: detail.source ?? null,
      photos: images.length > 0 ? images : detail.imageUrl ? [detail.imageUrl] : [],
      checkUrl: data.checkUrl ?? null,
      lastDeparture: data.lastDeparture ?? null,
    }
  } catch {
    // 서버가 없거나 TourAPI가 실패해도 화면은 떠야 합니다(비로그인 판정과 같은 원칙).
    return withoutServer
  }
}

export function findMockSpot(spotId) {
  const spot = SPOTS.find((item) => item.spotId === spotId)
  return spot ? { ...spot, ...SPOT_VERDICTS[spot.spotId] } : null
}

/**
 * 홈 — 오늘 되는 코스. 스팟을 고르기 전이라 조건만으로 판정합니다.
 * 홈은 조건이 항상 기본값으로라도 있으므로 조건 없이 부르는 경우는 없습니다.
 */
export async function fetchCourses({ origin, date, departTime, returnBy, limit = 6 } = {}) {
  // const query = new URLSearchParams({ origin, date, departTime, returnBy, limit })
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/courses?${query}`)
  // if (!res.ok) throw new Error(`코스를 불러오지 못했습니다 (${res.status})`)
  // return res.json()

  // 성립만 내보냅니다(2026-09-10 결정). 미확인 코스는 목록에서 뺍니다 —
  // 매미성 하차 정류소·거제식물원 운영 재개는 기준문서 §9 미해결이라, 확인되면 다시 나타납니다.
  const images = await loadSpotImages()
  const trip = { origin, date, departTime, returnBy }
  const courses = COURSES.map((course) => judgeCourse(course, trip))
    .filter((course) => course.verdict === 'YES')
    // 코스 썸네일은 첫 스팟의 사진을 씁니다. 코스 자체의 사진은 원천이 없습니다
    // (courses.thumbnail_url은 스키마에 있으나 비어 있습니다).
    .map((course) => {
      const url = course.spotIds?.map((id) => images.get(id)).find(Boolean)
      return url ? { ...course, thumbnailUrl: url } : course
    })
  return { courses: courses.slice(0, limit), ...SOURCE }
}
