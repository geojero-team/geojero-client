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
 * 2026-09-12: **균등 분할을 버리고 가로 스크롤로 바꿨습니다.**
 * 8칸이면 칸 폭이 약 38px인데(350 ÷ 8 − gap) 라벨은 nowrap이라 '언덕·전망'이 ~60px를
 * 요구해 글자가 칸을 넘고 서로 붙어 보였습니다 — 7칸에서 이미 넘치던 문제였습니다.
 * 이제 칸이 글자만큼만 차지하고 넘치면 스크롤합니다(CSS 주석 참고). 분류가 더 늘어도
 * 안 깨집니다. Figma 02-1의 균등 분할에서 이탈한 것이고, 그 배치가 8칸에서 읽히지
 * 않는다는 사실이 근거입니다.
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
