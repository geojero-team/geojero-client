import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import CourseMiniMap from './CourseMiniMap'

vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn() }))

const STOPS = [
  { seq: 1, poiId: 4, shortName: '학동몽돌해변', theme: 'BEACH', lat: 34.774752, lng: 128.641498, thumbnailUrl: 'https://tong.visitkorea.or.kr/hakdong.jpg' },
  { seq: 2, poiId: 3, shortName: '해금강', theme: 'VIEW', lat: 34.7333, lng: 128.6839, thumbnailUrl: 'https://tong.visitkorea.or.kr/haegeumgang.jpg' },
  { seq: 3, poiId: 1, shortName: '바람의언덕', theme: 'VIEW', lat: 34.7440458, lng: 128.6633111, thumbnailUrl: null },
]

function fakeKakao({ pxPerDeg = null, fitLevel = 8 } = {}) {
  const overlays = []
  const polylines = []
  const created = []
  // SDK 흉내: 지도 안쪽에서 휠을 듣고(onWheel), 확대 컨트롤은 칸 안에 <button>을 넣습니다(실제 SDK 4.5: title 「확대」·「축소」).
  const map = {
    setBounds: vi.fn(),
    getLevel: vi.fn(() => fitLevel),
    setLevel: vi.fn(),
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

const badgeOf = (overlay) => overlay.options.content.querySelector('span').textContent
const imgOf = (overlay) => overlay.options.content.querySelector('img')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CourseMiniMap — 코스 상세 300px 지도 (09-16: 스팟에만 맞춤 · 사진 핀 · 선 없음)', () => {
  // 치수(높이 300 · 사진 32 · 배지 18)는 CSS 모듈이라 여기서 재지 않습니다 — jsdom 은 레이아웃을 계산하지 않고 클래스 이름만 옵니다.
  it('스팟마다 사진 핀 + 번호 배지를 찍고, 스팟에만 맞춘다 — 고현터미널은 틀에도 지도에도 없다', async () => {
    const { kakao, map, overlays } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(overlays).toHaveLength(3))
    expect(overlays.map(badgeOf)).toEqual(['1', '2', '3'])
    // 사진은 타임라인 줄과 같은 출처 — /api/pois 대표 사진, 없으면 분류 자리그림(data URI)
    expect(imgOf(overlays[0]).getAttribute('src')).toBe(STOPS[0].thumbnailUrl)
    expect(imgOf(overlays[2]).getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(overlays.every((o) => o.options.map === map && o.options.xAnchor === 0.5 && o.options.yAnchor === 0.5)).toBe(true)
    expect(map.setBounds).toHaveBeenCalledTimes(1)
    expect(map.setBounds.mock.calls[0][0].points.map(({ lat, lng }) => [lat, lng])).toEqual(STOPS.map(({ lat, lng }) => [lat, lng]))
  })

  it('사진 링크가 죽으면 분류 자리그림으로 바꾼다', async () => {
    const { kakao, overlays } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(overlays).toHaveLength(3))
    const img = imgOf(overlays[0])
    fireEvent.error(img)
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  })

  it('스팟이 붙어 있어 맞춘 배율이 너무 가까우면 최소 배율로 물린다 — 골목까지 들어가지 않게', async () => {
    const { kakao, map } = fakeKakao({ fitLevel: 3 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalledTimes(1))
    expect(map.setLevel).toHaveBeenCalledWith(5)
  })

  it('맞춘 배율이 충분히 멀면 그대로 둔다', async () => {
    const { kakao, map } = fakeKakao({ fitLevel: 8 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(map.setBounds).toHaveBeenCalledTimes(1))
    expect(map.setLevel).not.toHaveBeenCalled()
  })

  it('끌기 · 두 손가락 확대 · 더블탭 · +/- 버튼은 된다 — 잠그는 옵션을 쓰지 않는다', async () => {
    const { kakao, map, created } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} />)

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

    render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(created).toHaveLength(1))
    // fireEvent 는 preventDefault 가 불리면 false 를 돌려준다 — 기본 동작(페이지 스크롤)은 살아 있어야 한다.
    expect(fireEvent.wheel(map.container, { deltaY: 120 })).toBe(true)
    expect(map.onWheel).not.toHaveBeenCalled()
  })

  it('SDK 확대·축소 버튼은 읽기 도구에 숨긴 칸 안에 있으므로 탭 순서에서 뺀다', async () => {
    const { kakao, map, created } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    const { container } = render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(created).toHaveLength(1))
    const buttons = container.querySelectorAll('[aria-hidden="true"] button')
    expect(buttons).toHaveLength(1)
    expect(map.container.querySelector('button').tabIndex).toBe(-1)
  })

  it('순서 선을 긋지 않는다 — 순서는 번호 배지가 말하고, 직선은 바다를 건너 길처럼 읽혔다(2026-09-16 사용자 결정)', async () => {
    const { kakao, overlays, polylines } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(overlays).toHaveLength(3))
    expect(polylines).toHaveLength(0)
  })

  it('스팟이 하나면 핀 하나', async () => {
    const { kakao, overlays } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={[STOPS[0]]} />)

    await waitFor(() => expect(overlays).toHaveLength(1))
    expect(badgeOf(overlays[0])).toBe('1')
  })

  it('SDK를 못 불러오면 지도 칸에 한 줄 — 읽기 도구에는 지도를 숨긴다', async () => {
    loadKakaoMaps.mockRejectedValue(new Error('no sdk'))
    const { container } = render(<CourseMiniMap stops={STOPS} />)

    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  // 코스에 맞춘 배율 흉내 — 3-01(학동 → 해금강 가로 0.043도)이 350px 칸에 들어오면 도당 약 6000px. 그때 113m 는 6px, 해금강 → 바람의언덕 2.3km 는 140px.
  it('화면에서 사진 핀이 포개지면 한 핀에 번호를 합쳐 적는다 — 조선해양문화관 · 거제씨월드(113m)는 코스 배율에서 6px 차이. 사진은 앞 스팟 것', async () => {
    const { kakao, overlays } = fakeKakao({ pxPerDeg: 6000 })
    loadKakaoMaps.mockResolvedValue(kakao)
    const stops = [
      { seq: 1, poiId: 4, shortName: '학동몽돌해변', theme: 'BEACH', lat: 34.774752, lng: 128.641498, thumbnailUrl: null },
      { seq: 2, poiId: 20, shortName: '조선해양문화관', theme: 'EXHIBIT', lat: 34.834849, lng: 128.701634, thumbnailUrl: 'https://tong.visitkorea.or.kr/museum.jpg' },
      { seq: 3, poiId: 18, shortName: '거제씨월드', theme: 'EXHIBIT', lat: 34.8358552, lng: 128.7014662, thumbnailUrl: 'https://tong.visitkorea.or.kr/seaworld.jpg' },
    ]

    render(<CourseMiniMap stops={stops} />)

    await waitFor(() => expect(overlays.map(badgeOf)).toEqual(['1', '2·3']))
    expect(imgOf(overlays[1]).getAttribute('src')).toBe(stops[1].thumbnailUrl)
  })

  it('떨어진 핀은 합치지 않는다 — 해금강 · 바람의언덕은 코스 배율에서 140px', async () => {
    const { kakao, overlays } = fakeKakao({ pxPerDeg: 6000 })
    loadKakaoMaps.mockResolvedValue(kakao)

    render(<CourseMiniMap stops={STOPS} />)

    await waitFor(() => expect(overlays.map(badgeOf)).toEqual(['1', '2', '3']))
  })
})
