import { useEffect, useRef } from 'react'
import { Bus, ChevronRight, TriangleAlert, X } from 'lucide-react'
import { THEME_LABELS, formatCost, formatDuration } from '../lib/format'
import styles from './CourseSheet.module.css'

/** 시트가 화면 바닥에 붙어 있으므로 지도는 시트 높이만큼만 물러나면 됩니다. */
const MAP_BREATHING_ROOM = 0

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

/** 지도에서 핀을 탭했을 때만 뜨는 하단 코스 요약 카드. */
export default function CourseSheet({
  course,
  onClose,
  onOpenDetail,
  onEditConditions,
  onHeightChange,
}) {
  const themeLabel = THEME_LABELS[course.theme] ?? course.theme
  const sheetRef = useRef(null)

  // 카드가 차지하는 높이를 지도에 알려줍니다. 지도는 그만큼 영역을 줄여서
  // 카카오 로고·축척이 카드에 가리지 않게 합니다. 성립/불성립에 따라 높이가
  // 달라지므로 상수로 두지 않고 실제로 잽니다.
  useEffect(() => {
    const element = sheetRef.current
    if (!element || !onHeightChange) return

    // offsetHeight를 쓰는 이유: 시트가 등장 애니메이션(translateY) 중일 때
    // getBoundingClientRect는 아직 밀려 있는 위치를 돌려줍니다. 그 값으로 지도를
    // 물리면 16px 덜 물러나서 카카오 로고·축척이 시트에 깔립니다.
    const observer = new ResizeObserver(() => {
      onHeightChange(element.offsetHeight + MAP_BREATHING_ROOM)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [onHeightChange])

  return (
    <section
      ref={sheetRef}
      className={styles.sheet}
      aria-label="선택한 코스 요약"
    >
      <div className={styles.grabber} aria-hidden="true" />

      <header className={styles.header}>
        <span
          className={`${styles.badge} ${course.feasible ? styles.badgeYes : styles.badgeNo}`}
        >
          {course.feasible ? '성립' : '불성립'}
        </span>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <h2 className={styles.name}>{course.name}</h2>
      <p className={styles.meta}>
        {course.region} · {themeLabel}
      </p>

      {course.feasible ? (
        <>
          <div className={styles.stats}>
            <Stat label="이동" value={formatDuration(course.travelMin)} />
            <Stat label="체류" value={formatDuration(course.stayMin)} />
            <Stat label="예상 요금" value={formatCost(course.estimatedCost)} />
          </div>

          {/* 서비스 정체성이 걸린 줄입니다. 매력도가 아니라 막차에서 역산했다는 근거. */}
          <div className={styles.anchor}>
            <Bus size={16} className={styles.anchorIcon} aria-hidden="true" />
            <div className={styles.anchorBody}>
              <p className={styles.anchorTime}>
                {course.returnAnchorTime} 부산행 탑승
              </p>
              <p className={styles.anchorNote}>
                막차 {course.lastBusTime} · 여유 {course.bufferMin}분
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={onOpenDetail}
          >
            자세히 보기
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <div className={styles.reason}>
            <TriangleAlert
              size={16}
              className={styles.reasonIcon}
              aria-hidden="true"
            />
            <p className={styles.reasonText}>{course.reason}</p>
          </div>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onEditConditions}
          >
            조건 바꿔서 다시 판정
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  )
}
