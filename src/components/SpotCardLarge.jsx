import { t } from '../i18n'
import { courseImage, onImageError } from '../lib/courseImage'
import styles from './SpotCardLarge.module.css'

/**
 * 큰 카드 — 스팟 탭·시간표 탭의 「크게 보기」(2026-09-17 사용자 결정, 참고 `그리드.png`).
 *
 * 격자(사진 2열)는 한 화면에 많이 담는 대신 이름과 분류만 보입니다. 큰 카드는 반대로,
 * 한 장씩 크게 보여주고 **우리가 쓴 요약**(서버 summary · V29)까지 읽게 합니다 —
 * 이름만으로는 어떤 곳인지 모르는 사람이 고를 수 있게 하려는 것입니다.
 *
 * 줄 순서는 참고 그림 그대로입니다: 사진 → 권역·분류(브랜드 색) → 이름 → 요약.
 * 요약은 세 줄에서 자릅니다 — 카드 높이가 들쭉날쭉하면 훑어보기 어렵습니다. 전문은 상세에서 읽습니다.
 *
 * 누르면 어디로 가는지는 **호출한 탭이 정합니다**(onOpen) — 스팟 탭은 스팟 상세로,
 * 시간표 탭은 그 스팟의 시간표로 갑니다.
 */
export default function SpotCardLarge({ spot, onOpen, tour }) {
  const meta = [spot.region, spot.category].filter(Boolean).join(' · ')

  return (
    <button type="button" className={styles.card} onClick={() => onOpen(spot)} data-tour={tour}>
      <span className={styles.photo}>
        <img className={styles.photoImg} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
        {spot.nineScenicNo != null && (
          <span className={styles.nine}>{t('nineScenic.badge', { rank: spot.nineScenicNo })}</span>
        )}
      </span>
      <span className={styles.info}>
        {meta && <span className={styles.meta}>{meta}</span>}
        <span className={styles.name}>{spot.shortName ?? spot.name}</span>
        {spot.summary && <span className={styles.summary}>{spot.summary}</span>}
      </span>
    </button>
  )
}
