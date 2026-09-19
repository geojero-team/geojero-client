import { describe, expect, it, vi } from 'vitest'
import { createPinElement, updateLabelVisibility } from './mapPins'
import styles from './MapView.module.css'

const TERMINAL = { spotId: 23, poiId: 23, kind: 'TERMINAL', name: '고현터미널', shortName: '고현터미널', lat: 34.89, lng: 128.62 }
const SPOT = { spotId: 4, poiId: 4, kind: 'SPOT', theme: 'BEACH', shortName: '학동몽돌해변', lat: 34.77, lng: 128.64, thumbnailUrl: 'https://x/a.jpg' }

describe('고현터미널 마커 — Figma 02-2 `501:213`', () => {
  it('파란 원 + 흰 테두리 + 흰 버스 아이콘이고 사진을 쓰지 않는다', () => {
    const { element, label } = createPinElement({ ...TERMINAL, thumbnailUrl: 'https://x/t.jpg' }, { order: null })

    expect(element.classList.contains(styles.pinTerminal)).toBe(true)
    expect(element.classList.contains(styles.pinSpot)).toBe(false)
    expect(element).toHaveAttribute('aria-label', '고현터미널')
    expect(element.querySelector('img')).toBeNull()

    const circle = element.querySelector('svg circle')
    expect(circle).toHaveAttribute('fill', '#0069B3')
    expect(circle).toHaveAttribute('stroke', 'white')
    expect(circle).toHaveAttribute('stroke-width', '2')
    // 버스 아이콘 패스 4개(몸체 · 창 가로선 · 바퀴 둘) — Figma 내보낸 자산 그대로
    expect(element.querySelectorAll('svg path')).toHaveLength(4)
    expect(label).toHaveTextContent('고현터미널')
  })

  it('스팟 마커는 그대로다 — 사진 원', () => {
    const { element } = createPinElement(SPOT, { order: null })
    expect(element.classList.contains(styles.pinSpot)).toBe(true)
    expect(element.classList.contains(styles.pinTerminal)).toBe(false)
    expect(element.querySelector('img')).toHaveAttribute('src', 'https://x/a.jpg')
  })
})

describe('숙소 · 맛집 마커 — 홈 칩(2026-09-19)', () => {
  it('스팟 마커와 같은 흰 원 + 이름표인데, 사진 대신 침대 · 수저 아이콘이다(공공누리 3유형이라 원으로 자르지 않는다)', () => {
    const STAY = { spotId: 'place-2578495', kind: 'STAY', name: '소노캄 거제', shortName: '소노캄 거제', thumbnailUrl: 'https://x/s.jpg' }
    const { element, label } = createPinElement(STAY, { order: null })

    expect(element.classList.contains(styles.pinSpot)).toBe(true)
    expect(element.classList.contains(styles.pinPlace)).toBe(true)
    expect(element.querySelector('img')).toBeNull()
    expect(element.querySelector('svg path')).not.toBeNull()
    expect(element).toHaveAttribute('aria-label', '소노캄 거제')
    expect(label).toHaveTextContent('소노캄 거제')
  })
})

/** 카카오 지도 대신 — 좌표를 그대로 픽셀로 쓰는 투영. */
function fakeMap(width = 390, height = 780) {
  return {
    getProjection: () => ({ containerPointFromCoords: (p) => p }),
    getNode: () => ({ offsetWidth: width, offsetHeight: height }),
  }
}

function pinAt(spot, x, y, labelWidth) {
  const { element, label, badge, isTerminal } = createPinElement(spot, { order: null })
  Object.defineProperty(label, 'offsetWidth', { value: labelWidth })
  return {
    spotId: spot.spotId,
    isStop: false,
    isTerminal,
    element,
    label,
    badge,
    overlay: { getPosition: () => ({ x, y }), setZIndex: vi.fn() },
  }
}

describe('고현터미널 이름표 — 마커 아래 가운데(Figma: 마커 아래 2px)', () => {
  it('자리가 있으면 아래에 둔다', () => {
    const terminal = pinAt(TERMINAL, 200, 300, 64)
    updateLabelVisibility(fakeMap(), [terminal], null, 16)

    expect(terminal.label.classList.contains(styles.pinLabelBelow)).toBe(true)
    expect(terminal.label.style.opacity).toBe('1')
  })

  it('아래를 다른 마커가 막으면 오른쪽으로 비킨다', () => {
    const terminal = pinAt(TERMINAL, 200, 300, 64)
    // 이름표 아래 자리(y 316~334) 한가운데에 스팟 마커
    const blocker = pinAt({ ...SPOT, spotId: 99 }, 200, 332, 40)
    updateLabelVisibility(fakeMap(), [terminal, blocker], null, 16)

    expect(terminal.label.classList.contains(styles.pinLabelBelow)).toBe(false)
    expect(terminal.label.classList.contains(styles.pinLabelLeft)).toBe(false)
    expect(terminal.label.style.opacity).toBe('1')
  })

  it('겹치면 고현터미널이 대표로 남고 스팟이 「+1」로 묶인다 — 목록에서 뒤에 와도', () => {
    // 운영 실측(2026-09-13): 섬 전체 배율에서 포로수용소와 16px 안으로 겹쳐 터미널이 숨었다
    const spot = pinAt({ ...SPOT, spotId: 13, shortName: '포로수용소' }, 200, 300, 56)
    const terminal = pinAt(TERMINAL, 206, 304, 64)
    updateLabelVisibility(fakeMap(), [spot, terminal], null, 16)

    expect(terminal.element.style.display).toBe('')
    expect(terminal.badge.hidden).toBe(false)
    expect(terminal.badge.textContent).toBe('+1')
    expect(spot.element.style.display).toBe('none')
  })

  it('스팟 이름표는 전처럼 오른쪽이다', () => {
    const spot = pinAt(SPOT, 100, 300, 70)
    updateLabelVisibility(fakeMap(), [spot], null, 16)
    expect(spot.label.classList.contains(styles.pinLabelBelow)).toBe(false)
    expect(spot.label.style.opacity).toBe('1')
  })
})
