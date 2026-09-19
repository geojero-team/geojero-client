import { useEffect, useRef, useState } from 'react'
import mongkkuArmRaise from '../assets/mongkku-arm-raise.png'
import mongkkuArmRest from '../assets/mongkku-arm-rest.png'
import mongkkuBody from '../assets/mongkku-body.png'
import { t } from '../i18n'
import styles from './MascotButton.module.css'

/** 누르면 팔을 올리고 말풍선을 띄운 뒤 이만큼 있다가 시트를 엽니다(ms) — 팔이 다 올라가 한 번 흔드는 시간. */
const RAISE_MS = 650
/** 시트가 열리고 나서 팔을 내리는 때(ms) — 시트 뒤에서 내려, 시트를 닫으면 처음 모습입니다. */
const LOWER_AFTER_MS = 300

function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * 몽꾸 — 거제시 캐릭터(2024-09-26 지정). 누르면 「거제9경이란?」 시트를 엽니다(2026-09-19 사용자 결정. Figma 프레임 없음).
 * 사용 승인은 거제시에서 받았다(2026-09 팀 확인 — 따로 받은 파일은 없다).
 *
 * 전에는 지도 왼쪽 위 보라 글자 버튼 「거제9경이란?」이었습니다. 그 자리는 스팟 · 숙소 · 맛집 칩에 주고, 설명은 캐릭터가 맡습니다.
 *
 * 평소엔 **왼팔(보는 쪽 왼쪽)을 내리고** 천천히 둥실, 누르면 **팔을 올려 흔들며** 말풍선 「거제 9경이 뭘까?」가 뜨고
 * 곧 시트가 열립니다(2026-09-19 사용자). 처음 들어올 때 저절로 뜨는 말풍선은 없습니다 — 누를 때만.
 *
 * 그림: 거제시청 캐릭터 페이지의 공식 PNG(팔을 든 모습 한 장)를 세 장으로 나눴습니다. 색 · 선은 원본 그대로입니다.
 *   몸        — 든 팔만 떼어 낸 원본
 *   평소 팔   — **반대쪽(이미 내린) 팔을 몸 대칭축으로 좌우로 뒤집은 것**. 좌우 팔이 대칭이다(2026-09-19 사용자)
 *   올리는 팔 — 원본의 든 팔. 몸 뒤에서 어깨(몸 테두리 안쪽)를 축으로 돈다 — 뿌리를 축까지 늘이고 끝을 축 중심 반원으로 둥글려
 *               어느 각도에서도 잘린 면이 보이지 않는다. 다 올리면 공식 그림과 같다. 내린 각도(-101°)는 평소 팔과 가장 잘 겹치는 각도
 * 누르면 평소 팔이 사라지며(0.08초) 올리는 팔이 그 자리에서 올라갑니다 — 두 팔이 거의 같은 자리라 바뀌는 게 보이지 않습니다.
 *
 * 움직임 줄이기 설정이면 둥실 · 흔들기를 멈추고 누르자마자 엽니다.
 * 화면 읽기 프로그램에는 캐릭터가 아니라 **하는 일**(「거제9경이란?」)을 이름으로 줍니다.
 */
export default function MascotButton({ onOpen, ref }) {
  const [raised, setRaised] = useState(false)
  const timersRef = useRef([])

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  const open = () => {
    if (raised) return
    if (reducedMotion()) {
      onOpen()
      return
    }
    setRaised(true)
    timersRef.current.push(
      setTimeout(() => {
        onOpen()
        timersRef.current.push(setTimeout(() => setRaised(false), LOWER_AFTER_MS))
      }, RAISE_MS),
    )
  }

  return (
    <div className={styles.wrap}>
      {raised && (
        <span className={styles.bubble} aria-hidden="true">
          {t('nineScenic.bubble')}
        </span>
      )}
      <button
        ref={ref}
        type="button"
        className={styles.mascot}
        data-arm={raised ? 'up' : 'down'}
        onClick={open}
        aria-label={t('nineScenic.title')}
        aria-haspopup="dialog"
      >
        {/* 팔이 몸 뒤라 팔을 먼저 그립니다. */}
        <img className={styles.armRest} src={mongkkuArmRest} alt="" draggable="false" />
        <img className={styles.arm} src={mongkkuArmRaise} alt="" draggable="false" />
        <img className={styles.body} src={mongkkuBody} alt="" draggable="false" />
      </button>
    </div>
  )
}
