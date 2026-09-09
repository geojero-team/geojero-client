import { useEffect, useRef } from 'react'
import { Bus, TriangleAlert, X } from 'lucide-react'
import { formatCost, formatDuration } from '../lib/format'
import Button from './Button'
import StatusBadge from './StatusBadge'
import styles from './CourseSheet.module.css'

/**
 * 추천 코스를 골랐을 때 뜨는 카드.
 * 코스명은 줄이지 않고 풀로 씁니다 — 어느 스팟들을 도는 코스인지가 이름에 들어 있어서,
 * 줄이면 코스 1·2·3을 구분할 수가 없습니다.
 */
export default function CourseSheet({
  route,
  spotCount,
  stackOffset = 0,
  onClose,
  onOpenVerdict,
  onHeightChange,
}) {
  const sheetRef = useRef(null)

  // 카드가 차지하는 높이를 지도에 알려줍니다. 지도는 그만큼 영역을 줄여서
  // 카카오 로고·축척이 카드에 가리지 않게 합니다. 성립/불성립에 따라 높이가
  // 달라지므로 상수로 두지 않고 실제로 잽니다.
  //
  // offsetHeight를 쓰는 이유: 시트가 등장 애니메이션(translateY) 중일 때
  // getBoundingClientRect는 아직 밀려 있는 위치를 돌려줍니다.
  useEffect(() => {
    const element = sheetRef.current
    if (!element || !onHeightChange) return

    const observer = new ResizeObserver(() =>
      onHeightChange(element.offsetHeight),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [onHeightChange])

  // 배지는 3분법 그대로(미확인을 성립으로 그리지 않는다). 아래 블록 분기는
  // 불성립 사유 박스 vs 나머지 — 미확인은 사유가 없으면 통계를 그대로 보여준다.
  const feasible = route.verdict !== 'NO'

  return (
    <section
      ref={sheetRef}
      className={styles.sheet}
      style={{ '--stack-offset': `${stackOffset}px` }}
      aria-label="선택한 코스 요약"
    >
      <div className={styles.grabber} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.badges}>
          <StatusBadge status={route.verdict} />
          {/* 버튼에는 번호만 있어서, 그 번호가 무슨 기준인지는 여기서 알려줍니다. */}
          <span className={styles.strategy}>
            맞춤 경로 {route.rank} · {route.strategyLabel}
          </span>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <h2 className={styles.name}>{route.name}</h2>
      <p className={styles.meta}>스팟 {spotCount}곳</p>

      {feasible ? (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>이동</span>
              <span className={styles.statValue}>
                {formatDuration(route.travelMin)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>체류</span>
              <span className={styles.statValue}>
                {formatDuration(route.stayMin)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>예상 요금</span>
              <span className={styles.statValue}>
                {formatCost(route.estimatedCost)}
              </span>
            </div>
          </div>

          {/* 서비스 정체성이 걸린 줄입니다. 매력도가 아니라 막차에서 역산했다는 근거. */}
          <div className={styles.anchor}>
            <Bus size={16} className={styles.anchorIcon} aria-hidden="true" />
            <div className={styles.anchorBody}>
              <p className={styles.anchorTime}>
                {route.returnAnchorTime} 부산행 탑승
              </p>
              <p className={styles.anchorNote}>
                막차 {route.lastBusTime} · 여유 {route.bufferMin}분
              </p>
            </div>
          </div>

          <Button
            className={styles.cta}
            onClick={onOpenVerdict}
            data-api="GET /api/routes/timeline"
          >
            자세히 보기 ›
          </Button>
        </>
      ) : (
        <div className={styles.reason}>
          <TriangleAlert
            size={16}
            className={styles.reasonIcon}
            aria-hidden="true"
          />
          <p className={styles.reasonText}>{route.reason}</p>
        </div>
      )}
    </section>
  )
}
