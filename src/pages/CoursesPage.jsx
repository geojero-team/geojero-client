import { Fragment, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import { loadSpotPhotos, withPhotos } from '../lib/spotPhotos'
import styles from './CoursesPage.module.css'

/**
 * 코스 추천 — Figma 02-2 `446:559`(고른 상태) / `451:184`(아직 안 고름 · 버튼 비활성).
 *
 * 판정을 뺀 뒤(2026-09-12) 흐름이 뒤집혔습니다. 전에는 사용자가 **스팟을 골라** 오면
 * 성립을 판정했고(PlanPage), 지금은 **개수만 고르면** 우리가 짠 코스를 보여줍니다.
 * 그래서 여기에는 조건(출발지·시각)이 없습니다 — 모든 코스가 고현터미널 11시 출발이고
 * 그 사실을 화면에 적습니다.
 *
 * 코스를 **여러 개** 고를 수 있습니다. 고른 것들은 지도에서 좌우로 넘겨 비교하고
 * 거기서 하나를 선택합니다 — 여기서의 다중 선택은 '찜'이 아니라 '비교 대상 추림'입니다.
 * (그래서 Figma의 「코스 저장」 버튼을 뺐습니다. 저장은 코스 상세 한 곳으로 모았습니다 —
 * 저장 계약이 코스 하나 + 날짜를 요구하는데 이 화면엔 둘 다 없습니다.)
 */

const SPOT_COUNTS = [3, 4, 5]

/** 카드 한 장 — 코스 번호 · 9경 수 · 체크 · 스팟 썸네일 줄 */
function CourseCard({ course, index, selected, onToggle }) {
  return (
    <button
      type="button"
      className={selected ? `${styles.card} ${styles.cardOn}` : styles.card}
      onClick={() => onToggle(course.courseId)}
      aria-pressed={selected}
    >
      <div className={styles.cardRow}>
        <span className={styles.cardTitle}>{t('courses.cardTitle', { n: index + 1 })}</span>
        {course.nineScenicCount > 0 && (
          <span className={styles.tag}>
            {t('courses.nineScenic', { count: course.nineScenicCount })}
          </span>
        )}
        <span className={styles.spacer} />
        <span className={selected ? `${styles.check} ${styles.checkOn}` : styles.check} aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      </div>

      {/* 4·5곳은 화살표를 뺍니다 — 350px 안에 다 못 들어가고, 순서는 번호 배지가 이미 말합니다.
          화살표를 남기고 가로 스크롤에 맡기면 4·5번째 스팟이 **가려져** 코스를 구별할 수
          없습니다(5-01과 5-07은 4번째만 다릅니다). 가려진 정보는 없는 정보와 같습니다. */}
      <div className={styles.order} data-count={course.spots.length}>
        {course.spots.map((spot, i) => (
          <Fragment key={spot.poiId}>
            {i > 0 && course.spots.length <= 3 && (
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            )}
            <span className={styles.stop}>
              <span className={styles.thumb}>
                <img
                  className={styles.thumbImg}
                  src={courseImage(spot)}
                  alt=""
                  onError={onImageError(spot)}
                />
                <span className={styles.num}>{i + 1}</span>
              </span>
              <span className={styles.stopName}>{spot.shortName}</span>
            </span>
          </Fragment>
        ))}
      </div>

      <div className={styles.cardFoot}>
        {course.departAt} → {course.returnAt} · {course.approxTotalText}
      </div>
    </button>
  )
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // 고른 개수는 주소에 둡니다 — 뒤로 왔을 때 칩이 제자리에 있어야 합니다.
  const spotCount = Number(searchParams.get('spots')) || 3
  const [selected, setSelected] = useState(() => new Set())
  // forCount = 이 응답이 **어느 칩**의 것인가. 칩을 바꾼 직후에는 아직 이전 개수의 응답을
  // 들고 있어서, 그걸 그대로 보여주면 3곳 칩에 5곳 코스가 잠깐 뜹니다.
  const [result, setResult] = useState({ status: 'loading', data: null, error: '', forCount: null })

  useEffect(() => {
    let cancelled = false
    // 코스와 사진을 함께 기다립니다. 사진은 실패해도 빈 Map으로 와서 코스를 막지 않습니다.
    Promise.all([api.courses(spotCount), loadSpotPhotos()])
      .then(([data, photos]) => {
        if (cancelled) return
        const courses = (data.courses ?? []).map((course) => ({
          ...course,
          spots: withPhotos(course.spots, photos),
        }))
        setResult({
          status: 'ready',
          data: { ...data, courses },
          error: '',
          forCount: spotCount,
        })
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({ status: 'error', data: null, error: error.message, forCount: spotCount })
        }
      })
    return () => {
      cancelled = true
    }
  }, [spotCount])

  const status = result.forCount === spotCount ? result.status : 'loading'

  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  const courses = status === 'ready' ? (result.data?.courses ?? []) : []
  const counts = result.data?.counts ?? {}

  // 칩을 바꾸면 고른 것을 비웁니다 — 3곳 코스와 5곳 코스를 섞어 비교할 화면이 없습니다.
  const pickCount = (n) => {
    if (n === spotCount) return
    setSelected(new Set())
    setSearchParams({ spots: String(n) }, { replace: true })
  }

  const toggle = (courseId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  // 지도가 고른 코스들을 받아 좌우로 넘겨 보여줍니다.
  const openMap = () => {
    if (selected.size === 0) return
    const ids = courses.filter((c) => selected.has(c.courseId)).map((c) => c.courseId)
    navigate(`/map?courses=${ids.join(',')}`)
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
            <br />
            {t('courses.headline3')}
          </h2>

          {/* 출발지를 고정했다는 사실을 숨기지 않습니다 — 모든 시각이 이 가정 위에 있습니다. */}
          <p className={styles.note}>{t('courses.originNote')}</p>

          <div className={styles.chips} role="group">
            {SPOT_COUNTS.map((n) => {
              // 코스가 0개인 칩도 **보여주고** 비활성합니다. 숨기면 왜 없는지 알 수 없습니다.
              const empty = status === 'ready' && counts[String(n)] === 0
              return (
                <button
                  key={n}
                  type="button"
                  className={n === spotCount ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                  onClick={() => pickCount(n)}
                  aria-pressed={n === spotCount}
                  aria-label={empty ? t('courses.chipDisabled', { n }) : undefined}
                  data-empty={empty ? 'true' : undefined}
                >
                  {t('courses.countChip', { n })}
                </button>
              )
            })}
          </div>

          {status === 'ready' && courses.length > 0 && (
            <p className={styles.total}>{t('courses.total', { count: courses.length })}</p>
          )}

          {status === 'error' ? (
            <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
          ) : status === 'loading' ? (
            <p className={styles.notice}>{t('courses.loading')}</p>
          ) : courses.length === 0 ? (
            /* 빈 칩의 이유를 밝힙니다. 지도앱이 8.17 운휴를 '이유 없는 빈칸'으로 표시한 것이
               이 서비스가 지적하는 문제라, 같은 빈칸을 우리가 내보내면 명제가 무너집니다. */
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{t('courses.emptyTitle', { n: spotCount })}</p>
              <p className={styles.emptyText}>{t('courses.emptyFerry')}</p>
            </div>
          ) : (
            courses.map((course, index) => (
              <CourseCard
                key={course.courseId}
                course={course}
                index={index}
                selected={selected.has(course.courseId)}
                onToggle={toggle}
              />
            ))
          )}

          {courses.length > 1 && <p className={styles.caption}>{t('courses.multiHint')}</p>}

          <div className={styles.actions}>
            <Button onClick={openMap} disabled={selected.size === 0}>
              {selected.size > 1
                ? t('courses.selectN', { count: selected.size })
                : t('courses.select')}
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  )
}
