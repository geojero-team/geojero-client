import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import GuideSheet from './GuideSheet'

vi.mock('../lib/api', () => ({ api: { places: vi.fn() } }))

/* 「오늘의 거제」는 lib/todayGeoje 의 summarizeToday 결과를 그대로 받습니다(홈이 useTodayGeoje 로 만들어 넘깁니다).
   값은 전부 API 원문에서 온 것이라 여기서는 그 모양만 흉내 냅니다. */
const READY_WEEKDAY = {
  status: 'ready',
  date: '2026-09-22',
  summary: {
    day: { kind: 'WEEKDAY', southBusRuns: true },
    alerts: {
      kind: 'SOME',
      items: [{ kind: 'DETOUR', targets: ['명사', '홍포'], reason: '도로 유실로 명사해수욕장앞 우회 중 (53·53-1 해당 구간 이용 불가)' }],
    },
    ferry: { kind: 'NEXT', dock: '도장포', depart: '14:00', returnApprox: '16:40' },
    source: { dataVersion: '2026-08-18' },
  },
}

const READY_HOLIDAY = {
  status: 'ready',
  date: '2026-09-26',
  summary: {
    day: { kind: 'HOLIDAY', southBusRuns: false },
    alerts: { kind: 'NONE' },
    ferry: { kind: 'ALL_GONE', dock: '도장포' },
    source: { dataVersion: null },
  },
}

const READY_UNKNOWN = {
  status: 'ready',
  date: '2026-09-22',
  summary: {
    day: { kind: 'UNKNOWN', southBusRuns: null },
    alerts: { kind: 'UNKNOWN' },
    ferry: { kind: 'UNKNOWN' },
    source: { dataVersion: null },
  },
}

const FOODS = [
  { placeId: 578976, kind: 'FOOD', name: '백만석', nineTasteNos: [1, 3] },
  { placeId: 2900574, kind: 'FOOD', name: '포로수용소굴구이', nineTasteNos: [2] },
  { placeId: 2783696, kind: 'FOOD', name: '대박난맛집', nineTasteNos: [] },
]

function renderSheet(props = {}) {
  const onClose = vi.fn()
  const onNineScenic = vi.fn()
  render(
    <MemoryRouter>
      <GuideSheet open onClose={onClose} onNineScenic={onNineScenic} today={READY_WEEKDAY} {...props} />
    </MemoryRouter>,
  )
  return { onClose, onNineScenic }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.places.mockResolvedValue({ places: FOODS })
})

describe('몽꾸 시트 — 목록(2026-09-21 사용자 결정)', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(
      <MemoryRouter>
        <GuideSheet open={false} onClose={() => {}} onNineScenic={() => {}} today={{ status: 'idle' }} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('열리면 「뭐가 궁금해?」 제목에 포커스가 가고 질문 셋이 있다 — 입력창은 없다(챗봇이 아니라 가이드)', () => {
    renderSheet()
    const dialog = screen.getByRole('dialog', { name: '뭐가 궁금해?' })
    expect(screen.getByRole('heading', { name: '뭐가 궁금해?' })).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: '거제 9경이 뭐야?' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '거제 9미는 뭐야?' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '왜 고현터미널에서 시작해?' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('「거제 9경이 뭐야?」는 시트 안에서 답하지 않고 지금 9경 흐름(설명 → 목록)으로 넘긴다', async () => {
    const user = userEvent.setup()
    const { onNineScenic } = renderSheet()
    await user.click(screen.getByRole('button', { name: '거제 9경이 뭐야?' }))
    expect(onNineScenic).toHaveBeenCalledTimes(1)
  })

  it('Esc · 바깥(닫기)으로 닫힌다', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('몽꾸 시트 — 오늘의 거제(값은 전부 API 원문 — 절대규칙 1)', () => {
  it('평일 · 우회 알림 · 다음 배 · 기준일을 몽꾸 말투로 적는다 — 알림 사유는 원문 그대로', () => {
    renderSheet()
    const card = screen.getByRole('region', { name: '오늘의 거제' })
    expect(card).toHaveTextContent('9월 22일(화)')
    expect(card).toHaveTextContent('오늘은 평일이라 남부면 마을버스도 다녀')
    expect(card).toHaveTextContent('명사 · 홍포 쪽은 우회 중이야. 도로 유실로 명사해수욕장앞 우회 중 (53·53-1 해당 구간 이용 불가)')
    expect(card).toHaveTextContent('도장포에서 외도 가는 배, 다음은 14:00 (약 16:40 복귀)')
    expect(card).toHaveTextContent('버스 시각 거제시 BIS 원문 2026-08-18 · 배 외도유람선 예약센터')
  })

  it('휴일에 마을버스가 0편이면 쉰다고, 알림이 없으면 없다고, 배가 다 떠났으면 그렇게 말한다', () => {
    renderSheet({ today: READY_HOLIDAY })
    const card = screen.getByRole('region', { name: '오늘의 거제' })
    expect(card).toHaveTextContent('오늘은 휴일이라 남부면 마을버스가 쉬어')
    expect(card).toHaveTextContent('오늘 우회 · 운휴 알림은 없어')
    expect(card).toHaveTextContent('오늘 도장포 외도 배는 다 떠났어')
    // 기준일을 못 받았으면 날짜 없이 출처만 — 빈 값을 지어 넣지 않는다
    expect(card).toHaveTextContent('버스 시각 거제시 BIS 원문 · 배 외도유람선 예약센터')
    expect(card).not.toHaveTextContent('undefined')
  })

  it('못 받은 줄은 「확인이 안 돼」로 둔다 — 빈칸이나 「없어」로 뭉개지 않는다(절대규칙 3)', () => {
    renderSheet({ today: READY_UNKNOWN })
    const card = screen.getByRole('region', { name: '오늘의 거제' })
    expect(card).toHaveTextContent('오늘 시간표는 지금 확인이 안 돼')
    expect(card).toHaveTextContent('운영상태는 지금 확인이 안 돼')
    expect(card).toHaveTextContent('배 시각은 지금 확인이 안 돼')
    expect(card).not.toHaveTextContent('알림은 없어')
  })

  it('받는 중에는 그렇게 말한다', () => {
    renderSheet({ today: { status: 'loading', date: '2026-09-22' } })
    expect(screen.getByRole('region', { name: '오늘의 거제' })).toHaveTextContent('몽꾸가 오늘 소식을 보는 중이야')
  })
})

describe('몽꾸 시트 — 거제 9미 답', () => {
  it('아홉 줄에 이름 · 제철(원문)과 우리 맛집 링크를 적고, 없는 미는 「원문에 등록된 곳이 없어요」', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: '거제 9미는 뭐야?' }))

    expect(screen.getByRole('heading', { name: '거제 9미' })).toHaveFocus()
    expect(screen.getByRole('dialog', { name: '거제 9미' })).toHaveTextContent('거제시가 정한 향토 음식 아홉 가지야')
    expect(api.places).toHaveBeenCalledWith('FOOD')

    const first = (await screen.findByText('1미')).closest('li')
    expect(first).toHaveTextContent('거제대구탕')
    expect(first).toHaveTextContent('제철 11월~2월')
    expect(within(first).getByRole('link', { name: '백만석 상세 보기' })).toHaveAttribute('href', '/places/578976')
    // 한 가게가 두 미일 수 있다(백만석 1 · 3미)
    expect(within(screen.getByText('3미').closest('li')).getByRole('link', { name: '백만석 상세 보기' })).toBeInTheDocument()
    expect(within(screen.getByText('2미').closest('li')).getByRole('link', { name: '포로수용소굴구이 상세 보기' })).toHaveAttribute('href', '/places/2900574')

    const fourth = screen.getByText('4미').closest('li')
    expect(fourth).toHaveTextContent('거제도다리쑥국')
    expect(fourth).toHaveTextContent('원문에 등록된 곳이 없어요')
    expect(within(fourth).queryByRole('link')).not.toBeInTheDocument()
    // 8 · 9미는 원문에 제철 칸이 없다 — 지어 넣지 않는다
    expect(screen.getByText('8미').closest('li')).not.toHaveTextContent('제철')
    expect(screen.getAllByText('원문에 등록된 곳이 없어요')).toHaveLength(6)
  })

  it('맛집을 못 받으면 실패라고 말한다 — 「등록된 곳이 없어요」로 뭉개지 않는다', async () => {
    const user = userEvent.setup()
    api.places.mockRejectedValue(new Error('down'))
    renderSheet()
    await user.click(screen.getByRole('button', { name: '거제 9미는 뭐야?' }))

    expect(await screen.findByText('맛집을 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.queryByText('원문에 등록된 곳이 없어요')).not.toBeInTheDocument()
    // 이름 · 제철은 우리 데이터라 그대로 보인다
    expect(screen.getByText('1미').closest('li')).toHaveTextContent('거제대구탕')
  })

  it('‹ 목록으로 돌아오면 질문 목록이고 제목에 포커스가 간다', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: '거제 9미는 뭐야?' }))
    await user.click(screen.getByRole('button', { name: '목록으로' }))
    expect(screen.getByRole('heading', { name: '뭐가 궁금해?' })).toHaveFocus()
    expect(screen.getByRole('button', { name: '거제 9미는 뭐야?' })).toBeInTheDocument()
  })
})

describe('몽꾸 시트 — 고현터미널 답', () => {
  it('시외버스 · 시내버스 · 코스 규칙 세 문장과 파란 버스 핀 범례', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: '왜 고현터미널에서 시작해?' }))

    const dialog = screen.getByRole('dialog', { name: '왜 고현터미널에서 시작해?' })
    expect(screen.getByRole('heading', { name: '왜 고현터미널에서 시작해?' })).toHaveFocus()
    expect(dialog).toHaveTextContent('서울남부에서 하루 20회, 부산서부에서 40회, 통영에서 22회야')
    expect(dialog).toHaveTextContent('남부면은 55번, 매미성은 30번대, 거제식물원은 50-2번이야')
    expect(dialog).toHaveTextContent('고현터미널에서 출발해서 고현터미널로 돌아와')
    expect(dialog).toHaveTextContent('파란 버스 핀이 그 정류장이야')
  })
})
