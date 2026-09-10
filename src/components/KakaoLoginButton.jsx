import styles from './KakaoLoginButton.module.css'

/**
 * 카카오 로그인 버튼 — Figma kakao-login(237:157 / 240:214).
 *
 * 두 곳에서 같은 스펙으로 쓰입니다(내 일정 빈 상태 · 로그인 시트). 350×48, radius/control,
 * 면 #fee500, 글자 rgba(0,0,0,.85) — 카카오 가이드 색이라 토큰을 쓰지 않고 고정합니다.
 * 프레임 이름도 "kakao-login (가이드 색 고정)"입니다.
 *
 * 심볼 패스는 Figma 내보내기 원본(18×16)과 문자 단위로 같습니다.
 */
export default function KakaoLoginButton({ className = '', ...props }) {
  return (
    <button type="button" className={`${styles.button} ${className}`} {...props}>
      <svg
        className={styles.symbol}
        width="18"
        height="16"
        viewBox="0 0 18 16"
        aria-hidden="true"
      >
        <path
          d="M9 0C4.0275 0 0 2.99092 0 6.6704C0 9.03732 1.63125 11.1138 4.10625 12.2972L3.2175 15.6217C3.13875 15.8906 3.465 16.1058 3.70125 15.9444L7.785 13.287C8.17875 13.3193 8.58375 13.3408 9 13.3408C13.9725 13.3408 18 10.3499 18 6.6704C18 2.99092 13.9725 0 9 0Z"
          fill="currentColor"
        />
      </svg>
      카카오로 로그인
    </button>
  )
}
