import styles from './StatusBadge.module.css'

const LABELS = {
  YES: ['✓', '성립'],
  NO: ['✕', '불성립'],
}

/**
 * 판정 배지 — 성립 / 불성립만 그립니다(2026-09-10 사용자 결정: "미확인은 사용자에게
 * 보여주지 않는다, 성립하는 것만 보여준다").
 *
 * 미확인은 배지를 다는 대신 **그 항목을 화면에서 뺍니다** — 추천 목록에서 거르고,
 * 남는 게 없으면 '안내할 코스가 없어요'를 띄웁니다. 그래서 여기서 모르는 값이 들어오면
 * 아무것도 그리지 않습니다. 미확인을 성립으로 접어 넣지 않기 위해서입니다.
 */
export default function StatusBadge({ status, className = '' }) {
  if (!Object.hasOwn(LABELS, status)) return null
  const key = status
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
