import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Button from './Button'

// 러너가 도는지 보는 스모크 — 기존 컴포넌트를 건드리지 않고 그대로 그립니다.
describe('Button', () => {
  it('라벨을 그리고 disabled를 그대로 넘긴다', () => {
    render(<Button disabled>올리기</Button>)
    expect(screen.getByRole('button', { name: '올리기' })).toBeDisabled()
  })
})
