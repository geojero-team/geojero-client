import { t } from '../i18n'
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

  // 판정 말은 **사용자가 고른 것**에만 붙입니다(2026-09-10 결정). 코스 핀은 고른 스팟이니
  // 배지와 이유를 달고, 코스 밖 스팟 핀은 고른 게 아니므로 둘 다 달지 않습니다.
  const verdict = isCourse ? route.verdict : null
  const reason = isCourse ? route.reason : null

  return (
    <section className={styles.sheet} aria-label={t(isCourse ? 'map.pinCourseAria' : 'map.pinSpotAria')}>
      <div className={styles.handleRow}>
        <span className={styles.handle} aria-hidden="true" />
      </div>

      <div className={styles.row}>
        {showVerdict && <StatusBadge status={verdict} />}
        <button type="button" className={styles.close} onClick={onClose} aria-label={t('common.close')}>
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
            <span className={styles.factLabel}>{t('map.factDepartArrive')}</span>
            <span className={styles.factValue}>
              {route.departTime} → {route.arriveTime}
            </span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>{t('map.factLastBus')}</span>
            <span className={styles.factValue}>
              {t('map.lastStop', { time: route.lastBus, stop: route.lastStopName })}
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

      {/* 고른 코스가 성립이 아닐 때만 이유를 답합니다. */}
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
        {t('map.openDetail')}
      </Button>
    </section>
  )
}
