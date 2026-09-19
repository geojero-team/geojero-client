import { describe, expect, it } from 'vitest'
import { splitHours } from './openHours'

/** 맛집 12곳의 TourAPI 영업시간 원문(opentimefood, 2026-09-19 운영 응답) — 모양이 셋이다: 한 줄 · 괄호 · 「-」 줄 목록. */
describe('영업시간 원문을 본 시간 한 줄 + 나머지로 나눈다', () => {
  it('한 줄뿐이면 나머지가 없다', () => {
    expect(splitHours('08:00~17:00')).toEqual({ main: '08:00~17:00', details: [] })
  })

  it('괄호 안은 나머지로 뺀다 — 글자는 그대로', () => {
    expect(splitHours('11:00~20:30 (라스트오더 20:00)')).toEqual({ main: '11:00~20:30', details: ['라스트오더 20:00'] })
    expect(splitHours('10:00~17:00 (준비시간 14:00~15:00)')).toEqual({ main: '10:00~17:00', details: ['준비시간 14:00~15:00'] })
  })

  it('「-」 줄 목록은 첫 줄이 본 시간, 나머지 줄이 나머지 — 앞의 「-」만 걷는다', () => {
    expect(splitHours('- 10:30~20:30\n- 준비시간 15:00~17:00\n- 마지막 주문 20:00')).toEqual({
      main: '10:30~20:30',
      details: ['준비시간 15:00~17:00', '마지막 주문 20:00'],
    })
    // 첫 줄에 띄어쓰기가 없는 「-10:00~21:00」(한꼬막두꼬막)
    expect(splitHours('-10:00~21:00\n- 준비시간 16:00~17:00\n- 마지막 주문 20:00')).toEqual({
      main: '10:00~21:00',
      details: ['준비시간 16:00~17:00', '마지막 주문 20:00'],
    })
  })

  it('값이 없으면 null', () => {
    expect(splitHours(null)).toBeNull()
    expect(splitHours('  ')).toBeNull()
  })
})
