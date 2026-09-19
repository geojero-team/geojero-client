import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** 지도 시트 기록에 붙이는 표시(location.state). 주소는 그대로라 이것으로만 가른다. */
export const SHEET_STATE_KEY = 'gjSheet'

/**
 * 폰 뒤로가기로 지도 위 시트를 닫습니다(2026-09-20 사용자).
 *
 * 시트(핀을 누르면 뜨는 스팟 · 맛집 · 숙소 시트)는 주소를 바꾸지 않아(디자인브리프 부록 E) 뒤로가기 기록에 없었습니다.
 * 그래서 시트를 펼쳐 보다가 폰 뒤로가기를 누르면 시트를 건너뛰고 홈 **직전 화면**(탭으로 온 시간표 등)으로 갔고,
 * 앱을 열자마자였다면 앱 밖으로 나갔습니다. 폰 앱의 약속은 「뒤로가기는 맨 위에 뜬 것부터 닫는다」입니다.
 *
 *   · 시트가 열리면 **같은 주소로 기록을 하나** 쌓습니다(state 에 표시). 다른 핀을 눌러 시트가 바뀌어도 더 쌓지 않습니다
 *   · 뒤로가기로 그 기록이 빠지면 `close` — 펼친 상세든 작은 시트든 한 번에 닫힙니다(사용자 결정). 지도 배율 · 칩은 그대로
 *   · 화면에서 닫으면(✕ · 지도 빈 곳) 쌓은 기록을 되돌려 지웁니다 — 남기면 다음 뒤로가기가 헛돕니다
 *   · 시트에서 다른 화면으로 갔다가(가까운 스팟 · 시간표) 돌아오면 시트 기록 위에 서는데 시트는 닫혀 있습니다 —
 *     그 기록을 건너뜁니다. 새로고침도 같습니다(기록의 state 는 새로고침 뒤에도 남는다)
 *
 * 돌려주는 값: 지금 기록이 시트 기록인가 — 머리의 ‹ 처럼 「이 화면을 떠나는」 버튼이 한 칸 더 물러나야 하는지 알려줍니다.
 */
export function useSheetHistory(open, close) {
  const navigate = useNavigate()
  const location = useLocation()
  const onTop = location.state?.[SHEET_STATE_KEY] === true
  // 이번에 열린 시트로 기록을 쌓았는가
  const pushedRef = useRef(false)
  const prevOnTopRef = useRef(onTop)
  // 개발 모드(StrictMode)는 마운트 effect 를 두 번 돌립니다 — 두 칸 물러나지 않게.
  const skippedRef = useRef(false)
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    if (onTop && !open && !skippedRef.current) {
      skippedRef.current = true
      navigate(-1)
    }
    // 도착한 순간 한 번만 봅니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (open && !pushedRef.current) {
      pushedRef.current = true
      navigate(
        { pathname: location.pathname, search: location.search, hash: location.hash },
        { state: { ...(location.state ?? {}), [SHEET_STATE_KEY]: true } },
      )
    } else if (!open && pushedRef.current) {
      pushedRef.current = false
      if (onTop) navigate(-1)
    }
    // 열림 · 닫힘이 바뀔 때만 — 주소가 바뀔 때마다 돌면 기록을 또 쌓습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const was = prevOnTopRef.current
    prevOnTopRef.current = onTop
    if (was && !onTop && pushedRef.current) {
      pushedRef.current = false
      closeRef.current()
    }
  }, [onTop])

  return onTop
}
