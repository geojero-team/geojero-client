import { useContext } from 'react'
import { createPortal } from 'react-dom'
import { ScreenNodeContext } from '../lib/screenLayer'

/**
 * 화면 전체를 덮는 것(방문자 사진 뷰어·올리기 시트·그 로그인 시트)을 **화면 프레임에 직접** 그립니다.
 *
 * 왜 필요한가: 스팟 상세는 두 자리에 들어갑니다. `/spots/:id`에서는 프레임 안에 바로 있지만,
 * 지도의 스팟 시트(full) 안에서는 시트 `.root`(overflow:hidden · z-index 3)에 갇힙니다 —
 * 그 안에 absolute로 그리면 시트 높이만큼만 덮이고 탭바가 보인 채로 뜹니다.
 *
 * body로 보내면 안 되는 이유: 프레임(`.screen`)에 CSS zoom과 390×844 잠금이 걸려 있어
 * body로 나가면 데스크톱에서 프레임 밖 창 전체를 덮고 배율도 달라집니다.
 * 그래서 Screen이 자기 노드를 컨텍스트로 내려주고, 여기서 그 노드로 포털합니다.
 */
export default function ScreenPortal({ children }) {
  const node = useContext(ScreenNodeContext)
  if (node === undefined) return createPortal(children, document.body)
  if (node === null) return null
  return createPortal(children, node)
}
