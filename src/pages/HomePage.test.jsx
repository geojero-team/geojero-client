import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { loadSpotDetail } from '../lib/spots'
import { peekHeightOf } from '../components/spotSheetHeight'
import HomePage from './HomePage'

vi.mock('../lib/api', () => ({
  api: { pois: vi.fn(), getVisitorPhotos: vi.fn(), me: vi.fn() },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/spots', () => ({ loadSpotDetail: vi.fn() }))

// 카카오 지도는 jsdom에서 뜨지 않습니다. 받은 핀을 버튼으로 그려 누를 수 있게만 합니다.
let mapProps = null
vi.mock('../components/MapView', () => ({
  default: (props) => {
    mapProps = props
    return (
      <div data-testid="map">
        {props.spots.map((s) => (
          <button key={s.spotId} type="button" onClick={() => props.onSelectSpot(s)}>
            {`핀 ${s.shortName ?? s.name}`}
          </button>
        ))}
      </div>
    )
  },
}))

const POIS = [
  { poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', kind: 'SPOT', theme: 'BEACH', region: '남부권', category: '해수욕장', lat: 34.77, lng: 128.64, imageUrl: null, nineScenicNo: 4 },
  { poiId: 12, name: '명사해수욕장', shortName: '명사해수욕장', kind: 'SPOT', theme: null, lat: 34.72, lng: 128.6, imageUrl: null },
  { poiId: 23, name: '고현터미널', shortName: '고현터미널', kind: 'TERMINAL', theme: null, region: null, category: null, lat: 34.8906148, lng: 128.6242507, imageUrl: null },
  // 9경 번호는 서버가 줍니다(/api/pois nineScenicNo, V28). 해금강은 9경 링크 확인용 — 뒤에 붙여 위 index(POIS[2])를 흔들지 않습니다.
  { poiId: 3, name: '해금강', shortName: '해금강', kind: 'SPOT', theme: 'VIEW', region: '남부권', category: '언덕·전망', lat: 34.7333, lng: 128.6839, imageUrl: null, nineScenicNo: 1 },
]

beforeEach(() => {
  vi.clearAllMocks()
  mapProps = null
  api.pois.mockResolvedValue({ pois: POIS })
  api.getVisitorPhotos.mockResolvedValue({ poiId: 23, count: 0, photos: [] })
  loadSpotDetail.mockResolvedValue({ ...POIS[2], photos: [] })
})

describe('홈 지도 — 고현터미널(출발 지점)', () => {
  it('화면 스팟과 함께 고현터미널을 지도에 넘기고, theme 없는 스팟은 넘기지 않는다', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '핀 고현터미널' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '핀 학동몽돌해변' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '핀 명사해수욕장' })).not.toBeInTheDocument()
    const terminal = mapProps.spots.find((s) => s.poiId === 23)
    expect(terminal).toMatchObject({ spotId: 23, kind: 'TERMINAL', lat: 34.8906148, lng: 128.6242507 })
  })

  it('누르면 스팟처럼 시트가 올라오고 지도는 터미널 시트 높이만큼 줄어든다', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '핀 고현터미널' }))

    const sheet = screen.getByRole('dialog', { name: '고현터미널' })
    expect(sheet).toHaveTextContent('모든 코스의 출발 지점')
    expect(mapProps.selectedSpotId).toBe(23)
    expect(screen.getByTestId('map').parentElement.style.bottom).toBe(`${peekHeightOf(POIS[2])}px`)
  })
})

describe('홈 — 거제9경(2026-09-14)', () => {
  function LocationProbe() {
    const location = useLocation()
    return <output data-testid="loc">{location.pathname + location.search}</output>
  }

  const renderHome = (entry = '/') =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <HomePage />
        <LocationProbe />
      </MemoryRouter>,
    )

  it('9경 스팟에만 몇 경인지 붙여 지도에 넘기고, 9경 핀의 스팟 시트에는 배지가 붙는다', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    expect(mapProps.spots.find((s) => s.poiId === 4).nineScenic).toBe(4)
    expect(mapProps.spots.find((s) => s.poiId === 23).nineScenic).toBeNull()

    await user.click(screen.getByRole('button', { name: '핀 학동몽돌해변' }))
    expect(screen.getByRole('dialog', { name: '학동몽돌해변' })).toHaveTextContent('거제9경 · 4경')
  })

  it('목록의 9경 이름은 스팟 상세로 가는 링크다 — 앱에 없는 곳만 링크가 아니다', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    await user.click(screen.getByRole('button', { name: '거제9경이란?' }))
    const dialog = screen.getByRole('dialog', { name: '거제9경이란?' })
    expect(dialog).toHaveTextContent('2024년')
    expect(dialog).toHaveTextContent('주황색 테두리')
    expect(screen.getByTestId('loc')).toHaveTextContent('/?nine=1')

    // 링크 주소는 서버 목록의 9경 번호(nineScenicNo)에서 온다 — 앱에 poiId 를 박지 않는다
    expect(within(dialog).getByRole('link', { name: '1경 거제해금강 상세 보기' })).toHaveAttribute('href', '/spots/3')
    expect(within(dialog).getByRole('link', { name: '4경 학동흑진주몽돌해변 상세 보기' })).toHaveAttribute('href', '/spots/4')
    // 목록에 번호가 없는 곳은 링크가 아니고 이유를 말한다(이 목 데이터에는 1경 · 4경만 있다)
    expect(within(dialog).queryByRole('link', { name: /동백섬 지심도/ })).not.toBeInTheDocument()
    expect(within(dialog).getAllByText('지도에 없음')).toHaveLength(7)

    await user.click(within(dialog).getByRole('link', { name: '4경 학동흑진주몽돌해변 상세 보기' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/spots/4')
  })

  it('상세에서 뒤로 오면(?nine=1) 9경 시트가 다시 열려 있다', async () => {
    renderHome('/?nine=1')
    expect(await screen.findByRole('dialog', { name: '거제9경이란?' })).toBeInTheDocument()
  })

  it('스팟 목록을 못 받았으면 줄이 링크도 아니고 「지도에 없음」도 적지 않는다 — 없는 걸 없다고 말하지 않는다', async () => {
    api.pois.mockRejectedValue(new Error('down'))
    renderHome('/?nine=1')
    const dialog = await screen.findByRole('dialog', { name: '거제9경이란?' })

    expect(within(dialog).queryAllByRole('link')).toHaveLength(0)
    expect(within(dialog).queryByText('지도에 없음')).not.toBeInTheDocument()
  })

  it('Esc 로 닫히면 주소에서 nine 이 빠지고 포커스가 연 버튼으로 돌아온다', async () => {
    const user = userEvent.setup()
    renderHome()
    await screen.findByRole('button', { name: '핀 학동몽돌해변' })

    const opener = screen.getByRole('button', { name: '거제9경이란?' })
    await user.click(opener)
    expect(screen.getByRole('heading', { name: '거제9경이란?' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '거제9경이란?' })).not.toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)
    expect(opener).toHaveFocus()
  })
})
