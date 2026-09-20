import { t } from '../i18n'
import { tasteNamesOf } from '../lib/nineTastes'
import styles from './NineTasteBadge.module.css'

/**
 * 「거제 9미」 배지 — 맛집 카드와 상세에 붙습니다(2026-09-20 사용자 결정, Figma 프레임 없음).
 * 어느 가게가 어느 미인지는 서버가 줍니다(`nineTasteNos`, V47 — 기준문서 §6 「거제 9미」).
 *
 * 글자는 **「거제 9미」 하나**입니다. 어느 음식인지는 적지 않습니다 — 사진 곁 배지는 짧은 이름 하나로 두고
 * 숫자 · 기준은 상세로 보낸다는 규칙을 2026-09-17 에 정해 뒀습니다(코스재설계 §5-2, 에어비앤비 「게스트 선호」 식).
 * 음식 이름을 억지로 줄이지 않아도 되는 이점도 있습니다 — 「거제멸치쌈밥&회무침」은 배지에 들어가지 않고,
 * 줄이면 「회무침」이 빠져 원문을 고치는 셈이 됩니다(절대규칙 5).
 *
 * 그래서 **읽기 도구에만** 음식 이름을 붙입니다 — 눈으로는 상세에서 읽고, 화면을 못 보는 사람은 배지 하나에서 바로 듣습니다.
 *
 *   withNames  참이면 배지 옆에 음식 이름을 거제시 원문 그대로 적습니다(상세 — 자리가 넓습니다).
 */
export default function NineTasteBadge({ place, withNames = false }) {
  const names = tasteNamesOf(place)
  if (names.length === 0) return null
  const joined = names.join(' · ')
  return (
    <p className={styles.row}>
      <span className={styles.badge} aria-label={t('nineTaste.badgeAria', { names: joined })}>
        {t('nineTaste.badge')}
      </span>
      {withNames && <span className={styles.names}>{joined}</span>}
    </p>
  )
}
