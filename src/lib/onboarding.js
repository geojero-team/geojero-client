/**
 * 첫 방문 튜토리얼을 봤는지 — **이 브라우저 · 기기 기준**(localStorage).
 *
 * 2026-09-15 사용자 결정: 대회 제출용이라 로그인 없이 기기마다 한 번. 끝까지 보거나 건너뛰면 표시를 남깁니다.
 *  · 아이폰 사파리는 7일 넘게 안 온 사이트의 저장소를 지워, 오랜만에 오면 한 번 더 뜰 수 있습니다 — 사용자가 괜찮다고 했습니다.
 *  · 홈 화면에 설치한 앱(PWA)은 연 날만 세서 사실상 지워지지 않습니다. PWA를 붙여도 이 파일은 그대로 씁니다.
 *  · 기기와 상관없이 "이 사람이 처음인지"를 알려면 로그인이 필요합니다(지금은 하지 않습니다).
 *
 * 튜토리얼 내용을 크게 바꾸면 KEY 를 v2 로 올려 모두에게 다시 보입니다.
 * 저장소가 막힌 브라우저(시크릿 모드 등)에서는 **띄우지 않습니다** — 표시를 남길 수 없어 매번 뜨게 됩니다.
 */
const KEY = 'gj_onboarded_v1'

export function isFirstVisit() {
  try {
    return localStorage.getItem(KEY) == null
  } catch {
    return false
  }
}

/** 본 날(ISO)을 남깁니다 — 지금은 있고 없음만 보지만, 나중에 "오래전에 봤으면 다시" 같은 규칙을 둘 수 있게. */
export function markOnboarded() {
  try {
    localStorage.setItem(KEY, new Date().toISOString())
  } catch {
    // 남길 수 없으면 이번 방문에서만 닫힙니다.
  }
}
