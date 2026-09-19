import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Splash from './Splash'
import { t } from '../i18n'
import { SPLASH_FADE_MS, SPLASH_MS } from '../lib/useSplash'

describe('Splash — 사진이 오기 전에도 바람의 언덕이 보인다(2026-09-20 사용자)', () => {
  it('사진 칸에 아주 작은 흐린 미리보기를 먼저 깔고, 그 위에 선명한 사진을 얹는다', () => {
    const { container } = render(<Splash />)
    const img = container.querySelector('img[src="/splash.webp"]')
    expect(img).not.toBeNull()

    // 느린 인터넷에서 2.3초 안에 사진이 다 오지 않으면 파란 바탕만 보였다(4Mbps 흉내로 실측).
    // 미리보기는 번들 안에 들어 있어(data URI) 따로 받지 않는다.
    const box = img.parentElement
    expect(box.style.backgroundImage).toMatch(/^url\("?data:image\/webp;base64,/)
  })

  it('끝나기 0.4초 전부터 흐려져, 시작화면이 닫히는 순간에는 다 사라져 있다 — 사진에서 지도로 뚝 끊기지 않게(2026-09-20 사용자)', () => {
    const { container } = render(<Splash />)
    const overlay = container.firstChild

    expect(SPLASH_FADE_MS).toBe(400)
    // 흐려지기 시작 + 흐려지는 길이 = 시작화면 길이. 어긋나면 반쯤 흐린 채로 뚝 끊기거나, 다 사라진 뒤에도 탭을 막는다.
    expect(overlay.style.animationDelay).toBe(`${SPLASH_MS - SPLASH_FADE_MS}ms`)
    expect(overlay.style.animationDuration).toBe(`${SPLASH_FADE_MS}ms`)
  })

  it('글씨는 한 줄씩 0.15초 간격으로 차례로 떠오른다 — Travel · Explore · Inspire · 거제로, ALL 거제 순(2026-09-20 사용자)', () => {
    const { getByText } = render(<Splash />)
    const delays = ['splash.line1', 'splash.line2', 'splash.line3', 'splash.sub'].map(
      (key) => getByText(t(key)).style.animationDelay,
    )
    expect(delays).toEqual(['100ms', '250ms', '400ms', '550ms'])
  })

  it('사진은 움직이지 않는다 — 확대하니 화면 전체가 움직여 보였다(2026-09-20 사용자)', () => {
    const { container } = render(<Splash />)
    const box = container.querySelector('img[src="/splash.webp"]').parentElement
    expect(box.style.animationDuration).toBe('')
    expect(box.style.animationName).toBe('')
  })
})
