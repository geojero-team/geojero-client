import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from '../lib/kakaoLoader'
import MapView from './MapView'

vi.mock('../lib/kakaoLoader', () => ({ loadKakaoMaps: vi.fn() }))

const SPOTS = [
  { spotId: 4, poiId: 4, kind: 'SPOT', theme: 'BEACH', shortName: '학동몽돌해변', lat: 34.774752, lng: 128.641498 },
  { spotId: 7, poiId: 7, kind: 'SPOT', theme: 'VIEW', shortName: '매미성', lat: 34.9682131, lng: 128.7050934 },
]

/**
 * 카카오 지도 대신. `getProjection` 을 일부러 두지 않습니다 — `updateLabelVisibility` 가
 * 그때 일찍 되돌아가므로(mapPins.js) 이름표 계산 없이 지도 조작만 볼 수 있습니다.
 */
function fakeKakao({ level = 10 } = {}) {
  const map = {
    setBounds: vi.fn(),
    getLevel: vi.fn(() => level),
    setLevel: vi.fn(),
    relayout: vi.fn(),
    panTo: vi.fn(),
    setCenter: vi.fn(),
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
          this.getPosition = () => options.position
        }
      },
      Polyline: class {
        constructor(options) {
          this.options = options
          this.setMap = vi.fn()
        }
      },
      event: { addListener: vi.fn() },
    },
  }
  return { kakao, map }
}

let originalResizeObserver

beforeEach(() => {
  vi.clearAllMocks()
  originalResizeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver
  delete window.kakao
})

async function mountReady(fake, props = {}) {
  loadKakaoMaps.mockResolvedValue(fake.kakao)
  window.kakao = fake.kakao
  const view = render(<MapView spots={SPOTS} selectedSpotId={null} {...props} />)
  await waitFor(() => expect(fake.map.setBounds).toHaveBeenCalled())
  return view
}

/**
 * 핀을 누르면 배율을 8km(레벨 9)로 맞추는데, 처음 한 번은 지도가 **전체 맞추기 배율**(10)이라 그 확대가 실제로 일어난다.
 * 2026-09-22 사용자: *"처음 스팟 누르면 거기 중심으로 확대 안 되고 엉뚱한 곳으로 확대됨(두 번째부터는 정상)."*
 * 원인은 `setLevel` 에 기준점을 주지 않은 것 — 카카오는 그러면 **지도 한가운데**를 축으로 확대하고,
 * 그 가운데는 섬 전체를 맞춰 둔 자리라 고른 핀과 멀다. 두 번째부터는 이미 레벨 9 라 확대가 생략돼 이동만 보였다.
 */
describe('MapView — 핀을 눌렀을 때의 확대', () => {
  it('고른 핀을 축으로 확대한다 — 지도 한가운데가 아니다', async () => {
    const fake = fakeKakao({ level: 10 })
    const { rerender } = await mountReady(fake)

    rerender(<MapView spots={SPOTS} selectedSpotId={7} />)

    await waitFor(() => expect(fake.map.setLevel).toHaveBeenCalled())
    const [level, options] = fake.map.setLevel.mock.calls.at(-1)
    expect(level).toBe(9)
    expect(options.anchor.lat).toBe(34.9682131)
    expect(options.anchor.lng).toBe(128.7050934)
    // 확대가 끝나면 고른 핀을 가운데로 보낸다(시트가 올라오는 동안 ResizeObserver 가 다시 맞춘다).
    expect(fake.map.panTo).toHaveBeenCalled()
  })

  it('이미 8km 배율이면 확대하지 않는다 — 이동만', async () => {
    const fake = fakeKakao({ level: 9 })
    const { rerender } = await mountReady(fake)

    rerender(<MapView spots={SPOTS} selectedSpotId={4} />)

    await waitFor(() => expect(fake.map.panTo).toHaveBeenCalled())
    expect(fake.map.setLevel).not.toHaveBeenCalled()
  })
})
