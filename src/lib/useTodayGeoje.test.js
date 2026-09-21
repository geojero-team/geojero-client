import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { useTodayGeoje } from './useTodayGeoje'

vi.mock('./api', () => ({
  api: { routeTimetable: vi.fn(), alerts: vi.fn(), spotFerries: vi.fn(), meta: vi.fn() },
}))

// 오늘을 못박습니다 — 가짜 타이머는 waitFor 와 부딪혀서 kstToday 만 바꿉니다. summarizeToday 는 진짜를 씁니다.
vi.mock('./todayGeoje', async (importOriginal) => ({
  ...(await importOriginal()),
  kstToday: vi.fn(() => '2026-09-21'),
}))

const TODAY = '2026-09-21'

const SOUTH_WEEKDAY = { routeNo: '남부1', date: TODAY, dayClass: 'WEEKDAY', trips: [{ direction: 0 }] }
const NO_ALERTS = { alerts: [] }
const FERRIES = {
  asOf: { date: TODAY, time: '12:30', zone: 'Asia/Seoul' },
  ferries: [
    {
      relation: 'DESTINATION',
      dock: { dockCode: 'DOJANGPO', shortName: '도장포' },
      next: [{ courseId: 1, date: TODAY, depart: '14:00', returnApprox: '16:40' }],
      rows: [{ date: TODAY, status: 'PUBLISHED', sailings: [{ depart: '14:00', courseId: 1, returnApprox: '16:40' }] }],
    },
  ],
}
const META = { ok: true, dataVersion: '2026-08-18', sessionKey: 'temporary' }

/** 밖에서 끝내는 약속 — 닫힌 뒤에 오는 답을 흉내 냅니다. */
function deferred() {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function mockAllOk() {
  api.routeTimetable.mockResolvedValue(SOUTH_WEEKDAY)
  api.alerts.mockResolvedValue(NO_ALERTS)
  api.spotFerries.mockResolvedValue(FERRIES)
  api.meta.mockResolvedValue(META)
}

describe('useTodayGeoje — 몽꾸 안내 시트가 열릴 때만 오늘의 사실 넷을 한꺼번에 묻는다(2026-09-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('닫혀 있으면 아무것도 부르지 않고 idle 이다', () => {
    const { result } = renderHook(() => useTodayGeoje(false))

    expect(result.current).toEqual({ status: 'idle', date: null, summary: null })
    expect(api.routeTimetable).not.toHaveBeenCalled()
    expect(api.alerts).not.toHaveBeenCalled()
    expect(api.spotFerries).not.toHaveBeenCalled()
    expect(api.meta).not.toHaveBeenCalled()
  })

  it('열리면 남부1 시간표 · 운영상태 · 외도 배(오늘 하루) · 메타를 오늘 날짜로 부르고 ready 가 된다', async () => {
    mockAllOk()
    const { result } = renderHook(() => useTodayGeoje(true))

    expect(result.current.status).toBe('loading')
    expect(api.routeTimetable).toHaveBeenCalledWith('남부1', TODAY)
    expect(api.alerts).toHaveBeenCalledWith(TODAY)
    expect(api.spotFerries).toHaveBeenCalledWith(5, { date: TODAY, days: 1 })
    expect(api.meta).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.date).toBe(TODAY)
    expect(result.current.summary).toEqual({
      day: { kind: 'WEEKDAY', southBusRuns: true },
      alerts: { kind: 'NONE' },
      ferry: { kind: 'NEXT', dock: '도장포', depart: '14:00', returnApprox: '16:40' },
      source: { dataVersion: '2026-08-18' },
    })
  })

  it('한 호출이 실패해도 나머지 줄은 채워지고 그 줄만 UNKNOWN 이다 — 실패를 「없음」으로 바꾸지 않는다', async () => {
    mockAllOk()
    api.alerts.mockRejectedValue(new Error('서버에 연결하지 못했습니다'))
    const { result } = renderHook(() => useTodayGeoje(true))

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.summary.alerts).toEqual({ kind: 'UNKNOWN' })
    expect(result.current.summary.day).toEqual({ kind: 'WEEKDAY', southBusRuns: true })
    expect(result.current.summary.ferry.kind).toBe('NEXT')
    expect(result.current.summary.source.dataVersion).toBe('2026-08-18')
  })

  it('닫았다 다시 열면 다시 묻는다 — 다음 배는 하루 안에 바뀐다', async () => {
    mockAllOk()
    const { result, rerender } = renderHook(({ open }) => useTodayGeoje(open), { initialProps: { open: true } })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ open: false })
    expect(result.current).toEqual({ status: 'idle', date: null, summary: null })

    rerender({ open: true })
    expect(result.current.status).toBe('loading')
    expect(api.meta).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('닫힌 뒤에 도착한 답은 버린다', async () => {
    mockAllOk()
    const late = deferred()
    api.meta.mockReturnValue(late.promise)
    const { result, rerender } = renderHook(({ open }) => useTodayGeoje(open), { initialProps: { open: true } })
    expect(result.current.status).toBe('loading')

    rerender({ open: false })
    await act(async () => {
      late.resolve(META)
    })

    expect(result.current).toEqual({ status: 'idle', date: null, summary: null })
  })
})
