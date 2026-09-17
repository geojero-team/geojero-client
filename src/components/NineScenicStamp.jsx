import { t } from '../i18n'
import styles from './NineScenicStamp.module.css'

/**
 * 거제 9경 도장 — 「거제 9경 ① ② ④」(2026-09-17 코스재설계 §5-2 사용자 결정 · Figma 프레임 없음).
 *
 * 스탬프 투어 모티프입니다 — 원 안에 번호. **경마다 색을 달리하지 않습니다**(아홉 색은 못 외우고 뜻이 없다).
 * 9경은 주황 하나, 다른 축(거제시 코스 초록 · 분류 중립색)과 색으로 갈립니다.
 *
 * 색은 두 변수로 받습니다 — 도장을 찍는 곳이 흰 바탕이면 주황 잉크, 주황 배지 위면 흰 잉크가 됩니다.
 *   --stamp-ink    글자 · 원 면(기본 nine-scenic-strong)
 *   --stamp-paper  원 안 숫자 · 안쪽 테(기본 bg-page)
 * 두 색 조합 모두 대비 5.18:1(흰색 ↔ orange-700)입니다.
 *
 * 읽기 도구에는 「거제 9경 1경 2경 4경」으로 — 숫자만 읽으면 무엇의 번호인지 모릅니다.
 * 눈에 보이는 글자와 번호는 숨겨 두 번 읽히지 않게 합니다. 0곳이면 아무것도 그리지 않습니다(「0경」 도장은 없다).
 */
export default function NineScenicStamp({ nos, className }) {
  if (!nos?.length) return null
  const list = nos.map((rank) => t('nineScenic.rank', { rank })).join(' ')
  return (
    <span className={className ? `${styles.stamp} ${className}` : styles.stamp}>
      <span className={styles.srOnly}>{t('nineScenic.stampA11y', { list })}</span>
      <span className={styles.visual} aria-hidden="true">
        <span className={styles.label}>{t('nineScenic.stamp')}</span>
        {nos.map((rank) => (
          <span key={rank} className={styles.no} data-no={rank}>
            {rank}
          </span>
        ))}
      </span>
    </span>
  )
}
