import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Screen from './Screen'
import ScreenPortal from './ScreenPortal'

describe('ScreenPortal', () => {
  it('지도 시트처럼 갇힌 자리에서 열어도 화면 프레임(Screen)의 직속 자식으로 그린다', () => {
    render(
      <Screen data-testid="frame">
        <div data-testid="sheet" style={{ overflow: 'hidden', position: 'absolute', zIndex: 3 }}>
          <ScreenPortal>
            <div data-testid="overlay">뷰어</div>
          </ScreenPortal>
        </div>
      </Screen>,
    )

    const overlay = screen.getByTestId('overlay')
    expect(overlay.parentElement).toBe(screen.getByTestId('frame'))
    expect(screen.getByTestId('sheet')).not.toContainElement(overlay)
  })

  it('Screen 밖(테스트·단독 렌더)에서는 body에 그린다', () => {
    render(
      <ScreenPortal>
        <div data-testid="overlay">뷰어</div>
      </ScreenPortal>,
    )
    expect(screen.getByTestId('overlay').parentElement).toBe(document.body)
  })
})
