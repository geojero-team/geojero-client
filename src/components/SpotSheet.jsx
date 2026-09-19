import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import SpotDetail from './SpotDetail'
import { t } from '../i18n'
import { courseImage, onImageError } from '../lib/courseImage'
import { peekHeightOf } from './spotSheetHeight'
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
 *   peek  이름 · 권역·분류 · **사진 한 장** — 지도가 위에 그만큼 남습니다(높이는 spotSheetHeight.js)
 *         고현터미널은 이름 · 「모든 코스의 출발 지점」뿐이라 더 낮습니다
 *   full  스팟 상세 전체(사진 캐러셀·소개·시간표 보기)
 * 중간에 멈추지 않습니다 — 반쯤 열린 시트는 사진도 글도 못 읽는 상태입니다.
 *
 * 올리고 내리는 방식(2026-09-14): 시트는 늘 틀을 꽉 채우고, 보이는 높이만큼만 드러나게 **아래로 밀어 둡니다**.
 * 전에는 시트의 height 를 바꿨는데, height 애니메이션은 매 프레임 레이아웃을 다시 계산해 폰에서 버벅입니다.
 * transform 은 이미 그린 것을 옮기기만 합니다.
 */

/** 이만큼 끌면 다음 단계로 넘어갑니다. 짧으면 손 떨림에도 열리고, 길면 안 열립니다. */
const SNAP_THRESHOLD = 56

export default function SpotSheet({ spot, onClose, onFullChange }) {
  const [full, setFull] = useState(false)
  // 끄는 동안 보이는 높이(px). null이면 단계가 정한 높이를 씁니다.
  const [dragHeight, setDragHeight] = useState(null)
  // 끄는 동안에는 전환 애니메이션을 끕니다 — 켜두면 손을 따라오지 않고 늦게 옵니다.
  const [dragging, setDragging] = useState(false)
  // 시트를 담는 틀. 끝까지 끌어올린 높이(= full)를 이 틀의 높이로 잽니다.
  const clipRef = useRef(null)
  const dragRef = useRef(null)
  /* 끌고 나면 브라우저가 pointerup 뒤에 click 도 보냅니다. 그걸 그대로 받으면 onClick 이
     방금 끌어서 정한 단계를 **다시 뒤집습니다**(끌어올려 full → click 이 peek 으로).
     그래서 실제로 움직였는지 표시해두고, 움직였으면 그 한 번의 click 을 버립니다. */
  const movedRef = useRef(false)

  /* 다른 스팟을 누르면 peek 에서 다시 시작해야 합니다 — 앞 스팟을 펼쳐 보던 상태가
     남으면 누른 적 없는 스팟의 상세가 펼쳐진 채로 뜹니다. 그 초기화를 effect 에서
     하지 않고 **부모가 `key={poiId}` 로 다시 마운트**해서 합니다. */

  /* 펼쳤는지를 부모에게 알립니다(2026-09-18 사용자 — 코스 지도에서 스팟 상세를 보는 동안에는
     아래 코스 카드를 감춥니다). 시트가 닫히면(spot 이 null) full 은 false 라 카드가 다시 나옵니다. */
  useEffect(() => {
    onFullChange?.(full)
  }, [full, onFullChange])

  const peek = peekHeightOf(spot)
  const maxHeight = () => clipRef.current?.clientHeight ?? peek
  // 9경 번호는 서버 값(/api/pois nineScenicNo, V28). 배지는 어느 지도에서 열든 붙입니다 —
  // 테두리와 달리 글이라 코스 지도에서도 방해되지 않습니다.
  const nineRank = spot?.nineScenicNo ?? null

  const onPointerDown = (event) => {
    // 손잡이에서만 끕니다. 본문에서 끌면 사진 캐러셀·본문 스크롤과 싸웁니다.
    dragRef.current = { y: event.clientY, from: full ? maxHeight() : peek }
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

  // 화면에 드러나는 높이. CSS 가 `translateY(100% - 이 값)`으로 시트를 밀어 둡니다. full 이면 100% — 밀지 않습니다.
  const visible = dragHeight != null ? `${dragHeight}px` : full ? '100%' : `${peek}px`

  if (!spot) return null

  return (
    /* 틀 — 지도 영역을 덮되 눌리지 않습니다(pointer-events: none). 아래로 밀린 시트가 틀 밖(탭바 쪽)으로
       삐져나오지 않게 여기서 자릅니다. 부모 화면(홈·코스 지도)의 CSS 에 기대지 않으려고 시트가 직접 둡니다. */
    <div ref={clipRef} className={styles.clip}>
      <div
        className={dragging ? `${styles.root} ${styles.dragging}` : styles.root}
        style={{ '--sheet-visible': visible }}
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

        {/* 펼치면 ✕ 는 스팟 상세의 사진 위 ‹ 맞은편으로 옮깁니다(2026-09-19) — 여기 두면 시트 맨 위에 걸쳐 잘려 보이고,
            스크롤하면 ‹ 는 올라가는데 ✕ 만 떠 있었습니다. */}
        {!full && (
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}

        {full ? (
          /* 끌어올리면 스팟 상세가 그대로 나옵니다.
             2026-09-18: 펼친 상태에 **‹ 버튼**을 줍니다(사용자 — 「지도에서 스팟 상세로 들어가면 뒤로가기가 없다」).
             전에는 손잡이와 ✕뿐이었는데, 펼치면 사진이 화면을 채워 둘 다 눈에 띄지 않았습니다.
             ‹ 는 **지도로 돌아가기**(시트를 peek 으로)이고 ✕ 는 닫기라 뜻이 갈립니다. */
          <SpotDetail key={spot.poiId} poiId={spot.poiId} seed={spot} onBack={() => setFull(false)} onClose={onClose} />
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
            {spot.kind === 'TERMINAL' ? (
              /* 고현터미널 — 권역·분류 자리에 무엇인지 말합니다. 사진은 없습니다(TourAPI 장소가 아님). */
              <span className={styles.category}>{t('terminal.startPoint')}</span>
            ) : (
              <>
                {/* 권역·분류가 없으면 줄을 아예 그리지 않습니다 — 값 없이 `·` 만 남으면
                    그게 곧 우리가 기준문서 §4에서 비판하는 '이유 없는 빈칸'입니다.
                    거제9경이면 분류 줄 맨 앞에 9경 배지(2026-09-14). 보라 테두리 핀을 눌렀을 때
                    "그래서 이게 몇 경인지"를 바로 말합니다. 같은 줄 안이라 peek 높이는 그대로입니다. */}
                {(spot.region || spot.category || nineRank) && (
                  <span className={styles.category}>
                    {nineRank && (
                      <span className={styles.nineBadge}>
                        {t('nineScenic.badge', { rank: nineRank })}
                      </span>
                    )}
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
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
