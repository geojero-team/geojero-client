import { useEffect, useRef } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { courseImage } from '../lib/courseImage'
import Button from './Button'
import styles from './SpotSheet.module.css'

/**
 * 지도에서 스팟 마커를 탭했을 때 뜨는 카드.
 * 사진 → 이름 → 지역·분류 순으로만 보여주고, 자세한 건 스팟 상세로 넘깁니다.
 *
 * 코스 카드(CourseSheet)와 다른 이유: 여기서 궁금한 건 "이 코스가 되나"가 아니라
 * "여기가 어디고 어떻게 생겼나"입니다. 판정은 코스 단위로 봅니다.
 */
export default function SpotSheet({
  spot,
  showVerdict,
  stackOffset = 0,
  onClose,
  onOpenDetail,
  onHeightChange,
}) {
  const sheetRef = useRef(null)

  useEffect(() => {
    const element = sheetRef.current
    if (!element || !onHeightChange) return

    const observer = new ResizeObserver(() =>
      onHeightChange(element.offsetHeight),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [onHeightChange])

  const blocked = showVerdict && spot.verdict === 'NO'

  return (
    <section
      ref={sheetRef}
      className={styles.sheet}
      style={{ '--stack-offset': `${stackOffset}px` }}
      aria-label="선택한 스팟"
    >
      <div className={styles.grabber} aria-hidden="true" />

      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="닫기"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <div className={styles.row}>
        <img className={styles.photo} src={courseImage(spot)} alt="" />
        <div className={styles.body}>
          <h2 className={styles.name}>{spot.name}</h2>
          <p className={styles.meta}>
            {spot.region} · {spot.category}
          </p>
          {showVerdict && spot.summary && (
            <p className={styles.summary}>{spot.summary}</p>
          )}
        </div>
      </div>

      {blocked && (
        <div className={styles.reason}>
          <TriangleAlert
            size={16}
            className={styles.reasonIcon}
            aria-hidden="true"
          />
          <p className={styles.reasonText}>{spot.reason}</p>
        </div>
      )}

      {/* Figma 240:194 — primary(파랑) '자세히 보기 ›' */}
      <Button
        className={styles.cta}
        onClick={onOpenDetail}
        data-api="GET /api/spots/{spotId}"
      >
        자세히 보기 ›
      </Button>
    </section>
  )
}
