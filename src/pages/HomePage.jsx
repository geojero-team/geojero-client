import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav, { MAP_PATH } from '../components/BottomNav'
import Button from '../components/Button'
import ConditionSheet from '../components/ConditionSheet'
import Screen from '../components/Screen'
import StatusBadge from '../components/StatusBadge'
import { t } from '../i18n'
import { fetchCourses } from '../data/mockPlan'
import { courseImage } from '../lib/courseImage'
import { THEME_LABELS, formatDateLong } from '../lib/format'
import {
  ORIGIN_LABELS,
  defaultTripParams,
  saveOrigin,
  tripToSearch,
} from '../lib/tripParams'
import styles from './HomePage.module.css'

/**
 * 홈 — Figma 233:296 · 274:529(조건 편집 시트) 기준.
 *
 * 조건을 먼저 정하고 스팟을 고르러 가는 화면입니다. 조건 카드가 주인공이고
 * '오늘 버스로 되는 코스'는 "이 조건이면 이런 게 된다"를 보여주는 미리보기입니다.
 * 홈은 이 두 덩어리로 끝입니다.
 *
 * '최근에 본 코스' 섹션은 2026-09-10 팀 논의로 없앴습니다 — 빈 상태 문구가 바로 위
 * CTA와 같은 말을 하고, 열람 이력은 카카오 로그인 한 번이면 되는 '내 일정' 탭이
 * 맡으며, 첫 방문자가 '없어요'부터 읽게 되기 때문입니다.
 */

const DOT_CLASS = {
  YES: 'dotYes',
  NO: 'dotNo',
  UNKNOWN: 'dotUnknown',
}

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
        <StatusBadge status={course.verdict} className={styles.badge} />
        {/* Figma dots — 스팟 사진 수 + 경로 미니지도 1장. 캐러셀 스크롤은 사진이 들어온 뒤. */}
        <span className={styles.dots} aria-hidden="true">
          {Array.from({ length: Math.max(spots.length, 1) + 1 }, (_, index) => (
            <span key={index} className={index === 0 ? styles.dotActive : styles.dotIdle} />
          ))}
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
                  className={styles[DOT_CLASS[spot.verdict] ?? 'dotUnknown']}
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
  const [sheetOpen, setSheetOpen] = useState(false)
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

  // '코스 추천 받기' — 조건을 확정하고 다시 판정합니다.
  const applyConditions = useCallback((next) => {
    if (next.origin) saveOrigin(next.origin)
    setResult((prev) => ({ ...prev, status: 'loading' }))
    setTrip(next)
    setSheetOpen(false)
  }, [])

  // 코스를 열면 홈에서 확정한 조건(날짜·시각)을 지도에 그대로 넘깁니다.
  const openCourse = useCallback(
    ({ spotIds, date = trip.date }) => {
      navigate(
        `${MAP_PATH}?${tripToSearch({ ...trip, date }, { spots: spotIds.join(',') })}`,
      )
    },
    [navigate, trip],
  )

  const originLabel = ORIGIN_LABELS[trip.origin] ?? trip.origin
  const courses = result.data?.courses ?? []

  const rows = [
    // 터미널 목록은 서버만 압니다 — "여기 있는 곳 = 판정 가능한 곳"이라서.
    { label: t('home.rowOrigin'), value: originLabel, api: 'GET /api/origins' },
    { label: t('home.rowDate'), value: formatDateLong(trip.date) },
    { label: t('home.rowDepart'), value: trip.departTime },
    {
      label: t('home.rowReturn', { origin: originLabel }),
      value: trip.returnBy ?? t('condition.untilLastBus'),
    },
  ]

  return (
    <Screen data-api="GET /api/courses">
      <div className={styles.page}>
        <div className={styles.body}>
          <p className={styles.wordmark}>{t('home.wordmark')}</p>

          <h1 className={styles.headline}>
            {t('home.headline1')}
            <br />
            {t('home.headline2')}
          </h1>

          <div className={styles.inputCard}>
            {rows.map(({ label, value, api }, index) => (
              <button
                key={label}
                type="button"
                className={index === 0 ? styles.row : `${styles.row} ${styles.rowRuled}`}
                onClick={() => setSheetOpen(true)}
                aria-label={t('home.rowAria', { label, value })}
                data-api={api}
              >
                <span className={styles.rowDot} aria-hidden="true" />
                <span className={styles.rowCol}>
                  <span className={styles.rowLabel}>{label}</span>
                  <span className={styles.rowValue}>{value}</span>
                </span>
                <span className={styles.rowChevron} aria-hidden="true">›</span>
              </button>
            ))}

            <Button
              className={styles.cta}
              onClick={() => navigate(`/spots/pick?${tripToSearch(trip)}`)}
              data-api="GET /api/spots"
            >
              {t('home.cta')}
            </Button>
          </div>

          <section className={styles.today}>
            <div className={styles.todayHead}>
              <h2 className={styles.sectionTitle}>{t('home.todayTitle')}</h2>
              <button
                type="button"
                className={styles.more}
                onClick={() => navigate('/spots')}
                data-api="GET /api/spots"
              >
                {t('common.more')}
              </button>
            </div>

            {result.status === 'error' ? (
              <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
            ) : result.status === 'loading' && courses.length === 0 ? (
              <p className={styles.notice}>{t('home.loading')}</p>
            ) : courses.length === 0 ? (
              <p className={styles.notice}>{t('home.empty')}</p>
            ) : (
              <div className={styles.cards}>
                {courses.map((course) => (
                  <CourseCard key={course.courseId} course={course} onOpen={openCourse} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <ConditionSheet
        open={sheetOpen}
        trip={trip}
        onClose={() => setSheetOpen(false)}
        onSubmit={applyConditions}
      />

      <BottomNav />
    </Screen>
  )
}
