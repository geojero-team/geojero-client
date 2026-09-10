import { formatDateWeekday } from '../lib/format'
import { ORIGIN_LABELS } from '../lib/tripParams'
import styles from './ConditionPill.module.css'

/**
 * 지도 위 조건 알약 — Figma condition-pill(240:167 / 285:228).
 *
 * Figma는 세 칸으로 나뉜 칩이 아니라 **한 덩어리 텍스트**입니다. 그래서 칸별 편집 대신
 * 알약 전체를 누르면 홈에서 쓰는 조건 시트가 열립니다(같은 컴포넌트 재사용).
 * 복귀 시각을 안 정한 상태(returnBy = null)는 '막차까지'로 씁니다.
 */
export default function ConditionPill({ trip, onEdit }) {
  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin
  const text = `${originLabel} · ${formatDateWeekday(trip.date)} · ${trip.departTime} → ${trip.returnBy ?? '막차까지'}`

  return (
    <button
      type="button"
      className={styles.pill}
      onClick={onEdit}
      aria-label={`판정 조건 ${text}, 바꾸기`}
    >
      {text}
    </button>
  )
}
