import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NineScenicStamp from './NineScenicStamp'

describe('NineScenicStamp — 거제 9경 도장(코스재설계 §5-2)', () => {
  it('눈에는 「거제 9경」 + 번호 원 — 번호만 적는다(「①」 모양)', () => {
    const { container } = render(<NineScenicStamp nos={[1, 2, 4]} />)

    const visual = container.querySelector('[aria-hidden="true"]')
    expect(visual).toHaveTextContent('거제 9경')
    expect([...visual.querySelectorAll('[data-no]')].map((e) => e.textContent)).toEqual(['1', '2', '4'])
  })

  it('읽기 도구에는 「거제 9경 1경 2경 4경」 — 숫자만 읽으면 무엇의 번호인지 모른다', () => {
    render(
      <button type="button">
        <NineScenicStamp nos={[1, 2, 4]} />
      </button>,
    )

    // 눈에 보이는 「거제 9경」 · 「1」 「2」 「4」는 읽지 않아 이름이 두 번 들리지 않는다
    expect(screen.getByRole('button')).toHaveAccessibleName('거제 9경 1경 2경 4경')
  })

  it('9경이 0곳이면 아무것도 그리지 않는다 — 「0경」 도장은 없다', () => {
    const { container } = render(<NineScenicStamp nos={[]} />)
    expect(container).toBeEmptyDOMElement()

    const second = render(<NineScenicStamp />)
    expect(second.container).toBeEmptyDOMElement()
  })
})
