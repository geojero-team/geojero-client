import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, beginKakaoLoginTo } from '../lib/api'
import { loadSpotDetail } from '../lib/spots'
import Screen from './Screen'
import SpotSheet from './SpotSheet'
import { PEEK_HEIGHT, peekHeightOf } from './spotSheetHeight'

vi.mock('../lib/api', () => ({
  api: { getVisitorPhotos: vi.fn(), me: vi.fn() },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/spots', () => ({ loadSpotDetail: vi.fn() }))

const SPOT = { poiId: 4, shortName: '학동몽돌해변', region: '남부권', category: '해수욕장', theme: 'BEACH' }

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="loc">{location.pathname + location.search}</output>
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  loadSpotDetail.mockResolvedValue({ ...SPOT, photos: [] })
  api.getVisitorPhotos.mockResolvedValue({ poiId: 4, count: 0, photos: [] })
})

const TERMINAL = { poiId: 23, kind: 'TERMINAL', name: '고현터미널', shortName: '고현터미널', theme: null, region: null, category: null }

describe('SpotSheet — 고현터미널(출발 지점)', () => {
  it('peek는 이름과 「모든 코스의 출발 지점」뿐 — 사진이 없어 시트가 낮다', () => {
    render(
      <MemoryRouter>
        <SpotSheet spot={TERMINAL} onClose={vi.fn()} />
      </MemoryRouter>,
    )
    const sheet = screen.getByRole('dialog', { name: '고현터미널' })
    expect(sheet).toHaveTextContent('고현터미널')
    expect(sheet).toHaveTextContent('모든 코스의 출발 지점')
    expect(sheet.querySelector('img')).toBeNull()
    // 높이가 아니라 '보이는 높이'를 넘깁니다 — 시트는 틀을 꽉 채우고 그만큼만 드러나게 밀려 있습니다.
    expect(sheet.style.getPropertyValue('--sheet-visible')).toBe(`${peekHeightOf(TERMINAL)}px`)
    expect(peekHeightOf(TERMINAL)).toBeLessThan(PEEK_HEIGHT)
    expect(peekHeightOf(SPOT)).toBe(PEEK_HEIGHT)
  })

  it('펼치면 버스 시간표 버튼 없이 출발 지점 문구와 방문자 사진', async () => {
    loadSpotDetail.mockResolvedValue({ ...TERMINAL, photos: [] })
    api.getVisitorPhotos.mockResolvedValue({ poiId: 23, count: 0, photos: [] })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SpotSheet spot={TERMINAL} onClose={vi.fn()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '자세히 보기', expanded: false }))

    expect(await screen.findByRole('heading', { name: '방문자 사진' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '고현터미널' })).toBeInTheDocument()
    expect(screen.getByText('모든 코스의 출발 지점')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '시간표 보기' })).not.toBeInTheDocument()
    expect(api.getVisitorPhotos).toHaveBeenCalledWith(23)
  })
})

describe('SpotSheet — 방문자 사진', () => {
  it('peek에는 없고 full에서 보인다 — 비로그인 올리기는 화면 프레임에 로그인 시트, 복귀는 /spots/4?upload=1', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Screen data-testid="frame">
          <SpotSheet spot={SPOT} onClose={vi.fn()} />
        </Screen>
        <LocationProbe />
      </MemoryRouter>,
    )

    expect(screen.queryByText('방문자 사진')).not.toBeInTheDocument()

    // 손잡이(aria-expanded=false)로 펼칩니다 — peek 덩어리도 같은 이름의 버튼입니다.
    await user.click(screen.getByRole('button', { name: '자세히 보기', expanded: false }))
    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    const title = screen.getByRole('heading', { name: '사진을 올리려면 로그인 해주세요' })
    expect(title.closest('section').parentElement).toBe(screen.getByTestId('frame'))
    expect(screen.getByRole('dialog', { name: '학동몽돌해변' })).not.toContainElement(title)
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLoginTo).toHaveBeenCalledWith('/spots/4?upload=1')
  })
})

/* 펼친 시트의 ‹ 버튼(2026-09-18 사용자 — 「지도에서 스팟 상세로 들어가면 뒤로가기가 없다」).
   손잡이와 ✕ 는 있었지만 펼치면 사진이 화면을 채워 둘 다 눈에 띄지 않았습니다.
   ‹ 는 **지도로 돌아가기**(시트를 peek 으로)이고 ✕ 는 닫기라 뜻이 갈립니다. */
describe('SpotSheet — 닫기 ✕ (2026-09-19)', () => {
  it('글자가 아니라 아이콘이고, 펼치면 사진 안 ‹ 맞은편으로 옮겨 하나만 남는다(스크롤해도 ‹ 와 같이 움직인다)', async () => {
    loadSpotDetail.mockResolvedValue({ ...SPOT, photos: [] })
    api.getVisitorPhotos.mockResolvedValue({ poiId: SPOT.poiId, count: 0, photos: [] })
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SpotSheet spot={SPOT} onClose={onClose} />
      </MemoryRouter>,
    )

    const peekClose = screen.getByRole('button', { name: '닫기' })
    expect(peekClose.querySelector('svg')).not.toBeNull()
    expect(peekClose.textContent.trim()).toBe('')

    await user.click(screen.getByRole('button', { name: '자세히 보기', expanded: false }))
    const back = await screen.findByRole('button', { name: '뒤로' })
    const closes = screen.getAllByRole('button', { name: '닫기' })
    expect(closes).toHaveLength(1)
    expect(closes[0].parentElement).toBe(back.parentElement)
    expect(closes[0].querySelector('svg')).not.toBeNull()

    await user.click(closes[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('SpotSheet — 펼친 뒤 돌아가기', () => {
  it('펼치면 ‹ 가 보이고, 누르면 닫지 않고 peek 으로 돌아온다', async () => {
    loadSpotDetail.mockResolvedValue({ ...SPOT, photos: [] })
    api.getVisitorPhotos.mockResolvedValue({ poiId: SPOT.poiId, count: 0, photos: [] })
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SpotSheet spot={SPOT} onClose={onClose} />
      </MemoryRouter>,
    )

    // peek 에서는 상세가 없으므로 ‹ 도 없습니다
    expect(screen.queryByRole('button', { name: '뒤로' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '자세히 보기', expanded: false }))
    const back = await screen.findByRole('button', { name: '뒤로' })

    await user.click(back)

    // 시트는 닫히지 않고 peek 으로 — 손잡이가 다시 「자세히 보기」가 됩니다
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '자세히 보기', expanded: false })).toBeInTheDocument()
  })
})

/* 펼쳤는지를 부모에게 알립니다(2026-09-18 사용자 — 코스 지도에서 스팟 상세를 보는 동안에는
   아래 코스 카드를 감춥니다). 시트 혼자서는 그 카드를 모르므로 판단만 넘기고 감추는 일은 화면이 합니다. */
describe('SpotSheet — 펼침을 부모에게 알린다', () => {
  it('펼치면 true, 지도로 돌아오면 다시 false', async () => {
    loadSpotDetail.mockResolvedValue({ ...SPOT, photos: [] })
    api.getVisitorPhotos.mockResolvedValue({ poiId: SPOT.poiId, count: 0, photos: [] })
    const onFullChange = vi.fn()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SpotSheet spot={SPOT} onClose={vi.fn()} onFullChange={onFullChange} />
      </MemoryRouter>,
    )

    // peek 으로 시작합니다 — 카드는 그대로 보입니다
    expect(onFullChange).toHaveBeenLastCalledWith(false)

    await user.click(screen.getByRole('button', { name: '자세히 보기', expanded: false }))
    expect(onFullChange).toHaveBeenLastCalledWith(true)

    await user.click(await screen.findByRole('button', { name: '뒤로' }))
    expect(onFullChange).toHaveBeenLastCalledWith(false)
  })
})
