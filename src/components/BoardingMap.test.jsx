import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import BoardingMap from './BoardingMap'

// jsdom에는 카카오 SDK가 없습니다. 기본은 실패 — 지도가 못 떠도 정류장 이름·거리·길찾기가 나오는지가 이 카드의 바닥입니다.
vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn() }))

const SOURCE = '정류소 좌표 국토교통부 TAGO · 2026-09-13'

/** 운영 바람의언덕 → 고현터미널(530:213) — 정류장 하나 · 노선 하나. */
const BARAM = {
  from: { name: '바람의언덕', kind: 'SPOT', lat: 34.7440458, lng: 128.6633111 },
  stops: [{ nodeId: 'GJB583', name: '도장포', lat: 34.7426, lng: 128.6664, distanceM: 376, routes: ['55'] }],
  exceptions: [],
  unresolved: [],
  source: SOURCE,
}

/** 운영 매미성 → 고현터미널 — 정류장 하나에 노선 다섯 + 32번 20:37 길 건너편(6m). */
const MAEMI = {
  from: { name: '매미성', kind: 'SPOT', lat: 34.9682131, lng: 128.7050934 },
  stops: [
    { nodeId: 'GJB1599', name: '대금교차로', lat: 34.9673158, lng: 128.7030327, distanceM: 213, routes: ['33', '32-1', '33-2', '33-1', '32'] },
  ],
  exceptions: [
    { routeNo: '32', depart: '20:37', nodeId: 'GJB1621', name: '대금교차로', lat: 34.9672817, lng: 128.7029844, distanceM: 218, mainNodeId: 'GJB1599', gapM: 6 },
  ],
  unresolved: [],
  source: SOURCE,
}

/** 운영 학동몽돌해변 → 고현터미널 — 노선마다 정류장이 다르다(55 학동 311m · 67-1 학동삼거리 106m). */
const HAKDONG = {
  from: { name: '학동몽돌해변', kind: 'SPOT', lat: 34.774752, lng: 128.641498 },
  stops: [
    { nodeId: 'GJB876', name: '학동', lat: 34.7747, lng: 128.6381, distanceM: 311, routes: ['55'] },
    { nodeId: 'GJB633', name: '학동삼거리', lat: 34.7756, lng: 128.6411, distanceM: 106, routes: ['67-1'] },
  ],
  exceptions: [],
  unresolved: [],
  source: SOURCE,
}

/** 운영 김영삼 생가 → 고현터미널 — 32번이 편마다 타는 쪽이 달라 대표 정류장이 없다(둘 다 이름이 대계마을). */
const DAEGYE = {
  from: { name: '김영삼 생가', kind: 'SPOT', lat: 34.97, lng: 128.66 },
  stops: [],
  exceptions: [
    { routeNo: '32', depart: '06:00', nodeId: 'GJB283', name: '대계마을', lat: 34.9708, lng: 128.6608, distanceM: 95, mainNodeId: null, gapM: null },
    { routeNo: '32', depart: '20:55', nodeId: 'GJB252', name: '대계마을', lat: 34.97085, lng: 128.66088, distanceM: 95, mainNodeId: null, gapM: null },
  ],
  unresolved: [],
  source: SOURCE,
}

/** 운영 맹종죽테마공원 → 고현터미널 — 37 · 37-2번은 타는 곳을 못 찍었다. */
const MAENGJONG = {
  from: { name: '맹종죽테마공원', kind: 'SPOT', lat: 34.9, lng: 128.6 },
  stops: [{ nodeId: 'GJB111', name: '와항마을', lat: 34.9004, lng: 128.6003, distanceM: 54, routes: ['30', '30-1', '31', '32', '33'] }],
  exceptions: [],
  unresolved: [
    { routeNo: '37', reason: 'NO_STOP_NAME' },
    { routeNo: '37-2', reason: 'NO_STOP_NAME' },
  ],
  source: SOURCE,
}

/** 고현터미널 → 스팟 — 타는 정류장이 터미널 바로 앞(0m). */
const FROM_TERMINAL = {
  from: { name: '고현터미널', kind: 'TERMINAL', lat: 34.8906148, lng: 128.6242507 },
  stops: [{ nodeId: 'GJB500', name: '터미널(일반)', lat: 34.8906148, lng: 128.6242507, distanceM: 0, routes: ['55', '55-1'] }],
  exceptions: [],
  unresolved: [],
  source: SOURCE,
}

/** 카카오 지도 대신 — 만든 오버레이를 모아둡니다. */
function fakeKakao({ level = 1, pxPerDeg = null } = {}) {
  const overlays = []
  const map = { setBounds: vi.fn(), getLevel: vi.fn(() => level), setLevel: vi.fn(), relayout: vi.fn() }
  // 화면 좌표 — 운영 지도(배율 500m 막대 ≈ 57px)처럼 위경도 1도 ≈ pxPerDeg px 로 편다
  if (pxPerDeg) {
    map.getProjection = () => ({
      containerPointFromCoords: (latLng) => ({ x: (latLng.lng - 128.6) * pxPerDeg, y: (35.0 - latLng.lat) * pxPerDeg * 1.2 }),
    })
  }
  const kakao = {
    maps: {
      Map: class {
        constructor() {
          return map
        }
      },
      LatLng: class {
        constructor(lat, lng) {
          this.lat = lat
          this.lng = lng
        }
      },
      LatLngBounds: class {
        points = []
        extend(point) {
          this.points.push(point)
        }
      },
      CustomOverlay: class {
        constructor(options) {
          this.options = options
          this.setMap = vi.fn()
          overlays.push(this)
        }
      },
    },
  }
  return { kakao, map, overlays }
}

/** 카드 머리줄(펼치기 버튼) — 펼침 여부와 무관하게 찾습니다. */
const toggle = () => screen.getByRole('region', { name: '타는 곳' }).querySelector('button[aria-expanded]')

async function expand(user) {
  await user.click(screen.getByRole('button', { expanded: false }))
}

beforeEach(() => {
  vi.clearAllMocks()
  loadKakaoMaps.mockRejectedValue(new Error('SDK를 불러오지 못했습니다'))
})

describe('BoardingMap — 접힌 카드(530:231 · 541:231)', () => {
  it('정류장 하나 · 노선 하나: 「도장포 정류장」 · 「바람의언덕에서 약 380m · 55번」 — 지도는 펼칠 때까지 부르지 않는다', () => {
    render(<BoardingMap boarding={BARAM} />)

    const card = screen.getByRole('region', { name: '타는 곳' })
    const button = within(card).getByRole('button', { expanded: false })
    expect(button).toHaveTextContent('도장포 정류장')
    expect(button).toHaveTextContent('바람의언덕에서 약 380m · 55번')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(loadKakaoMaps).not.toHaveBeenCalled()
    expect(card).not.toHaveTextContent(SOURCE) // 출처는 페이지 맨 아래로 갔다
  })

  it('노선이 여럿이면 「33번 외 4」 — 길 건너편에서 타는 편은 접혀 있어도 알린다', () => {
    render(<BoardingMap boarding={MAEMI} />)

    expect(toggle()).toHaveTextContent('대금교차로 정류장')
    expect(toggle()).toHaveTextContent('매미성에서 약 210m · 33번 외 4')
    expect(screen.getByText('32번 20:37 버스는 길 건너편 정류장에서 타요.')).toBeInTheDocument()
  })

  it('노선마다 정류장이 다르면 한 이름으로 뭉개지 않는다 — 「정류장 2곳」', () => {
    render(<BoardingMap boarding={HAKDONG} />)

    expect(toggle()).toHaveTextContent('정류장 2곳')
    expect(toggle()).toHaveTextContent('노선마다 타는 정류장이 달라요')
  })

  it('노선 칩을 고르면 그 노선의 정류장만 — 학동 67-1번은 학동삼거리', () => {
    render(<BoardingMap boarding={HAKDONG} route="67-1" />)

    expect(toggle()).toHaveTextContent('학동삼거리 정류장')
    expect(toggle()).toHaveTextContent('학동몽돌해변에서 약 110m · 67-1번')
  })

  it('편마다 타는 쪽이 다르면(대표 정류장 없음) 같은 이름은 한 번 · 「편마다 타는 쪽이 달라요」', () => {
    render(<BoardingMap boarding={DAEGYE} />)

    expect(toggle()).toHaveTextContent('대계마을 정류장')
    expect(toggle()).toHaveTextContent('편마다 타는 쪽이 달라요')
  })

  it('고현터미널 바로 앞(30m 안) 정류장은 거리 대신 「고현터미널 앞」', () => {
    render(<BoardingMap boarding={FROM_TERMINAL} />)

    expect(toggle()).toHaveTextContent('터미널(일반) 정류장')
    expect(toggle()).toHaveTextContent('고현터미널 앞 · 55번 외 1')
    expect(toggle()).not.toHaveTextContent('약 0m')
  })

  it('고른 노선의 타는 곳을 못 찍었으면 펼칠 것 없이 이유 한 줄 — 「운행 없음」이 아니다', () => {
    const { container } = render(<BoardingMap boarding={MAENGJONG} route="37" />)

    expect(screen.getByText('37번은 타는 곳을 지도에 표시하지 못했어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent('운행 없음')
  })
})

describe('BoardingMap — 펼친 카드(530:282 · 541:408)', () => {
  it('노선 하나: 둘째 줄은 거리만 · 지도 · 카드 폭 길찾기 버튼 하나(새 창) — 목록 줄은 없다', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={BARAM} />)

    await expand(user)
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(toggle()).toHaveTextContent('바람의언덕에서 약 380m')
    expect(toggle()).not.toHaveTextContent('55번')
    const link = screen.getByRole('link', { name: '도장포 정류장 카카오맵 길찾기 — 새 창에서 열려요' })
    expect(link).toHaveTextContent('카카오맵으로 길찾기 ↗')
    expect(link).toHaveAttribute('href', `https://map.kakao.com/link/to/${encodeURIComponent('도장포')},34.7426,128.6664`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
  })

  it('정류장 하나에 노선 여럿: 「노선 5개가 같은 정류장」 · 목록 줄(이름 · 약 거리 · 노선 뱃지) · 버튼 하나', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={MAEMI} />)

    await expand(user)
    expect(toggle()).toHaveTextContent('노선 5개가 같은 정류장')
    const row = screen.getByRole('listitem')
    expect(within(row).getByText('대금교차로 정류장')).toBeInTheDocument()
    expect(within(row).getByText('약 210m')).toBeInTheDocument()
    expect(within(row).getAllByText(/^3[23](-\d)?$/)).toHaveLength(5)
    expect(screen.getAllByRole('link', { name: /카카오맵 길찾기/ })).toHaveLength(1)
    expect(screen.getByText('32번 20:37 버스는 길 건너편 정류장에서 타요.')).toBeInTheDocument()
  })

  it('정류장이 여럿이면 정류장마다 목록 줄과 길찾기 — 카드 아래 버튼 하나로 어디로 보낼지 정할 수 없다', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={HAKDONG} />)

    await expand(user)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('학동 정류장')
    expect(rows[0]).toHaveTextContent('약 310m')
    expect(within(rows[0]).getByRole('link', { name: '학동 정류장 카카오맵 길찾기 — 새 창에서 열려요' })).toBeInTheDocument()
    expect(rows[1]).toHaveTextContent('학동삼거리 정류장')
    expect(within(rows[1]).getByText('67-1')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('편마다 다름: 한 문장 + 편마다 목록 줄(노선 · 시각 뱃지)', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={DAEGYE} />)

    await expand(user)
    expect(screen.getByText('32번은 편마다 타는 쪽이 달라요 — 06:00 버스 · 20:55 버스')).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]).getByText('32 06:00')).toBeInTheDocument()
    expect(within(rows[1]).getByText('32 20:55')).toBeInTheDocument()
  })

  it('타는 곳을 못 찍은 노선은 접혀 있어도 한 문장(겹친 노선은 한 번) — 다음 버스가 그 노선이면 엉뚱한 정류장을 안내하게 된다', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={MAENGJONG} />)

    expect(screen.getByText('37·37-2번은 타는 곳을 지도에 표시하지 못했어요.')).toBeInTheDocument()
    await expand(user)
    expect(screen.getAllByText('37·37-2번은 타는 곳을 지도에 표시하지 못했어요.')).toHaveLength(1)
  })

  it('다시 누르면 접힌다', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={BARAM} />)

    await expand(user)
    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('BoardingMap — 카카오 지도(펼칠 때)', () => {
  /** 마커 = 버스 아이콘 28 + 간격 2 + 태그 21 → 51px. 좌표는 아이콘 가운데(14px). */
  const ICON_CENTER = 14 / 51

  it('버스 마커 + 태그(노선 여럿이면 「33 +4」) · 예외 편(노선 + 시각) · 출발 곳 — 모두 들어오게 맞추고 너무 당기지 않는다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 1 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={MAEMI} />)
    await expand(user)

    await waitFor(() => expect(overlays).toHaveLength(3))
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['33 +4', '32 20:37', '매미성'])
    expect(overlays[0].options.content.querySelector('svg')).not.toBeNull()
    expect(overlays[0].options.yAnchor).toBeCloseTo(ICON_CENTER)
    expect(map.setBounds).toHaveBeenCalledTimes(1)
    expect(map.setBounds.mock.calls[0][0].points).toHaveLength(3)
    expect(map.setLevel).toHaveBeenCalledWith(3)
  })

  it('매미성 대금교차로 — 6m 떨어진 길 건너편 마커는 대표 마커 아래로 비켜 단다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={MAEMI} />)
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const [main, opposite, from] = overlays
    expect(main.options.yAnchor).toBeCloseTo(ICON_CENTER)
    expect(opposite.options.yAnchor).toBeLessThan(0) // 대표 마커 아래로
    expect(from.options.yAnchor).toBe(0.5) // 출발 곳은 점 가운데 · 213m 떨어져 겹치지 않는다
  })

  it('편마다 다른 마커 셋이 몇 m 안에 모이면 제자리 · 실제로 있는 쪽(북쪽이면 위) · 남은 쪽으로 단다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)
    const at = (depart, nodeId, lat, lng) => ({
      routeNo: '32', depart, nodeId, name: '대계', lat, lng, distanceM: 120, mainNodeId: null, gapM: null,
    })

    render(
      <BoardingMap
        boarding={{
          ...DAEGYE,
          from: { name: '김영삼 생가', kind: 'SPOT', lat: 34.975, lng: 128.66 },
          exceptions: [at('06:00', 'A1', 34.97, 128.66), at('13:10', 'A2', 34.97005, 128.66005), at('20:55', 'A3', 34.97002, 128.66008)],
        }}
      />,
    )
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const anchors = overlays.map((o) => o.options.yAnchor)
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['32 06:00', '32 13:10', '32 20:55', '김영삼 생가'])
    expect(anchors[0]).toBeCloseTo(ICON_CENTER)
    expect(anchors[1]).toBeGreaterThan(1) // A2는 A1보다 북쪽 — 위로
    expect(anchors[2]).toBeLessThan(0) // A3도 북쪽이지만 위는 A2가 썼다 — 아래로
    expect(anchors[3]).toBe(0.5)
  })

  it('거제씨월드 — 26m 떨어진 두 지세포 마커도 지도 배율에서 몇 px 안에 겹치면 다른 높이에 단다(운영 실측, 2026-09-14)', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 5, pxPerDeg: 10000 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(
      <BoardingMap
        boarding={{
          from: { name: '거제씨월드', kind: 'SPOT', lat: 34.8358552, lng: 128.7014662 },
          stops: [
            { nodeId: 'GJB1657', name: '지세포', lat: 34.828869, lng: 128.702914, distanceM: 788, routes: ['4000'] },
            { nodeId: 'GJB901', name: '신촌', lat: 34.8345, lng: 128.69975167, distanceM: 217, routes: ['22', '23'] },
            { nodeId: 'GJB849', name: '지세포', lat: 34.82895333, lng: 128.70264333, distanceM: 775, routes: ['63', '67-1'] },
          ],
          exceptions: [],
          unresolved: [],
          source: SOURCE,
        }}
      />,
    )
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const byText = Object.fromEntries(overlays.map((o) => [o.options.content.textContent, o.options.yAnchor]))
    expect(byText['4000']).toBeCloseTo(ICON_CENTER)
    expect(byText['63 +1']).not.toBeCloseTo(ICON_CENTER)
    expect(byText['22 +1']).toBeCloseTo(ICON_CENTER)
  })

  it('세로로 40px 떨어진 마커도 겹침으로 본다 — 아이콘 + 태그가 51px라 알약(24px) 기준이면 포개진다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 5, pxPerDeg: 10000 })
    loadKakaoMaps.mockResolvedValue(kakao)
    // y 차이 = 위도차 × 10000 × 1.2 = 40px, x 차이 0
    const stop = (nodeId, lat, routes) => ({ nodeId, name: nodeId, lat, lng: 128.7, distanceM: 100, routes })

    render(
      <BoardingMap
        boarding={{
          from: { name: '어딘가', kind: 'SPOT', lat: 34.9, lng: 128.9 },
          stops: [stop('A', 34.8, ['1']), stop('B', 34.8 - 40 / 12000, ['2'])],
          exceptions: [],
          unresolved: [],
          source: SOURCE,
        }}
      />,
    )
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(overlays[1].options.yAnchor).not.toBeCloseTo(ICON_CENTER)
  })

  it('출발지가 고현터미널이고 가장 가까운 정류장이 30m 안이면 출발 곳을 찍지 않는다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 5 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={FROM_TERMINAL} />)
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['55 +1'])
    expect(map.setLevel).not.toHaveBeenCalled()
  })

  it('고현터미널 → 김영삼 생가 — 북동쪽 70m 2000번 마커는 위로 비킨다(아래로 내리면 북쪽 정류장이 남쪽에 그려진다)', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3, pxPerDeg: 80000 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(
      <BoardingMap
        boarding={{
          from: { name: '고현터미널', kind: 'TERMINAL', lat: 34.8906148, lng: 128.6242507 },
          stops: [
            { nodeId: 'GJB500', name: '터미널(일반)', lat: 34.89061475, lng: 128.62425069, distanceM: 0, routes: ['32'] },
            { nodeId: 'GJB362', name: '터미널(순환)', lat: 34.8910729, lng: 128.62478237, distanceM: 70, routes: ['2000'] },
          ],
          exceptions: [],
          unresolved: [],
          source: SOURCE,
        }}
      />,
    )
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const byText = Object.fromEntries(overlays.map((o) => [o.options.content.textContent, o.options.yAnchor]))
    expect(byText['32']).toBeCloseTo(ICON_CENTER)
    expect(byText['2000']).toBeGreaterThan(1)
  })

  it('출발 곳 점이 마커와 겹치면 점 자기 높이(9px)로 비킨다 — 마커 비율로 재면 7px만 움직여 이름표가 마커를 덮는다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3, pxPerDeg: 100000 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(
      <BoardingMap
        boarding={{
          from: { name: '고현터미널', kind: 'TERMINAL', lat: 34.8906, lng: 128.6242 },
          stops: [{ nodeId: 'GJB370', name: '터미널(순환)', lat: 34.89063, lng: 128.62458, distanceM: 42, routes: ['100-1', '100', '110', '111'] }],
          exceptions: [],
          unresolved: [],
          source: SOURCE,
        }}
      />,
    )
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const from = overlays.find((o) => o.options.content.textContent === '고현터미널')
    // 마커 박스(좌표 기준 -14 ~ +37px) 밖으로: 아래면 점 윗변이 +39px(= -39/9), 위면 점 아랫변이 -16px(= 25/9)
    expect(Math.abs(from.options.yAnchor - -39 / 9) < 1e-6 || Math.abs(from.options.yAnchor - 25 / 9) < 1e-6).toBe(true)
  })
})

