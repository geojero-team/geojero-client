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

const STAY = { spotId: 'place-2578495', kind: 'STAY', name: '소노캄 거제', shortName: '소노캄 거제' }
const CAFE = { spotId: 'place-2783404', kind: 'CAFE', name: '심해', shortName: '심해' }

describe('숙소 · 맛집 마커 — 홈 칩(2026-09-19)', () => {
  /* 카페 사진도 일곱 곳 모두 공공누리 3유형(변경금지)이다 — 원으로 자르면 저작권을 어긴다.
     숙소 · 맛집과 같은 사각 액자여야 한다(2026-09-20). */
  it('카페도 사진을 자르지 않는 사각 액자다 — 스팟 원이 아니다', () => {
    const { element, size } = createPinElement({ ...CAFE, thumbnailUrl: 'https://x/s.jpg' }, { order: null })

    expect(element.classList.contains(styles.pinPlace)).toBe(true)
    expect(element.classList.contains(styles.pinPlacePhoto)).toBe(true)
    expect(element.querySelector('img').classList.contains(styles.pinPhotoWhole)).toBe(true)
    expect(size).toEqual({ width: 32, height: 22 })
  })

  it('대표 사진이 있으면 사진을 자르지 않고 통째로 담는 사각 액자다 — 높이 22(스팟 원 28 보다 낮게 — 폭까지 더하면 원만큼 무겁다), 폭은 3:2 로 시작', () => {
    const { element, label, size } = createPinElement({ ...STAY, thumbnailUrl: 'https://x/s.jpg' }, { order: null })

    expect(element.classList.contains(styles.pinPlace)).toBe(true)
    expect(element.classList.contains(styles.pinPlacePhoto)).toBe(true)
    const photo = element.querySelector('img')
    expect(photo).toHaveAttribute('src', 'https://x/s.jpg')
    expect(photo.classList.contains(styles.pinPhotoWhole)).toBe(true)
    expect(size).toEqual({ width: 32, height: 22 }) // 19 × 1.5 = 28.5 → 29 + 테두리 3
    expect(element).toHaveAttribute('aria-label', '소노캄 거제')
    expect(label).toHaveTextContent('소노캄 거제')
  })

  it('사진이 오면 액자 폭을 사진 비율에 맞춘다 — 빈칸 없이, 자르지 않고(높이 22 · 테두리 안 19)', () => {
    const onResize = vi.fn()
    const { element, size } = createPinElement({ ...STAY, thumbnailUrl: 'https://x/wide.jpg' }, { order: null, onResize })
    const photo = element.querySelector('img')
    Object.defineProperty(photo, 'naturalWidth', { value: 940 })
    Object.defineProperty(photo, 'naturalHeight', { value: 470 })
    photo.dispatchEvent(new Event('load'))

    expect(size.width).toBe(41) // 19 × 2 + 테두리 3
    expect(element.style.width).toBe('41px')
    expect(onResize).toHaveBeenCalledTimes(1)

    // 세로 사진은 좁게
    const tall = createPinElement({ ...STAY, spotId: 'place-t', thumbnailUrl: 'https://x/tall.jpg' }, { order: null })
    const tallPhoto = tall.element.querySelector('img')
    Object.defineProperty(tallPhoto, 'naturalWidth', { value: 705 })
    Object.defineProperty(tallPhoto, 'naturalHeight', { value: 940 })
    tallPhoto.dispatchEvent(new Event('load'))
    expect(tall.size.width).toBe(17) // 19 × 0.75 = 14.25 → 14 + 3
  })

  it('사진이 없으면 스팟 마커와 같은 28px 원에 침대 · 수저 아이콘', () => {
    const { element, size } = createPinElement({ ...STAY, thumbnailUrl: null }, { order: null })

    expect(element.classList.contains(styles.pinSpot)).toBe(true)
    expect(element.classList.contains(styles.pinPlacePhoto)).toBe(false)
    expect(element.querySelector('img')).toBeNull()
    expect(element.querySelector('svg path')).not.toBeNull()
    expect(size).toEqual({ width: 28, height: 28 })
  })

  it('이름표 자리는 액자 폭으로 잰다 — 28px 원이면 오른쪽에 들어갈 이름표도 액자면 넘쳐 왼쪽으로 뒤집는다', () => {
    const photoPin = pinAt({ ...STAY, thumbnailUrl: 'https://x/s.jpg' }, 300, 300, 75)
    updateLabelVisibility(fakeMap(390), [photoPin], null, 16)
    expect(photoPin.label.classList.contains(styles.pinLabelLeft)).toBe(true)

    const iconPin = pinAt({ ...STAY, spotId: 'place-1', thumbnailUrl: null }, 300, 300, 74)
    updateLabelVisibility(fakeMap(390), [iconPin], null, 16)
    expect(iconPin.label.classList.contains(styles.pinLabelLeft)).toBe(false)
  })

  it('액자끼리 4px 넘게 겹치면 「+1」로 묶는다 — 원(중심 16px · 12px 겹침 허용)보다 엄격하게, 액자 크기로 잰다', () => {
    const a = pinAt({ ...STAY, spotId: 'place-a', thumbnailUrl: 'https://x/a.jpg' }, 200, 300, 40)
    const b = pinAt({ ...STAY, spotId: 'place-b', thumbnailUrl: 'https://x/b.jpg' }, 224, 305, 40)
    updateLabelVisibility(fakeMap(), [a, b], null, 16)
    expect(a.badge.textContent).toBe('+1')
    expect(b.element.style.display).toBe('none')

    // 27px 떨어져 5px 겹치는 액자(폭 32) 둘도 묶는다 — 28px(4px 겹침)부터 따로 그린다
    const e = pinAt({ ...STAY, spotId: 'place-e', thumbnailUrl: 'https://x/e.jpg' }, 200, 300, 40)
    const f = pinAt({ ...STAY, spotId: 'place-f', thumbnailUrl: 'https://x/f.jpg' }, 227, 300, 40)
    updateLabelVisibility(fakeMap(), [e, f], null, 16)
    expect(f.element.style.display).toBe('none')
    const g = pinAt({ ...STAY, spotId: 'place-g', thumbnailUrl: 'https://x/g.jpg' }, 200, 300, 40)
    const h = pinAt({ ...STAY, spotId: 'place-h', thumbnailUrl: 'https://x/h.jpg' }, 228, 300, 40)
    updateLabelVisibility(fakeMap(), [g, h], null, 16)
    expect(h.element.style.display).toBe('')

    // 같은 거리(24px)의 원 두 개는 묶지 않는다 — 원 규칙은 그대로
    const c = pinAt({ ...SPOT, spotId: 71 }, 200, 300, 40)
    const d = pinAt({ ...SPOT, spotId: 72 }, 224, 305, 40)
    updateLabelVisibility(fakeMap(), [c, d], null, 16)
    expect(d.element.style.display).toBe('')
    expect(c.badge.hidden).toBe(true)
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
  const { element, label, badge, isTerminal, size } = createPinElement(spot, { order: null })
  Object.defineProperty(label, 'offsetWidth', { value: labelWidth })
  return {
    spotId: spot.spotId,
    isStop: false,
    isTerminal,
    size,
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
