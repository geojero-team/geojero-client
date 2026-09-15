import { t } from '../i18n'
import { formatDateWeekday, formatDuration, formatShortDate } from '../lib/format'
import page from '../pages/SpotTimetablePage.module.css'
import DockCard from './DockCard'
import styles from './FerryTimetable.module.css'

/**
 * 유람선 시간표 — 선착장 하나. 스팟 시간표 화면의 배 칩이 그립니다(2026-09-14 · Figma 프레임 없음).
 *
 * 2026-09-15 재배치(사용자 요청 — "정보가 이리저리 흩어져 가독성이 엉망"): **버스 칩과 같은 순서 · 같은 부품**으로 다시 짰습니다.
 *   (타는 문장 · 칩은 화면이 그립니다 — 버스와 같은 자리)
 *   1. 다음 배 카드 — 버스의 다음 버스 카드 그대로. 둘째 줄에 「외도에서 2시간 · 약 16:40 도장포 선착장 복귀」.
 *      전에는 이 사실이 카드 위 「왕복이에요 …」 문장 · 코스 카드 · 각주로 세 번 흩어져 있었습니다.
 *   2. 예약 — 코스가 하나면 카드 폭 버튼(외도에 가는 배는 예약센터 발권). 코스가 둘이면 이용 안내의 코스마다.
 *   3. 타는 곳 — 선착장 지도 카드(DockCard, 버스 타는 곳 카드와 같은 모양).
 *   4. 배 시간표 — 버스의 「평일 시간표」 머리줄 모양 + 날짜 줄. 코스가 둘일 때만 색 각주.
 *   5. 이용 안내 — 코스마다 소요 · 외도 체류 · 상품 원문 이름.
 *   6. 주의 · 출처 — 버스 출처 자리(맨 아래 작은 글씨).
 *
 * **원천 사이트(외도유람선 예약센터 배시간표) 모양 그대로** 날짜마다 한 줄에 출항 시각을 늘어놓습니다.
 * 코스는 원천처럼 글자 색으로 가릅니다 — 외도상륙 편 검정, 선상관광 편 빨강. 색만으로 구분하지 않게 각 편의 읽는 이름에 코스를 적습니다.
 *
 * 순수 렌더입니다(요청 없음). 지난 편을 거르는 것은 서버가 아니라 여기 몫입니다.
 *
 * ★ 이 화면에는 「운행 없음」이 없습니다. 원문이 공개한 날의 0편만 「예정된 배 없음」이고,
 * 공개 전(UNPUBLISHED)·수집 전(NOT_COLLECTED) 날은 전부 「시각 미확인」입니다.
 *
 * @param ferry  서버 ferries[] 한 개 (dock · access · courses · next · rows · coverage)
 * @param asOf   서버 asOf { date, time } — 오늘 줄과 지난 편을 가르는 기준
 * @param days   서버 days — 「앞으로 N일」
 */

/** "HH:MM" → 분. 오늘 줄에서 떠난 배를 빼려면 비교가 필요합니다. */
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/**
 * 이어진 시각 미확인 날을 한 줄로 묶습니다. 11월 7일치를 일곱 줄로 늘어놓으면
 * 같은 「시각 미확인」이 표를 채워 공개된 날이 묻힙니다. 공개된 날은 날마다 한 줄입니다.
 */
function groupRows(rows) {
  const blocks = []
  for (const row of rows) {
    const last = blocks[blocks.length - 1]
    if (row.status !== 'PUBLISHED' && last?.status === row.status) last.to = row.date
    else blocks.push({ ...row, from: row.date, to: row.date })
  }
  return blocks
}

export default function FerryTimetable({ ferry, asOf, days }) {
  const coursesById = new Map(ferry.courses.map((course) => [course.courseId, course]))
  const multiCourse = ferry.courses.length > 1
  const single = multiCourse ? null : (ferry.courses[0] ?? null)
  // 코스 색은 원문 색이 아니라 lands_on_oedo로 정합니다 — 서버가 코스 종류를 그 값으로 말합니다.
  const tone = (course) => (course?.landsOnOedo ? styles.landing : styles.cruise)
  const dock = ferry.dock.shortName
  const nowMin = asOf.time ? toMin(asOf.time) : null
  const nextKeys = new Set(ferry.next.map((n) => `${n.date}|${n.depart}|${n.courseId}`))
  const hasUnknownDay = ferry.rows.some((row) => row.status !== 'PUBLISHED')
  /* 수집 시각(KST ISO)의 날짜 부분. 한 달도 공개분을 못 받은 선착장이면 coverage가 비어 있을 수 있습니다 —
     그때 날짜 줄은 전부 NOT_COLLECTED라 이 값을 쓰지 않고, 출처 줄도 그리지 않습니다. */
  const fetchedAt = ferry.coverage?.fetchedAt
  const fetched = fetchedAt ? formatShortDate(fetchedAt.slice(0, 10)) : null

  // 다음 배 — 가장 이른 편이 카드의 주인공, 다른 코스의 다음 편은 아래 줄.
  const nexts = [...ferry.next].sort((a, b) => `${a.date} ${a.depart}`.localeCompare(`${b.date} ${b.depart}`))
  const lead = nexts[0] ?? null
  const leadCourse = lead ? coursesById.get(lead.courseId) : null
  const whenOf = (n) => (n.date === asOf.date ? n.depart : `${formatDateWeekday(n.date)} ${n.depart}`)

  const dayLabel = (block) =>
    block.from === block.to
      ? formatDateWeekday(block.from)
      : t('ferry.range', { from: formatDateWeekday(block.from), to: formatDateWeekday(block.to) })

  return (
    <div data-api="GET /api/pois/{id}/ferries">
      {/* 1. 다음 배 */}
      <div className={page.nextCard}>
        <p className={page.nextLine}>
          {lead
            ? t(lead.date === asOf.date ? 'ferry.nextBig' : 'ferry.nextBigOn', {
                time: lead.depart,
                day: formatDateWeekday(lead.date),
              })
            : hasUnknownDay
              ? t('ferry.nextUnknown')
              : t('ferry.noNext', { days })}
        </p>
        {lead && (
          <p className={page.nextSub}>
            {[
              multiCourse ? leadCourse?.legendLabel : null,
              leadCourse?.landsOnOedo ? t('ferry.stay', { stay: formatDuration(leadCourse.oedoStayMin) }) : null,
              t('ferry.returnTo', { ret: lead.returnApprox, dock }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {nexts.slice(1).map((n) => (
          <p key={`${n.courseId}-${n.date}-${n.depart}`} className={page.nextSub}>
            {t('ferry.nextOther', {
              course: coursesById.get(n.courseId)?.legendLabel,
              time: whenOf(n),
              ret: n.returnApprox,
            })}
          </p>
        ))}
      </div>

      {/* 2. 예약 — 코스가 하나일 때 카드 폭 버튼 */}
      {single && (
        <div className={styles.actions}>
          <a
            className={styles.action}
            href={single.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('ferry.bookA11y', { course: single.legendLabel })}
          >
            {t('ferry.book')}
          </a>
        </div>
      )}

      {/* 3. 타는 곳 — 선착장 지도 카드. 예약센터의 「도보 1분거리」 같은 인용은 접혀 있어도 보입니다. */}
      <div className={page.boarding}>
        <DockCard
          name={dock}
          address={ferry.dock.address}
          lat={ferry.dock.lat}
          lng={ferry.dock.lng}
          note={ferry.access ? t('ferry.access', { quote: ferry.access.quote }) : null}
        />
      </div>

      {/* 4. 배 시간표 — 날짜마다 원문이 달라 버스의 「평일 시간표」 대신 「배 시간표 · 앞으로 N일」 */}
      <section aria-label={t('ferry.tableTitle')}>
        <div className={page.tableHead}>
          <h2 className={page.tableTitle}>{t('ferry.tableTitle')}</h2>
          <p className={page.tableSummary}>{t('ferry.tableSummary', { days })}</p>
        </div>

        {multiCourse && (
          <ul className={styles.legend}>
            {ferry.courses.map((course) => (
              <li key={course.courseId} className={tone(course)}>
                <span aria-hidden="true">●</span> {course.legendLabel}
              </li>
            ))}
          </ul>
        )}

        <ul className={styles.rows}>
          {groupRows(ferry.rows).map((block) => {
            if (block.status !== 'PUBLISHED') {
              return (
                <li key={block.from} className={styles.row}>
                  <span className={styles.day}>
                    <span>{dayLabel(block)}</span>
                  </span>
                  <span className={styles.unknown}>
                    {block.status === 'UNPUBLISHED'
                      ? t('ferry.unpublished', { fetched })
                      : t('ferry.notCollected')}
                  </span>
                </li>
              )
            }

            const isToday = block.from === asOf.date
            // 오늘 줄에서 이미 떠난 배는 그리지 않습니다(흐리게 두면 회색이 선상관광 색과 헷갈립니다).
            const shown =
              isToday && nowMin != null
                ? block.sailings.filter((s) => toMin(s.depart) >= nowMin)
                : block.sailings

            return (
              <li key={block.from} className={styles.row}>
                <span className={styles.day}>
                  <span>{dayLabel(block)}</span>
                  {isToday && <span className={styles.todayTag}>{t('ferry.today')}</span>}
                </span>
                {block.sailings.length === 0 ? (
                  <span className={styles.none}>{t('ferry.noSailing')}</span>
                ) : shown.length === 0 ? (
                  <span className={styles.none}>{t('ferry.todayDone')}</span>
                ) : (
                  <ul className={styles.times}>
                    {shown.map((s) => {
                      const course = coursesById.get(s.courseId)
                      return (
                        <li
                          key={`${s.courseId}-${s.depart}`}
                          className={`${styles.time} ${tone(course)}`}
                          aria-label={t('ferry.sailingA11y', {
                            time: s.depart,
                            course: course?.legendLabel,
                            ret: s.returnApprox,
                          })}
                        >
                          {s.depart}
                          {nextKeys.has(`${block.from}|${s.depart}|${s.courseId}`) && (
                            <span className={styles.nextTag}>{t('ferry.nextTag')}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* 5. 이용 안내 — 코스마다 소요 · 외도 체류 · 상품 원문 이름(입장료 별도 문구 포함) */}
      <section className={styles.info} aria-labelledby={`${ferry.key}-info`}>
        <h2 id={`${ferry.key}-info`} className={styles.infoTitle}>
          {t('boat.infoTitle')}
        </h2>
        <ul className={styles.courses}>
          {ferry.courses.map((course) => (
            <li key={course.courseId} className={styles.course}>
              <p className={styles.courseHead}>
                {multiCourse && (
                  <span className={`${styles.dot} ${tone(course)}`} aria-hidden="true">
                    ●
                  </span>
                )}
                <span className={styles.courseLabel}>{course.legendLabel}</span>
                <span className={styles.courseTotal}>{course.totalText}</span>
              </p>
              <p className={styles.courseLine}>
                {course.landsOnOedo
                  ? t('ferry.courseStay', { stay: formatDuration(course.oedoStayMin) })
                  : t('ferry.cruiseNoLanding')}
              </p>
              <p className={styles.caption}>{course.name}</p>
              {multiCourse && (
                <a
                  className={styles.book}
                  href={course.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('ferry.bookA11y', { course: course.legendLabel })}
                >
                  {t('ferry.book')}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* 6. 주의 · 출처 — 버스 출처 자리 */}
      <div className={page.sources}>
        <p className={`${page.source} ${styles.lines}`}>{t('ferry.caution')}</p>
        {fetched && (
          <p className={page.source}>
            {t('ferry.source', {
              source: ferry.coverage.source,
              fetched,
              through: formatShortDate(ferry.coverage.publishedThrough),
            })}
            {ferry.coverage.crossCheckUrl && ` · ${t('ferry.crossChecked')}`}
          </p>
        )}
      </div>
    </div>
  )
}
