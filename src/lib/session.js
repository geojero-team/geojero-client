/**
 * 로그인 세션 — 토큰과 닉네임을 브라우저에 둡니다.
 *
 * **왜 쿠키가 아닌가**: 프론트(vercel.app)와 API(api.geojero.com)가 다른 사이트라
 * `SameSite=Lax` 쿠키는 저장도 전송도 되지 않습니다. `SameSite=None`으로 열면 사파리가
 * 서드파티 쿠키를 막습니다. 서버가 쿠키와 같은 토큰을 응답 본문으로도 주므로
 * 그걸 들고 `Authorization: Bearer`로 보냅니다.
 *
 * 대가: httpOnly 쿠키와 달리 스크립트가 토큰을 읽을 수 있습니다. 이 세션이 주는 권한은
 * 닉네임 조회와 일정 저장·삭제뿐이고(무이메일 로그인이라 이메일도 없습니다), 기준문서 §6상
 * 로그인은 없어도 되는 부가 기능입니다. `geojero.com`이 붙어 같은 사이트가 되면 서버가
 * 쿠키를 먼저 보므로 이 파일 없이도 동작합니다.
 *
 * 저장이 막힌 브라우저(시크릿 모드 등)에서도 화면이 죽지 않게 전부 try/catch로 감쌉니다.
 */

const TOKEN_KEY = 'gj_token'
const NICKNAME_KEY = 'gj_nickname'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getNickname() {
  try {
    return localStorage.getItem(NICKNAME_KEY)
  } catch {
    return null
  }
}

export function saveSession({ token, nickname }) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (nickname) localStorage.setItem(NICKNAME_KEY, nickname)
  } catch {
    // 저장이 막혀도 이번 세션은 메모리로 돌 수 있게 조용히 넘어갑니다.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NICKNAME_KEY)
  } catch {
    // 지울 수 없으면 만료를 기다립니다(토큰 TTL 7일).
  }
}

/**
 * 로그인 후 돌아올 화면. 카카오를 거치는 동안 라우터 상태가 사라지므로 여기 맡깁니다.
 * 열린 리다이렉트를 만들지 않으려고 같은 출처의 경로만 받습니다.
 */
export function stashReturnTo(path) {
  try {
    sessionStorage.setItem('gj_return_to', path)
  } catch {
    // 못 맡기면 콜백이 홈으로 보냅니다.
  }
}

export function takeReturnTo() {
  try {
    const path = sessionStorage.getItem('gj_return_to')
    sessionStorage.removeItem('gj_return_to')
    return path && path.startsWith('/') && !path.startsWith('//') ? path : '/'
  } catch {
    return '/'
  }
}
