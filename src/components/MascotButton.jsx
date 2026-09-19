import { useEffect, useRef, useState } from 'react'
import mongkku from '../assets/mongkku.png'
import { t } from '../i18n'
import { isFirstVisit } from '../lib/onboarding'
import styles from './MascotButton.module.css'

/** 말풍선은 시작화면(2초 — App.jsx useSplash)이 걷힌 뒤에 뜨고, 4초 떠 있습니다(ms). */
const BUBBLE_DELAY_MS = 2400
const BUBBLE_MS = 4000
/** 말풍선은 **탭마다 한 번** — 홈에 돌아올 때마다 뜨면 시끄럽습니다. 저장소가 막혔으면 띄우지 않습니다. */
const BUBBLE_KEY = 'gj_nine_bubble'

function bubbleSeen() {
  try {
    return sessionStorage.getItem(BUBBLE_KEY) != null
  } catch {
    return true
  }
}

function markBubble() {
  try {
    sessionStorage.setItem(BUBBLE_KEY, '1')
  } catch {
    // 남길 수 없으면 bubbleSeen 이 true 라 애초에 뜨지 않습니다.
  }
}
/** 누르면 이만큼 튀어 오른 뒤 시트를 엽니다(ms) — 움직임의 앞 절반. 움직임 줄이기면 기다리지 않습니다. */
const HOP_MS = 180

function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * 몽꾸 — 거제시 캐릭터(2024-09-26 지정). 누르면 「거제9경이란?」 시트를 엽니다(2026-09-19 사용자 결정. Figma 프레임 없음).
 * 사용 승인은 거제시에서 받았다(2026-09 팀 확인). 그림은 거제시청 캐릭터 페이지의 공식 PNG 그대로다 — 색 · 모양을 바꾸지 않는다.
 *
 * 전에는 지도 왼쪽 위 보라 글자 버튼 「거제9경이란?」이었습니다. 그 자리는 스팟 · 숙소 · 맛집 칩에 주고,
 * 설명은 캐릭터가 맡습니다. 캐릭터만 있으면 누르면 무엇이 나오는지 모르므로 **말풍선**이 말합니다(Speak 앱처럼) —
 * 시작화면이 걷힌 뒤 4초, 탭마다 한 번. 첫 방문에는 튜토리얼이 먼저라 띄우지 않습니다(두 안내가 겹칩니다).
 *
 * 움직임: 평소엔 천천히 둥실(위아래 4px), 누르면 찌그러졌다 튀어 오르고 그 사이에 시트가 열립니다.
 * 움직임 줄이기 설정이면 둘 다 멈추고 바로 엽니다.
 *
 * 화면 읽기 프로그램에는 캐릭터가 아니라 **하는 일**(「거제9경이란?」)을 이름으로 줍니다.
 */
export default function MascotButton({ onOpen, ref }) {
  const [bubble, setBubble] = useState(false)
  const [hopping, setHopping] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (isFirstVisit() || bubbleSeen()) return
    const show = setTimeout(() => {
      setBubble(true)
      markBubble()
    }, BUBBLE_DELAY_MS)
    const hide = setTimeout(() => setBubble(false), BUBBLE_DELAY_MS + BUBBLE_MS)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const open = () => {
    setBubble(false)
    if (reducedMotion()) {
      onOpen()
      return
    }
    setHopping(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setHopping(false)
      onOpen()
    }, HOP_MS)
  }

  return (
    <div className={styles.wrap}>
      {bubble && (
        <span className={styles.bubble} aria-hidden="true">
          {t('nineScenic.bubble')}
        </span>
      )}
      <button
        ref={ref}
        type="button"
        className={hopping ? `${styles.mascot} ${styles.hop}` : styles.mascot}
        onClick={open}
        aria-label={t('nineScenic.title')}
        aria-haspopup="dialog"
      >
        <img className={styles.img} src={mongkku} alt="" draggable="false" />
      </button>
    </div>
  )
}
