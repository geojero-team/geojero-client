import { t } from '../i18n'
import { formatDateWeekday, formatDuration, formatShortDate } from '../lib/format'
import styles from './FerryTimetable.module.css'

/**
 * 유람선 시간표 — 선착장 하나. 스팟 시간표 화면의 배 칩이 그립니다(2026-09-14 · Figma 프레임 없음).
 *
 * **원천 사이트(외도유람선 예약센터 배시간표) 모양 그대로** 날짜마다 한 줄에 출항 시각을 늘어놓습니다.
 * 코스는 원천처럼 글자 색으로 가릅니다 — 외도상륙 편 검정, 선상관광 편 빨강 — 그리고 표 위에
 * 원천과 같은 각주를 둡니다. 색만으로 구분하지 않게 각 편의 읽는 이름에 코스를 적습니다.
 *
 * 순수 렌더입니다(요청 없음). 지난 편을 거르는 것은 서버가 아니라 여기 몫입니다.
 *
 * ★ 이 화면에는 「운행 없음」이 없습니다. 원문이 공개한 날의 0편만 「예정된 배 없음」이고,
 * 공개 전(UNPUBLISHED)·수집 전(NOT_COLLECTED) 날은 전부 「시각 미확인」입니다.
 * 11월이 아직 안 올라온 것을 운휴로 말하면 우리가 §4에서 비판한 '이유 없는 빈칸'이 됩니다.
 *
 * @param ferry  서버 ferries[] 한 개 (dock · access · courses · next · rows · coverage)
 * @param asOf   서버 asOf { date, time } — 오늘 줄과 지난 편을 가르는 기준
 * @param days   서버 days — 「앞으로 N일 동안」
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
  const landing = ferry.courses.find((course) => course.landsOnOedo)
  const multiCourse = ferry.courses.length > 1
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

  const dayLabel = (block) =>
    block.from === block.to
      ? formatDateWeekday(block.from)
      : t('ferry.range', { from: formatDateWeekday(block.from), to: formatDateWeekday(block.to) })

  return (
    <div className={styles.root} data-api="GET /api/pois/{id}/ferries">
      {/* 1. 타는 곳 — 스팟이 아니라 선착장에서 탑니다. */}
      <div className={styles.boardBlock}>
        <p className={styles.board}>{t('ferry.board', { dock })}</p>
        <p className={styles.caption}>{ferry.dock.address}</p>
        {ferry.access && <p className={styles.caption}>{t('ferry.access', { quote: ferry.access.quote })}</p>}
      </div>

      {/* 2. 왕복 — 외도에 가는 배는 외도상륙 코스뿐이고, 출발한 선착장으로 돌아옵니다. */}
      {landing && (
        <p className={styles.board}>
          {t('ferry.roundTrip', { stay: formatDuration(landing.oedoStayMin), dock })}
        </p>
      )}

      {/* 3. 다음 배 — 코스마다 한 줄. 오늘이 아니면 날짜를 붙입니다. */}
      <div className={styles.nextCard}>
        {ferry.next.length > 0 ? (
          ferry.next.map((n) => {
            const course = coursesById.get(n.courseId)
            const vars = { time: n.depart, ret: n.returnApprox, day: formatDateWeekday(n.date) }
            return (
              <p key={`${n.courseId}-${n.date}-${n.depart}`} className={styles.nextLine}>
                {t(n.date === asOf.date ? 'ferry.next' : 'ferry.nextOn', vars)}
                {multiCourse && (
                  <span className={styles.nextCourse}>
                    <span className={`${styles.dot} ${tone(course)}`} aria-hidden="true">●</span>
                    {course?.legendLabel}
                  </span>
                )}
              </p>
            )
          })
        ) : (
          <p className={styles.nextLine}>
            {hasUnknownDay ? t('ferry.nextUnknown') : t('ferry.noNext', { days })}
          </p>
        )}
      </div>

      {/* 4. 코스 카드 — 총 소요시간과 예약. 예약 링크는 편마다가 아니라 선착장 × 코스마다 하나입니다. */}
      <ul className={styles.courses}>
        {ferry.courses.map((course) => (
          <li key={course.courseId} className={styles.course}>
            <p className={styles.courseHead}>
              <span className={`${styles.dot} ${tone(course)}`} aria-hidden="true">●</span>
              <span className={styles.courseLabel}>{course.legendLabel}</span>
              <span className={styles.courseTotal}>{course.totalText}</span>
            </p>
            {!course.landsOnOedo && <p className={styles.caption}>{t('ferry.cruiseNoLanding')}</p>}
            <a
              className={styles.book}
              href={course.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('ferry.bookA11y', { course: course.legendLabel })}
            >
              {t('ferry.book')}
            </a>
          </li>
        ))}
      </ul>

      {/* 5. 각주 + 날짜 줄 — 원천처럼 표 바로 위에 코스 이름(상품 원문, 입장료 별도 문구 포함). */}
      <div>
        <ul className={styles.legend}>
          {ferry.courses.map((course) => (
            <li key={course.courseId} className={tone(course)}>
              <span aria-hidden="true">●</span> {course.name}
            </li>
          ))}
        </ul>

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
      </div>

      {/* 6. 주의 — 복귀 시각이 늘 「약」인 이유. */}
      <p className={styles.caption}>{t('ferry.caution')}</p>

      {/* 7. 출처 */}
      {fetched && (
        <p className={styles.source}>
          {t('ferry.source', {
            source: ferry.coverage.source,
            fetched,
            through: formatShortDate(ferry.coverage.publishedThrough),
          })}
          {ferry.coverage.crossCheckUrl && ` · ${t('ferry.crossChecked')}`}
        </p>
      )}
    </div>
  )
}
