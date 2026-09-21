import { afterEach, describe, expect, it, vi } from 'vitest'
import { kstToday, summarizeToday } from './todayGeoje'

/**
 * 「오늘의 거제」(2026-09-21) — 몽꾸 안내 시트의 오늘 카드. 값은 전부 API 응답에서만 나온다(절대규칙 1).
 * 호출이 실패한 자리는 UNKNOWN 이지 「없음」이 아니다(절대규칙 3 — 실패를 빈 사실로 바꾸지 않는다).
 */

const TODAY = '2026-09-21'

/** 배 응답 한 벌. 기본은 도장포 선착장(코스가 쓰는 곳)이고 next · rows 만 갈아 끼운다. */
function ferriesRes({ next = [], rows = [], dockCode = 'DOJANGPO', shortName = '도장포' } = {}) {
  return {
    poiId: 5,
    shortName: '외도보타니아',
    asOf: { date: TODAY, time: '12:30', zone: 'Asia/Seoul' },
    days: 1,
    ferries: [
      {
        key: `DESTINATION:${dockCode}`,
        relation: 'DESTINATION',
        landingOnly: true,
        dock: { dockCode, operatorName: '도장포유람선', shortName, address: '경남 거제시 남부면 도장포1길 55' },
        courses: [{ courseId: 1, landsOnOedo: true, legendLabel: '외도상륙+해금강선상관광', totalMin: 160 }],
        next,
        rows,
      },
    ],
  }
}

/** 운영 실데이터(디자인브리프 §4) — 같은 이유의 우회 알림 둘. reason 은 원문이라 글자 그대로 둔다. */
const DETOUR_REASON = '도로 유실로 명사해수욕장앞 우회 중 (53·53-1 해당 구간 이용 불가)'
const PROD_ALERTS = {
  alerts: [
    { kind: 'DETOUR', stop: '명사', route: null, dateFrom: '2026-09-05', dateTo: null, reason: DETOUR_REASON },
    { kind: 'DETOUR', stop: '홍포', route: null, dateFrom: '2026-09-05', dateTo: null, reason: DETOUR_REASON },
  ],
}

const EMPTY = { southRoute: null, alerts: null, ferries: null, meta: null }

describe('summarizeToday — 요일과 남부면 버스 (남부1 시간표 사실로 말한다)', () => {
  it('평일에 회차가 있으면 WEEKDAY · 버스 있음', () => {
    const { day } = summarizeToday({ ...EMPTY, southRoute: { routeNo: '남부1', date: TODAY, dayClass: 'WEEKDAY', trips: [{ direction: 0 }, { direction: 0 }] } })
    expect(day).toEqual({ kind: 'WEEKDAY', southBusRuns: true })
  })

  it('휴일에 회차가 0이면 HOLIDAY · 버스 없음 — 「휴일 ⇒ 운휴」 규칙이 아니라 그날 시간표가 빈 사실이다', () => {
    const { day } = summarizeToday({ ...EMPTY, southRoute: { routeNo: '남부1', date: TODAY, dayClass: 'HOLIDAY', trips: [] } })
    expect(day).toEqual({ kind: 'HOLIDAY', southBusRuns: false })
  })

  it('시간표 호출이 실패했으면 UNKNOWN — 「버스 없음」으로 바꾸지 않는다', () => {
    expect(summarizeToday(EMPTY).day).toEqual({ kind: 'UNKNOWN', southBusRuns: null })
  })
})

describe('summarizeToday — 운영상태', () => {
  it('알림이 하나도 없으면 NONE', () => {
    expect(summarizeToday({ ...EMPTY, alerts: { alerts: [] } }).alerts).toEqual({ kind: 'NONE' })
  })

  it('같은 종류 · 같은 이유는 한 항목으로 묶고 대상은 원래 순서 — 운영의 명사 · 홍포 우회', () => {
    expect(summarizeToday({ ...EMPTY, alerts: PROD_ALERTS }).alerts).toEqual({
      kind: 'SOME',
      items: [{ kind: 'DETOUR', targets: ['명사', '홍포'], reason: DETOUR_REASON }],
    })
  })

  it('사이에 다른 알림이 끼어도 종류 · 이유가 같으면 같은 항목이고, 노선 대상은 route 를 쓴다', () => {
    const alerts = {
      alerts: [
        PROD_ALERTS.alerts[0],
        { kind: 'SUSPENSION', stop: null, route: '남부1', dateFrom: TODAY, dateTo: TODAY, reason: '침수로 운행 불가' },
        PROD_ALERTS.alerts[1],
      ],
    }
    expect(summarizeToday({ ...EMPTY, alerts }).alerts).toEqual({
      kind: 'SOME',
      items: [
        { kind: 'DETOUR', targets: ['명사', '홍포'], reason: DETOUR_REASON },
        { kind: 'SUSPENSION', targets: ['남부1'], reason: '침수로 운행 불가' },
      ],
    })
  })

  it('호출이 실패했으면 UNKNOWN — 「알림 없음」으로 바꾸지 않는다', () => {
    expect(summarizeToday(EMPTY).alerts).toEqual({ kind: 'UNKNOWN' })
  })
})

describe('summarizeToday — 도장포 선착장의 오늘 배', () => {
  it('오늘 날짜의 next 가 있으면 NEXT — 뒷날 편이 앞에 있어도 오늘이 아니라 건너뛴다', () => {
    const ferries = ferriesRes({
      next: [
        { courseId: 1, date: '2026-09-22', depart: '09:00', returnApprox: '11:40' },
        { courseId: 1, date: TODAY, depart: '14:00', returnApprox: '16:40' },
        { courseId: 1, date: TODAY, depart: '15:10', returnApprox: '17:50' },
      ],
      rows: [{ date: TODAY, status: 'PUBLISHED', sailings: [{ depart: '10:30', courseId: 1, returnApprox: '13:10' }] }],
    })
    expect(summarizeToday({ ...EMPTY, ferries }).ferry).toEqual({ kind: 'NEXT', dock: '도장포', depart: '14:00', returnApprox: '16:40' })
  })

  it('오늘 편이 공개돼 있는데 next 에 오늘이 없으면 ALL_GONE — 다 떠났다', () => {
    const ferries = ferriesRes({
      next: [{ courseId: 1, date: '2026-09-22', depart: '09:00', returnApprox: '11:40' }],
      rows: [{ date: TODAY, status: 'PUBLISHED', sailings: [{ depart: '10:30', courseId: 1, returnApprox: '13:10' }] }],
    })
    expect(summarizeToday({ ...EMPTY, ferries }).ferry).toEqual({ kind: 'ALL_GONE', dock: '도장포' })
  })

  it('원문이 오늘을 공개했는데 편이 0이면 NONE_TODAY', () => {
    const ferries = ferriesRes({ rows: [{ date: TODAY, status: 'PUBLISHED', sailings: [] }] })
    expect(summarizeToday({ ...EMPTY, ferries }).ferry).toEqual({ kind: 'NONE_TODAY', dock: '도장포' })
  })

  it.each(['UNPUBLISHED', 'NOT_COLLECTED'])('오늘 줄이 %s 면 UNPUBLISHED — 시각 미확인이지 운행 없음이 아니다', (status) => {
    const ferries = ferriesRes({ rows: [{ date: TODAY, status, sailings: [] }] })
    expect(summarizeToday({ ...EMPTY, ferries }).ferry).toEqual({ kind: 'UNPUBLISHED', dock: '도장포' })
  })

  it('도장포 선착장이 응답에 없으면 UNKNOWN', () => {
    const ferries = ferriesRes({ dockCode: 'WAHYEON', shortName: '와현', rows: [{ date: TODAY, status: 'PUBLISHED', sailings: [] }] })
    expect(summarizeToday({ ...EMPTY, ferries }).ferry).toEqual({ kind: 'UNKNOWN' })
  })

  it('오늘 날짜 줄이 없으면 UNKNOWN', () => {
    const ferries = ferriesRes({ rows: [{ date: '2026-09-22', status: 'PUBLISHED', sailings: [] }] })
    expect(summarizeToday({ ...EMPTY, ferries }).ferry).toEqual({ kind: 'UNKNOWN' })
  })

  it('호출이 실패했으면 UNKNOWN', () => {
    expect(summarizeToday(EMPTY).ferry).toEqual({ kind: 'UNKNOWN' })
  })
})

describe('summarizeToday — 출처', () => {
  it('메타가 있으면 dataVersion, 없으면 null', () => {
    expect(summarizeToday({ ...EMPTY, meta: { ok: true, dataVersion: '2026-08-18', sessionKey: 'temporary' } }).source).toEqual({ dataVersion: '2026-08-18' })
    expect(summarizeToday(EMPTY).source).toEqual({ dataVersion: null })
  })
})

describe('kstToday — 한국 시간 기준 오늘', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('UTC 로는 전날 밤이어도 한국은 다음 날이다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T15:30:00Z'))
    expect(kstToday()).toBe('2026-09-22')
  })
})
