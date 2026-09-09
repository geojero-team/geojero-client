import styles from './Screen.module.css'

/**
 * 모든 화면의 껍데기.
 * 모바일 우선 — 폰에서는 꽉 차고, 데스크톱에서는 가운데 정렬된 폰 폭 컨테이너가 됩니다.
 *
 * 나머지 props는 그대로 넘깁니다. 화면 단위로 `data-api`를 달 때 씁니다.
 */
export default function Screen({ children, ...rest }) {
  return (
    <div className={styles.screen} {...rest}>
      {children}
    </div>
  )
}
