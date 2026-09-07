import styles from './Screen.module.css'

/**
 * 모든 화면의 껍데기.
 * 모바일 우선 — 폰에서는 꽉 차고, 데스크톱에서는 가운데 정렬된 폰 폭 컨테이너가 됩니다.
 */
export default function Screen({ children }) {
  return <div className={styles.screen}>{children}</div>
}
