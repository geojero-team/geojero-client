import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import BoardingMap from './BoardingMap'
import { courseImageFallback } from '../lib/courseImage'

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
  const lines = []
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
      Polyline: class {
        constructor(options) {
          this.options = options
          this.setMap = vi.fn()
          lines.push(this)
        }
      },
    },
  }
  return { kakao, map, overlays, lines }
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
  it('정류장 하나 · 노선 하나: 「도장포 정류장」 · 「바람의언덕에서 직선 약 380m · 55번」 — 지도는 펼칠 때까지 부르지 않는다', () => {
    render(<BoardingMap boarding={BARAM} />)

    const card = screen.getByRole('region', { name: '타는 곳' })
    const button = within(card).getByRole('button', { expanded: false })
    expect(button).toHaveTextContent('도장포 정류장')
    expect(button).toHaveTextContent('바람의언덕에서 직선 약 380m · 55번')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(loadKakaoMaps).not.toHaveBeenCalled()
    expect(card).not.toHaveTextContent(SOURCE) // 출처는 페이지 맨 아래로 갔다
  })

  it('노선이 여럿이면 「33번 외 4」 — 길 건너편에서 타는 편은 접혀 있어도 알린다', () => {
    render(<BoardingMap boarding={MAEMI} />)

    expect(toggle()).toHaveTextContent('대금교차로 정류장')
    expect(toggle()).toHaveTextContent('매미성에서 직선 약 210m · 33번 외 4')
    expect(screen.getByText('32번 20:37 버스는 길 건너편 정류장에서 타요.')).toBeInTheDocument()
  })

  it('대표 정류장에서 50m 넘게 떨어진 곳에서 타는 편 — 그 거리도 「매미성에서 직선 약」으로 기준을 적는다', () => {
    const far = { ...MAEMI.exceptions[0], nodeId: 'GJB9999', lat: 34.9660, lng: 128.7010, distanceM: 330, gapM: 140 }
    render(<BoardingMap boarding={{ ...MAEMI, exceptions: [far] }} />)

    expect(screen.getByText('32번 20:37 버스는 대금교차로 정류장(매미성에서 직선 약 330m)에서 타요.')).toBeInTheDocument()
    expect(screen.queryByText(/떨어진 곳/)).not.toBeInTheDocument()
  })

  it('노선마다 정류장이 다르면 한 이름으로 뭉개지 않는다 — 「정류장 2곳」', () => {
    render(<BoardingMap boarding={HAKDONG} />)

    expect(toggle()).toHaveTextContent('정류장 2곳')
    expect(toggle()).toHaveTextContent('노선마다 타는 정류장이 달라요')
  })

  it('노선 칩을 고르면 그 노선의 정류장만 — 학동 67-1번은 학동삼거리', () => {
    render(<BoardingMap boarding={HAKDONG} route="67-1" />)

    expect(toggle()).toHaveTextContent('학동삼거리 정류장')
    expect(toggle()).toHaveTextContent('학동몽돌해변에서 직선 약 110m · 67-1번')
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
    expect(toggle()).toHaveTextContent('바람의언덕에서 직선 약 380m')
    expect(toggle()).not.toHaveTextContent('55번')
    // 2026-09-16 — 스팟 → 정류장 도보 길찾기가 바로 열린다(카카오맵 `/link/by/walk/출발/도착`). 우리 지도는 직선거리만 알고 길은 카카오가 그린다.
    const link = screen.getByRole('link', { name: '바람의언덕에서 도장포 정류장까지 카카오맵 도보 길찾기 — 새 창에서 열려요' })
    expect(link).toHaveTextContent('카카오맵으로 도보 길찾기 ↗')
    expect(link).toHaveAttribute(
      'href',
      `https://map.kakao.com/link/by/walk/${encodeURIComponent('바람의언덕')},34.7440458,128.6633111/${encodeURIComponent('도장포 정류장')},34.7426,128.6664`,
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
  })

  it('정류장 하나에 노선 여럿: 「33·32-1·33-2·33-1·32번 모두 여기서 타요」 · 목록 줄(이름 · 약 거리 · 노선 뱃지) · 버튼 하나', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={MAEMI} />)

    await expand(user)
    // 541:436(2026-09-14 저녁 수정) — 노선 번호를 다 적는다. 「노선 5개가 같은 정류장」은 옛 그림.
    expect(toggle()).toHaveTextContent('33·32-1·33-2·33-1·32번 모두 여기서 타요')
    expect(toggle()).not.toHaveTextContent('같은 정류장')
    const row = screen.getByRole('listitem')
    expect(within(row).getByText('대금교차로 정류장')).toBeInTheDocument()
    // 어디서 잰 거리인지 — 접힌 카드와 같은 말투(2026-09-14 사용자 결정: 「약 210m」만으로는 기준을 모른다)
    expect(within(row).getByText('매미성에서 직선 약 210m')).toBeInTheDocument()
    expect(within(row).getAllByText(/^3[23](-\d)?$/)).toHaveLength(5)
    expect(screen.getAllByRole('link', { name: /카카오맵 도보 길찾기/ })).toHaveLength(1)
    expect(screen.getByText('32번 20:37 버스는 길 건너편 정류장에서 타요.')).toBeInTheDocument()
  })

  it('출발이 고현터미널이면 도보 길찾기가 아니라 전처럼 정류장만 넘긴다 — 터미널 앞 30m 는 도보 안내가 뜻이 없다', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={FROM_TERMINAL} />)

    await expand(user)
    const link = screen.getByRole('link', { name: '터미널(일반) 정류장 카카오맵 길찾기 — 새 창에서 열려요' })
    expect(link).toHaveTextContent('카카오맵으로 길찾기 ↗')
    expect(link).not.toHaveTextContent('도보')
    expect(link).toHaveAttribute('href', `https://map.kakao.com/link/to/${encodeURIComponent('터미널(일반) 정류장')},34.8906148,128.6242507`)
  })

  it('정류장이 여럿이면 정류장마다 목록 줄과 길찾기 — 카드 아래 버튼 하나로 어디로 보낼지 정할 수 없다', async () => {
    const user = userEvent.setup()
    render(<BoardingMap boarding={HAKDONG} />)

    await expand(user)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('학동 정류장')).toBeInTheDocument()
    expect(within(rows[0]).getByText('학동몽돌해변에서 직선 약 310m')).toBeInTheDocument()
    expect(within(rows[1]).getByText('학동몽돌해변에서 직선 약 110m')).toBeInTheDocument()
    expect(within(rows[0]).getByRole('link', { name: '학동몽돌해변에서 학동 정류장까지 카카오맵 도보 길찾기 — 새 창에서 열려요' })).toBeInTheDocument()
    expect(within(rows[0]).getByRole('link')).toHaveAttribute(
      'href',
      `https://map.kakao.com/link/by/walk/${encodeURIComponent('학동몽돌해변')},34.774752,128.641498/${encodeURIComponent('학동 정류장')},34.7747,128.6381`,
    )
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
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['33번 외 4', '32 20:37', '매미성'])
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
    const at = (text) => overlays.find((o) => o.options.content.textContent === text).options
    // 옆으로 비킨 마커는 앵커가 아니라 px 이동(transform)으로 옮깁니다 — 태그 실제 폭이 어림과 달라도 자리가 어긋나지 않게.
    const stays = (text) => !at(text).content.style.transform && Math.abs(at(text).yAnchor - ICON_CENTER) < 1e-6
    expect(stays('4000')).toBe(true)
    expect(stays('63번 외 1')).toBe(false)
    expect(stays('22번 외 1')).toBe(true)
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

  /** 점선 한 줄의 끝점 — [출발 곳, 정류장] 위경도. */
  const ends = (line) => line.options.path.map((p) => [p.lat, p.lng])

  it('출발 곳과 정류장을 점선으로 잇는다 — 길이 아니라 직선이라 실선(코스 순서 선)과 다른 모양', async () => {
    const user = userEvent.setup()
    const { kakao, lines } = fakeKakao({ level: 5 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={BARAM} />)
    await expand(user)

    await waitFor(() => expect(lines).toHaveLength(1))
    expect(ends(lines[0])).toEqual([
      [34.7440458, 128.6633111],
      [34.7426, 128.6664],
    ])
    expect(lines[0].options.strokeStyle).toBe('shortdash')
    expect(lines[0].options.strokeWeight).toBe(2)
    expect(lines[0].options.strokeColor).toBe('#0069b3')
    expect(lines[0].options.strokeOpacity).toBeLessThan(1)
  })

  it('정류장이 여럿이면 곳마다 한 줄 — 길 건너편에서 타는 편(예외 핀)에는 긋지 않는다', async () => {
    const user = userEvent.setup()
    const { kakao, lines } = fakeKakao({ level: 5 })
    loadKakaoMaps.mockResolvedValue(kakao)

    const { unmount } = render(<BoardingMap boarding={HAKDONG} />)
    await expand(user)
    await waitFor(() => expect(lines).toHaveLength(2))
    expect(ends(lines[0])[1]).toEqual([34.7747, 128.6381])
    expect(ends(lines[1])[1]).toEqual([34.7756, 128.6411])
    unmount()
    expect(lines[0].setMap).toHaveBeenCalledWith(null)

    lines.length = 0
    render(<BoardingMap boarding={MAEMI} />)
    await expand(user)
    await waitFor(() => expect(lines).toHaveLength(1))
    expect(ends(lines[0])[1]).toEqual([34.9673158, 128.7030327])
  })

  it('출발 곳을 안 찍는 경우(고현터미널 앞 30m)에는 점선도 없다 — 이을 두 점이 한 자리다', async () => {
    const user = userEvent.setup()
    const { kakao, lines } = fakeKakao({ level: 5 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={FROM_TERMINAL} />)
    await expand(user)

    await waitFor(() => expect(loadKakaoMaps).toHaveBeenCalled())
    expect(lines).toHaveLength(0)
  })

  it('출발지가 고현터미널이고 가장 가까운 정류장이 30m 안이면 출발 곳을 찍지 않는다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 5 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={FROM_TERMINAL} />)
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['55번 외 1'])
    expect(map.setLevel).not.toHaveBeenCalled()
  })

  it('고현터미널 → 김영삼 생가 — 북동쪽 70m 2000번 마커가 겹치면 위로 비킨다(아래로 내리면 북쪽 정류장이 남쪽에 그려진다)', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3, pxPerDeg: 30000 })
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

  it('거제씨월드 — 26m 떨어진 두 지세포(거의 같은 높이)는 옆으로 나란히 · 위로 비키면 신촌 마커와 부딪힌다(운영 실측, 2026-09-14)', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 5, pxPerDeg: 10000 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(
      <BoardingMap
        boarding={{
          from: { name: '거제씨월드', kind: 'SPOT', lat: 34.8358552, lng: 128.7014662 },
          stops: [
            { nodeId: 'GJB1657', name: '지세포', lat: 34.828869, lng: 128.702914, distanceM: 788, routes: ['4000'] },
            { nodeId: 'GJB901', name: '신촌', lat: 34.8345, lng: 128.69975167, distanceM: 217, routes: ['23-1', '23', '22', '25-1', '25', '24-1'] },
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
    const at = (text) => overlays.find((o) => o.options.content.textContent === text).options
    expect(at('4000').content.style.transform).toBe('')
    expect(at('23-1번 외 5').content.style.transform).toBe('')
    expect(at('63번 외 1').yAnchor).toBeCloseTo(ICON_CENTER) // 높이는 그대로
    expect(at('63번 외 1').content.style.transform).toMatch(/^translateX\(/) // 옆으로
    expect(at('63번 외 1').xAnchor).toBe(0.5) // 앵커는 늘 가운데 — 옆 이동은 px 로
  })

  it('비킨 마커가 지도 칸(180px) 밖으로 나가면 반대쪽으로 — 매미성 대금교차로가 지도 아래쪽에 있을 때', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3, pxPerDeg: 10000 })
    loadKakaoMaps.mockResolvedValue(kakao)
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 180 })
    try {
      // y = (35 - 위도) × 12000 → 대표 정류장 150px, 길 건너편은 0.6px 남쪽
      render(
        <BoardingMap
          boarding={{
            from: { name: '매미성', kind: 'SPOT', lat: 34.99, lng: 128.62 },
            stops: [{ nodeId: 'GJB1599', name: '대금교차로', lat: 34.9875, lng: 128.61, distanceM: 213, routes: ['33', '32'] }],
            exceptions: [
              { routeNo: '32', depart: '20:37', nodeId: 'GJB1621', name: '대금교차로', lat: 34.98745, lng: 128.61, distanceM: 218, mainNodeId: 'GJB1599', gapM: 6 },
            ],
            unresolved: [],
            source: SOURCE,
          }}
        />,
      )
      await expand(user)

      await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
      const opposite = overlays.find((o) => o.options.content.textContent === '32 20:37')
      expect(opposite.options.yAnchor).toBeGreaterThan(1) // 아래(150 + 39 ~ 90px)는 칸 밖이라 위로
    } finally {
      if (height) Object.defineProperty(HTMLElement.prototype, 'clientHeight', height)
      else delete HTMLElement.prototype.clientHeight
    }
  })

  it('화면 맞추기 여백에 마커 몸통을 넣는다 — 좌표는 아이콘 가운데라 태그가 아래로 37px 내려온다', async () => {
    const user = userEvent.setup()
    const { kakao, map } = fakeKakao({ level: 5 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={BARAM} />)
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const [, top, right, bottom, left] = map.setBounds.mock.calls[0]
    expect(bottom).toBeGreaterThanOrEqual(28 + 37)
    expect(top).toBeGreaterThanOrEqual(28 + 14)
    expect(left).toBeGreaterThanOrEqual(28 + 14)
    expect(right).toBeGreaterThanOrEqual(28 + 14)
  })

  it('어느 쪽으로 비켜도 부딪히면 가장 덜 겹치는 칸 — 제자리가 12px 겹치고 아래가 37px 겹치면 제자리(운영 거제씨월드 신촌 · 4000)', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 5, pxPerDeg: 10000 })
    loadKakaoMaps.mockResolvedValue(kakao)
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
    const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 180 })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 110 })
    try {
      // y = (35 - 위도) × 12000 · x = (경도 - 128.6) × 10000, 지도 칸 110 × 180
      // 4000: (40, 79) · 신촌: (21, 40) — 위로 비키면 칸 밖(40 - 67 < 0), 아래로 비키면 4000과 37px 겹침,
      // 왼쪽 · 오른쪽으로 비키면 칸 밖(폭 110), 제자리는 12px 겹침
      render(
        <BoardingMap
          boarding={{
            from: { name: '거제씨월드', kind: 'SPOT', lat: 35 - 170 / 12000, lng: 128.74 },
            stops: [
              { nodeId: 'GJB1657', name: '지세포', lat: 35 - 79 / 12000, lng: 128.604, distanceM: 788, routes: ['4000'] },
              { nodeId: 'GJB901', name: '신촌', lat: 35 - 40 / 12000, lng: 128.6021, distanceM: 217, routes: ['23-1', '23', '22', '25-1', '25', '24-1'] },
            ],
            exceptions: [],
            unresolved: [],
            source: SOURCE,
          }}
        />,
      )
      await expand(user)

      await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
      const sinchon = overlays.find((o) => o.options.content.textContent === '23-1번 외 5')
      expect(sinchon.options.yAnchor).toBeCloseTo(ICON_CENTER)
      expect(sinchon.options.content.style.transform).toBe('')
    } finally {
      if (height) Object.defineProperty(HTMLElement.prototype, 'clientHeight', height)
      else delete HTMLElement.prototype.clientHeight
      if (width) Object.defineProperty(HTMLElement.prototype, 'clientWidth', width)
      else delete HTMLElement.prototype.clientWidth
    }
  })

  it('가로로 더 떨어져 겹친 마커는 옆으로 비킨다 — 동쪽이면 오른쪽, 높이는 그대로', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 5, pxPerDeg: 10000 })
    loadKakaoMaps.mockResolvedValue(kakao)
    // A: (1000, 600) · B: 동쪽 20px · 남쪽 5px — 상자가 겹친다
    render(
      <BoardingMap
        boarding={{
          from: { name: '어딘가', kind: 'SPOT', lat: 34.9, lng: 128.9 },
          stops: [
            { nodeId: 'A', name: 'A', lat: 35 - 600 / 12000, lng: 128.7, distanceM: 100, routes: ['55'] },
            { nodeId: 'B', name: 'B', lat: 35 - 605 / 12000, lng: 128.702, distanceM: 100, routes: ['67-1'] },
          ],
          exceptions: [],
          unresolved: [],
          source: SOURCE,
        }}
      />,
    )
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const b = overlays.find((o) => o.options.content.textContent === '67-1').options
    expect(b.yAnchor).toBeCloseTo(ICON_CENTER)
    // 내용이 좌표보다 오른쪽으로 — 앵커(내용 폭의 비율)로 옮기면 실제 폭이 어림과 다른 만큼 자리가 어긋나서(운영 거제씨월드 「63번 외 1」이
    // 「4000」에 1px 걸쳤다, 2026-09-14 저녁) px 로 옮깁니다.
    expect(b.xAnchor).toBe(0.5)
    expect(b.content.style.transform).toMatch(/^translateX\(\d+(\.\d+)?px\)$/)
  })
})


/**
 * 출발 곳이 스팟이면 점 + 이름 대신 **스팟 썸네일**(24px 원, 글자 없음) — 2026-09-15 사용자 결정.
 * 글자 라벨은 카카오 지도 자체 라벨(「학동 흑진주몽돌」)과 겹쳐 두 번 말했고, 홈 지도가 스팟을 사진 핀으로 그리므로 같은 모양으로 맞춘다.
 * 고현터미널 출발은 그대로 점 + 이름이고, 스팟 정보를 못 받으면(목록 실패) 점 + 이름으로 남는다 — 기준점을 비우지 않는다.
 */
describe('BoardingMap — 출발 곳 썸네일', () => {
  const PHOTO = 'https://tong.visitkorea.or.kr/maemi.jpg'
  const CASTLE = { thumbnailUrl: PHOTO, theme: 'CASTLE' }

  it('스팟 출발 + 스팟 정보 → 사진 원 하나 · 이름 글자 없음 · 앵커는 가운데 · 화면 맞추기에 든다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<BoardingMap boarding={MAEMI} fromSpot={CASTLE} />)
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const from = overlays[2]
    const img = from.options.content.querySelector('img')
    expect(img.getAttribute('src')).toBe(PHOTO)
    expect(img.getAttribute('alt')).toBe('')
    expect(from.options.content.textContent).toBe('')
    expect(from.options.yAnchor).toBe(0.5)
    expect(map.setBounds.mock.calls[0][0].points).toHaveLength(3)
  })

  it('사진이 없는 스팟(저작권 Type3)은 분류 자리그림이고, 사진 링크가 죽어도 자리그림으로 돌아온다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)

    const { unmount } = render(<BoardingMap boarding={MAEMI} fromSpot={{ thumbnailUrl: null, theme: 'CASTLE' }} />)
    await expand(user)
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(overlays[2].options.content.querySelector('img').getAttribute('src')).toBe(courseImageFallback({ theme: 'CASTLE' }))
    unmount()

    overlays.length = 0
    map.setBounds.mockClear()
    render(<BoardingMap boarding={MAEMI} fromSpot={CASTLE} />)
    await expand(user)
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const img = overlays[2].options.content.querySelector('img')
    img.dispatchEvent(new Event('error'))
    expect(img.getAttribute('src')).toBe(courseImageFallback({ theme: 'CASTLE' }))
  })

  it('스팟 정보가 없으면 점 + 이름 그대로 · 고현터미널 출발은 스팟 정보가 와도 점 + 이름', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)

    const { unmount } = render(<BoardingMap boarding={MAEMI} />)
    await expand(user)
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    expect(overlays[2].options.content.textContent).toBe('매미성')
    expect(overlays[2].options.content.querySelector('img')).toBeNull()
    unmount()

    overlays.length = 0
    map.setBounds.mockClear()
    render(
      <BoardingMap
        boarding={{ ...FROM_TERMINAL, stops: [{ nodeId: 'GJB370', name: '터미널(순환)', lat: 34.8916, lng: 128.6242, distanceM: 110, routes: ['100'] }] }}
        fromSpot={CASTLE}
      />,
    )
    await expand(user)
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const terminal = overlays.find((o) => o.options.content.textContent === '고현터미널')
    expect(terminal).toBeDefined()
    expect(terminal.options.content.querySelector('img')).toBeNull()
  })

  it('썸네일이 마커와 겹치면 자기 높이(24px)로 비킨다', async () => {
    const user = userEvent.setup()
    const { kakao, map, overlays } = fakeKakao({ level: 3, pxPerDeg: 100000 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(
      <BoardingMap
        boarding={{
          from: { name: '어딘가', kind: 'SPOT', lat: 34.8906, lng: 128.6242 },
          // 5px 옆 · 4px 위 — 점 + 이름표는 오른쪽으로 길어 38px 옆 정류장과도 겹쳤지만, 썸네일은 24px 원이라 더 붙어야 겹친다
          stops: [{ nodeId: 'GJB370', name: '어딘가 앞', lat: 34.89063, lng: 128.62425, distanceM: 6, routes: ['100'] }],
          exceptions: [],
          unresolved: [],
          source: SOURCE,
        }}
        fromSpot={CASTLE}
      />,
    )
    await expand(user)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalled())
    const from = overlays.find((o) => o.options.content.querySelector('img'))
    // 마커 박스(좌표 기준 -14 ~ +37px) 밖으로: 아래면 원 윗변이 +39px(= -39/24), 위면 원 아랫변이 -16px(= 40/24)
    expect(Math.abs(from.options.yAnchor - -39 / 24) < 1e-6 || Math.abs(from.options.yAnchor - 40 / 24) < 1e-6).toBe(true)
  })
})
