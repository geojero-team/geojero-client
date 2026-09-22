import { ChevronRight } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import styles from './NineScenicTour.module.css'

/** 구멍을 대상보다 이만큼 넓게 뚫습니다 — 딱 맞추면 보라 테두리와 이름표 끝이 잘려 보입니다. */
const PAD = 7

/** 이름표 구멍 모서리 둥글기. */
const LABEL_RADIUS = 9

/** 지도가 아홉 곳에 맞춰 움직이는 동안 구멍 자리를 다시 잽니다. */
const TICK_MS = 120

const round = (n) => Math.round(n)

/** 원 구멍 — 호 두 개로 그립니다(path 안에서 원을 그리는 표준 방법). */
function circlePath({ cx, cy, r }) {
  return `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 0 ${round(r * 2)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-r * 2)} 0Z`
}

/** 둥근 네모 구멍 — 이름표용. */
function rectPath({ x, y, w, h }) {
  const r = Math.min(LABEL_RADIUS, w / 2, h / 2)
  return (
    `M${round(x + r)} ${round(y)}H${round(x + w - r)}A${round(r)} ${round(r)} 0 0 1 ${round(x + w)} ${round(y + r)}` +
    `V${round(y + h - r)}A${round(r)} ${round(r)} 0 0 1 ${round(x + w - r)} ${round(y + h)}` +
    `H${round(x + r)}A${round(r)} ${round(r)} 0 0 1 ${round(x)} ${round(y + h - r)}` +
    `V${round(y + r)}A${round(r)} ${round(r)} 0 0 1 ${round(x + r)} ${round(y)}Z`
  )
}

/**
 * 설명이 짚는 곳 — 주제마다 **어떤 핀을 남길지**만 다릅니다(2026-09-22 둘이 되면서 뽑아냈습니다).
 * 나머지(흐리기 · 구멍 · 말풍선 자리 · 되풀이 재기)는 똑같아 한 벌로 둡니다.
 */
const TOPICS = {
  nine: { dot: '[data-nine]', label: '[data-nine-label]' },
  terminal: { dot: '[data-terminal]', label: '[data-terminal-label]' },
}

/**
 * 몽꾸 설명 — 지도에서 **짚는 핀만 남기고 흐리게** 하고, 몽꾸가 두 번에 나눠 말합니다(2026-09-19 사용자).
 *
 * 주제는 둘입니다(2026-09-22 사용자):
 *   nine      거제 9경 아홉 곳 — 끝나면 목록 시트로 넘깁니다
 *   terminal  고현터미널 한 곳 — 「관광객들은 고현터미널로만 방문해요 → 그래서 코스도 거기서 시작합니다」.
 *             넘길 목록이 없어 그냥 닫습니다.
 *
 * 전에는 몽꾸 말풍선을 누르면 곧장 목록 시트였습니다. 시트는 「지도의 보라색 테두리 스팟이 9경이에요」라고
 * 말하면서 정작 그 지도를 자기가 덮고 있었습니다 — 확인하려면 시트를 닫아야 했습니다.
 * 이제 지도를 아홉 곳에 맞춰(홈에서 fitSpots) 보여주면서 설명하고, 목록은 그 다음입니다.
 *
 * 구멍이 **여럿이고 모양도 둘**입니다 — 동그라미(핀)와 둥근 네모(이름표). 둘은 서로 겹칩니다.
 * 그래서 SVG 마스크에 구멍마다 도형을 따로 그립니다(아래 dimStyle).
 * 방사형 그라데이션 마스크는 원밖에 못 뚫어 이름표가 흐린 채로 남았고, 튜토리얼의 clip-path(evenodd)는
 * 겹친 자리를 도로 채웠습니다.
 *
 * 몽꾸도 뚫습니다. 말하는 사람이 흐려져 있으면 누가 말하는지 알 수 없습니다.
 *
 * 지도가 움직이는 동안 핀 자리가 바뀌므로 잠시 되풀이해 잽니다(튜토리얼과 같은 방법).
 *
 *   topic  'nine' · 'terminal' — 어떤 핀을 남길지와 무슨 말을 할지
 *   step   1 · 2. 2 에서 다음을 누르면 onDone — 9경이면 홈이 목록 시트를 엽니다
 */
export default function NineScenicTour({ step, topic = 'nine', onNext, onDone }) {
  const [layout, setLayout] = useState(null)
  const titleId = useId()
  const pick = TOPICS[topic] ?? TOPICS.nine

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
      const local = (r) => ({
        x: (r.left - box.left) / scale - frame.clientLeft,
        y: (r.top - box.top) / scale - frame.clientTop,
        w: r.width / scale,
        h: r.height / scale,
      })
      const toCircle = (r) => {
        const b = local(r)
        return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: Math.max(b.w, b.h) / 2 + PAD }
      }
      const toRect = (r) => {
        const b = local(r)
        return { x: b.x - 4, y: b.y - 3, w: b.w + 8, h: b.h + 6 }
      }
      const visible = (el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 ? r : null
      }

      const circles = [...frame.querySelectorAll(pick.dot)].map(visible).filter(Boolean).map(toCircle)
      // 이름표는 겹치면 숨습니다(updateLabelVisibility) — 그때는 뚫을 것도 없습니다.
      const rects = [...frame.querySelectorAll(pick.label)].map(visible).filter(Boolean).map(toRect)
      const mascotEl = frame.querySelector('[data-nine-mascot]')
      const mascotRect = mascotEl ? visible(mascotEl) : null
      const mascot = mascotRect ? toCircle(mascotRect) : null
      const mascotBox = mascotRect ? local(mascotRect) : null

      const next = { W: frame.clientWidth, H: frame.clientHeight, circles, rects, mascot, mascotBox }
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
  }, [step, pick.dot, pick.label])

  if (!step) return null

  const frame = document.querySelector('[data-screen]')
  if (!frame) return null

  const advance = () => (step === 1 ? onNext() : onDone())

  /* 흰 바탕에 구멍마다 검은 도형을 따로 그린 SVG 마스크 — 겹친 구멍도 그대로 뚫립니다.
     clip-path: path(evenodd) 로 한 줄에 이으면 동그라미와 이름표가 겹친 자리가 두 번 뚫려 도로 흐려졌습니다
     (핀 오른쪽에 회색 반달이 남았습니다). 아직 못 쟀으면 구멍 없이 통째로 흐리게 둡니다. */
  const holes = layout
    ? [
        ...layout.circles.map(circlePath),
        ...layout.rects.map(rectPath),
        ...(layout.mascot ? [circlePath(layout.mascot)] : []),
      ]
    : []
  const mask = layout
    ? `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.W}" height="${layout.H}">` +
          `<mask id="m"><rect width="100%" height="100%" fill="#fff"/>` +
          holes.map((d) => `<path d="${d}" fill="#000"/>`).join('') +
          `</mask><rect width="100%" height="100%" mask="url(#m)"/></svg>`,
      )}")`
    : null
  const dimStyle = mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined

  /* 말풍선은 몽꾸 **왼쪽**에 가로로 붙습니다(2026-09-19 사용자) — 위에 두면 지도 아래쪽 9경(해금강 · 바람의언덕)을
     덮고, 글도 좁은 폭에 갇혀 여러 줄이 됩니다. 옆으로 뻗으면 그 자리가 비고 한 줄이 길어져 읽기 쉽습니다. */
  const bubbleStyle = layout?.mascotBox
    ? { right: layout.W - layout.mascotBox.x + 8, top: layout.mascotBox.y + layout.mascotBox.h / 2 }
    : { right: 120, bottom: 80 }

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

      <div className={styles.dim} style={dimStyle} aria-hidden="true" />

      <div className={styles.bubble} style={bubbleStyle}>
        <p id={titleId} className={styles.lines}>
          {topic === 'terminal' ? (
            /* 고현터미널 — 1단계는 **본 것**(관광객은 여기로만 온다), 2단계는 **그래서 우리가 한 가정**입니다.
               가정을 먼저 말하면 「왜 하필 고현터미널?」이 남습니다. 순서를 바꾸지 않습니다. */
            step === 1 ? (
              <span>{t('terminal.lead1')}</span>
            ) : (
              <>
                <span>{t('terminal.lead2')}</span>
                <span>{t('terminal.lead3')}</span>
              </>
            )
          ) : step === 1 ? (
            <>
              <span>{t('nineScenic.lead1Title')}</span>
              {/* 문장 가운데 「대표 경관 아홉 곳」만 굵게(2026-09-20 사용자). 줄은 하나라 span 을 나누지 않습니다. */}
              <span>
                {t('nineScenic.lead1Head')}
                <strong className={styles.strong}>{t('nineScenic.lead1Strong')}</strong>
                {t('nineScenic.lead1Tail')}
              </span>
            </>
          ) : (
            <>
              <span>{t('nineScenic.lead2')}</span>
              <span>{t('nineScenic.lead3')}</span>
              <span>{t('nineScenic.lead4')}</span>
            </>
          )}
        </p>
        {/* 마지막 걸음의 글자 — 9경은 뒤에 목록 시트가 있어 「다음」이고, 고현터미널은 여기서 끝이라 「알겠어요」입니다.
            끝인데 「다음」이라고 적으면 다음이 있는 줄 알고 한 번 더 누릅니다. */}
        <button type="button" className={styles.next} onClick={advance}>
          {t(topic === 'terminal' && step === 2 ? 'nineScenic.tourDone' : 'nineScenic.tourNext')}
          <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <span className={styles.tail} aria-hidden="true" />
      </div>
    </div>,
    frame,
  )
}
