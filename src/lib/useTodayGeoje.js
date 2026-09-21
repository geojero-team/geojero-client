import { useEffect, useState } from 'react'
import { api } from './api'
import { kstToday, summarizeToday } from './todayGeoje'

/**
 * 「오늘의 거제」(2026-09-21) — 몽꾸 안내 시트가 **열릴 때** 오늘의 사실 넷을 한꺼번에 묻습니다.
 *
 *   · 남부1 시간표(요일 · 남부면 마을버스가 오늘 도는가) · 운영상태 · 외도보타니아 배(도장포 선착장 오늘 하루) · 메타(원문 시점)
 *
 * **allSettled** 입니다 — 하나가 죽어도 나머지는 그립니다(기준문서 §6 「장애가 조회를 막지 않는다」).
 * 실패한 호출은 null 로 넘겨 그 줄만 UNKNOWN 이 됩니다(절대규칙 3 — 실패를 「없음」으로 바꾸지 않습니다).
 *
 * 열 때마다 다시 묻습니다 — 다음 배는 하루 안에 바뀝니다. 닫힌 뒤(또는 화면을 떠난 뒤)에 오는 답은 버립니다.
 *
 * 상태는 답이 왔을 때만 바꿉니다 — 이펙트 본문에서 「불러오는 중」을 setState 로 박으면 연쇄 렌더가 됩니다
 * (react-hooks/set-state-in-effect · fitOneLine 과 같은 이유). 그래서 「불러오는 중」은 `open` 인데 답이 없는 상태로 읽습니다.
 *
 * @param open 시트가 열려 있는가
 * @returns { status: 'idle' | 'loading' | 'ready', date: 'YYYY-MM-DD' | null, summary: summarizeToday 결과 | null }
 */
export function useTodayGeoje(open) {
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    const date = kstToday()
    Promise.allSettled([
      api.routeTimetable(SOUTH_ROUTE, date),
      api.alerts(date),
      api.spotFerries(OEDO_POI_ID, { date, days: 1 }),
      api.meta(),
    ]).then(([southRoute, alerts, ferries, meta]) => {
      if (cancelled) return
      setResult({
        date,
        summary: summarizeToday({
          southRoute: valueOf(southRoute),
          alerts: valueOf(alerts),
          ferries: valueOf(ferries),
          meta: valueOf(meta),
        }),
      })
    })
    return () => {
      cancelled = true
      // 닫으면 비웁니다 — 다음에 열 때 옛 답이 「준비됨」으로 한 번 비쳤다가 바뀌지 않게.
      setResult(null)
    }
  }, [open])

  if (!open) return IDLE
  return result ? { status: 'ready', date: result.date, summary: result.summary } : LOADING
}

/** 남부면 마을버스 — 휴일 전면 운휴(기준문서 §2). 이 노선의 그날 회차 수가 곧 「오늘 남부면 버스가 도는가」입니다. */
const SOUTH_ROUTE = '남부1'
/** 외도보타니아 — 배로만 가는 스팟(기준문서 §6 「유람선 시간표」). 배 응답은 이 스팟에 선착장 넷이 전부 들어 있습니다. */
const OEDO_POI_ID = 5

const IDLE = { status: 'idle', date: null, summary: null }
const LOADING = { status: 'loading', date: null, summary: null }

/** allSettled 한 칸 → 값 또는 null(실패). */
const valueOf = (settled) => (settled.status === 'fulfilled' ? settled.value : null)
