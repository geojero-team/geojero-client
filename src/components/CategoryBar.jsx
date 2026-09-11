import { t } from '../i18n'
import { THEME_LABELS } from '../lib/format'
import SpotMarkerIcon from './SpotMarkerIcon'
import styles from './CategoryBar.module.css'

/**
 * Figma category(233:387) — 칸 균등, 아이콘 28 + 라벨. value=null이 '전체'.
 *
 * Figma는 6칸(전체 + 5분류)을 그렸지만 HISTORY를 더해 **7칸**입니다(2026-09-11 결정).
 * 포로수용소는 거제 9경 중 6경이고 화면 스팟 8곳에 들어 있는데, HISTORY 칸이 없으면
 * 어느 분류로도 걸리지 않아 필터를 켜는 순간 목록에서 사라졌습니다.
 * 칸은 flex로 나누므로 폭만 좁아지고 배치는 그대로입니다.
 */
const ITEMS = [
  { theme: null, label: t('category.all'), icon: 'ALL' },
  ...['VIEW', 'CRUISE', 'BEACH', 'GARDEN', 'CASTLE', 'HISTORY'].map((theme) => ({
    theme,
    label: THEME_LABELS[theme],
    icon: theme,
  })),
]

export default function CategoryBar({ value, onChange }) {
  return (
    <div className={styles.bar} role="tablist" aria-label={t('category.aria')}>
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
