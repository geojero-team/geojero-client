import { render, screen, waitFor } from '@testing-library/react'
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
  const created = []
  const map = { setBounds: vi.fn() }
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
  return { kakao, map, overlays, created }
}

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

  it('요약 지도라 끌거나 확대하지 않는다 — 페이지 스크롤을 뺏지 않게', async () => {
    const { kakao, created } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} terminal={TERMINAL} />)

    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0]).toMatchObject({ draggable: false, scrollwheel: false, disableDoubleClickZoom: true })
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
