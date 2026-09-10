import { Fragment, useRef } from 'react'
import Button from './Button'
import { t } from '../i18n'
import { courseImage, onImageError } from '../lib/courseImage'
import { useDragScroll } from '../lib/useDragScroll'
import styles from './CourseStrip.module.css'

/**
 * 지도 하단 코스 카드 스트립 — Figma course-sheet(285:251).
 *
 * 카드를 가로로 늘어놓고 다음 카드가 우측에 살짝 보이게(peek) 둡니다. 카드를 누르면
 * 그 코스가 지도에 그려지고, 선택된 카드에만 '코스 상세보기 ›' 버튼이 생깁니다.
 * '추천' 태그는 선택 여부와 무관하게 첫 카드(=추천 코스)에만 붙습니다 — 두 프레임
 * (285:251 / 285:357)에서 선택이 옮겨가도 태그는 그대로였습니다.
 *
 * 시트는 지도 위에 떠 있지 않고 지도를 밀어냅니다(Figma에서 지도·시트·탭바가 형제).
 */
function OrderStop({ spot, index, last, lastBus }) {
  return (
    <span className={styles.stop}>
      <span className={styles.thumb}>
        <img className={styles.thumbImg} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
        <span className={styles.num}>{index + 1}</span>
      </span>
      <span className={styles.stopName}>{spot.shortName ?? spot.name}</span>
      {last && lastBus && (
        <span className={styles.lastBus}>{t('course.lastBus', { time: lastBus })}</span>
      )}
    </span>
  )
}

function OrderCard({ route, spotsById, selected, onSelect, onOpenVerdict }) {
  const spots = route.spotIds.map((id) => spotsById.get(id)).filter(Boolean)

  return (
    <div className={selected ? `${styles.card} ${styles.cardOn}` : styles.card}>
      <button
        type="button"
        className={styles.cardMain}
        onClick={() => onSelect(route.routeId)}
        aria-pressed={selected}
      >
        <span className={styles.row}>
          <span className={styles.time}>
            {route.departTime} → {route.arriveTime}
          </span>
          {route.recommended && <span className={styles.tag}>{t('course.recommended')}</span>}
        </span>

        <span className={styles.order}>
          {spots.map((spot, index) => (
            <Fragment key={spot.spotId}>
              {index > 0 && (
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              )}
              <OrderStop
                spot={spot}
                index={index}
                last={index === spots.length - 1}
                lastBus={route.lastBus}
              />
            </Fragment>
          ))}
        </span>
      </button>

      {selected && (
        <Button
          className={styles.cta}
          onClick={() => onOpenVerdict(route)}
          data-api="POST /api/courses/{courseId}/judge"
        >
          {t('course.openVerdict')}
        </Button>
      )}
    </div>
  )
}

export default function CourseStrip({
  routes,
  spotsById,
  activeRouteId,
  onSelect,
  onOpenVerdict,
}) {
  /* 카드를 마우스로도 밀 수 있게 합니다. 다음 카드가 오른쪽에 살짝 보이는(peek) 배치라
     PC에서 밀 방법이 없으면 "더 있다"만 알려주고 못 보게 됩니다. 끌다 손을 떼면 그
     카드가 눌린 것으로 처리되던 것도 훅이 막습니다. */
  const stripRef = useRef(null)
  const stripDrag = useDragScroll(stripRef)

  if (routes.length === 0) return null

  return (
    <section className={styles.sheet} aria-label={t('course.sheetAria')}>
      <div className={styles.handleRow}>
        <span className={styles.handle} aria-hidden="true" />
      </div>

      <div className={styles.strip} ref={stripRef} {...stripDrag}>
        <div className={styles.cards}>
          {routes.map((route) => (
            <OrderCard
              key={route.routeId}
              route={route}
              spotsById={spotsById}
              selected={route.routeId === activeRouteId}
              onSelect={onSelect}
              onOpenVerdict={onOpenVerdict}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
