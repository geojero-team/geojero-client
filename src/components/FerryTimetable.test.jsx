import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FerryTimetable from './FerryTimetable'
import styles from './FerryTimetable.module.css'

/*
 * 순수 렌더 — 요청이 없으므로 props만 넣고 봅니다.
 * 값은 2026-09-13 수집분 설계 예시(도장포 9/14 = 10:30 외도상륙 · 14:00 외도상륙 · 14:00 선상관광)입니다.
 */

const AS_OF = { date: '2026-09-14', time: '12:30', zone: 'Asia/Seoul' }

const LANDING = {
  courseId: 1,
  landsOnOedo: true,
  legendLabel: '외도상륙+해금강선상관광',
  name: '외도상륙+해금강, 십자동굴 선상관광(외도입장료 별도)',
  totalMin: 160,
  totalText: '약 2시간 40분',
  oedoStayMin: 120,
  bookingUrl: 'https://www.oedoticket.com/page/view.php?cid=bUlHNGo3WmV0dCttcDBNYVJSMUhZdz09',
}

const CRUISE = {
  courseId: 2,
  landsOnOedo: false,
  legendLabel: '해금강선상관광',
  name: '해금강, 십자동굴 선상관광(신선대,우제봉,외도상륙X)',
  totalMin: 60,
  totalText: '약 1시간',
  oedoStayMin: null,
  bookingUrl: 'https://www.oedoticket.com/page/view.php?cid=cWQ0KzkzWlJ4eEZBbHBLMUtISVUxdz09',
}

const DOCK = { dockCode: 'DOJANGPO', operatorName: '도장포유람선', shortName: '도장포', address: '경남 거제시 남부면 도장포1길 55' }

const COVERAGE = {
  publishedThrough: '2026-10-31',
  fetchedAt: '2026-09-13T23:24:00+09:00',
  source: '외도유람선 예약센터',
  sourceUrl: 'https://oedoticket.com/page/time-schedule.php',
  crossCheckUrl: 'https://www.dojangpo.kr/page/time-schedule.php',
}

const published = (date, sailings) => ({ date, status: 'PUBLISHED', sailings })
const landing = (depart, returnApprox) => ({ depart, courseId: 1, returnApprox })
const cruise = (depart, returnApprox) => ({ depart, courseId: 2, returnApprox })

/** 외도보타니아 화면의 도장포 — 외도상륙 편만(landingOnly). */
function destination(overrides = {}) {
  return {
    key: 'DESTINATION:DOJANGPO',
    relation: 'DESTINATION',
    landingOnly: true,
    dock: DOCK,
    access: null,
    courses: [LANDING],
    next: [{ courseId: 1, date: '2026-09-14', depart: '14:00', returnApprox: '16:40' }],
    rows: [
      published('2026-09-14', [landing('10:30', '13:10'), landing('14:00', '16:40')]),
      published('2026-09-15', [landing('10:30', '13:10'), landing('14:00', '16:40')]),
    ],
    coverage: COVERAGE,
    ...overrides,
  }
}

/** 도장포유람선 화면 — 두 코스 전부. */
function dock(overrides = {}) {
  return destination({
    key: 'DOCK:DOJANGPO',
    relation: 'DOCK',
    landingOnly: false,
    courses: [LANDING, CRUISE],
    next: [
      { courseId: 1, date: '2026-09-14', depart: '14:00', returnApprox: '16:40' },
      { courseId: 2, date: '2026-09-14', depart: '14:00', returnApprox: '15:00' },
    ],
    rows: [
      published('2026-09-14', [landing('10:30', '13:10'), landing('14:00', '16:40'), cruise('14:00', '15:00')]),
      published('2026-09-15', [landing('10:30', '13:10'), cruise('17:30', '18:30')]),
    ],
    ...overrides,
  })
}

function renderFerry(ferry, asOf = AS_OF) {
  return render(<FerryTimetable ferry={ferry} asOf={asOf} days={14} />)
}

/** 날짜 줄 하나 — 날짜 글자로 찾습니다. */
const rowOf = (dayText) => screen.getByText(dayText).closest('li')

describe('FerryTimetable — 날짜 줄', () => {
  it('원천 사이트처럼 한 줄에 날짜와 출항 시각을 늘어놓고, 오늘 줄은 「오늘」 태그와 함께 이미 떠난 배를 뺀다', () => {
    renderFerry(destination())

    const today = rowOf('9/14(월)')
    expect(within(today).getByText('오늘')).toBeInTheDocument()
    expect(within(today).queryByText('10:30')).not.toBeInTheDocument()
    expect(within(today).getByText('14:00')).toBeInTheDocument()

    const tomorrow = rowOf('9/15(화)')
    expect(within(tomorrow).getByText('10:30')).toBeInTheDocument()
    expect(within(tomorrow).getByText('14:00')).toBeInTheDocument()
    expect(within(tomorrow).queryByText('오늘')).not.toBeInTheDocument()
  })

  it('「다음」 태그는 next 편에만 붙는다', () => {
    renderFerry(destination())

    const nextSailing = within(rowOf('9/14(월)')).getByRole('listitem', {
      name: '14:00 출발 · 외도상륙+해금강선상관광 · 약 16:40 복귀',
    })
    expect(within(nextSailing).getByText('다음')).toBeInTheDocument()
    expect(screen.getAllByText('다음')).toHaveLength(1)
    expect(within(rowOf('9/15(화)')).queryByText('다음')).not.toBeInTheDocument()
  })

  it('오늘 남은 배가 없으면 오늘 줄에 「오늘 남은 배 없음」', () => {
    renderFerry(destination({ next: [{ courseId: 1, date: '2026-09-15', depart: '10:30', returnApprox: '13:10' }] }), {
      ...AS_OF,
      time: '15:00',
    })

    const today = rowOf('9/14(월)')
    expect(within(today).getByText('오늘 남은 배 없음')).toBeInTheDocument()
    expect(within(today).queryByText('14:00')).not.toBeInTheDocument()
    expect(screen.queryByText('예정된 배 없음')).not.toBeInTheDocument()
  })

  it('원문이 공개한 날에 편이 0개면 「예정된 배 없음」', () => {
    renderFerry(destination({ rows: [published('2026-09-14', [landing('14:00', '16:40')]), published('2026-09-15', [])] }))

    expect(within(rowOf('9/15(화)')).getByText('예정된 배 없음')).toBeInTheDocument()
  })

  it('이어진 UNPUBLISHED 날은 한 줄로 묶어 「시각 미확인」 — 「예정된 배 없음」·「운행 없음」은 쓰지 않는다', () => {
    const unpublished = ['01', '02', '03', '04', '05', '06', '07'].map((d) => ({
      date: `2026-11-${d}`,
      status: 'UNPUBLISHED',
      sailings: [],
    }))
    const { container } = renderFerry(
      destination({
        next: [{ courseId: 1, date: '2026-10-31', depart: '10:30', returnApprox: '13:10' }],
        rows: [published('2026-10-31', [landing('10:30', '13:10')]), ...unpublished],
      }),
      { date: '2026-10-31', time: '09:00', zone: 'Asia/Seoul' },
    )

    const range = rowOf('11/1(일)~11/7(토)')
    expect(within(range).getByText('시각 미확인 · 배시간표에 아직 안 올라왔어요 (9/13 확인)')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').filter((li) => li.textContent.includes('11/'))).toHaveLength(1)
    expect(container).not.toHaveTextContent('예정된 배 없음')
    expect(container).not.toHaveTextContent('운행 없음')
  })

  it('NOT_COLLECTED 날도 이어지면 한 줄 — 「이 날짜는 수집하지 않았어요」', () => {
    const rows = ['01', '02', '03'].map((d) => ({ date: `2026-09-${d}`, status: 'NOT_COLLECTED', sailings: [] }))
    const { container } = renderFerry(destination({ next: [], rows }), { date: '2026-09-01', time: null, zone: 'Asia/Seoul' })

    const range = rowOf('9/1(화)~9/3(목)')
    expect(within(range).getByText('시각 미확인 · 이 날짜는 수집하지 않았어요')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('운행 없음')
  })
})

describe('FerryTimetable — 다음 배', () => {
  it('오늘이면 시각만, 다른 날이면 날짜를 붙인다', () => {
    const { unmount } = renderFerry(destination())
    expect(screen.getByText('다음 배 14:00 · 약 16:40 복귀')).toBeInTheDocument()
    unmount()

    renderFerry(destination({ next: [{ courseId: 1, date: '2026-09-15', depart: '10:30', returnApprox: '13:10' }] }))
    expect(screen.getByText('다음 배 9/15(화) 10:30 · 약 13:10 복귀')).toBeInTheDocument()
  })

  it('다음 배가 없고 창 안에 미공개 날이 있으면 「시각 미확인」, 전부 공개면 「앞으로 14일 동안 예정된 배가 없어요」', () => {
    const { unmount } = renderFerry(
      destination({ next: [], rows: [published('2026-09-14', []), { date: '2026-09-15', status: 'UNPUBLISHED', sailings: [] }] }),
    )
    expect(screen.getByText('다음 배 시각 미확인 — 배시간표에 아직 안 올라왔어요')).toBeInTheDocument()
    unmount()

    renderFerry(destination({ next: [], rows: [published('2026-09-14', []), published('2026-09-15', [])] }))
    expect(screen.getByText('앞으로 14일 동안 예정된 배가 없어요')).toBeInTheDocument()
  })

  it('코스가 둘이면 줄마다 코스 이름을 붙인다', () => {
    renderFerry(dock())

    const lines = screen.getAllByText(/^다음 배 14:00/).map((el) => el.textContent)
    expect(lines).toEqual([
      expect.stringContaining('외도상륙+해금강선상관광'),
      expect.stringContaining('해금강선상관광'),
    ])
    expect(screen.getByText(/약 15:00 복귀/)).toBeInTheDocument()
  })
})

describe('FerryTimetable — 코스와 각주', () => {
  it('각주는 표 바로 위에 코스 이름(상품 원문)을 코스 색으로 — 외도상륙 검정, 선상관광 빨강', () => {
    renderFerry(dock())

    const landingNote = screen.getByText(LANDING.name).closest('li')
    const cruiseNote = screen.getByText(CRUISE.name).closest('li')
    expect(landingNote).toHaveClass(styles.landing)
    expect(cruiseNote).toHaveClass(styles.cruise)
    expect(landingNote).toHaveTextContent(`● ${LANDING.name}`)

    // 각주 → 날짜 줄 순서
    expect(cruiseNote.compareDocumentPosition(rowOf('9/14(월)')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('외도상륙 편과 선상관광 편은 aria와 색이 다르다', () => {
    renderFerry(dock())

    const landingItem = screen.getByRole('listitem', { name: '14:00 출발 · 외도상륙+해금강선상관광 · 약 16:40 복귀' })
    const cruiseItem = screen.getByRole('listitem', { name: '14:00 출발 · 해금강선상관광 · 약 15:00 복귀' })
    expect(landingItem).toHaveClass(styles.landing)
    expect(cruiseItem).toHaveClass(styles.cruise)
    expect(landingItem).not.toHaveClass(styles.cruise)
  })

  it('외도 화면은 보이는 코스만 — 각주 한 줄', () => {
    renderFerry(destination())

    expect(screen.getByText(LANDING.name)).toBeInTheDocument()
    expect(screen.queryByText(CRUISE.name)).not.toBeInTheDocument()
  })

  it('코스 카드: 이름 · 총 소요시간 · 선상관광이면 「외도에 내리지 않아요」', () => {
    renderFerry(dock())

    expect(screen.getByText('약 2시간 40분')).toBeInTheDocument()
    expect(screen.getByText('약 1시간')).toBeInTheDocument()
    expect(screen.getAllByText('외도에 내리지 않아요')).toHaveLength(1)
  })

  it('예약 링크는 선착장 × 코스마다 하나 — 새 창, opener 없이', () => {
    renderFerry(dock())

    const links = screen.getAllByRole('link', { name: /예약 — 새 창에서 열려요$/ })
    expect(links).toHaveLength(2)
    const landingLink = screen.getByRole('link', { name: '외도상륙+해금강선상관광 예약 — 새 창에서 열려요' })
    expect(landingLink).toHaveAttribute('href', LANDING.bookingUrl)
    expect(landingLink).toHaveAttribute('target', '_blank')
    expect(landingLink.getAttribute('rel')).toContain('noopener')
    expect(landingLink.getAttribute('rel')).toContain('noreferrer')
    expect(landingLink).toHaveTextContent('예약센터에서 예약 ↗')
  })
})

describe('FerryTimetable — 타는 곳·왕복·주의·출처', () => {
  it('선착장 · 주소 · 왕복 안내(같은 배로 금지)', () => {
    const { container } = renderFerry(destination())

    expect(screen.getByText('도장포 선착장에서 타요.')).toBeInTheDocument()
    expect(screen.getByText('경남 거제시 남부면 도장포1길 55')).toBeInTheDocument()
    expect(
      screen.getByText('왕복이에요. 외도에 내려 2시간 구경한 뒤 출발한 도장포 선착장으로 돌아와요.'),
    ).toBeInTheDocument()
    expect(container).not.toHaveTextContent('같은 배로')
  })

  it('access가 있으면 예약센터 문장을 인용한다', () => {
    renderFerry(
      destination({
        relation: 'TOWARD',
        access: { quote: '도보 1분거리에 바람의 언덕이 있습니다.', sourceUrl: 'https://www.oedoticket.com/page/view.php?cid=x' },
      }),
    )

    expect(screen.getByText('예약센터 안내 — “도보 1분거리에 바람의 언덕이 있습니다.”')).toBeInTheDocument()
  })

  it('출항 주의와 출처 한 줄 — 도장포는 누리집 대조를 덧붙인다', () => {
    const { unmount } = renderFerry(destination())

    expect(screen.getByText(/출항은 기상·인원에 따라 10~30분/)).toBeInTheDocument()
    expect(
      screen.getByText('출처 외도유람선 예약센터 · 9/13 확인 · 10/31까지 공개 · 도장포유람선 누리집과 대조'),
    ).toBeInTheDocument()
    unmount()

    renderFerry(destination({ coverage: { ...COVERAGE, crossCheckUrl: null } }))
    expect(screen.getByText('출처 외도유람선 예약센터 · 9/13 확인 · 10/31까지 공개')).toBeInTheDocument()
  })

  it('공개분을 한 번도 못 받은 선착장(coverage 없음)이어도 화면이 죽지 않고 시각 미확인만 말한다', () => {
    const rows = ['14', '15'].map((d) => ({ date: `2026-09-${d}`, status: 'NOT_COLLECTED', sailings: [] }))
    const { container } = renderFerry(destination({ next: [], rows, coverage: null }))

    expect(screen.getByText('시각 미확인 · 이 날짜는 수집하지 않았어요')).toBeInTheDocument()
    expect(screen.getByText('다음 배 시각 미확인 — 배시간표에 아직 안 올라왔어요')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('출처')
  })
})
