import LikeCount from './LikeCount'
import NineTasteBadge from './NineTasteBadge'
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
        {/* 하트 수(2026-09-22) — 스팟 카드와 **같은 자리**(사진 왼쪽 아래 · 부록 Q)입니다. 누를 수 없습니다 —
            누르는 자리는 상세 하나입니다. 값이 없으면(옛 응답) 그리지 않습니다. */}
        <LikeCount count={place.likeCount} filled={Boolean(place.liked)} overlay className={styles.likeCount} />
      </div>
      <div className={styles.info}>
        {/* 거제 9미(2026-09-20) — 이름 위 한 줄. 사진 위에 얹지 않습니다: 맛집 사진은 자르지 않아(contain)
            비율에 따라 위아래에 여백이 생기고, 그러면 배지가 사진이 아니라 흰 여백에 떠 보입니다. */}
        <NineTasteBadge place={place} />
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
