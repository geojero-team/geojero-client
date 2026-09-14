import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { courseTitle } from '../lib/courseTitle'
import { formatDuration } from '../lib/format'
import { loadSpotPhotos, loadSpots, regionsOf, withPhotos } from '../lib/spots'
import styles from './CoursesPage.module.css'

/**
 * 코스 추천 — v3 대표 코스 카드(Figma 02-2 `585:417` 고름 · `585:485` 안 고름 · `582:416` 카드 예시).
 *
 * 2026-09-14 저녁 사용자 결정: 3/4/5곳 칩을 없애고 **대표 코스 10개**를 카드로 보여줍니다.
 * 어느 10개인지는 서버가 정합니다(`featured=true` — 9경 많은 순 · 버스 시간 짧은 순 · 곳 수 · 코드 순).
 * 여기서 다시 고르거나 정렬하지 않습니다 — 코스를 다시 적재해도 화면이 그대로 따라오게.
 *
 * 카드는 첫 스팟 사진 · 9경 배지 · 제목 · 스팟 체인 · 소개 · 태그 넷(버스 시간 · 권역 · 배차 · 요일)입니다.
 * 태그 값은 전부 서버 데이터입니다 — 기준문서에 없는 수치를 화면에서 만들지 않습니다(절대규칙 1).
 * 그림(582:416)의 둘째 태그는 노선 번호(「55번 한 노선」)였는데 2026-09-14 밤 **권역**으로 바꿨습니다(사용자 결정) —
 * 「55·67-1번 2노선」은 읽히지 않고, 노선은 코스 상세가 구간마다 말합니다.
 * 모든 코스가 고현터미널 출발이고 그 사실을 화면에 적습니다.
 *
 * 코스를 **여러 개** 고를 수 있습니다. 고른 것들은 지도에서 좌우로 넘겨 비교하고
 * 거기서 하나를 선택합니다 — 여기서의 다중 선택은 '찜'이 아니라 '비교 대상 추림'입니다.
 * (그래서 저장 버튼이 없습니다. 저장은 코스 상세 한 곳입니다 — 저장 계약이 코스 하나 + 날짜를
 * 요구하는데 이 화면엔 둘 다 없습니다.)
 */

/** 고름 표시 — 32px 원. 안 고름은 테두리만, 고름은 brand 면 + 흰 체크(인라인 SVG). */
function Check({ on }) {
  return (
    <span className={on ? `${styles.check} ${styles.checkOn}` : styles.check} aria-hidden="true">
      {on && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

/**
 * 태그 넷 — 버스 시간 · 권역 · 배차 · 요일. 권역은 /api/pois 를 못 받으면 빠집니다(빈 태그를 남기지 않게).
 * 배차는 노선이 하나일 때만 서버가 줍니다(tripsPerDay) — 노선이 섞인 코스의 회차를 하나로 합치면 실제로 운행하지 않는 수가 됩니다.
 */
function tagsOf(course) {
  const trips = course.tripsPerDay
  return [
    t('courses.tagBus', { time: formatDuration(course.busMinTotal) }),
    course.regions,
    trips
      ? t(trips.weekday === trips.holiday ? 'courses.tagDaily' : 'courses.tagWeekday', { n: trips.weekday })
      : null,
    t(course.holidayService ? 'courses.tagServiceAll' : 'courses.tagServiceWeekday'),
  ].filter(Boolean)
}

/** 카드 한 장 — 카드 전체가 버튼이고 누르면 고름이 토글됩니다. */
function CourseCard({ course, selected, onToggle }) {
  // 첫 스팟 사진(/api/pois 대표 사진 — 코스 API는 사진을 주지 않습니다). 링크가 죽으면(onError)
  // 사진이 없을 때와 같은 「사진 없음」 상태로 — 깨진 그림 아이콘을 남기지 않습니다.
  const [broken, setBroken] = useState(false)
  const photo = broken ? null : (course.spots[0]?.thumbnailUrl ?? null)
  const names = course.spots.map((spot) => spot.shortName)
  const title = courseTitle(course.title, names) ?? names[0]
  const nine = course.nineScenicNos ?? []

  return (
    <button
      type="button"
      className={selected ? `${styles.card} ${styles.cardOn}` : styles.card}
      onClick={() => onToggle(course.courseId)}
      aria-pressed={selected}
      data-course={course.courseId}
    >
      <span className={styles.hero}>
        {photo ? (
          <img className={styles.heroImg} src={photo} alt="" onError={() => setBroken(true)} />
        ) : (
          /* 자리그림 SVG 를 쓰지 않습니다 — 그림이 그렇습니다. 0장은 버그가 아니라 사실이라 이유를 적습니다. */
          <span className={styles.noPhoto}>{t('courses.noPhoto')}</span>
        )}
      </span>

      {/* 9경 배지 — hero 아래 경계에 반쯤 걸칩니다. 0곳이면 배지가 없습니다(「0곳」이라 적지 않습니다). */}
      {nine.length > 0 && (
        <span className={styles.badge}>
          {t('courses.nineBadge', { list: nine.map((n) => t('courses.nineNo', { n })).join(' ') })}
        </span>
      )}

      <span className={styles.content}>
        <span className={styles.titleRow}>
          <span className={styles.cardTitle}>{title}</span>
          <Check on={selected} />
        </span>
        <span className={styles.chain}>{names.join(' → ')}</span>
        {/* 소개가 없는 코스는 문단 자체를 그리지 않습니다 — 빈 줄이 남지 않게. */}
        {course.intro && <span className={styles.intro}>{course.intro}</span>}
        <span className={styles.tags}>
          {tagsOf(course).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </span>
      </span>
    </button>
  )
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selected, setSelected] = useState(() => new Set())
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    // 코스와 스팟 목록(사진 · 권역)을 함께 기다립니다. 목록은 실패해도 빈 Map으로 와서 코스를 막지 않습니다.
    // loadSpotPhotos 와 loadSpots 는 같은 /api/pois 캐시를 씁니다 — 호출은 한 번입니다.
    Promise.all([api.courses({ featured: true }), loadSpotPhotos(), loadSpots()])
      .then(([data, photos, pois]) => {
        if (cancelled) return
        const courses = (data.courses ?? []).map((course) => ({
          ...course,
          spots: withPhotos(course.spots, photos),
          regions: regionsOf(course.spots, pois),
        }))
        setResult({ status: 'ready', data: courses, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  const courses = result.data ?? []

  const toggle = (courseId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  // 지도가 고른 코스들을 받아 좌우로 넘겨 보여줍니다. 순서는 누른 순서가 아니라 카드 순서입니다.
  const openMap = () => {
    const ids = courses.filter((c) => selected.has(c.courseId)).map((c) => c.courseId)
    navigate(`/course-map?courses=${ids.join(',')}`)
  }

  return (
    <Screen data-api="GET /api/courses">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack} aria-label={t('common.back')}>
          ‹
        </button>
        <h1 className={styles.title}>{t('courses.title')}</h1>
      </header>

      <div className={styles.scroll}>
        <div className={styles.body}>
          <h2 className={styles.headline}>
            {t('courses.headline1')}
            <br />
            {t('courses.headline2')}
          </h2>

          {/* 출발지 가정과 근거를 숨기지 않습니다 — 모든 시각이 이 위에 있습니다. */}
          <p className={styles.note}>{t('courses.originNote')}</p>

          {result.status === 'error' ? (
            <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
          ) : result.status === 'loading' ? (
            <p className={styles.notice}>{t('courses.loading')}</p>
          ) : courses.length === 0 ? (
            <p className={styles.notice}>{t('courses.empty')}</p>
          ) : (
            <>
              <p className={styles.total}>{t('courses.total', { count: courses.length })}</p>
              <div className={styles.list}>
                {courses.map((course) => (
                  <CourseCard
                    key={course.courseId}
                    course={course}
                    selected={selected.has(course.courseId)}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 하단 고정 바(585:483) — 고른 게 있을 때만. 0개면 비활성 버튼이 아니라 바 자체가 없습니다. */}
      {selected.size > 0 && (
        <div className={styles.bar}>
          <Button onClick={openMap}>{t('courses.selectN', { count: selected.size })}</Button>
        </div>
      )}
    </Screen>
  )
}
