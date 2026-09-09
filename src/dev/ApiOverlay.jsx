import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './ApiOverlay.module.css'

/**
 * 개발용 — 화면 위에 "이 요소가 어떤 API를 부르는지" 뱃지로 띄웁니다.
 *
 * 화면↔API 매핑을 문서에 그려두면 코드가 바뀌는 순간 거짓말이 됩니다. 그래서
 * 그림을 따로 그리지 않고, API를 부르는 요소에 `data-api`를 직접 달아두고
 * 이 오버레이가 실행 중인 화면에서 그대로 읽어 표시합니다. 호출이 사라지면
 * 뱃지도 같이 사라지므로 낡을 수가 없습니다.
 *
 *   켜기   http://localhost:5173/?debug=api
 *   달기   <button data-api="GET /api/spots/{spotId}">자세히 보기</button>
 *   뽑기   npm run api:map   (백엔드에 넘길 표가 코드에서 그대로 나옵니다)
 *
 * 프로덕션 번들에는 들어가지 않습니다 — App.jsx가 import.meta.env.DEV로 막습니다.
 */

/** 뱃지를 요소 위에 올릴지 아래에 붙일지 가르는 높이. 화면 밖으로 나가면 안 됩니다. */
const BADGE_HEIGHT = 22

function enabledNow() {
  return new URLSearchParams(window.location.search).get('debug') === 'api'
}

/**
 * 지금 화면에 떠 있는 `data-api` 요소를 전부 재봅니다.
 * 크기가 0인 것(닫힌 시트, 조건부 렌더 직전)은 그릴 자리가 없으므로 건너뜁니다.
 */
function measure() {
  return Array.from(document.querySelectorAll('[data-api]'))
    .map((element, index) => {
      const { top, left, width, height } = element.getBoundingClientRect()
      return { key: `${index}-${element.dataset.api}`, api: element.dataset.api, top, left, width, height }
    })
    .filter(({ width, height }) => width > 0 && height > 0)
}

export default function ApiOverlay() {
  const [targets, setTargets] = useState([])
  const [on, setOn] = useState(enabledNow)

  useEffect(() => {
    let frame = 0

    const sync = () => {
      cancelAnimationFrame(frame)
      // 레이아웃이 끝난 뒤에 재야 정확합니다. 연달아 들어오는 이벤트는 한 프레임으로 묶습니다.
      frame = requestAnimationFrame(() => {
        const next = enabledNow()
        setOn(next)
        setTargets(next ? measure() : [])
      })
    }

    // 화면 전환·시트 열림처럼 DOM이 바뀌면 다시 잽니다. 오버레이 자신은 body에
    // 포털로 붙어 있고 여기서는 #root만 보므로, 우리 렌더가 다시 우리를 깨우지 않습니다.
    const root = document.getElementById('root')
    const observer = new MutationObserver(sync)
    if (root) {
      observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-api', 'class', 'style'],
      })
    }

    // 지도·시트가 각자 스크롤되므로 캡처 단계에서 받아야 안쪽 스크롤도 잡힙니다.
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    window.addEventListener('popstate', sync)

    sync()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  if (!on) return null

  const apis = [...new Set(targets.map(({ api }) => api))]

  return createPortal(
    <div className={styles.layer} aria-hidden="true">
      {targets.map(({ key, api, top, left, width, height }) => (
        <div
          key={key}
          className={styles.frame}
          style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` }}
        >
          <span
            className={styles.badge}
            /* 화면 맨 위에 붙은 요소는 뱃지를 안쪽으로 넣어야 잘리지 않습니다. */
            style={top < BADGE_HEIGHT ? { top: 0 } : { top: `-${BADGE_HEIGHT}px` }}
          >
            {api}
          </span>
        </div>
      ))}

      <aside className={styles.panel}>
        <p className={styles.panelTitle}>이 화면이 쓰는 API</p>
        {apis.length === 0 ? (
          <p className={styles.panelEmpty}>data-api가 달린 요소가 없습니다</p>
        ) : (
          <ul className={styles.panelList}>
            {apis.map((api) => (
              <li key={api} className={styles.panelItem}>
                {api}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>,
    document.body,
  )
}
