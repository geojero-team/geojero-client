import styles from './StatusBadge.module.css'

const LABELS = {
  YES: ['✓', '성립'],
  NO: ['✕', '불성립'],
  UNKNOWN: ['?', '미확인'],
}

/**
 * Figma StatusBadge(12:3) — 판정 3분법. 값이 없거나 모르는 값이면 미확인으로 그립니다.
 * 성립으로 추정하지 않는다(엔진 규칙)는 것이 화면에서도 지켜져야 합니다.
 */
export default function StatusBadge({ status, className = '' }) {
  const key = Object.hasOwn(LABELS, status) ? status : 'UNKNOWN'
  const [mark, label] = LABELS[key]

  return (
    <span className={`${styles.badge} ${styles[key.toLowerCase()]} ${className}`}>
      <span className={styles.mark} aria-hidden="true">
        {mark}
      </span>
      {label}
    </span>
  )
}
