import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import PlaceMap from './PlaceMap'

vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn() }))

const PLACE = { name: '호텔상상', kind: 'STAY', lat: 34.8476, lng: 128.7099 }
const SPOT2 = { poiId: 20, shortName: '조선해양문화관', lat: 34.8245, lng: 128.7044, thumbnailUrl: null, theme: 'EXHIBIT' }
const SPOT = { poiId: 18, shortName: '거제씨월드', lat: 34.8359, lng: 128.7015, thumbnailUrl: 'https://tong.visitkorea.or.kr/seaworld.jpg', theme: 'EXHIBIT' }

function fakeKakao({ fitLevel = 5 } = {}) {
  const overlays = []
  const created = []
  const map = { setBounds: vi.fn(), setZoomable: vi.fn(), getLevel: vi.fn(() => fitLevel), setLevel: vi.fn() }
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

describe('맛집 · 숙소 위치 지도', () => {
  it('누르면 카카오맵에서 그곳을 크게 연다(새 창)', () => {
    loadKakaoMaps.mockReturnValue(new Promise(() => {}))
    render(<PlaceMap place={PLACE} spots={[SPOT]} />)
    const link = screen.getByRole('link', { name: /호텔상상.*카카오맵/ })
    expect(link).toHaveAttribute('href', `https://map.kakao.com/link/map/${encodeURIComponent('호텔상상')},34.8476,128.7099`)
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('움직이지 않는 지도에 그곳 핀과 가까운 스팟 사진 핀을 찍고, 다 보이게 맞춘다', async () => {
    const { kakao, map, overlays, created } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)
    render(<PlaceMap place={PLACE} spots={[SPOT]} />)
    await waitFor(() => expect(overlays).toHaveLength(2))
    expect(created[0]).toMatchObject({ draggable: false, scrollwheel: false, disableDoubleClickZoom: true })
    expect(map.setBounds).toHaveBeenCalledTimes(1)
    expect(map.setBounds.mock.calls[0][0].points).toHaveLength(2)
    const spotPin = overlays.map((o) => o.options.content).find((el) => el.tagName === 'IMG')
    expect(spotPin.getAttribute('src')).toBe('https://tong.visitkorea.or.kr/seaworld.jpg')
    // 이름표는 없다 — 바로 아래 「가까운 스팟」 목록이 같은 사진으로 이름을 말한다(가까운 두 스팟 이름표가 겹쳤다)
    expect(spotPin.textContent).toBe('')
  })

  it('두 곳이 아주 가까우면 골목까지 들어가지 않게 배율을 4 에서 멈춘다(주변 길이 보이게)', async () => {
    const { kakao, map } = fakeKakao({ fitLevel: 2 })
    loadKakaoMaps.mockResolvedValue(kakao)
    render(<PlaceMap place={PLACE} spots={[SPOT]} />)
    await waitFor(() => expect(map.setLevel).toHaveBeenCalledWith(4))
  })

  it('맞춘 배율이 4 보다 멀면 그대로 둔다', async () => {
    const { kakao, map, overlays } = fakeKakao({ fitLevel: 6 })
    loadKakaoMaps.mockResolvedValue(kakao)
    render(<PlaceMap place={PLACE} spots={[SPOT]} />)
    await waitFor(() => expect(overlays).toHaveLength(2))
    expect(map.setLevel).not.toHaveBeenCalled()
  })

  it('가까운 스팟이 여럿이면 전부 찍고 전부 보이게 맞춘다', async () => {
    const { kakao, map, overlays } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)
    render(<PlaceMap place={PLACE} spots={[SPOT, SPOT2]} />)
    await waitFor(() => expect(overlays).toHaveLength(3))
    expect(map.setBounds.mock.calls[0][0].points).toHaveLength(3)
  })

  it('가까운 스팟이 없으면 그곳 핀 하나만, 그곳을 가운데로', async () => {
    const { kakao, map, overlays } = fakeKakao()
    loadKakaoMaps.mockResolvedValue(kakao)
    render(<PlaceMap place={PLACE} spots={[]} />)
    await waitFor(() => expect(overlays).toHaveLength(1))
    expect(map.setBounds).not.toHaveBeenCalled()
  })

  it('지도 도구를 못 받으면 칸째 사라진다 — 빈 회색 칸을 남기지 않는다', async () => {
    loadKakaoMaps.mockRejectedValue(new Error('no sdk'))
    const { container } = render(<PlaceMap place={PLACE} spots={[SPOT]} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
