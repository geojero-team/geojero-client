import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import CourseMiniMap from './CourseMiniMap'

vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn() }))

const STOPS = [
  { seq: 1, poiId: 4, shortName: '학동몽돌해변', lat: 34.774752, lng: 128.641498 },
  { seq: 2, poiId: 3, shortName: '해금강', lat: 34.7333, lng: 128.6839 },
  { seq: 3, poiId: 1, shortName: '바람의언덕', lat: 34.7440458, lng: 128.6633111 },
]
const TERMINAL = { lat: 34.8906148, lng: 128.6242507 }

function fakeKakao({ pxPerDeg = null } = {}) {
  const overlays = []
  const polylines = []
  const created = []
  // SDK 흉내: 지도 안쪽에서 휠을 듣고(onWheel), 확대 컨트롤은 칸 안에 <button>을 넣습니다(실제 SDK 4.5: title 「확대」·「축소」).
  const map = {
    setBounds: vi.fn(),
    onWheel: vi.fn(),
    container: null,
    addControl: vi.fn(() => {
      const button = document.createElement('button')
      button.type = 'button'
      button.title = '확대'
      map.container.append(button)
    }),
  }
  if (pxPerDeg) {
    map.getProjection = () => ({
      containerPointFromCoords: (latLng) => ({ x: (latLng.lng - 128.6) * pxPerDeg, y: (35.0 - latLng.lat) * pxPerDeg }),
    })
  }
  const kakao = {
    maps: {
      Map: class {
        constructor(container, options) {
          created.push(options)
          map.container = container
          container.addEventListener('wheel', map.onWheel)
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
          polylines.push(this)
        }
      },
      ZoomControl: class {},
      ControlPosition: { RIGHT: 'RIGHT' },
    },
  }
  return { kakao, map, overlays, polylines, created }
}

const pathOf = (polyline) => polyline.options.path.map(({ lat, lng }) => [lat, lng])

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CourseMiniMap — 코스 상세 220px 지도(532:324)', () => {
  it('번호 핀(순서) + 번호 없는 고현터미널 핀을 찍고, 전부 들어오게 맞춘다', async () => {
    const { kakao, map, overlays } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    await waitFor(() => expect(overlays).toHaveLength(4))
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['', '1', '2', '3'])
    expect(overlays.every((o) => o.options.map === map && o.options.yAnchor === 0.5)).toBe(true)
    expect(map.setBounds).toHaveBeenCalledTimes(1)
    expect(map.setBounds.mock.calls[0][0].points).toHaveLength(4)
  })

  it('끌기 · 두 손가락 확대 · 더블탭 · +/- 버튼은 된다 — 잠그는 옵션을 쓰지 않는다', async () => {
    const { kakao, map, created } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    await waitFor(() => expect(created).toHaveLength(1))
    // scrollwheel:false 는 SDK가 마우스 휠과 두 손가락 확대를 한 스위치로 묶은 옵션이라 쓰면 폰에서 확대가 안 된다.
    expect(created[0].scrollwheel).not.toBe(false)
    expect(created[0].draggable).not.toBe(false)
    expect(created[0].disableDoubleClickZoom).not.toBe(true)
    expect(map.addControl).toHaveBeenCalledTimes(1)
    expect(map.addControl.mock.calls[0][0]).toBeInstanceOf(kakao.maps.ZoomControl)
    expect(map.addControl.mock.calls[0][1]).toBe('RIGHT')
  })

  it('마우스 휠은 지도에 닿기 전에 멈추고 페이지 스크롤은 그대로 — PC에서 스크롤이 지도에 잡히지 않게', async () => {
    const { kakao, map, created } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    await waitFor(() => expect(created).toHaveLength(1))
    // fireEvent 는 preventDefault 가 불리면 false 를 돌려준다 — 기본 동작(페이지 스크롤)은 살아 있어야 한다.
    expect(fireEvent.wheel(map.container, { deltaY: 120 })).toBe(true)
    expect(map.onWheel).not.toHaveBeenCalled()
  })

  it('SDK 확대·축소 버튼은 읽기 도구에 숨긴 칸 안에 있으므로 탭 순서에서 뺀다', async () => {
    const { kakao, map, created } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    const { container } = render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    await waitFor(() => expect(created).toHaveLength(1))
    const buttons = container.querySelectorAll('[aria-hidden="true"] button')
    expect(buttons).toHaveLength(1)
    expect(map.container.querySelector('button').tabIndex).toBe(-1)
  })

  it('고현터미널 → 1 → 2 → 3 → 고현터미널을 한 선으로 잇는다 — 코스 지도와 같은 파란 선', async () => {
    const { kakao, map, polylines } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    const { unmount } = render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    await waitFor(() => expect(polylines).toHaveLength(1))
    expect(pathOf(polylines[0])).toEqual([
      [TERMINAL.lat, TERMINAL.lng],
      [STOPS[0].lat, STOPS[0].lng],
      [STOPS[1].lat, STOPS[1].lng],
      [STOPS[2].lat, STOPS[2].lng],
      [TERMINAL.lat, TERMINAL.lng],
    ])
    expect(polylines[0].options).toMatchObject({ map, strokeWeight: 2.5, strokeColor: '#0069b3', strokeStyle: 'solid' })

    unmount()
    expect(polylines[0].setMap).toHaveBeenCalledWith(null)
  })

  it('고현터미널 좌표가 없으면 스팟끼리만 잇는다', async () => {
    const { kakao, polylines } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} terminal={null} />)

    await waitFor(() => expect(polylines).toHaveLength(1))
    expect(pathOf(polylines[0])).toEqual(STOPS.map(({ lat, lng }) => [lat, lng]))
  })

  it('이을 점이 하나뿐이면 선을 긋지 않는다', async () => {
    const { kakao, overlays, polylines } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={[STOPS[0]]} terminal={null} />)

    await waitFor(() => expect(overlays).toHaveLength(1))
    expect(polylines).toHaveLength(0)
  })

  it('고현터미널 좌표가 없으면 스팟 핀만', async () => {
    const { kakao, overlays } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} terminal={null} />)

    await waitFor(() => expect(overlays).toHaveLength(3))
    expect(overlays.map((o) => o.options.content.textContent)).toEqual(['1', '2', '3'])
  })

  it('SDK를 못 불러오면 지도 칸에 한 줄 — 읽기 도구에는 지도를 숨긴다', async () => {
    loadKakaoMaps.mockRejectedValue(new Error('no sdk'))
    const { container } = render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('화면에서 번호 핀이 포개지면 한 핀에 번호를 합쳐 적는다 — 조선해양문화관 · 거제씨월드(113m)가 섬 배율에서 1px 차이', async () => {
    const { kakao, overlays } = fakeKakao({ pxPerDeg: 900 })
    loadKakaoMaps.mockResolvedValue(kakao)
    const stops = [
      { seq: 1, poiId: 4, shortName: '학동몽돌해변', lat: 34.774752, lng: 128.641498 },
      { seq: 2, poiId: 20, shortName: '조선해양문화관', lat: 34.834849, lng: 128.701634 },
      { seq: 3, poiId: 18, shortName: '거제씨월드', lat: 34.8358552, lng: 128.7014662 },
    ]

    render(<CourseMiniMap stops={stops} terminal={TERMINAL} />)

    await waitFor(() => expect(overlays.map((o) => o.options.content.textContent)).toEqual(['', '1', '2·3']))
  })

  it('떨어진 핀은 합치지 않는다', async () => {
    const { kakao, overlays } = fakeKakao({ pxPerDeg: 900 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    await waitFor(() => expect(overlays.map((o) => o.options.content.textContent)).toEqual(['', '1', '2', '3']))
  })
})
