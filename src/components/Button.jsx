import styles from './Button.module.css'

/**
 * Figma Button(27:15) — 높이 48 고정, 폭 FILL, radius/control.
 * variant: primary(brand 면) · secondary(흰 면 + 테두리 + brand 글자) ·
 *          ghost(면 없음 + brand 글자) · disabled(surface 면 + 테두리 + 보조 글자)
 * 라벨의 '›'는 텍스트로 넣습니다 — Figma 버튼엔 아이콘이 없습니다.
 */
export default function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
