import { Bus, Calendar, House, MapPin } from 'lucide-react'
import { formatShortDate } from '../lib/format'
import { ORIGIN_LABELS } from '../lib/tripParams'
import styles from './ConditionHeader.module.css'

/**
 * 판정 조건 요약 칩 — 지도 위에 하나만 떠 있습니다.
 *
 * 배경판 없이 칩만 띄웁니다. 지도가 화면을 끝까지 쓰는 게 이 화면의 힘이라
 * 상단에 흰 판을 깔면 그만큼을 지도에서 뺏어옵니다.
 * 지도 타일 위에서도 읽히는 건 흰 바탕 + 테두리 + 그림자를 두른 덕입니다.
 *
 * 세 칸이 각각 버튼입니다. 어디를 눌렀는지에 따라 다른 편집 시트가 열리고,
 * 고치면 이 화면에서 바로 다시 판정합니다. (다른 화면으로 나가지 않습니다)
 */
export default function ConditionHeader({ trip, onEdit }) {
  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin

  return (
    <div className={styles.bar}>
      <div className={styles.chip}>
        <button
          type="button"
          className={styles.segment}
          onClick={() => onEdit('origin')}
          aria-label={`출발지 ${originLabel}, 바꾸기`}
        >
          <MapPin className={styles.iconPlace} size={15} aria-hidden="true" />
          <span className={styles.value}>{originLabel}</span>
        </button>

        <span className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          className={styles.segment}
          onClick={() => onEdit('date')}
          aria-label={`날짜 ${trip.date}, 바꾸기`}
        >
          <Calendar className={styles.iconDate} size={15} aria-hidden="true" />
          <span className={styles.value}>{formatShortDate(trip.date)}</span>
        </button>

        <span className={styles.divider} aria-hidden="true" />

        {/* 출발은 버스 타는 시각, 귀가는 돌아와야 하는 시각. 한 쌍이라 한 칸에 둡니다. */}
        <button
          type="button"
          className={styles.segment}
          onClick={() => onEdit('time')}
          aria-label={`출발 ${trip.departTime}, 귀가 ${trip.returnBy ?? '막차까지'}, 바꾸기`}
        >
          <Bus className={styles.iconDepart} size={15} aria-hidden="true" />
          <span className={styles.value}>{trip.departTime}</span>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
          <House className={styles.iconReturn} size={15} aria-hidden="true" />
          <span className={styles.value}>{trip.returnBy ?? '막차까지'}</span>
        </button>
      </div>
    </div>
  )
}
