import { THEME_LABELS } from '../lib/format'
import SpotMarkerIcon from './SpotMarkerIcon'
import styles from './CategoryBar.module.css'

/** Figma category(233:387) — 6칸 균등, 아이콘 28 + 라벨. value=null이 '전체'. */
const ITEMS = [
  { theme: null, label: '전체', icon: 'ALL' },
  ...['VIEW', 'CRUISE', 'BEACH', 'GARDEN', 'CASTLE'].map((theme) => ({
    theme,
    label: THEME_LABELS[theme],
    icon: theme,
  })),
]

export default function CategoryBar({ value, onChange }) {
  return (
    <div className={styles.bar} role="tablist" aria-label="분류">
      {ITEMS.map(({ theme, label, icon }) => {
        const selected = theme === value
        return (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? `${styles.cat} ${styles.catOn}` : styles.cat}
            onClick={() => onChange(theme)}
          >
            <SpotMarkerIcon category={icon} />
            <span className={styles.label}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
