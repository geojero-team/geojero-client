import { ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav, { MAP_PATH } from '../components/BottomNav'
import ConditionEditor from '../components/ConditionEditor'
import Screen from '../components/Screen'
import { fetchCourses } from '../data/mockPlan'
import { courseImage } from '../lib/courseImage'
import { THEME_LABELS, formatDateLong } from '../lib/format'
import { ORIGIN_LABELS, defaultTripParams, saveOrigin } from '../lib/tripParams'
import styles from './HomePage.module.css'

/**
 * 홈 — Figma `홈 — A 최근 코스 섹션 숨김` (233:296) 기준.
 *
 * 조건을 먼저 정하고 스팟을 고르러 가는 화면입니다. 지도와 달리 판정 결과를
 * 보여주는 자리가 아니라 **조건을 세팅하는 자리**라, 조건 카드가 화면의 주인공이고
 * 코스는 "이 조건이면 이런 게 된다"를 보여주는 미리보기입니다.
 *
 * 조건 편집은 지도와 같은 `ConditionEditor` 시트를 그대로 씁니다. 같은 조건을
 * 두 화면이 각각 다른 방식으로 고치게 두면 값이 어긋납니다.
 */

/** 코스 카드 — Figma CourseCard2(146:583) kind=course */
function CourseCard({ course, onOpen }) {
  const spots = course.spots ?? []

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onOpen(course)}
      data-api="GET /api/routes"
    >
      <div className={styles.photo}>
        <img className={styles.photoImg} src={courseImage(course)} alt="" />
        <span
          className={
            course.verdict === 'YES'
              ? styles.badge
              : `${styles.badge} ${styles.badgeNo}`
          }
        >
          {course.verdict === 'YES' ? '✓ 성립' : '✕ 불성립'}
        </span>
      </div>

      <div className={styles.cardInfo}>
        <span className={styles.cardName}>{course.name}</span>

        {/* 스팟이 여러 개면 스팟별 판정을, 하나면 지역·분류를 씁니다.
            여러 곳 중 한 곳만 안 되는 코스가 있어서, 카드에서 어디가 걸리는지
            보여주지 않으면 들어가 봐야만 알게 됩니다. */}
        {spots.length > 1 ? (
          <span className={styles.cardMeta}>
            {spots.map((spot, index) => (
              <span key={spot.spotId}>
                {index > 0 && ' · '}
                <span
                  className={
                    spot.verdict === 'YES' ? styles.dotYes : styles.dotNo
                  }
                  aria-hidden="true"
                >
                  ●
                </span>{' '}
                {spot.shortName}
              </span>
            ))}
          </span>
        ) : (
          <span className={styles.cardMeta}>
            {course.region} · {THEME_LABELS[course.theme] ?? course.theme}
          </span>
        )}
      </div>
    </button>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  const [trip, setTrip] = useState(defaultTripParams)
  const [editing, setEditing] = useState(null) // 'origin' | 'date' | 'time' | null
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })

  useEffect(() => {
    let cancelled = false

    fetchCourses(trip)
      .then((data) => {
        if (!cancelled) setResult({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })

    return () => {
      cancelled = true
    }
  }, [trip])

  const updateTrip = useCallback((patch) => {
    if (patch.origin) saveOrigin(patch.origin)
    setResult((prev) => ({ ...prev, status: 'loading' }))
    setTrip((prev) => ({ ...prev, ...patch }))
  }, [])

  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin
  const courses = result.data?.courses ?? []

  /* 네 줄이 각각 편집 시트를 엽니다. 출발 시간과 복귀 시간은 한 쌍이라
     ConditionEditor에서 'time' 시트 하나가 둘을 같이 다룹니다. */
  const rows = [
    {
      label: '출발지',
      value: originLabel,
      field: 'origin',
      // 터미널 목록은 서버만 압니다 — "여기 있는 곳 = 판정 가능한 곳"이라서.
      api: 'GET /api/origins',
    },
    { label: '날짜', value: formatDateLong(trip.date), field: 'date' },
    { label: '출발 시간', value: trip.departTime, field: 'time' },
    {
      label: `복귀 시간 · ${originLabel} 도착`,
      value: trip.returnBy,
      field: 'time',
    },
  ]

  return (
    <Screen data-api="GET /api/courses">
      <div className={styles.page}>
        <div className={styles.body}>
          <p className={styles.wordmark}>거제로</p>

          <h1 className={styles.headline}>
            스케줄만 고르세요.
            <br />
            코스는 맡기세요
          </h1>

          <div className={styles.inputCard}>
            {rows.map(({ label, value, field, api }, index) => (
              <button
                key={label}
                type="button"
                className={index === 0 ? styles.row : `${styles.row} ${styles.rowRuled}`}
                onClick={() => setEditing(field)}
                aria-label={`${label} ${value}, 바꾸기`}
                data-api={api}
              >
                <span className={styles.rowDot} aria-hidden="true" />
                <span className={styles.rowCol}>
                  <span className={styles.rowLabel}>{label}</span>
                  <span className={styles.rowValue}>{value}</span>
                </span>
                <ChevronRight
                  className={styles.rowChevron}
                  size={20}
                  aria-hidden="true"
                />
              </button>
            ))}

            <button
              type="button"
              className={styles.cta}
              onClick={() => navigate('/spots')}
              data-api="GET /api/spots"
            >
              가고 싶은 곳 고르기
            </button>
          </div>

          <section className={styles.today}>
            <div className={styles.todayHead}>
              <h2 className={styles.sectionTitle}>주요 스팟</h2>
              <button
                type="button"
                className={styles.more}
                onClick={() => navigate('/spots')}
                data-api="GET /api/spots"
              >
                더보기
              </button>
            </div>

            {result.status === 'error' ? (
              <p className={styles.notice}>불러오지 못했습니다 — {result.error}</p>
            ) : result.status === 'loading' && courses.length === 0 ? (
              <p className={styles.notice}>코스를 찾는 중</p>
            ) : courses.length === 0 ? (
              <p className={styles.notice}>
                이 조건으로 당일에 다녀올 수 있는 코스가 없습니다. 출발 시간을 앞당기거나
                복귀 시간을 늦춰보세요.
              </p>
            ) : (
              <div className={styles.cards}>
                {courses.map((course) => (
                  <CourseCard
                    key={course.courseId}
                    course={course}
                    onOpen={({ spotIds }) =>
                      navigate(`${MAP_PATH}?spots=${spotIds.join(',')}`)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <ConditionEditor
        field={editing}
        trip={trip}
        onChange={updateTrip}
        onClose={() => setEditing(null)}
      />

      <BottomNav />
    </Screen>
  )
}
