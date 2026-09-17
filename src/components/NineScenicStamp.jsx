import { t } from '../i18n'
import styles from './NineScenicStamp.module.css'

/**
 * 거제 9경 도장 — 도장 하나 + 「거제 9경」(2026-09-17 코스재설계 §5-2 사용자 결정 · Figma 프레임 없음).
 *
 * 스탬프 투어 모티프입니다. 처음엔 원 안에 번호(①②④)였는데 2026-09-17 저녁 **번호를 뺐습니다**(사용자:
 * *"문구에 숫자가 들어가지 않았으면 해. 한눈에 알아보게"*). 사진 위 배지는 숫자 없는 짧은 이름 하나이고,
 * 몇 경인지는 스팟 시트 「거제9경 · N경」이 말합니다. 「9」는 목록 이름의 일부라 남깁니다(사용자 확인).
 * 도장 모양은 남겨 둡니다 — 초록 거제시 코스 배지와 밝기가 같아(흰 글씨 5.02 · 5.18) 색약이면 색으로 못 가르고, 모양이 가릅니다.
 *
 * 색은 두 변수로 받습니다 — 도장을 찍는 곳이 흰 바탕이면 주황 잉크, 주황 배지 위면 흰 잉크가 됩니다.
 *   --stamp-ink    글자 · 도장 테(기본 nine-scenic-strong)
 *   --stamp-paper  도장 안쪽(기본 bg-page)
 * 두 색 조합 모두 대비 5.18:1(흰색 ↔ orange-700)입니다.
 *
 * 읽기 도구에는 「거제 9경」 — 도장은 장식이라 숨깁니다.
 */
export default function NineScenicStamp({ className }) {
  return (
    <span className={className ? `${styles.stamp} ${className}` : styles.stamp}>
      <span className={styles.seal} aria-hidden="true" />
      <span className={styles.label}>{t('nineScenic.stamp')}</span>
    </span>
  )
}
