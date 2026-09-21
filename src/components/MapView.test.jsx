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
 * 핀을 누르면 배율을 8km(레벨 9)로 맞추는데, 처음 한 번은 지도가 **전체 맞추기 배율**이라 그 확대가 실제로 일어난다.
 * 2026-09-22 사용자: *"처음 스팟 누르면 거기 중심으로 확대 안 되고 엉뚱한 곳으로 확대됨(두 번째부터는 정상)."*
 *
 * ⚠️ **애니메이션 확대는 뒤따르는 `panTo` 를 삼킨다**(운영 실측 — 첫 탭에서 핀이 누르기 전 자리 그대로 남고,
 * 시트가 열리며 ResizeObserver 가 부르는 `setCenter` 까지 함께 묻힌다). 두 번째부터 멀쩡해 보인 이유는
 * 이미 레벨 9 라 확대가 통째로 생략돼 `panTo` 만 돌았기 때문이다.
 * → 확대해야 할 때는 **먼저 가운데를 고른 핀으로 옮기고** 확대한다. 확대가 그 자리에서 시작해 그 자리에서 끝난다.
 */
describe('MapView — 핀을 눌렀을 때의 확대', () => {
  it('확대해야 하면 가운데를 먼저 고른 핀으로 옮긴다 — 확대가 panTo 를 삼킨다', async () => {
    const fake = fakeKakao({ level: 10 })
    const { rerender } = await mountReady(fake)

    rerender(<MapView spots={SPOTS} selectedSpotId={7} />)

    await waitFor(() => expect(fake.map.setLevel).toHaveBeenCalled())
    const center = fake.map.setCenter.mock.calls.at(-1)[0]
    expect(center.lat).toBe(34.9682131)
    expect(center.lng).toBe(128.7050934)
    expect(fake.map.setLevel.mock.calls.at(-1)[0]).toBe(9)
    // 순서가 중요하다 — 확대가 시작된 뒤에 옮기면 그 이동이 묻힌다.
    expect(fake.map.setCenter.mock.invocationCallOrder.at(-1)).toBeLessThan(
      fake.map.setLevel.mock.invocationCallOrder.at(-1),
    )
  })

  it('이미 8km 배율이면 확대하지 않고 미끄러져 간다', async () => {
    const fake = fakeKakao({ level: 9 })
    const { rerender } = await mountReady(fake)

    rerender(<MapView spots={SPOTS} selectedSpotId={4} />)

    await waitFor(() => expect(fake.map.panTo).toHaveBeenCalled())
    expect(fake.map.panTo.mock.calls.at(-1)[0].lat).toBe(34.774752)
    expect(fake.map.setLevel).not.toHaveBeenCalled()
  })
})
