import Button from './Button'
import StatusBadge from './StatusBadge'
import styles from './PinSheet.module.css'

/**
 * 지도 핀을 눌렀을 때 뜨는 요약 시트 — Figma pin-summary-sheet(240:173).
 *
 * Figma 프레임 하나에 코스 속성(출발 → 도착 · 돌아오는 막차 · 막차 탑승)과
 * 스팟 속성(권역 · 분류)이 섞여 있습니다. 핀이 두 종류라서 그렇습니다 —
 * 껍데기는 그대로 두고 내용만 눌린 핀에 따라 나눕니다.
 *
 *   course  코스에 든 정류소를 눌렀다 → 코스 요약, '자세히 보기'는 판정 결과로
 *   spot    코스 밖 스팟을 눌렀다     → 스팟 요약, '자세히 보기'는 스팟 상세로
 *
 * 부제('남부권 · 언덕·전망')는 두 경우 모두 **눌린 스팟**의 것입니다.
 */
export default function PinSheet({ kind, spot, route, showVerdict, onClose, onOpen }) {
  const isCourse = kind === 'course'
  const verdict = isCourse ? route.verdict : spot.verdict
  const reason = isCourse ? route.reason : spot.reason

  return (
    <section className={styles.sheet} aria-label={isCourse ? '선택한 코스' : '선택한 스팟'}>
      <div className={styles.handleRow}>
        <span className={styles.handle} aria-hidden="true" />
      </div>

      <div className={styles.row}>
        {showVerdict && <StatusBadge status={verdict} />}
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      <h2 className={styles.title}>{isCourse ? route.name : spot.name}</h2>
      <p className={styles.subtitle}>
        {spot.region} · {spot.category}
      </p>

      {/* facts는 여정 속성이라 코스 핀에만 붙습니다(Figma 240:184). */}
      {isCourse && (
        <div className={styles.facts}>
          <div className={styles.fact}>
            <span className={styles.factLabel}>출발 → 도착</span>
            <span className={styles.factValue}>
              {route.departTime} → {route.arriveTime}
            </span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>돌아오는 막차</span>
            <span className={styles.factValue}>
              {route.lastBus} {route.lastStopName}발
            </span>
          </div>
        </div>
      )}

      {isCourse && route.lastRide && (
        <div className={styles.lastRide}>
          <p className={styles.lastRideBoard}>{route.lastRide.board}</p>
          <p className={styles.lastRideArrive}>{route.lastRide.arrive}</p>
        </div>
      )}

      {/* 미확인·불성립 사유는 성립이 아닐 때 항상 보여줍니다.
          미확인을 성립처럼 조용히 넘기지 않기 위한 줄입니다. */}
      {showVerdict && verdict !== 'YES' && reason && (
        <p className={verdict === 'NO' ? styles.reasonNo : styles.reason}>{reason}</p>
      )}

      {!isCourse && showVerdict && spot.summary && (
        <p className={styles.summary}>{spot.summary}</p>
      )}

      <Button
        className={styles.cta}
        onClick={onOpen}
        data-api={isCourse ? 'POST /api/courses/{courseId}/judge' : 'GET /api/pois/{poiId}'}
      >
        자세히 보기 ›
      </Button>
    </section>
  )
}
