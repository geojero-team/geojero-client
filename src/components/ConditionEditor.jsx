import { useMemo, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  SearchX,
  X,
} from 'lucide-react'
import { t } from '../i18n'
import { WEEKDAYS, formatDateLong, isWeekend } from '../lib/format'
import {
  DEPART_RANGE,
  ORIGINS,
  RETURN_RANGE,
  TIME_STEP_MIN,
  atLimit,
  shiftTime,
  todayISO,
} from '../lib/tripParams'
import styles from './ConditionEditor.module.css'

const TITLES = {
  origin: t('condition.titleOrigin'),
  date: t('condition.titleDate'),
  time: t('condition.titleTime'),
}

/* ── 출발지 ───────────────────────────────────────────────────────────────*/

function OriginContent({ trip, onChange, onClose }) {
  const [query, setQuery] = useState('')

  const keyword = query.trim()
  const matches = ORIGINS.filter(
    ({ label, region }) => label.includes(keyword) || region.includes(keyword),
  )

  const pick = (code) => {
    onChange({ origin: code })
    onClose()
  }

  return (
    <>
      <div className={styles.search}>
        <Search className={styles.searchIcon} size={18} aria-hidden="true" />
        <input
          className={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('condition.searchPlaceholder')}
          aria-label={t('condition.searchAria')}
        />
        {keyword && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => setQuery('')}
            aria-label={t('condition.searchClear')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className={styles.sectionLabel}>
        {t('condition.originCount', { count: ORIGINS.length })}
      </p>

      {matches.length === 0 ? (
        <div className={styles.empty}>
          <SearchX className={styles.emptyIcon} size={26} aria-hidden="true" />
          <p className={styles.emptyTitle}>{t('condition.originEmptyTitle', { keyword })}</p>
          <p className={styles.emptyText}>{t('condition.originEmptyText')}</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {matches.map(({ code, label, region }) => {
            const selected = code === trip.origin
            return (
              <li key={code}>
                <button
                  type="button"
                  className={
                    selected ? `${styles.row} ${styles.rowOn}` : styles.row
                  }
                  onClick={() => pick(code)}
                >
                  <span className={styles.tag}>{region}</span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowLabel}>{label}</span>
                    <span className={styles.badge}>
                      {t('condition.originBadge')}
                    </span>
                  </span>
                  {selected && (
                    <Check
                      className={styles.check}
                      size={18}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* 목록이 짧은 게 미완성이 아니라 판단이라는 걸 여기서 말해줍니다.
          "다 된다고 하지 않는 앱"이 이 서비스의 신뢰 근거입니다. */}
      <p className={styles.trustNote}>{t('condition.trustNote')}</p>
    </>
  )
}

/* ── 날짜 ─────────────────────────────────────────────────────────────────*/

/** 해당 달을 주 단위로 쪼갠 격자. 앞뒤 빈 칸은 null입니다. */
function buildMonth(year, month) {
  const leading = new Date(year, month - 1, 1).getDay()
  const dayCount = new Date(year, month, 0).getDate()

  const cells = Array(leading).fill(null)
  for (let day = 1; day <= dayCount; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    )
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push({
      key: `${year}-${month}-w${i / 7}`,
      days: cells.slice(i, i + 7),
    })
  }
  return weeks
}

function DateContent({ trip, onChange, onClose }) {
  const today = todayISO()
  const [year, month] = trip.date.split('-').map(Number)
  const [cursor, setCursor] = useState({ year, month })

  const weeks = useMemo(
    () => buildMonth(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const shiftMonth = (delta) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() + 1 }
    })
  }

  // 지난 날짜는 판정할 수 없으므로 이번 달보다 뒤로는 못 갑니다.
  const [thisYear, thisMonth] = today.split('-').map(Number)
  const atFirstMonth =
    cursor.year === thisYear && cursor.month === thisMonth
  const atLastMonth =
    cursor.year * 12 + cursor.month >= thisYear * 12 + thisMonth + 3

  const pick = (iso) => {
    onChange({ date: iso })
    onClose()
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.monthBar}>
        <button
          type="button"
          className={styles.monthButton}
          onClick={() => shiftMonth(-1)}
          disabled={atFirstMonth}
          aria-label={t('condition.prevMonth')}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className={styles.monthLabel}>
          {t('condition.monthLabel', { year: cursor.year, month: cursor.month })}
        </span>
        <button
          type="button"
          className={styles.monthButton}
          onClick={() => shiftMonth(1)}
          disabled={atLastMonth}
          aria-label={t('condition.nextMonth')}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.weekHead}>
        {WEEKDAYS.map((label, index) => (
          <span
            key={label}
            className={
              index === 0 || index === 6
                ? `${styles.weekName} ${styles.weekEnd}`
                : styles.weekName
            }
          >
            {label}
          </span>
        ))}
      </div>

      {weeks.map((week) => (
        <div key={week.key} className={styles.week}>
          {week.days.map((iso, index) =>
            iso === null ? (
              <span key={`${week.key}-gap-${index}`} className={styles.day} />
            ) : (
              <button
                key={iso}
                type="button"
                className={[
                  styles.day,
                  styles.dayOn,
                  iso === trip.date ? styles.daySelected : '',
                  iso === today ? styles.dayToday : '',
                  isWeekend(iso) ? styles.dayWeekend : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => pick(iso)}
                disabled={iso < today}
              >
                {Number(iso.slice(8))}
              </button>
            ),
          )}
        </div>
      ))}

      <p className={styles.note}>{formatDateLong(trip.date)}</p>
    </div>
  )
}

/* ── 시각 ─────────────────────────────────────────────────────────────────*/

const TIME_RE = /^\d{2}:\d{2}$/

function Stepper({ label, hint, value, range, onStep }) {
  return (
    <div className={styles.stepper}>
      <div className={styles.stepperHead}>
        <span className={styles.stepperLabel}>{label}</span>
        <span className={styles.stepperHint}>{hint}</span>
      </div>

      <div className={styles.stepperControl}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onStep(-TIME_STEP_MIN)}
          disabled={TIME_RE.test(value) && atLimit(value, -1, range)}
          aria-label={t('condition.stepEarlier', { label })}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <span className={styles.stepValue}>{value}</span>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onStep(TIME_STEP_MIN)}
          disabled={TIME_RE.test(value) && atLimit(value, 1, range)}
          aria-label={t('condition.stepLater', { label })}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/** 귀가가 '막차까지'(null)면 스테퍼는 범위 끝에서 시작합니다. 건드리는 순간 시각 지정으로 바뀝니다. */
function TimeContent({ trip, onChange }) {
  const returnBy = trip.returnBy ?? RETURN_RANGE[1]

  return (
    <div className={styles.steppers}>
      <Stepper
        label={t('condition.departLabel')}
        hint={t('condition.departHint')}
        value={trip.departTime}
        range={DEPART_RANGE}
        onStep={(delta) =>
          onChange({ departTime: shiftTime(trip.departTime, delta, DEPART_RANGE) })
        }
      />
      <Stepper
        label={t('condition.returnLabel')}
        hint={t('condition.returnHint')}
        value={trip.returnBy === null ? t('condition.untilLastBus') : returnBy}
        range={RETURN_RANGE}
        onStep={(delta) => onChange({ returnBy: shiftTime(returnBy, delta, RETURN_RANGE) })}
      />
    </div>
  )
}

/* ── 껍데기 ───────────────────────────────────────────────────────────────*/

/**
 * 조건 편집 시트.
 * 고른 즉시 상위에서 재판정이 돌아갑니다. 별도 화면으로 나갔다 오지 않습니다.
 */
export default function ConditionEditor({ field, trip, onChange, onClose }) {
  if (!field) return null

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label={t('common.close')}
      />

      <section className={styles.sheet} aria-label={TITLES[field]}>
        <div className={styles.grabber} aria-hidden="true" />

        <header className={styles.header}>
          <h2 className={styles.title}>{TITLES[field]}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {field === 'origin' && (
          <OriginContent trip={trip} onChange={onChange} onClose={onClose} />
        )}
        {field === 'date' && (
          <DateContent trip={trip} onChange={onChange} onClose={onClose} />
        )}
        {field === 'time' && <TimeContent trip={trip} onChange={onChange} />}

        {field === 'time' && (
          <button type="button" className={styles.done} onClick={onClose}>
            {t('condition.done')}
          </button>
        )}
      </section>
    </>
  )
}
