import { t } from '../i18n'
import { THEME_LABELS } from '../lib/format'
import SpotMarkerIcon from './SpotMarkerIcon'
import styles from './CategoryBar.module.css'

/**
 * Figma category(233:387) — 칸 균등, 아이콘 28 + 라벨. value=null이 '전체'.
 *
 * Figma는 6칸(전체 + 5분류)을 그렸지만 HISTORY를 더해 7칸(2026-09-11),
 * EXHIBIT를 더해 **8칸**이 됐습니다(2026-09-12 권역 스팟 9곳 추가).
 * 포로수용소는 HISTORY 칸이 없으면 필터를 켜는 순간 목록에서 사라졌고, 새로 들어온
 * 조선해양문화관·씨월드·양지암조각공원·청마기념관 넷도 EXHIBIT 없이는 같은 일이 납니다.
 *
 * ⚠️ 8칸이면 칸 폭이 약 38px입니다(350px ÷ 8 − gap 6). 라벨은 nowrap이라
 * '언덕·전망'(12px × 5자 ≈ 60px)이 칸을 넘칩니다 — **7칸에서 이미 넘치던 문제**이고
 * 칸이 하나 늘며 더 좁아졌습니다. 근본 수정(가로 스크롤 또는 2줄)은 Figma 02-1에
 * 없는 배치라 디자인 결정이 필요합니다. 새 라벨만이라도 짧게('전시') 잡아 뒀습니다.
 */
const ITEMS = [
  { theme: null, label: t('category.all'), icon: 'ALL' },
  ...['VIEW', 'CRUISE', 'BEACH', 'GARDEN', 'CASTLE', 'HISTORY', 'EXHIBIT'].map((theme) => ({
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
