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
 *
 * 2026-09-15: **여행자 관점 6칸으로 다시 묶었습니다**(사용자 결정). 전에는 칸이 스팟의 종류(해수욕장·식물원·성 …)라
 * 성(매미성 한 곳)처럼 한 곳뿐인 칸이 있었습니다. 이제 여행자가 고르는 기준이고 칸마다 2~4곳입니다 —
 * 바다·해변 / 섬·유람선 / 전망·명소 / 정원·숲 / 역사·유적 / 전시·체험. 서버 theme 코드는 그대로 두고 이름표만
 * 바꿨고, 칸을 옮긴 스팟은 둘입니다(서버 V29 — 매미성 CASTLE → VIEW, 외도보타니아 GARDEN → CRUISE).
 * 이름 아래 「권역 · 분류」 줄의 세부 분류(해수욕장 · 테마공원 …)는 서버 category 그대로입니다.
 */
const ITEMS = [
  { theme: null, label: t('category.all'), icon: 'ALL' },
  ...['BEACH', 'CRUISE', 'VIEW', 'GARDEN', 'HISTORY', 'EXHIBIT'].map((theme) => ({
    theme,
    label: THEME_LABELS[theme],
    icon: theme,
  })),
]

/**
 * extras — 분류 끝에 붙는 칸(스팟 탭의 「맛집」 「숙소」, 2026-09-19). 스팟 분류가 아니라 시간표 탭에는 넘기지 않습니다.
 * value 로는 그 칸의 key('FOOD' · 'STAY' · 'CAFE')가 옵니다.
 */
export default function CategoryBar({ value, onChange, extras = [] }) {
  const items = [...ITEMS, ...extras.map(({ key, label }) => ({ theme: key, label, icon: key }))]
  return (
    <div className={styles.bar} role="tablist" aria-label={t('category.aria')}>
      {items.map(({ theme, label, icon }) => {
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
