import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import BoardingMap from './BoardingMap'

// jsdom에는 카카오 SDK가 없습니다. 기본은 실패 — 지도가 못 떠도 목록이 나오는지가 이 화면의 바닥입니다.
vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn() }))

const MAEMISEONG = { name: '매미성', kind: 'SPOT', lat: 34.9682131, lng: 128.7050934 }

/** 매미성 — 대표 핀 둘 + 예외 둘(길 건너편 6m · 다른 정류장 240m) + 핀 없는 노선 둘. */
const BOARDING = {
  from: MAEMISEONG,
  stops: [
    { nodeId: 'GJB1599', name: '대금교차로', lat: 34.965, lng: 128.703, distanceM: 311, routes: ['32', '33'] },
    { nodeId: 'GJB2000', name: '장목', lat: 34.97, lng: 128.71, distanceM: 1080, routes: ['30', '31', '32-1', '33-1'] },
  ],
  exceptions: [
    { routeNo: '32', depart: '20:37', nodeId: 'GJB1621', name: '대금교차로', lat: 34.9651, lng: 128.7031, distanceM: 315, mainNodeId: 'GJB1599', gapM: 6 },
    { routeNo: '33', depart: '07:10', nodeId: 'GJB1700', name: '시방', lat: 34.96, lng: 128.69, distanceM: 520, mainNodeId: 'GJB1599', gapM: 240 },
  ],
  unresolved: [
    { routeNo: '37', reason: 'NO_STOP_NAME' },
    { routeNo: '38', reason: 'TOO_FAR' },
    { routeNo: '37', reason: 'WRONG_DIRECTION' },
  ],
  source: '국토교통부 TAGO 정류소 좌표 · 2026-09-13',
}

/** 김영삼 생가 32번 — 편마다 타는 곳이 달라 대표 핀이 없다(mainNodeId null). */
const SPLIT = {
  from: { name: '김영삼 생가', kind: 'SPOT', lat: 34.97, lng: 128.66 },
  stops: [],
  exceptions: [
    { routeNo: '32', depart: '06:00', nodeId: 'A1', name: '대계', lat: 34.971, lng: 128.661, distanceM: 120, mainNodeId: null, gapM: null },
    { routeNo: '32', depart: '20:55', nodeId: 'B1', name: '외포', lat: 34.972, lng: 128.662, distanceM: 640, mainNodeId: null, gapM: null },
  ],
  unresolved: [],
  source: '국토교통부 TAGO 정류소 좌표 · 2026-09-13',
}

/** 고현터미널 → 스팟 — 타는 정류장이 터미널 바로 앞(12m). */
const FROM_TERMINAL = {
  from: { name: '고현터미널', kind: 'TERMINAL', lat: 34.8906148, lng: 128.6242507 },
  stops: [{ nodeId: 'GJB500', name: '터미널(일반)', lat: 34.8907, lng: 128.6243, distanceM: 12, routes: ['55'] }],
  exceptions: [],
  unresolved: [],
  source: '국토교통부 TAGO 정류소 좌표 · 2026-09-13',
}

/** 카카오 지도 대신 — 만든 오버레이를 모아둡니다. */
function fakeKakao({ level = 1, pxPerDeg = null } = {}) {
  const overlays = []
  const map = { setBounds: vi.fn(), getLevel: vi.fn(() => level), setLevel: vi.fn() }
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

beforeEach(() => {
  vi.clearAllMocks()
  loadKakaoMaps.mockRejectedValue(new Error('SDK를 불러오지 못했습니다'))
})

describe('BoardingMap — 목록', () => {
  it('대표 정류장마다 한 줄: 이름 · 노선 · 거리 · 카카오맵 길찾기(새 창)', async () => {
    render(<BoardingMap boarding={BOARDING} />)

    expect(screen.getByRole('heading', { name: '타는 곳' })).toBeInTheDocument()

    const first = screen.getByText('대금교차로 정류장').closest('li')
    expect(within(first).getByText('32')).toBeInTheDocument()
    expect(within(first).getByText('33')).toBeInTheDocument()
    expect(within(first).getByText('매미성에서 약 310m')).toBeInTheDocument()
    const link = within(first).getByRole('link', { name: '대금교차로 정류장 카카오맵 길찾기 — 새 창에서 열려요' })
    expect(link).toHaveAttribute('href', `https://map.kakao.com/link/to/${encodeURIComponent('대금교차로')},34.965,128.703`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    expect(link).toHaveTextContent('카카오맵 길찾기 ↗')

    const second = screen.getByText('장목 정류장').closest('li')
    expect(within(second).getByText('매미성에서 약 1.1km')).toBeInTheDocument()
    expect(within(second).getAllByText(/^3[0-3](-1)?$/)).toHaveLength(4)

    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
  })

  it('지도가 못 떠도 목록은 그대로 — 지도 칸 대신 한 줄', async () => {
    const { container } = render(<BoardingMap boarding={BOARDING} />)

    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /카카오맵 길찾기/ })).toHaveLength(2)
    expect(container).not.toHaveTextContent('운행 없음')
  })

  it('대표 핀과 다른 정류장에서 타는 편 — 50m 안이면 길 건너편, 그 밖이면 정류장 이름과 거리', () => {
    render(<BoardingMap boarding={BOARDING} />)

    expect(screen.getByText('32번 20:37 버스는 길 건너편 정류장에서 타요.')).toBeInTheDocument()
    expect(screen.getByText('33번 07:10 버스는 시방 정류장(약 520m 떨어진 곳)에서 타요.')).toBeInTheDocument()
  })

  it('편마다 타는 곳이 다른 노선은 한 문장으로 묶고, 편마다 목록 줄(정류장·거리·길찾기)을 준다', () => {
    render(<BoardingMap boarding={SPLIT} />)

    expect(screen.getByText('32번은 편마다 타는 쪽이 달라요 — 06:00 버스 · 20:55 버스')).toBeInTheDocument()
    const daegye = screen.getByText('대계 정류장').closest('li')
    expect(within(daegye).getByText('32 06:00')).toBeInTheDocument()
    expect(within(daegye).getByText('김영삼 생가에서 약 120m')).toBeInTheDocument()
    expect(within(daegye).getByRole('link', { name: '대계 정류장 카카오맵 길찾기 — 새 창에서 열려요' })).toBeInTheDocument()
    expect(screen.getByText('외포 정류장').closest('li')).toHaveTextContent('김영삼 생가에서 약 640m')
  })

  it('핀을 못 찍은 노선은 한 문장(겹친 노선은 한 번) · 출처 한 줄', () => {
    render(<BoardingMap boarding={BOARDING} />)

    expect(screen.getByText('37·38번은 타는 곳을 지도에 표시하지 못했어요.')).toBeInTheDocument()
    expect(screen.getByText('정류장 위치 국토교통부 TAGO 정류소 좌표 · 2026-09-13')).toBeInTheDocument()
  })

  it('고현터미널에서 30m 안의 정류장이면 거리 문구를 쓰지 않는다', () => {
    render(<BoardingMap boarding={FROM_TERMINAL} />)

    expect(screen.getByText('터미널(일반) 정류장')).toBeInTheDocument()
    expect(screen.queryByText(/고현터미널에서 약/)).not.toBeInTheDocument()
  })
})

describe('BoardingMap — 카카오 지도', () => {
  it('대표 핀(노선) · 예외 핀(노선 + 시각) · 출발 자리를 오버레이로 찍고 모두 들어오게 맞춘다 — 너무 당기지 않는다', async () => {
    const { kakao, map, overlays } = fakeKakao({ level: 1 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={BOARDING} />)

    await waitFor(() => expect(overlays).toHaveLength(5))
    expect(overlays.map((o) => o.options.content.textContent)).toEqual([
      '32 · 33',
      '30 외 3',
      '32 20:37',
      '33 07:10',
      '매미성',
    ])
    expect(overlays.every((o) => o.options.map === map)).toBe(true)
    expect(map.setBounds).toHaveBeenCalledTimes(1)
    expect(map.setBounds.mock.calls[0][0].points).toHaveLength(5)
    expect(map.setLevel).toHaveBeenCalledWith(3)
    expect(screen.queryByText('지도를 불러오지 못했어요')).not.toBeInTheDocument()
  })

  it('매미성 대금교차로 — 6m 떨어진 길 건너편 핀은 대표 핀과 다른 높이에 달아 글자가 겹치지 않는다', async () => {
    const { kakao, map, overlays } = fakeKakao({ level: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(
      <BoardingMap
        boarding={{
          from: MAEMISEONG,
          stops: [
            { nodeId: 'GJB1599', name: '대금교차로', lat: 34.9673158, lng: 128.7030327, distanceM: 311, routes: ['32', '33'] },
          ],
          exceptions: [
            { routeNo: '32', depart: '20:37', nodeId: 'GJB1621', name: '대금교차로', lat: 34.9672817, lng: 128.7029844, distanceM: 315, mainNodeId: 'GJB1599', gapM: 6 },
          ],
          unresolved: [],
          source: BOARDING.source,
        }}
      />,
    )

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const [main, opposite, from] = overlays
    expect(main.options.content.textContent).toBe('32 · 33')
    expect(main.options.yAnchor).toBe(0.5)
    expect(opposite.options.yAnchor).not.toBe(main.options.yAnchor)
    expect(opposite.options.yAnchor).toBeLessThan(0) // 점 아래로
    expect(from.options.yAnchor).toBe(0.5) // 매미성은 수백 m 떨어져 겹치지 않는다
  })

  it('편마다 타는 곳이 달라 핀 셋이 몇 m 안에 모이면 제자리 · 아래 · 위로 번갈아 단다', async () => {
    const { kakao, map, overlays } = fakeKakao({ level: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)
    const at = (depart, nodeId, lat, lng) => ({
      routeNo: '32', depart, nodeId, name: '대계', lat, lng, distanceM: 120, mainNodeId: null, gapM: null,
    })

    render(
      <BoardingMap
        boarding={{
          ...SPLIT,
          from: { name: '김영삼 생가', kind: 'SPOT', lat: 34.975, lng: 128.66 },
          exceptions: [
            at('06:00', 'A1', 34.97, 128.66),
            at('13:10', 'A2', 34.97005, 128.66005),
            at('20:55', 'A3', 34.97002, 128.66008),
          ],
        }}
      />,
    )

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const anchors = overlays.map((o) => o.options.yAnchor)
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['32 06:00', '32 13:10', '32 20:55', '김영삼 생가'])
    expect(anchors[0]).toBe(0.5)
    expect(anchors[1]).toBeLessThan(0)
    expect(anchors[2]).toBeGreaterThan(1)
    expect(anchors[3]).toBe(0.5)
  })

  it('거제씨월드 — 26m 떨어진 두 지세포 핀도 지도 배율에서 몇 px 안에 겹치면 다른 높이에 단다(운영 실측, 2026-09-14)', async () => {
    // 운영 화면에서 4000 핀이 63 · 67-1 핀 뒤로 가려졌다. 미터 기준(25m)으로는 겹침으로 안 쳤다
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
          source: BOARDING.source,
        }}
      />,
    )

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const byText = Object.fromEntries(overlays.map((o) => [o.options.content.textContent, o.options.yAnchor]))
    expect(byText['4000']).toBe(0.5)
    expect(byText['63 · 67-1']).not.toBe(0.5)
    expect(byText['22 · 23']).toBe(0.5)
  })

  it('출발지가 고현터미널이고 가장 가까운 핀이 30m 안이면 출발 자리를 찍지 않는다', async () => {
    const { kakao, map, overlays } = fakeKakao({ level: 5 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={FROM_TERMINAL} />)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['55'])
    expect(map.setLevel).not.toHaveBeenCalled()
  })
})
