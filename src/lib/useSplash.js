import { useEffect, useState } from 'react'

/* 시작화면을 띄울지(2026-09-19 사용자) — 앱을 열면 3초(2026-09-20 사용자 — 2초 → 2.3초 → 2.8초 → 3초).
   3초가 위 한계입니다 — 애플 가이드: "sometimes they don't want to wait more than a couple of seconds". 새 탭마다 다시 뜹니다.
   마지막 0.4초(SPLASH_FADE_MS)는 흐려지며 홈으로 넘어가는 시간입니다 — Splash 가 이 두 값으로 움직임을 맞춥니다.
   카카오가 돌려보내는 자리만 뺍니다: 거기는 앱을 여는 순간이 아니라 로그인 도중이라,
   시간을 끼우면 로그인이 그만큼 느려집니다.

   **창(탭) 하나에 한 번**(2026-09-20 사용자) — 웹은 새로고침도 처음 여는 것과 같아서, 지도를 보다가
   새로고침하면 시작화면이 다시 떴습니다. 본 것을 sessionStorage 에 남겨 같은 창에서는 다시 띄우지 않습니다.
   창을 닫으면 지워지므로 앱을 완전히 닫았다 새로 열면 다시 뜹니다. 저장소가 막힌 브라우저(시크릿 모드 등)에서는
   기억할 수 없어 전처럼 매번 뜹니다. */
export const SPLASH_MS = 3000
export const SPLASH_FADE_MS = 400
const SEEN_KEY = 'gj_splash_seen'

function seenInThisTab() {
  try {
    return sessionStorage.getItem(SEEN_KEY) != null
  } catch {
    return false
  }
}

export function useSplash() {
  const [open, setOpen] = useState(
    () => !window.location.pathname.startsWith('/auth/callback') && !seenInThisTab(),
  )

  useEffect(() => {
    if (!open) return undefined
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // 남길 수 없으면 새로고침 때 다시 뜹니다.
    }
    const id = setTimeout(() => setOpen(false), SPLASH_MS)
    return () => clearTimeout(id)
    // 여는 순간 한 번만 재니 open 을 의존성에 넣지 않습니다 — 넣으면 false 가 될 때 한 번 더 돕니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return open
}
