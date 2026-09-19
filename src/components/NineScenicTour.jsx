import { ChevronRight } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import styles from './NineScenicTour.module.css'

/** 구멍을 핀보다 이만큼 넓게 뚫습니다 — 딱 맞추면 보라 테두리가 잘려 보입니다. */
const PAD = 7

/** 지도가 아홉 곳에 맞춰 움직이는 동안 구멍 자리를 다시 잽니다. */
const TICK_MS = 120

/**
 * 거제9경 설명 — 지도에서 **9경 핀만 남기고 흐리게** 하고, 몽꾸가 두 번에 나눠 말합니다(2026-09-19 사용자).
 *
 * 전에는 몽꾸 말풍선을 누르면 곧장 목록 시트였습니다. 시트는 「지도의 보라색 테두리 스팟이 9경이에요」라고
 * 말하면서 정작 그 지도를 자기가 덮고 있었습니다 — 확인하려면 시트를 닫아야 했습니다.
 * 이제 지도를 아홉 곳에 맞춰(홈에서 fitSpots) 보여주면서 설명하고, 목록은 그 다음입니다.
 *
 * 구멍이 **여러 개**라 첫 방문 튜토리얼의 방식(clip-path 로 네모 하나)을 쓸 수 없습니다.
 * 방사형 그라데이션을 핀 수만큼 겹치고 `mask-composite: intersect` 로 뚫습니다 —
 * 한 겹이라도 뚫린 자리는 뚫립니다.
 *
 * 몽꾸도 뚫습니다. 말하는 사람이 흐려져 있으면 누가 말하는지 알 수 없습니다.
 *
 * 지도가 움직이는 동안 핀 자리가 바뀌므로 잠시 되풀이해 잽니다(튜토리얼과 같은 방법).
 *
 *   step   1 · 2. 2 에서 다음을 누르면 onDone — 홈이 목록 시트를 엽니다
 */
export default function NineScenicTour({ step, onNext, onDone }) {
  const [layout, setLayout] = useState(null)
  const titleId = useId()

  useEffect(() => {
    if (!step) return undefined
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      const frame = document.querySelector('[data-screen]')
      if (!frame) return
      const box = frame.getBoundingClientRect()
      // 데스크톱 프레임에 걸린 배율(frameZoom)을 벗겨 프레임 안 좌표로 옮깁니다(Tutorial 과 같은 계산).
      const scale = frame.offsetWidth ? box.width / frame.offsetWidth : 1
      const toLocal = (r) => ({
        cx: (r.left + r.width / 2 - box.left) / scale - frame.clientLeft,
        cy: (r.top + r.height / 2 - box.top) / scale - frame.clientTop,
        r: Math.max(r.width, r.height) / 2 / scale + PAD,
      })
      const circles = [...frame.querySelectorAll('[data-nine]')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map(toLocal)
      const mascotEl = frame.querySelector('[data-nine-mascot]')
      const mascot = mascotEl ? toLocal(mascotEl.getBoundingClientRect()) : null
      const next = { W: frame.clientWidth, H: frame.clientHeight, circles, mascot }
      setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }

    const frameId = requestAnimationFrame(tick)
    const timer = setInterval(tick, TICK_MS)
    window.addEventListener('resize', tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      clearInterval(timer)
      window.removeEventListener('resize', tick)
    }
  }, [step])

  if (!step) return null

  const frame = document.querySelector('[data-screen]')
  if (!frame) return null

  const advance = () => (step === 1 ? onNext() : onDone())

  /* 구멍마다 한 겹씩. 겹 하나는 "이 동그라미만 빼고 다 덮개"이고, intersect 로 합치면
     한 겹이라도 뚫린 자리가 뚫립니다. 아직 못 쟀으면 겹 없이 통째로 흐리게 둡니다. */
  const holes = layout ? [...layout.circles, ...(layout.mascot ? [layout.mascot] : [])] : []
  const mask = holes
    .map(({ cx, cy, r }) => `radial-gradient(circle at ${cx}px ${cy}px, transparent 0 ${r}px, #000 ${r + 1}px)`)
    .join(', ')
  const maskStyle = holes.length
    ? {
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }
    : undefined

  // 말풍선은 몽꾸 바로 위에 붙입니다. 아직 못 쟀으면 화면 아래쪽 기본 자리에 둡니다.
  const bubbleStyle = layout?.mascot
    ? { bottom: layout.H - (layout.mascot.cy - layout.mascot.r) + 10 }
    : { bottom: 150 }

  return createPortal(
    <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* 화면 아무 곳이나 누르면 다음으로 — 뒤 화면이 눌리지 않게 이 층이 먼저 받습니다(사용자 요청).
          읽기 도구와 탭 순서에서는 뺍니다 — 아래 「다음」 버튼이 같은 일을 하고, 둘 다 노출하면
          같은 이름의 버튼이 둘이 되어 무엇을 누르는지 흐려집니다. */}
      <button
        type="button"
        className={styles.catcher}
        onClick={advance}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className={styles.dim} style={maskStyle} aria-hidden="true" />

      <div className={styles.bubble} style={bubbleStyle}>
        <p id={titleId} className={styles.lines}>
          {step === 1 ? (
            <span>{t('nineScenic.lead1')}</span>
          ) : (
            <>
              <span>{t('nineScenic.lead2')}</span>
              <span>{t('nineScenic.lead3')}</span>
            </>
          )}
        </p>
        <button type="button" className={styles.next} onClick={advance}>
          {t('nineScenic.tourNext')}
          <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <span className={styles.tail} aria-hidden="true" />
      </div>
    </div>,
    frame,
  )
}
