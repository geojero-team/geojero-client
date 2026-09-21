/**
 * 「오늘의 거제」(2026-09-21) — 몽꾸 안내 시트의 오늘 카드에 들어갈 사실을 API 응답에서만 뽑습니다.
 *
 * 순수 함수입니다 — fetch · React 없음. 호출은 `useTodayGeoje` 가 하고, 여기는 받은 응답을 화면이 그릴 모양으로 접습니다.
 *
 * 두 규칙이 이 파일의 이유입니다:
 *   · 절대규칙 1 — 값은 전부 응답에서. 요일도 「휴일 ⇒ 남부면 운휴」를 코드에 박지 않고 남부1 시간표의 회차 수로 말합니다.
 *   · 절대규칙 3 — 호출이 실패한 자리는 UNKNOWN 입니다. 「알림 없음」 · 「버스 없음」 · 「배 없음」으로 바꾸면
 *     기준문서 §4 에서 비판한 「이유 없는 빈칸」을 우리가 하는 것입니다.
 */

/** 코스가 쓰는 선착장 — 바람의언덕 「도보 1분」(원문 인용) · 코스 3-11 의 배 구간(부록 H 「09-16」). */
const COURSE_DOCK = 'DOJANGPO'

/**
 * 한국 시간 기준 오늘(`YYYY-MM-DD`). 서버가 이 날짜로 요일을 가르고 배 응답의 asOf 도 Asia/Seoul 입니다 —
 * 기기 시간대를 따르면 해외에서 여행 전에 볼 때 하루가 어긋납니다(SpotTimetablePage 의 today() 와 같은 방식 · 2026-09-14 리뷰).
 * 그 함수는 페이지 안 비공개라 여기 다시 둡니다.
 */
export function kstToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** 남부1 시간표 → 요일 · 그날 남부면 마을버스가 도는가. 회차 0 이 곧 「안 돈다」(원문 사실)입니다. */
function summarizeDay(southRoute) {
  if (!southRoute) return { kind: 'UNKNOWN', southBusRuns: null }
  const trips = Array.isArray(southRoute.trips) ? southRoute.trips : null
  return {
    kind: southRoute.dayClass === 'WEEKDAY' || southRoute.dayClass === 'HOLIDAY' ? southRoute.dayClass : 'UNKNOWN',
    southBusRuns: trips ? trips.length > 0 : null,
  }
}

/**
 * 알림 → 종류 · 이유가 같은 것끼리 한 항목(대상은 원래 순서). 운영의 명사 · 홍포 우회는 이유가 글자까지 같아
 * 두 줄이 아니라 「명사 · 홍포 우회」 한 줄이 맞습니다. reason 은 원문이라 손대지 않습니다.
 */
function summarizeAlerts(alerts) {
  if (!alerts) return { kind: 'UNKNOWN' }
  const list = Array.isArray(alerts.alerts) ? alerts.alerts : []
  if (list.length === 0) return { kind: 'NONE' }

  const items = []
  for (const alert of list) {
    const same = items.find((item) => item.kind === alert.kind && item.reason === alert.reason)
    const target = alert.stop ?? alert.route
    if (same) same.targets.push(target)
    else items.push({ kind: alert.kind, targets: [target], reason: alert.reason })
  }
  return { kind: 'SOME', items }
}

/**
 * 도장포 선착장의 오늘 배. next 에는 뒷날 편도 오므로 **asOf 날짜와 같은 편**만 오늘입니다.
 * 오늘 편이 next 에 없을 때 그 이유는 rows 의 오늘 줄이 말합니다 —
 *   PUBLISHED + 편 있음 → 다 떠났다 / PUBLISHED + 0편 → 오늘 예정된 배 없음 /
 *   UNPUBLISHED · NOT_COLLECTED → 원문이 아직 안 올린 날(시각 미확인 — 「운행 없음」이 아닙니다, 부록 G).
 */
function summarizeFerry(ferries) {
  const today = ferries?.asOf?.date
  const ferry = ferries?.ferries?.find((f) => f.dock?.dockCode === COURSE_DOCK)
  if (!today || !ferry) return { kind: 'UNKNOWN' }

  const dock = ferry.dock.shortName
  const next = (ferry.next ?? []).find((n) => n.date === today)
  if (next) return { kind: 'NEXT', dock, depart: next.depart, returnApprox: next.returnApprox }

  const row = (ferry.rows ?? []).find((r) => r.date === today)
  if (!row) return { kind: 'UNKNOWN' }
  if (row.status === 'PUBLISHED') {
    return { kind: (row.sailings ?? []).length > 0 ? 'ALL_GONE' : 'NONE_TODAY', dock }
  }
  return { kind: 'UNPUBLISHED', dock }
}

/**
 * @param southRoute  GET /api/routes/남부1/timetable?date=오늘 응답, 실패면 null
 * @param alerts      GET /api/alerts?date=오늘 응답, 실패면 null
 * @param ferries     GET /api/pois/5/ferries?date=오늘&days=1 응답(poi 5 = 외도보타니아), 실패면 null
 * @param meta        GET /api/meta 응답, 실패면 null
 */
export function summarizeToday({ southRoute, alerts, ferries, meta }) {
  return {
    day: summarizeDay(southRoute),
    alerts: summarizeAlerts(alerts),
    ferry: summarizeFerry(ferries),
    source: { dataVersion: meta?.dataVersion ?? null },
  }
}
