import StatusBadge from './StatusBadge'
import styles from './DirTabs.module.css'

/**
 * 가는 편 / 오는 편 탭 — Figma DirTabs(63:55).
 * 탭마다 자기 방향의 판정 배지가 붙습니다. 어느 탭을 처음 보여줄지는 호출부가 정하되,
 * 컴포넌트 설명대로 "판정이 나쁜 쪽"이 기본입니다(lib/verdict.js worseDirection).
 */
const TABS = [
  { key: 'out', label: '가는 편' },
  { key: 'back', label: '오는 편' },
]

export default function DirTabs({ value, verdicts, onChange }) {
  return (
    <div className={styles.tabs} role="tablist">
      {TABS.map(({ key, label }) => {
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? `${styles.tab} ${styles.tabOn}` : styles.tab}
            onClick={() => onChange(key)}
          >
            <span className={styles.label}>{label}</span>
            <StatusBadge status={verdicts[key]} />
          </button>
        )
      })}
    </div>
  )
}
