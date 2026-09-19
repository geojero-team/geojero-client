import { useEffect, useRef } from 'react'
import ScreenPortal from './ScreenPortal'
import styles from './Toast.module.css'

/** 저절로 사라지기까지. 짧으면 못 읽고, 길면 화면을 가립니다. Toast.module.css 의 사라지는 시각과 맞춥니다. */
const VISIBLE_MS = 2400

/**
 * 한 일이 끝났다고 알리는 띠 — 화면 아래 가운데에 떴다가 스스로 사라집니다.
 *
 * 2026-09-19 사용자 결정. 코스를 저장하면 결과가 본문 **맨 아래**에 나타나는데, 로그인하고 돌아온
 * 사람에게는 그 자리가 화면 밖입니다. 저장은 됐는데 아무 일도 안 일어난 것처럼 보였습니다.
 * 앞서 「돌아오면 맨 아래로 스크롤」로 풀어 보았지만 화면이 자기 마음대로 움직이는 느낌이라 접었습니다.
 * 결과를 **눈이 있는 자리로** 가져오는 편이 낫습니다.
 *
 * 체크 표시는 그려지는 동안 보입니다 — 끝난 일에 형태를 주면 글을 읽기 전에 결과를 압니다.
 *
 * 화면 프레임에 직접 그립니다(ScreenPortal) — 본문 안에 두면 스크롤을 따라다니고,
 * 지도 시트 안에서는 시트 높이에 갇힙니다.
 *
 *   open     띄울지. false 면 아무것도 그리지 않습니다
 *   message  한 줄로 끝나는 말
 *   onDone   스스로 사라질 때 부릅니다(부모가 open 을 false 로 되돌립니다)
 */
export default function Toast({ open, message, onDone }) {
  /* 부모가 onDone 을 매번 새로 만들어도 타이머가 다시 시작되지 않게 ref 로 읽습니다 —
     다시 시작하면 부모가 그려질 때마다 사라질 시각이 뒤로 밀립니다(NineScenicSheet 와 같은 방법). */
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => doneRef.current?.(), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [open])

  if (!open) return null

  return (
    <ScreenPortal>
      {/* role="status" — 화면을 못 보는 사람에게도 읽힙니다. 끼어들지 않게 polite 입니다. */}
      <div className={styles.wrap} role="status" aria-live="polite">
        <span className={styles.toast}>
          <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true">
            <circle className={styles.ring} cx="12" cy="12" r="10" />
            <path className={styles.tick} d="M7.4 12.4l3.1 3.1 6.1-6.6" />
          </svg>
          {message}
        </span>
      </div>
    </ScreenPortal>
  )
}
