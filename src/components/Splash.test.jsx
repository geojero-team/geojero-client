import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Splash from './Splash'

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
})
