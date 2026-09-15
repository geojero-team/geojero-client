import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OptionChip from './OptionChip'
import styles from './OptionChip.module.css'

describe('OptionChip — Figma 01 컴포넌트 49:32', () => {
  it('안 고름 — 라벨을 그린 버튼, aria-pressed false, 누르면 onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<OptionChip onClick={onClick}>3곳</OptionChip>)

    const chip = screen.getByRole('button', { name: '3곳' })
    expect(chip).toHaveAttribute('type', 'button')
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect(chip).not.toHaveClass(styles.on)
    await user.click(chip)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('고름 — aria-pressed true 와 고름 모양', () => {
    render(<OptionChip selected>전체</OptionChip>)

    const chip = screen.getByRole('button', { name: '전체' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(chip).toHaveClass(styles.chip, styles.on)
  })

  it('비활성 — 누를 수 없다(메모 623:520 「코스가 0개인 칩은 비활성」)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<OptionChip disabled onClick={onClick}>5곳</OptionChip>)

    const chip = screen.getByRole('button', { name: '5곳' })
    expect(chip).toBeDisabled()
    await user.click(chip)
    expect(onClick).not.toHaveBeenCalled()
  })
})
