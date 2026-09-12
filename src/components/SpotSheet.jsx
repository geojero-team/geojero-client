import { useRef, useState } from 'react'
import SpotDetail from './SpotDetail'
import { t } from '../i18n'
import { courseImage, onImageError } from '../lib/courseImage'
import styles from './SpotSheet.module.css'

/**
 * 스팟 시트 — 지도에서 핀을 누르면 아래에서 올라옵니다.
 *
 * 2026-09-13 결정. 전에는 핀을 누르면 **화면이 통째로 바뀌어** 스팟 상세로 갔습니다.
 * 지도를 보다가 "이게 뭐지"를 확인하려면 지도를 떠나야 했고, 돌아오면 배율과 위치가
 * 다시 맞춰졌습니다. 이제 지도를 그 자리에 두고 시트만 올라옵니다 —
 * **끌어올리면 스팟 상세가 그대로** 나오고(`SpotDetail` 같은 컴포넌트), 내리면 지도로 돌아옵니다.
 *
 * 02-1의 `PinSheet`가 하던 자리입니다. 그 시트는 판정 배지·불성립 이유를 담고 있어
 * 판정과 함께 지웠는데(2026-09-12), 배선은 `MapView`에 남아 있었습니다
 * (`selectedSpotId`를 주면 그 핀으로 지도를 옮기고 이름표를 지키고, 빈 곳을 누르면
 * `onDeselect`가 옵니다). 그 배선을 그대로 다시 씁니다.
 *
 * 두 단계로만 섭니다.
 *   peek  이름 · 권역·분류 · **사진 한 장** — 지도가 위에 그만큼 남습니다
 *   full  스팟 상세 전체(사진 캐러셀·소개·버스 시간표 보기)
 * 중간에 멈추지 않습니다 — 반쯤 열린 시트는 사진도 글도 못 읽는 상태입니다.
 */

/**
 * peek 높이(px) = 손잡이 24 + 위 4 + 이름 32 + 분류 20 + 8 + 사진 140 + 아래 16.
 *
 * 지도를 이만큼 줄이는 쪽에서도 같은 값이 필요합니다 — 지도가 그대로면 `panTo`가 핀을
 * **시트에 가려진 자리**로 옮깁니다. 그래서 상수를 내보냅니다(값이 두 군데서 갈리면
 * 핀이 시트 경계에 걸립니다). 844 화면에서 지도가 536px 남습니다.
 */
export const PEEK_HEIGHT = 244

/** 이만큼 끌면 다음 단계로 넘어갑니다. 짧으면 손 떨림에도 열리고, 길면 안 열립니다. */
const SNAP_THRESHOLD = 56

export default function SpotSheet({ spot, onClose }) {
  const [full, setFull] = useState(false)
  // 끄는 동안의 높이(px). null이면 단계가 정한 높이를 씁니다.
  const [dragHeight, setDragHeight] = useState(null)
  // 끄는 동안에는 높이 전환 애니메이션을 끕니다 — 켜두면 손을 따라오지 않고 늦게 옵니다.
  const [dragging, setDragging] = useState(false)
  const rootRef = useRef(null)
  const dragRef = useRef(null)
  /* 끌고 나면 브라우저가 pointerup 뒤에 click 도 보냅니다. 그걸 그대로 받으면 onClick 이
     방금 끌어서 정한 단계를 **다시 뒤집습니다**(끌어올려 full → click 이 peek 으로).
     그래서 실제로 움직였는지 표시해두고, 움직였으면 그 한 번의 click 을 버립니다. */
  const movedRef = useRef(false)

  /* 다른 스팟을 누르면 peek 에서 다시 시작해야 합니다 — 앞 스팟을 펼쳐 보던 상태가
     남으면 누른 적 없는 스팟의 상세가 펼쳐진 채로 뜹니다. 그 초기화를 effect 에서
     하지 않고 **부모가 `key={poiId}` 로 다시 마운트**해서 합니다. */

  const maxHeight = () => rootRef.current?.parentElement?.clientHeight ?? PEEK_HEIGHT

  const onPointerDown = (event) => {
    // 손잡이에서만 끕니다. 본문에서 끌면 사진 캐러셀·본문 스크롤과 싸웁니다.
    dragRef.current = { y: event.clientY, from: full ? maxHeight() : PEEK_HEIGHT }
    movedRef.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    // 4px 은 손 떨림입니다. 그보다 움직였으면 '끈 것'으로 봅니다.
    if (Math.abs(drag.y - event.clientY) > 4) movedRef.current = true
    const next = drag.from + (drag.y - event.clientY)
    setDragHeight(Math.max(0, Math.min(next, maxHeight())))
  }

  const onPointerUp = (event) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)

    const moved = drag.y - event.clientY // 위로 끌면 양수
    setDragHeight(null)
    if (moved > SNAP_THRESHOLD) setFull(true)
    else if (moved < -SNAP_THRESHOLD) {
      // peek에서 더 내리면 닫습니다. full에서 내리면 peek으로만 돌아옵니다.
      if (full) setFull(false)
      else onClose()
    }
  }

  // full에서는 시트가 부모를 꽉 채웁니다. peek·끄는 중에는 px로 잠급니다.
  const height = dragHeight != null ? `${dragHeight}px` : full ? '100%' : `${PEEK_HEIGHT}px`

  if (!spot) return null

  return (
    <div
      ref={rootRef}
      className={dragging ? `${styles.root} ${styles.dragging}` : styles.root}
      style={{ height }}
      role="dialog"
      aria-label={spot.shortName ?? spot.name}
    >
      {/* 손잡이. 끌어도 되고 눌러도 됩니다 — 마우스만 쓰는 사람에게는 끄는 것이 어렵습니다. */}
      <button
        type="button"
        className={styles.grabber}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          // 끈 뒤에 따라오는 click 한 번은 버립니다(위 movedRef 주석).
          if (movedRef.current) {
            movedRef.current = false
            return
          }
          setFull((on) => !on)
        }}
        aria-label={t(full ? 'spotSheet.collapse' : 'spotSheet.expand')}
        aria-expanded={full}
      >
        <span className={styles.grabberBar} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label={t('common.close')}
      >
        ✕
      </button>

      {full ? (
        /* 끌어올리면 스팟 상세가 그대로 나옵니다. 시트에 손잡이와 닫기가 있으므로
           onBack은 주지 않습니다 — 닫는 방법이 둘이면 어느 게 뭘 닫는지 알 수 없습니다. */
        <SpotDetail key={spot.poiId} poiId={spot.poiId} seed={spot} />
      ) : (
        /* peek — 이름 · 권역·분류 · 사진 한 장.
           「자세히 보기」 버튼을 뺐습니다(2026-09-13). 손잡이로 바로 올릴 수 있어 버튼이
           같은 일을 두 번 하고, 그 자리를 사진에 주는 편이 "여기가 어딘지"를 훨씬 빨리
           말해줍니다. 대신 **이 덩어리 전체가 눌립니다** — 끄는 동작이 어려운 사람에게
           열 방법이 남아야 합니다. */
        <button
          type="button"
          className={styles.peek}
          onClick={() => setFull(true)}
          aria-label={t('spotSheet.expand')}
        >
          <span className={styles.name}>{spot.shortName ?? spot.name}</span>
          {/* 권역·분류가 없으면 줄을 아예 그리지 않습니다 — 값 없이 `·` 만 남으면
              그게 곧 우리가 기준문서 §4에서 비판하는 '이유 없는 빈칸'입니다. */}
          {(spot.region || spot.category) && (
            <span className={styles.category}>
              {[spot.region, spot.category].filter(Boolean).join(' · ')}
            </span>
          )}
          {/* 사진이 없는 스팟(저작권 Type3)은 courseImage가 테마 자리그림을 줍니다 —
              0장은 버그가 아니라 사실이므로 빈 자리로 두지 않습니다. */}
          <img
            className={styles.photo}
            src={courseImage(spot)}
            alt=""
            onError={onImageError(spot)}
          />
        </button>
      )}
    </div>
  )
}
