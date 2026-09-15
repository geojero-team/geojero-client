import styles from './OptionChip.module.css'

/**
 * Figma OptionChip(01 컴포넌트 `49:32`) — 단일 선택 칩(출발지 · 필터 등). 높이 40, pill.
 * 안 고름: 흰 면 + border-default 테두리 · body 글자 / 고름: brand-tint 면 + brand-strong 테두리 · body-strong 글자.
 * disabled 는 Figma 에 변형이 아직 없어 메모 `623:520`(「여기선 투명도 0.4」)대로 흐리게 두고 누를 수 없게 합니다.
 * 고름은 aria-pressed 로 읽힙니다 — 묶음(role="group" · aria-label)은 쓰는 쪽이 둡니다.
 */
export default function OptionChip({ selected = false, className = '', children, ...props }) {
  const classes = [styles.chip, selected && styles.on, className].filter(Boolean).join(' ')

  return (
    <button type="button" className={classes} aria-pressed={selected} {...props}>
      {children}
    </button>
  )
}
