import { useState } from 'react'
import { ScreenNodeContext } from '../lib/screenLayer'
import styles from './Screen.module.css'

/**
 * 모든 화면의 껍데기.
 * 모바일 우선 — 폰에서는 꽉 차고, 데스크톱에서는 가운데 정렬된 폰 폭 컨테이너가 됩니다.
 *
 * 나머지 props는 그대로 넘깁니다. 화면 단위로 `data-api`를 달 때 씁니다.
 *
 * 자기 DOM 노드를 컨텍스트로 내려줍니다 — 시트 안에서 여는 뷰어처럼 화면 전체를 덮어야 하는
 * 것이 `ScreenPortal`로 이 프레임에 직접 그려지게 하려고입니다.
 */
export default function Screen({ children, ...rest }) {
  const [node, setNode] = useState(null)

  return (
    <ScreenNodeContext.Provider value={node}>
      {/* data-screen — 첫 방문 튜토리얼(Tutorial)이 지금 화면 프레임을 찾아 그 안에 그립니다. */}
      <div ref={setNode} className={styles.screen} data-screen="" {...rest}>
        {children}
      </div>
    </ScreenNodeContext.Provider>
  )
}
