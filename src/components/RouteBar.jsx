import { useEffect, useRef } from 'react'
import { Route } from 'lucide-react'
import styles from './RouteBar.module.css'

/**
 * 추천 코스 버튼 줄. 하단 탭바 바로 위에 고정입니다.
 *
 * 카드가 떠도 이 줄은 계속 보입니다 — 코스 1 ↔ 2 ↔ 3을 바로 오가며 비교하는 게
 * 이 화면의 핵심이라, 다른 코스를 보려고 카드를 먼저 닫게 만들면 안 됩니다.
 *
 * 순위는 팀 결정입니다: 1 = 많이 갈 수 있는 곳, 2 = 최소 시간 동선, 3 = +α.
 */
export default function RouteBar({
  routes,
  activeRouteId,
  onSelect,
  onHeightChange,
}) {
  const barRef = useRef(null)

  // 카드와 지도가 이 줄만큼 위로 물러나야 해서 높이를 위로 알려줍니다.
  // 안내 문구가 사라지면 높이가 줄어드는데 그것도 따라옵니다.
  useEffect(() => {
    const element = barRef.current
    if (!onHeightChange) return
    if (!element) {
      onHeightChange(0)
      return
    }

    const observer = new ResizeObserver(() =>
      onHeightChange(element.offsetHeight),
    )
    observer.observe(element)
    return () => observer.disconnect()
    // routes가 0 → 3으로 바뀌면 ref가 null에서 엘리먼트로 바뀌므로 다시 붙어야 합니다.
  }, [onHeightChange, routes.length])

  if (routes.length === 0) return null

  return (
    <div ref={barRef} className={styles.bar}>
      <p className={styles.hint}>
        <Route size={13} aria-hidden="true" />
        맞춤 경로를 눌러 동선을 확인하세요
      </p>

      <div className={styles.scroller}>
        {routes.map((route) => {
          const active = route.routeId === activeRouteId
          return (
            <button
              key={route.routeId}
              type="button"
              className={active ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              // 다시 누르면 코스를 풀고 전체 스팟으로 돌아갑니다.
              onClick={() => onSelect(active ? null : route.routeId)}
              aria-pressed={active}
            >
              <span className={styles.label}>맞춤 경로 {route.rank}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
