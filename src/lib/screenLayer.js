import { createContext } from 'react'

/**
 * 화면 프레임(`Screen`의 390×844 div) DOM 노드.
 *
 *   undefined  Screen 밖(테스트·단독 렌더) — 겹쳐 그릴 곳이 body뿐입니다
 *   null       Screen 안인데 아직 마운트 전 — 한 박자 기다립니다
 *   Element    그 프레임
 *
 * 컴포넌트 파일(.jsx)에서 컨텍스트를 함께 내보내면 react-refresh 규칙에 걸려 여기 따로 둡니다.
 */
export const ScreenNodeContext = createContext(undefined)
