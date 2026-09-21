import { Heart } from 'lucide-react'
import { t } from '../i18n'
import styles from './LikeCount.module.css'

/**
 * 하트 수 「♥ 12」 — 2026-09-21 사용자 결정 · Figma 프레임 없음(디자인브리프 부록 Q 가 그림 대신).
 *
 * 카드 · 줄(스팟 탭 격자 · 큰 카드 · 시간표 탭 줄)에는 **수만 보이고 누를 수 없습니다** — 누르는 자리는 스팟 상세 하나입니다.
 * **0 도 「♥ 0」으로 그립니다** — 「추천순」이 이 수의 순서라, 숨기면 목록이 왜 이 순서인지 말하지 않습니다
 * (사진 0장이 정상 상태인 규칙과 같습니다). 수가 아예 없으면(옛 응답) 그리지 않습니다 — 값 없이 하트만 남기지 않습니다(절대규칙 3).
 *
 * `overlay` 는 **사진 위에 얹는 모양**(2026-09-21 저녁 · 부록 Q) — 검은 반투명 알약 + 흰 글자. 히어로의 장수 칩(「1 / 13」)과 같은 재료라
 * 앱 안에서 새 언어가 아니고, 글줄 밖이라 분류가 두 줄인 카드에서도 수가 밀리지 않습니다(Kitchen Stories 가 같은 자리에 「♡ 0」을 둡니다).
 *
 * 읽기 도구에는 「하트 12」로 들립니다(role=img + 이름) — 아이콘은 읽히지 않으므로 낱말을 글로 붙입니다.
 * 스팟 상세의 버튼도 이 조각을 안에 넣습니다(size 16 · filled · id) — 버튼의 설명(aria-describedby)이 이 이름입니다.
 * 그 설명은 브라우저마다 이름(aria-label)을 쓰기도, 글 내용을 쓰기도 해서 같은 이름을 숨은 글로도 두고 보이는 수는 읽기 도구에서 뺍니다
 * (어느 쪽이든 「하트 12」 한 번).
 * 크기 · 색은 부모가 덮어씁니다(className) — 기본은 12px 하트 · 라벨 글자 · 보조색.
 */
export default function LikeCount({ count, size = 12, filled = false, id, className, overlay = false }) {
  if (count == null) return null
  const label = t('spotLike.count', { n: count })
  const classes = [styles.count, overlay && styles.overlay, className].filter(Boolean).join(' ')
  return (
    <span id={id} className={classes} role="img" aria-label={label}>
      <Heart size={size} strokeWidth={2} fill={filled ? 'currentColor' : 'none'} aria-hidden="true" />
      <span className={styles.srOnly}>{label}</span>
      <span aria-hidden="true">{count}</span>
    </span>
  )
}
