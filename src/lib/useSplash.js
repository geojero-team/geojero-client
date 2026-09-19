import { useEffect, useState } from 'react'

/* 시작화면을 띄울지(2026-09-19 사용자) — 앱을 열면 2.3초(2026-09-20 사용자 — 2초에서 0.3초 늘림).
   카카오가 돌려보내는 자리만 뺍니다: 거기는 앱을 여는 순간이 아니라 로그인 도중이라,
   시간을 끼우면 로그인이 그만큼 느려집니다. */
export const SPLASH_MS = 2300

export function useSplash() {
  const [open, setOpen] = useState(
    () => !window.location.pathname.startsWith('/auth/callback'),
  )

  useEffect(() => {
    if (!open) return undefined
    const id = setTimeout(() => setOpen(false), SPLASH_MS)
    return () => clearTimeout(id)
    // 여는 순간 한 번만 재니 open 을 의존성에 넣지 않습니다 — 넣으면 false 가 될 때 한 번 더 돕니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return open
}
