import { useState } from 'react'
import { Search } from 'lucide-react'
import { formatDateLong } from '../lib/format'
import { ORIGINS, ORIGIN_LABELS } from '../lib/tripParams'
import Button from './Button'
import ConditionEditor from './ConditionEditor'
import styles from './ConditionSheet.module.css'

/**
 * 홈 조건 편집 시트 — Figma `홈 — 조건 편집 시트` (274:529 / condition-sheet 274:571).
 * 출발지·날짜·시간을 한 시트에서 고치고 '코스 추천 받기'로 한 번에 확정합니다.
 * 확정 전까지는 초안(draft)만 바뀌고 상위 조건은 그대로입니다.
 *
 * 날짜·시각 FieldRow를 탭했을 때 열리는 피커는 Figma에 프레임이 없어([미확인])
 * 기존 ConditionEditor의 달력·30분 스테퍼를 하위 시트로 재사용합니다.
 */
export default function ConditionSheet({ open, ...props }) {
  // 닫히면 통째로 내려가므로 다시 열 때 초안이 현재 조건에서 새로 시작합니다.
  return open ? <SheetBody {...props} /> : null
}

function SheetBody({ trip, onClose, onSubmit }) {
  const [draft, setDraft] = useState(trip)
  const [picker, setPicker] = useState(null) // 'date' | 'time' | null

  const patch = (next) => setDraft((prev) => ({ ...prev, ...next }))
  const originLabel = draft.origin ? ORIGIN_LABELS[draft.origin] : ''
  const untilLastBus = draft.returnBy === null

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="닫기"
      />

      <section className={styles.sheet} aria-label="조건">
        <div className={styles.handle} aria-hidden="true" />
        <h2 className={styles.title}>조건</h2>

        {/* ── 출발지 (Figma 274:576) ── */}
        <div className={styles.group}>
          <span className={styles.label}>출발지</span>

          <div
            className={draft.origin ? `${styles.field} ${styles.fieldFilled}` : styles.field}
          >
            <Search
              className={styles.fieldIcon}
              size={12}
              strokeWidth={1.6}
              absoluteStrokeWidth
              aria-hidden="true"
            />
            {/* 표시 전용 — 고르는 건 아래 칩. 검색 입력 동작은 Figma에 정의 없음([미확인]). */}
            <span
              className={draft.origin ? styles.fieldValue : styles.fieldPlaceholder}
            >
              {draft.origin ? originLabel : '도시나 터미널 이름'}
            </span>
            {draft.origin && (
              <button
                type="button"
                className={styles.fieldClear}
                onClick={() => patch({ origin: null })}
                aria-label="출발지 지우기"
              >
                ×
              </button>
            )}
          </div>

          <div className={styles.chips}>
            {ORIGINS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                className={code === draft.origin ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                onClick={() => patch({ origin: code })}
                aria-pressed={code === draft.origin}
              >
                {label}
              </button>
            ))}
          </div>

          <p className={styles.hint}>
            시간표가 있는 곳은 판정에 들어가고, 그 밖은 가까운 터미널까지 카카오맵
            길찾기로 안내해요
          </p>
        </div>

        {/* ── 날짜 · 시간 (Figma 274:583) ── */}
        <div className={styles.group}>
          <span className={styles.label}>날짜 · 시간</span>

          <div className={styles.pair}>
            <button
              type="button"
              className={`${styles.fieldRow} ${styles.fieldRowDate}`}
              onClick={() => setPicker('date')}
            >
              <span className={styles.fieldRowLabel}>날짜</span>
              <span className={styles.fieldRowValue}>{formatDateLong(draft.date)}</span>
              <span className={styles.fieldRowChevron} aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              className={`${styles.fieldRow} ${styles.fieldRowDepart}`}
              onClick={() => setPicker('time')}
            >
              <span className={styles.fieldRowLabel}>출발</span>
              <span className={styles.fieldRowValue}>{draft.departTime}</span>
              <span className={styles.fieldRowChevron} aria-hidden="true">›</span>
            </button>
          </div>

          <div className={styles.pair}>
            <button
              type="button"
              className={`${styles.fieldRow} ${styles.fieldRowReturn}`}
              onClick={() => setPicker('time')}
            >
              <span className={styles.fieldRowLabel}>
                복귀{originLabel && ` (${originLabel} 도착)`}
              </span>
              <span className={styles.fieldRowValue}>
                {untilLastBus ? '막차까지' : draft.returnBy}
              </span>
              <span className={styles.fieldRowChevron} aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              className={untilLastBus ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              onClick={() => patch({ returnBy: untilLastBus ? '23:00' : null })}
              aria-pressed={untilLastBus}
            >
              막차까지
            </button>
          </div>

          <p className={styles.hintReturn}>
            복귀를 안 정하면 막차 기준으로 판정해요 · 출발보다 이르면 다음 날 도착(+1)
          </p>
        </div>

        {/* Button 컴포넌트 가이드(09-07): 비활성 사유는 옆 텍스트로. 이 문구는 Figma에 없음([미확인]). */}
        {!draft.origin && (
          <p className={styles.hintReturn}>출발지를 고르면 코스를 추천해 드려요</p>
        )}
        <Button onClick={() => onSubmit(draft)} disabled={!draft.origin}>
          코스 추천 받기
        </Button>
      </section>

      {/* 날짜·시각 피커 — 이 시트 위에 한 겹 더 뜹니다. */}
      <ConditionEditor
        field={picker}
        trip={draft}
        onChange={patch}
        onClose={() => setPicker(null)}
      />
    </>
  )
}
