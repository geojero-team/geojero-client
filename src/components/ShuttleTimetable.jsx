import { t } from '../i18n'
import { formatShortDate } from '../lib/format'
import styles from './FerryTimetable.module.css'

/**
 * 도선 시간표 — 섬으로 들어가는 배 · 나오는 배 한 방향(2026-09-15 사용자 결정 · 운항사 안내를 사용자가 입력).
 * 내도(구조라 ↔ 내도) · 지심도(장승포 지심도 터미널 ↔ 지심도). 스팟 시간표 화면의 도선 칩이 그립니다.
 *
 * **외도 유람선(FerryTimetable)과 같은 모양 · 같은 CSS**입니다 — 타는 곳 → 다음 배 카드 → 운항사 카드 → 시각 줄 → 주의 → 출처.
 * 다른 점은 하나: 외도 배는 날짜마다 원문이 있어 날짜 줄을 늘어놓지만, 도선은 **요일별 고정 시각**이라
 * 그날(평일/휴일) 한 줄만 그립니다. 지난 편을 흐리지 않고 다음 편에 「다음」을 답니다(버스 표와 같은 규칙).
 *
 * 그날 정해진 시각이 없으면(내도 주말 · 공휴일 「5번~8번 (주말 수시운행)」) 시각을 지어내지 않고 원문을 그대로 보입니다.
 *
 * @param shuttle   서버 shuttles[] 한 개
 * @param way       'in' 선착장 → 섬 · 'out' 섬 → 선착장
 * @param now       "HH:MM" — 다음 배를 고르는 기준
 * @param showsNow  오늘을 보는 중인지. 다른 날짜면 다음 배를 짚지 않고 첫 배 · 막배만 말합니다
 */

/** "HH:MM" → 분. */
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

export default function ShuttleTimetable({ shuttle, way, now, showsNow }) {
  const inbound = way === 'in'
  const times = inbound ? shuttle.inTimes : shuttle.outTimes
  const holiday = shuttle.dayClass === 'HOLIDAY'
  const dayLabel = t(holiday ? 'courseDetail.holiday' : 'courseDetail.weekday')
  const nowMin = showsNow && now ? toMin(now) : null
  const next = nowMin == null ? null : (times.find((time) => toMin(time) >= nowMin) ?? null)
  // 그날 시각이 없고 원문 안내가 있으면 그 원문이 답입니다(수시 운행).
  const flexible = times.length === 0 && Boolean(shuttle.holidayNote)
  const phoneDigits = shuttle.phone.replace(/[^0-9]/g, '')

  const nextText = flexible
    ? t('shuttle.flexibleTitle')
    : times.length === 0
      ? t('ferry.noSailing')
      : nowMin == null
        ? t('shuttle.firstLast', { first: times[0], last: times[times.length - 1] })
        : next
          ? t('shuttle.next', { time: next })
          : t('shuttle.todayDone')

  return (
    <div className={styles.root} data-api="GET /api/pois/{id}/ferries">
      {/* 1. 타는 곳 — 들어갈 때는 선착장, 나올 때는 섬에서 탑니다. */}
      <div className={styles.boardBlock}>
        <p className={styles.board}>
          {inbound
            ? t('shuttle.boardIn', { dock: shuttle.dockName })
            : t('shuttle.boardOut', { island: shuttle.islandName, dock: shuttle.dockName })}
        </p>
        <p className={styles.caption}>
          {shuttle.operatorName} · {shuttle.address}
        </p>
        {shuttle.tripNote && <p className={styles.caption}>{shuttle.tripNote}</p>}
      </div>

      {/* 2. 다음 배 — 외도·버스와 같은 면 */}
      <div className={styles.nextCard}>
        <p className={styles.nextLine}>{nextText}</p>
        {flexible && (
          <p className={styles.caption}>{t('shuttle.flexibleNote', { note: shuttle.holidayNote })}</p>
        )}
      </div>

      {/* 3. 운항사 카드 — 외도의 코스 카드 자리. 전화 · 요금 · 안내 · 예약 */}
      <div className={styles.course}>
        <p className={styles.courseHead}>
          <span className={styles.courseLabel}>{shuttle.operatorName}</span>
        </p>
        <a
          className={styles.book}
          href={`tel:${phoneDigits}`}
          aria-label={t('shuttle.callA11y', { operator: shuttle.operatorName, phone: shuttle.phone })}
        >
          {t('shuttle.call', { phone: shuttle.phone })}
        </a>
        {shuttle.fareText && <p className={styles.caption}>{t('shuttle.fare', { fare: shuttle.fareText })}</p>}
        {shuttle.notice && <p className={styles.caption}>{shuttle.notice}</p>}
        {shuttle.bookingUrl && (
          <a
            className={styles.book}
            href={shuttle.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('shuttle.bookA11y', { operator: shuttle.operatorName })}
          >
            {t('shuttle.book')}
          </a>
        )}
      </div>

      {/* 4. 그날 시각 한 줄 — 외도 표의 날짜 줄 모양 */}
      {times.length > 0 && (
        <ul className={styles.rows}>
          <li className={styles.row}>
            <span className={styles.day}>
              <span>{dayLabel}</span>
            </span>
            <ul className={styles.times}>
              {times.map((time) => (
                <li key={time} className={`${styles.time} ${styles.landing}`}>
                  {time}
                  {time === next && <span className={styles.nextTag}>{t('ferry.nextTag')}</span>}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      )}

      {/* 평일에 보면 주말 사정도 알려 둡니다 — 주말에 와서야 "정해진 시각이 없다"를 알면 늦습니다. */}
      {!holiday && shuttle.holidayNote && (
        <p className={styles.caption}>{t('shuttle.holidayCaption', { note: shuttle.holidayNote })}</p>
      )}

      {/* 5. 주의 · 6. 출처 */}
      <p className={styles.caption}>{t('shuttle.caution')}</p>
      <p className={styles.source}>
        {t('shuttle.source', { source: shuttle.source, entered: formatShortDate(shuttle.enteredOn) })}
      </p>
    </div>
  )
}
