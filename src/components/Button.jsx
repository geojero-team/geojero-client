import { usePressTilt } from '../lib/usePressTilt'
import styles from './Button.module.css'

/**
 * Figma Button(27:15) — 높이 48 고정, 폭 FILL, radius/control.
 * variant: primary(brand 면) · secondary(흰 면 + 테두리 + brand 글자) ·
 *          ghost(면 없음 + brand 글자) · disabled(surface 면 + 테두리 + 보조 글자)
 * 라벨의 '›'는 텍스트로 넣습니다 — Figma 버튼엔 아이콘이 없습니다.
 *
 * 2026-09-19 **누름 촉감**을 붙였습니다(사용자 — 토스처럼). 누르면 살짝 작아지며 누른 쪽으로 기웁니다.
 * 이 컴포넌트에만 넣은 이유: 화면마다 하나뿐인 주요 버튼이 전부 여기를 지나갑니다
 * (코스 추천 받기 · 코스 N개 선택하기 · 코스 선택 · 이 코스 저장하기 …).
 * 칩 · 아이콘 버튼 · 탭바 · 목록 줄에는 넣지 않습니다 — 작고 자주 눌리는 것이 움직이면 앱이 느려 보입니다.
 */
export default function Button({
  variant = 'primary',
  className = '',
  children,
  ref,
  ...props
}) {
  /* 호출부도 ref 를 받을 수 있습니다(Tutorial 이 다음 버튼 자리를 재려고 넘깁니다).
     둘을 합치는 일은 **훅 안에서** 합니다 — 여기서 `press.ref.current` 에 손대면
     React 컴파일러가 「훅이 돌려준 값을 밖에서 고치지 말라」고 막습니다. */
  const { attach, handlers: pressHandlers } = usePressTilt({ forwardedRef: ref })

  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ')

  /* 포인터 핸들러는 호출부가 같은 이름을 넘기면 둘 다 부릅니다 — 하나가 조용히 사라지지 않게. */
  const handlers = Object.fromEntries(
    Object.entries(pressHandlers).map(([name, own]) => [
      name,
      (event) => {
        own(event)
        props[name]?.(event)
      },
    ]),
  )

  return (
    <button type="button" className={classes} ref={attach} {...props} {...handlers}>
      {children}
    </button>
  )
}
