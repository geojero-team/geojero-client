/**
 * 판정 결과 타임라인 아이콘 — Figma 268:295 내보내기 원본(src/assets/verdict/*.svg)을 그대로 인라인.
 * 기하는 원본과 동일하고 색만 currentColor로 바꿔 톤(brand / secondary)을 CSS가 정합니다.
 *
 *   ModeBusIcon / ModeShipIcon   summary 수단 체인용 15px (원본은 16.5 박스에 15px 아이콘)
 *   NodeStartIcon / NodeBusIcon  거터 28px 원형 노드 — 흰 면 + 2px 링 + 획 1.5
 *   NodeShipIcon                 유람선 노드 — 링이 3/3 점선 (미확인 수단)
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function ModeBusIcon({ className }) {
  return (
    <svg
      className={className}
      width="16.5"
      height="16.5"
      viewBox="0 0 16.5 16.5"
      overflow="visible"
      aria-hidden="true"
    >
      <path
        d="M0.75 7.5H15.75M3.75 12.75V15.75M12.75 12.75V15.75M0.75 0.75H15.75V12.75H0.75V0.75Z"
        {...STROKE}
      />
    </svg>
  )
}

export function ModeShipIcon({ className }) {
  return (
    <svg
      className={className}
      width="16.5"
      height="16.5"
      viewBox="0 0 16.5 16.5"
      overflow="visible"
      aria-hidden="true"
    >
      <path
        d="M4.5 10.75V5.75H12V10.75M8.25 5.75V0.75M0.750004 10.75H15.75L13.875 15.75H2.625L0.750004 10.75Z"
        {...STROKE}
      />
    </svg>
  )
}

function Node({ className, dashed = false, children }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="13" fill="#fff" />
      <rect
        x="1"
        y="1"
        width="26"
        height="26"
        rx="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={dashed ? '3 3' : undefined}
      />
      {children}
    </svg>
  )
}

export function NodeStartIcon({ className }) {
  return (
    <Node className={className}>
      <path
        d="M7 8.09375C7 7.4375 7.62222 7 8.55556 7C11.6667 7 13.2222 8.53125 17.1111 8.53125C19.4444 8.53125 21 8.09375 21 8.09375V17.9375C21 17.9375 19.4444 18.375 17.1111 18.375C13.2222 18.375 11.6667 16.8438 8.55556 16.8438C7.62222 16.8438 7 17.2812 7 17.9375M7 7.32813V21"
        {...STROKE}
      />
    </Node>
  )
}

export function NodeBusIcon({ className }) {
  return (
    <Node className={className}>
      <path d="M7 13.3H21M9.8 18.2V21M18.2 18.2V21M7 7H21V18.2H7V7Z" {...STROKE} />
    </Node>
  )
}

export function NodeShipIcon({ className }) {
  return (
    <Node className={className} dashed>
      <path
        d="M10.5 16.3333V11.6667H17.5V16.3333M14 11.6667V7M7 16.3333H21L19.25 21H8.75L7 16.3333Z"
        {...STROKE}
      />
    </Node>
  )
}
