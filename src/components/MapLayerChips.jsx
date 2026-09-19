import { BedDouble, MapPin, Utensils } from 'lucide-react'
import { t } from '../i18n'
import styles from './MapLayerChips.module.css'

/** 칩 순서 · 아이콘(2026-09-19 사용자 — 「스팟/숙소/맛집」). */
const LAYERS = [
  { key: 'SPOT', label: () => t('home.layer.SPOT'), Icon: MapPin },
  { key: 'STAY', label: () => t('places.chip.STAY'), Icon: BedDouble },
  { key: 'FOOD', label: () => t('places.chip.FOOD'), Icon: Utensils },
]

/**
 * 홈 지도 왼쪽 위 칩 — 지도에 무엇을 찍을지 하나만 고릅니다(2026-09-19 사용자 결정. Figma 프레임 없음).
 * 네이버지도 · 카카오맵의 지도 위 분류 칩과 같은 자리 · 모양입니다. 「거제9경이란?」 버튼이 있던 자리이고,
 * 그 설명은 오른쪽 아래 몽꾸가 엽니다(MascotButton).
 *
 * 하나만 고르는 칩이라 radiogroup 입니다 — 화면 읽기 프로그램이 「셋 중 하나」로 읽습니다.
 */
export default function MapLayerChips({ value, onChange }) {
  return (
    <div className={styles.bar} role="radiogroup" aria-label={t('home.layers')}>
      {LAYERS.map(({ key, label, Icon }) => {
        const on = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            onClick={() => onChange(key)}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
            {label()}
          </button>
        )
      })}
    </div>
  )
}
