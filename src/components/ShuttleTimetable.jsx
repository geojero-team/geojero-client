import { t } from '../i18n'
import { formatShortDate } from '../lib/format'
import page from '../pages/SpotTimetablePage.module.css'
import DockCard from './DockCard'
import styles from './FerryTimetable.module.css'

/**
 * 도선 시간표 — 섬으로 들어가는 배 · 나오는 배 한 방향(2026-09-15 사용자 결정 · 운항사 안내를 사용자가 입력).
 * 내도(구조라 ↔ 내도) · 지심도(장승포 지심도 터미널 ↔ 지심도). 스팟 시간표 화면의 도선 칩이 그립니다.
 *
 * 2026-09-15 재배치(사용자 요청 — 가독성): **버스 칩과 같은 순서 · 같은 부품**입니다.
 *   (타는 문장 · 칩은 화면이 그립니다 — 버스와 같은 자리)
 *   1. 다음 배 카드 — 버스의 다음 버스 카드 그대로. 둘째 줄은 운항사의 관광시간 문구
 *   2. 행동 — 전화 · 예약(성수기 미예약 시 탑승이 어려운 곳이 있어 눈에 띄는 자리)
 *   3. 타는 곳 — 들어가는 배일 때 선착장 지도 카드(DockCard). 나오는 배는 섬에서 타고, 섬 선착장 좌표는 없습니다
 *   4. 「평일 시간표」 — 버스와 같은 머리줄 · 한 편 한 줄 · 「다음」. 평일에 보면 주말 사정 한 줄
 *   5. 이용 안내 — 운항 · 요금 · 안내 · (나오는 배면) 도착하는 선착장 주소
 *   6. 주의 · 출처
 * 전에는 설명 세 줄이 맨 위에 쌓이고, 다섯 편이 한 줄에 몰리고, 전화 · 요금 · 안내가 한 카드에 섞여 있었습니다.
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
  const first = times[0]
  const last = times[times.length - 1]

  const nextText = flexible
    ? t('shuttle.flexibleTitle')
    : times.length === 0
      ? t('ferry.noSailing')
      : nowMin == null
        ? t('shuttle.firstLast', { first, last })
        : next
          ? t('shuttle.next', { time: next })
          : t('shuttle.todayDone')
  const nextSub = flexible ? t('shuttle.flexibleNote', { note: shuttle.holidayNote }) : shuttle.tripNote

  // 이용 안내 — 값이 있는 것만. 들어가는 배의 주소는 타는 곳 카드가 이미 말합니다.
  const facts = [
    [t('boat.operator'), shuttle.operatorName],
    [t('boat.fare'), shuttle.fareText],
    [t('boat.notice'), shuttle.notice],
    [t('boat.arriveDock'), inbound ? null : shuttle.address],
  ].filter(([, value]) => value)

  return (
    <div data-api="GET /api/pois/{id}/ferries">
      {/* 1. 다음 배 */}
      <div className={page.nextCard}>
        <p className={page.nextLine}>{nextText}</p>
        {nextSub && <p className={page.nextSub}>{nextSub}</p>}
      </div>

      {/* 2. 행동 — 전화 · 예약 */}
      <div className={styles.actions}>
        <a
          className={styles.action}
          href={`tel:${phoneDigits}`}
          aria-label={t('shuttle.callA11y', { operator: shuttle.operatorName, phone: shuttle.phone })}
        >
          {t('shuttle.call', { phone: shuttle.phone })}
        </a>
        {shuttle.bookingUrl && (
          <a
            className={styles.action}
            href={shuttle.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('shuttle.bookA11y', { operator: shuttle.operatorName })}
          >
            {t('shuttle.book')}
          </a>
        )}
      </div>

      {/* 3. 타는 곳 — 들어가는 배만(선착장). */}
      {inbound && (
        <div className={page.boarding}>
          <DockCard name={shuttle.dockName} address={shuttle.address} lat={shuttle.dockLat} lng={shuttle.dockLng} />
        </div>
      )}

      {/* 4. 그날 시간표 — 버스와 같은 한 편 한 줄. 시(時)는 그 시의 첫 줄에만 적습니다. */}
      {times.length > 0 && (
        <section aria-label={t('spotTime.tableTitle', { day: dayLabel })}>
          <div className={page.tableHead}>
            <h2 className={page.tableTitle}>{t('spotTime.tableTitle', { day: dayLabel })}</h2>
            <p className={page.tableSummary}>{t('shuttle.summary', { first, last, count: times.length })}</p>
          </div>
          {/* 평일에 보면 주말 사정도 알려 둡니다 — 주말에 와서야 "정해진 시각이 없다"를 알면 늦습니다. */}
          {!holiday && shuttle.holidayNote && (
            <p className={page.estimatedNote}>{t('shuttle.holidayCaption', { note: shuttle.holidayNote })}</p>
          )}
          <ul className={page.rows}>
            {times.map((time, i) => {
              const hour = time.slice(0, 2)
              const firstOfHour = i === 0 || times[i - 1].slice(0, 2) !== hour
              const isNext = time === next
              return (
                <li key={time} className={page.row}>
                  <span className={page.hourLabel}>{firstOfHour ? t('spotTime.hour', { h: hour }) : ''}</span>
                  <span className={isNext ? page.timeNext : page.time}>{time}</span>
                  {isNext && <span className={page.nextTag}>{t('spotTime.nextTag')}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 5. 이용 안내 */}
      {facts.length > 0 && (
        <section className={styles.info} aria-labelledby={`shuttle-${shuttle.shuttleId}-${way}-info`}>
          <h2 id={`shuttle-${shuttle.shuttleId}-${way}-info`} className={styles.infoTitle}>
            {t('boat.infoTitle')}
          </h2>
          <dl className={styles.facts}>
            {facts.map(([label, value]) => (
              <div key={label} className={styles.fact}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 6. 주의 · 출처 — 버스 출처 자리 */}
      <div className={page.sources}>
        <p className={`${page.source} ${styles.lines}`}>{t('shuttle.caution')}</p>
        <p className={page.source}>
          {t('shuttle.source', { source: shuttle.source, entered: formatShortDate(shuttle.enteredOn) })}
        </p>
      </div>
    </div>
  )
}
