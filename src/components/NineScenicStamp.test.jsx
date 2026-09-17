import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NineScenicStamp from './NineScenicStamp'

describe('NineScenicStamp — 거제 9경 도장(코스재설계 §5-2 · 2026-09-17 저녁 번호를 뺐다)', () => {
  it('눈에는 도장 하나 + 「거제 9경」 — 번호 원이 없다', () => {
    const { container } = render(<NineScenicStamp />)

    expect(container).toHaveTextContent(/^거제 9경$/)
    // 「9」는 목록 이름의 일부라 남는다(사용자 확인). 그 밖의 숫자 글자는 없다
    expect(container.textContent.replace('거제 9경', '')).not.toMatch(/[0-9①-⑨]/)
    expect(container.querySelector('[data-no]')).toBeNull()
  })

  it('읽기 도구에는 「거제 9경」 — 도장은 장식이라 숨긴다', () => {
    render(
      <button type="button">
        <NineScenicStamp />
      </button>,
    )

    expect(screen.getByRole('button')).toHaveAccessibleName('거제 9경')
    const seal = screen.getByRole('button').querySelector('[aria-hidden="true"]')
    expect(seal).not.toBeNull()
    expect(seal).toBeEmptyDOMElement()
  })
})
