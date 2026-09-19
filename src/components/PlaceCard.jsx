import { t } from '../i18n'
import { formatDistance } from '../lib/format'
import styles from './PlaceCard.module.css'

/**
 * 맛집 · 숙소 카드(2026-09-19 — 스팟 탭 「맛집」 「숙소」 칩).
 *
 * 사진은 **자르지 않습니다**(object-fit: contain). TourAPI 사진 대부분이 Type3 = 공공누리 제3유형(출처표시 + 변경금지)이라
 * 칸에 맞춰 잘라 내면 「형식의 변경」이 됩니다(기준문서 §7). 대부분 3:2 라 칸을 3:2 로 두고, 비율이 다른 사진은 여백이 남습니다.
 *
 * 위치는 동네 이름이 아니라 **가까운 스팟과의 직선거리**로 말합니다 — 원문에 없는 동네 이름을 짓지 않고,
 * 이 앱의 뼈대(스팟 · 코스)와 바로 이어지게 합니다.
 */
export default function PlaceCard({ place, onOpen }) {
  const near = place.nearSpot
  return (
    <button type="button" className={styles.card} onClick={() => onOpen(place)}>
      <div className={styles.photo}>
        {place.imageUrl ? (
          <img className={styles.photoImg} src={place.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className={styles.noPhoto}>{t('courses.noPhoto')}</span>
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>{place.name}</h3>
        {place.category && <p className={styles.headline}>{place.category}</p>}
        {near && (
          <p className={styles.meta}>
            {t('places.near', { place: near.shortName, dist: formatDistance(near.distanceM) })}
          </p>
        )}
        {place.restDay && <p className={styles.meta}>{t('places.restDay', { day: place.restDay })}</p>}
      </div>
    </button>
  )
}
