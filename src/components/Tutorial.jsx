import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from './Button'
import { t } from '../i18n'
import { isFirstVisit, markOnboarded } from '../lib/onboarding'
import styles from './Tutorial.module.css'

/**
 * 첫 방문 튜토리얼 — Figma 02-2 `558:200` 「튜토리얼 — 첫 방문 1회」(09-14 · 로그인 없이 이 기기에서 처음 열 때 · 건너뛰기 가능).
 *
 * 네 단계(`558:201` · `558:249` · `558:297` · `558:333`):
 *   1 홈 · 고현터미널 핀     2 홈 · 코스 추천 받기 버튼     3 스팟 탭 · 첫 카드     4 시간표 탭 · 첫 줄(시작하기)
 * 3 · 4단계는 그 탭으로 화면을 옮깁니다. 끝내면(시작하기 · 건너뛰기 · Esc) 표시를 남기고 홈으로 돌아옵니다.
 *
 * 그림 그대로의 규칙(설계 값):
 *  · 화면 전체를 3px 흐리게 + 본문색 40% 어두운 층(로그인 시트 배경과 같은 값). 짚는 곳만 선명한 창으로 남깁니다
 *  · 창은 대상보다 사방 8px 크게, 2px 브랜드 테두리 · 모서리 12
 *  · 설명 카드는 창에서 24px — 창 아래 · 위 중 **남는 쪽이 넓은 곳**(그림: 1 · 3 · 4단계 아래, 2단계는 버튼이 바닥이라 위)
 *  · 카드 = 단계 점 넷 · 제목 · 문장마다 한 줄 · 「건너뛰기」 + 「다음」(마지막은 「시작하기」만)
 *
 * 어디에 그리나 — 앱 전체에 하나 두고(App), **지금 화면의 390 프레임**(Screen 의 `data-screen`) 안에 포털로 그립니다.
 * 창 밖(데스크톱 여백)까지 덮지 않고, 탭바까지 흐려지는 그림과 같습니다.
 *
 * 짚을 곳은 화면이 `data-tour` 로 표시합니다(terminal · get-courses · first-spot · first-timetable).
 * 0.3초마다 다시 잽니다 — 홈 지도는 카카오가 늦게 뜨고 화면 맞추기로 핀이 움직입니다. 대상이 2.5초 안에 안 나타나면
 * (지도 실패 · 목록 실패) 창 없이 카드만 가운데에 둡니다 — 튜토리얼이 멈춰 버리면 안 됩니다.
 *
 * **홈에서 처음 열 때만** 시작합니다. 공유 링크로 스팟 상세에 곧장 들어온 사람을 다른 화면으로 끌고 가지 않습니다
 * (그 사람은 나중에 홈에 처음 올 때 봅니다).
 */

const STEPS = [
  { path: '/', target: 'terminal', lines: 2 },
  { path: '/', target: 'get-courses', lines: 2 },
  { path: '/spots', target: 'first-spot', lines: 1 },
  { path: '/timetable', target: 'first-timetable', lines: 3 },
]

/** 창 여백 · 모서리 · 카드와의 간격 — 그림 값. */
const PAD = 8
const RADIUS = 12
const GAP = 24
/** 다시 재는 간격 · 대상을 기다리는 시간(ms). */
const TICK_MS = 300
const WAIT_MS = 2500

/**
 * 지금 화면에서 짚을 곳을 잽니다. 좌표는 **화면 프레임 안쪽 기준 CSS px** 입니다 —
 * 큰 모니터에서 프레임에 zoom(frameZoom)이 걸려도 맞게, 화면에 보이는 크기를 프레임의 CSS 폭으로 나눕니다.
 * 대상의 자손까지 합칩니다 — 고현터미널 핀은 이름표가 핀 상자 밖에 붙어 있고, 그림의 창은 핀 + 이름표를 감쌉니다.
 */
function measure(target) {
  const frame = document.querySelector('[data-screen]')
  if (!frame) return null
  const box = frame.getBoundingClientRect()
  const scale = frame.offsetWidth ? box.width / frame.offsetWidth : 1
  const W = frame.clientWidth
  const H = frame.clientHeight
  const element = frame.querySelector(`[data-tour="${target}"]`)
  if (!element) return { frame, W, H, found: false, hole: null }

  const rects = [element, ...element.querySelectorAll('*')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
  if (rects.length === 0) return { frame, W, H, found: true, hole: null }

  const toLocalX = (v) => (v - box.left) / scale - frame.clientLeft
  const toLocalY = (v) => (v - box.top) / scale - frame.clientTop
  const x0 = Math.max(0, toLocalX(Math.min(...rects.map((r) => r.left))) - PAD)
  const y0 = Math.max(0, toLocalY(Math.min(...rects.map((r) => r.top))) - PAD)
  const x1 = Math.min(W, toLocalX(Math.max(...rects.map((r) => r.right))) + PAD)
  const y1 = Math.min(H, toLocalY(Math.max(...rects.map((r) => r.bottom))) + PAD)
  const hole = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }
  return { frame, W, H, found: true, hole }
}

const sameLayout = (a, b) =>
  a && b && a.frame === b.frame && a.W === b.W && a.H === b.H &&
  JSON.stringify(a.hole) === JSON.stringify(b.hole)

/** 어두운 층에 창을 뚫는 모양 — 바깥 사각형 + 둥근 창(evenodd). */
function holeClip(W, H, { x, y, w, h }) {
  const r = Math.min(RADIUS, w / 2, h / 2)
  return (
    `path(evenodd, "M0 0H${W}V${H}H0Z ` +
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}` +
    `A${r} ${r} 0 0 1 ${x + r} ${y}Z")`
  )
}

export default function Tutorial() {
  const location = useLocation()
  const navigate = useNavigate()
  const [step, setStep] = useState(null)
  const [closed, setClosed] = useState(false)
  const [layout, setLayout] = useState(null)
  const titleId = useId()
  const rootRef = useRef(null)
  const nextRef = useRef(null)

  // 시작 조건은 렌더에서 셉니다 — 홈에 처음 온 순간 0단계. 한 번 시작하면 step 이 이어 갑니다.
  const current = step ?? (!closed && location.pathname === '/' && isFirstVisit() ? 0 : null)
  const config = current == null ? null : STEPS[current]
  const last = current === STEPS.length - 1

  useEffect(() => {
    if (!config) return
    let cancelled = false
    const startedAt = Date.now()
    const tick = () => {
      if (cancelled) return
      const next = measure(config.target)
      // 대상이 아직 없으면(지도 · 목록이 뜨는 중) 잠깐 기다립니다. 너무 오래면 창 없이 카드만.
      if (!next || (!next.found && Date.now() - startedAt < WAIT_MS)) return
      setLayout((prev) => (sameLayout(prev, next) ? prev : next))
    }
    const frame = requestAnimationFrame(tick)
    const timer = setInterval(tick, TICK_MS)
    window.addEventListener('resize', tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      clearInterval(timer)
      window.removeEventListener('resize', tick)
    }
  }, [config, location.pathname])

  // 단계가 바뀌면 「다음」(마지막은 「시작하기」)에 포커스 — 키보드로 바로 넘길 수 있게.
  const shown = Boolean(config && layout?.frame)
  useEffect(() => {
    if (shown) nextRef.current?.focus()
  }, [shown, current])

  const close = () => {
    markOnboarded()
    setClosed(true)
    setStep(null)
    setLayout(null)
    if (location.pathname !== '/') navigate('/')
  }

  const goNext = () => {
    const n = current + 1
    if (n >= STEPS.length) {
      close()
      return
    }
    setLayout(null) // 새 화면에서 다시 잽니다 — 앞 단계의 창이 잠깐 남지 않게
    setStep(n)
    if (STEPS[n].path !== location.pathname) navigate(STEPS[n].path)
  }

  // Esc 로 건너뛰고, Tab 은 카드 안에서만 돕니다(뒤 화면은 흐려져 있어 누를 수 없습니다).
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const focusables = [...(rootRef.current?.querySelectorAll('button') ?? [])]
    if (focusables.length === 0) return
    const first = focusables[0]
    const lastButton = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      lastButton.focus()
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!shown) return null

  const { W, H, hole } = layout
  // 창 아래 · 위 중 남는 쪽이 넓은 곳에 카드. 위에 둘 때는 아래 기준(bottom)으로 붙여 카드 높이를 잴 필요가 없습니다.
  const below = hole ? H - (hole.y + hole.h) >= hole.y : true
  const cardStyle = !hole
    ? { top: '50%', transform: 'translateY(-50%)' }
    : below
      ? { top: hole.y + hole.h + GAP }
      : { bottom: H - hole.y + GAP }
  const n = current + 1
  const lines = Array.from({ length: config.lines }, (_, i) => `tutorial.${n}.line${i + 1}`)

  return createPortal(
    <div
      ref={rootRef}
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
    >
      {/* 뒤 화면을 누르지 못하게 — 창 안(선명한 곳)도 누르면 튜토리얼 밑에서 시트가 열립니다. */}
      <div className={styles.catcher} aria-hidden="true" />
      <div className={styles.dim} style={hole ? { clipPath: holeClip(W, H, hole) } : undefined} aria-hidden="true" />
      {hole && (
        <div
          className={styles.ring}
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          aria-hidden="true"
        />
      )}

      <section key={current} className={styles.card} style={cardStyle}>
        <div className={styles.dots} role="img" aria-label={t('tutorial.progress', { n, total: STEPS.length })}>
          {STEPS.map((s, i) => (
            <span key={s.target} className={i === current ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
          ))}
        </div>
        <h2 id={titleId} className={styles.title}>
          {t(`tutorial.${n}.title`)}
        </h2>
        {/* 문장마다 한 줄(그림 그대로 · 사용자 요청) */}
        <div className={styles.lines}>
          {lines.map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
        <div className={styles.actions}>
          {!last && (
            <button type="button" className={styles.skip} onClick={close}>
              {t('tutorial.skip')}
            </button>
          )}
          <span className={styles.spacer} />
          <Button ref={nextRef} className={styles.next} onClick={goNext}>
            {t(last ? 'tutorial.start' : 'tutorial.next')}
          </Button>
        </div>
      </section>
    </div>,
    layout.frame,
  )
}
