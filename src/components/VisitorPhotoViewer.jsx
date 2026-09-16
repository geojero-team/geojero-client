import { Flag } from 'lucide-react'
import { t } from '../i18n'
import { formatDateWeekday } from '../lib/format'
import styles from './VisitorPhotoViewer.module.css'

/**
 * 방문자 사진 뷰어 — Figma 02-1 v2 `268:499` (390×844 어두운 전체 화면).
 *
 * 스트립의 타일을 누르거나 「더보기」(1장부터)를 누르면 열립니다(02-2). 호출부가 `ScreenPortal`로 화면 프레임에
 * 그리므로 지도 시트 안에서 열어도 탭바까지 덮습니다.
 *
 * Figma와 다른 점
 *   · 위 줄의 아바타·「여행자 A」를 그리지 않고 날짜만 둡니다 — 서버가 작성자를 주지 않습니다
 *   · 「신고」 자리에 내 사진일 때만 「삭제」(actions)가 옵니다
 *   · 첫 장의 ‹ · 끝 장의 › 는 비활성으로 흐리게 둡니다(그 모습은 Figma에 없습니다)
 *   · 사진은 390×390 칸 안에 **잘리지 않게** 넣습니다(contain) — 원본 비율 처리가 Figma에 정해져 있지 않습니다
 */
export default function VisitorPhotoViewer({
  photo,
  index,
  total,
  onPrev,
  onNext,
  onClose,
  onReport,
  actions,
}) {
  return (
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label={t('visitorPhotos.viewerAria')}
    >
      {/* top(268:500) */}
      <div className={styles.top}>
        <span className={styles.date}>{formatDateWeekday(photo.uploadedDate)}</span>
        <span className={styles.position}>{`${index + 1} / ${total}`}</span>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={t('common.close')}
          autoFocus
        >
          ×
        </button>
      </div>

      {/* photo(268:508) */}
      <div className={styles.photo}>
        <img className={styles.image} src={photo.imageUrl} alt="" draggable="false" />
        {/* 신고 — 사진 우측 위(2026-09-16 사용자 지정). 면 없이 아이콘만 얹습니다. */}
        {onReport && (
          <button
            type="button"
            className={styles.overlay}
            onClick={onReport}
            aria-label={t('visitorPhotos.report')}
          >
            <Flag size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* caption(268:510) — 캡션이 없으면 문단을 그리지 않습니다 */}
      <div className={styles.captionBox}>
        {photo.caption && <p className={styles.caption}>{photo.caption}</p>}
        {actions}
      </div>

      {/* nav(268:513) */}
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navButton}
          onClick={onPrev}
          disabled={index === 0}
          aria-label={t('visitorPhotos.prev')}
        >
          ‹
        </button>
        <button
          type="button"
          className={styles.navButton}
          onClick={onNext}
          disabled={index === total - 1}
          aria-label={t('visitorPhotos.next')}
        >
          ›
        </button>
      </div>
    </div>
  )
}
