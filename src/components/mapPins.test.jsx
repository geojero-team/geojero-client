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

  /* 액자끼리는 **1px 이라도 겹치면** 묶는다(2026-09-20 사용자 — 「보통 겹치면 +1로 표시되지 않나」).
     전에는 4px 까지 봐줬는데, 운영에서 씨야드 ↔ 엄마의 바다가 세로 3px · 고현터미널 ↔ 하면옥이 1px 겹친 채로
     둘 다 그려져 사진이 잘려 보였다. 사진은 조금만 가려도 무엇인지 알 수 없다. */
  it('액자끼리 1px 이라도 겹치면 「+1」로 묶는다 — 원(중심 16px · 12px 겹침 허용)보다 엄격하게, 액자 크기로 잰다', () => {
    const a = pinAt({ ...STAY, spotId: 'place-a', thumbnailUrl: 'https://x/a.jpg' }, 200, 300, 40)
    const b = pinAt({ ...STAY, spotId: 'place-b', thumbnailUrl: 'https://x/b.jpg' }, 224, 305, 40)
    updateLabelVisibility(fakeMap(), [a, b], null, 16)
    expect(a.badge.textContent).toBe('+1')
    expect(b.element.style.display).toBe('none')

    // 운영에서 잡은 자리 — 폭 32 액자 둘이 **세로로 3px** 겹친다(씨야드 ↔ 엄마의 바다). 전에는 그냥 그렸다
    const e = pinAt({ ...STAY, spotId: 'place-e', thumbnailUrl: 'https://x/e.jpg' }, 200, 300, 40)
    const f = pinAt({ ...STAY, spotId: 'place-f', thumbnailUrl: 'https://x/f.jpg' }, 200, 319, 40)
    updateLabelVisibility(fakeMap(), [e, f], null, 16)
    expect(f.element.style.display).toBe('none')

    // 딱 붙어 닿기만 하면(겹침 0) 따로 그린다 — 가린 것이 없다
    const g = pinAt({ ...STAY, spotId: 'place-g', thumbnailUrl: 'https://x/g.jpg' }, 200, 300, 40)
    const h = pinAt({ ...STAY, spotId: 'place-h', thumbnailUrl: 'https://x/h.jpg' }, 232, 300, 40)
    updateLabelVisibility(fakeMap(), [g, h], null, 16)
    expect(h.element.style.display).toBe('')

    // 같은 거리(24px)의 원 두 개는 묶지 않는다 — 원 규칙은 그대로
    const c = pinAt({ ...SPOT, spotId: 71 }, 200, 300, 40)
    const d = pinAt({ ...SPOT, spotId: 72 }, 224, 305, 40)
    updateLabelVisibility(fakeMap(), [c, d], null, 16)
    expect(d.element.style.display).toBe('')
    expect(c.badge.hidden).toBe(true)
  })

  /* 원인지 액자인지를 **폭이 28인가**로 가르면 안 된다 — 사진 비율에 따라 액자 폭이 마침 28이 될 수 있다
     (운영의 엄마의 바다가 28 × 22 다). 그러면 높이를 안 보고 중심거리만 재 잘못 판정한다. */
  it('폭이 28인 액자도 액자로 잰다 — 원으로 오인하지 않는다', () => {
    // 사진이 와서 폭이 28(원 지름과 같은 값)이 된 액자 둘. 운영의 엄마의 바다가 28 × 22 다.
    const load = (pin, w, h) => {
      const photo = pin.element.querySelector('img')
      Object.defineProperty(photo, 'naturalWidth', { value: w })
      Object.defineProperty(photo, 'naturalHeight', { value: h })
      photo.dispatchEvent(new Event('load'))
    }
    const a = pinAt({ ...STAY, spotId: 'place-w1', thumbnailUrl: 'https://x/w1.jpg' }, 200, 300, 40)
    const b = pinAt({ ...STAY, spotId: 'place-w2', thumbnailUrl: 'https://x/w2.jpg' }, 200, 320, 40)
    load(a, 940, 705) // 4:3 → 19 × 1.333 = 25.3 → 25 + 테두리 3 = 28
    load(b, 940, 705)
    expect(a.size).toEqual({ width: 28, height: 22 })

    // 세로로 20px 띄웠으니 액자(높이 22)끼리는 2px 겹친다 → 묶여야 한다.
    // 폭으로 원이라고 잘못 보면 중심거리 20px > 16px 이라 안 묶인다.
    updateLabelVisibility(fakeMap(), [a, b], null, 16)
    expect(a.badge.textContent).toBe('+1')
    expect(b.element.style.display).toBe('none')
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
  const { element, label, badge, isTerminal, isNineScenic, size, framed } = createPinElement(spot, { order: null })
  Object.defineProperty(label, 'offsetWidth', { value: labelWidth })
  return {
    spotId: spot.spotId,
    isStop: false,
    isTerminal,
    isNineScenic,
    size,
    framed,
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


/* 이름표 자리 찾기(2026-09-20 사용자 — 「9경은 이름이 다 떴으면」).
   홈 8km 에서 9경 넷(거제식물원 · 외도보타니아 · 공곶이·내도 · 바람의언덕)의 이름이 통째로 사라졌습니다.
   재 보니 옆 핀과 1~5px 스치는 것이 원인이었고, 그나마도 **동그란 핀을 네모로 재서** 생긴 빈 모서리였습니다. */
const NINE = { ...SPOT, spotId: 61, shortName: '거제식물원', nineScenic: 5 }

describe('이름표 자리 — 동그란 핀은 동그라미로 잰다', () => {
  it('옆 핀의 네모에는 걸쳐도 원에 닿지 않으면 이름표를 그대로 둔다', () => {
    const pin = pinAt({ ...SPOT, spotId: 71 }, 100, 100, 60)
    // (185,118) 핀의 네모(171~199 · 104~132)는 이름표 오른쪽 자리(116~176 · 91~109)와 겹치지만,
    // 원까지의 거리는 12.7px 이라 닿지 않습니다.
    const corner = pinAt({ ...SPOT, spotId: 72 }, 185, 118, 40)
    updateLabelVisibility(fakeMap(), [pin, corner], null, 16)

    expect(pin.label.style.opacity).toBe('1')
    expect(pin.label.classList.contains(styles.pinLabelLeft)).toBe(false)
  })

  it('오른쪽이 막히면 12px 밀어서 놓는다 — 자리 하나만 보고 이름을 지우지 않는다', () => {
    const pin = pinAt({ ...SPOT, spotId: 73 }, 100, 100, 60)
    const right = pinAt({ ...SPOT, spotId: 74 }, 185, 88, 40) // 오른쪽 가운데 자리를 막는다
    const left = pinAt({ ...SPOT, spotId: 75 }, 14, 100, 40) // 왼쪽 자리도 막는다
    updateLabelVisibility(fakeMap(), [pin, right, left], null, 16)

    expect(pin.label.style.opacity).toBe('1')
    expect(pin.label.style.transform).toBe('translateY(12px)')
  })
})

describe('이름표 자리 — 9경은 이름을 끝까지 남긴다', () => {
  it('빈 자리가 없으면 9경 아닌 핀 위로 올라간다', () => {
    const nine = pinAt(NINE, 100, 100, 60)
    const blockRight = pinAt({ ...SPOT, spotId: 76 }, 146, 100, 40)
    const blockLeft = pinAt({ ...SPOT, spotId: 77 }, 52, 100, 40)
    updateLabelVisibility(fakeMap(), [nine, blockRight, blockLeft], null, 16)

    expect(nine.label.style.opacity).toBe('1')
  })

  it('9경끼리는 겹치지 않는다 — 막은 쪽도 9경이면 이름표를 숨긴다', () => {
    const nine = pinAt(NINE, 100, 100, 60)
    const otherNine = pinAt({ ...NINE, spotId: 78, shortName: '매미성' }, 146, 100, 40)
    const blockLeft = pinAt({ ...NINE, spotId: 79, shortName: '해금강' }, 52, 100, 40)
    updateLabelVisibility(fakeMap(), [nine, otherNine, blockLeft], null, 16)

    expect(nine.label.style.opacity).toBe('0')
  })
})
