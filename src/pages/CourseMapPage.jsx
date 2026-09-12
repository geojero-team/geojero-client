import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import { loadSpotPhotos, withPhotos } from '../lib/spots'
import styles from './CourseMapPage.module.css'

/**
 * 지도 — 고른 코스 (Figma 02-2 `446:717` / `446:823`).
 *
 * 코스 추천에서 고른 것들을 지도에 얹고 **좌우로 넘겨 비교**합니다. 여기서 하나를
 * 선택하면 코스 상세로 갑니다 — 코스 추천의 다중 선택은 '찜'이 아니라 여기서 비교할
 * 대상을 추리는 것이었습니다.
 *
 * MapView는 `spotId`로 핀을 식별하므로 poiId를 그 자리에 맞춰 넘깁니다.
 */

/** 지도 위에 코스 카드 스트립이 얹히므로 그만큼 위쪽을 비워 핀이 가려지지 않게 합니다. */
const TOP_RESERVED = 16

export default function CourseMapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const idsParam = searchParams.get('courses') ?? ''
  const ids = useMemo(
    () => idsParam.split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0),
    [idsParam],
  )

  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  const [activeId, setActiveId] = useState(null)
  const [selectedSpotId, setSelectedSpotId] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.courses(), loadSpotPhotos()])
      .then(([data, photos]) => {
        if (cancelled) return
        const picked = (data.courses ?? [])
          .filter((course) => ids.includes(course.courseId))
          .map((course) => ({ ...course, spots: withPhotos(course.spots, photos) }))
        setResult({ status: 'ready', data: picked, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [ids])

  const courses = result.data ?? []
  const active = courses.find((c) => c.courseId === activeId) ?? courses[0] ?? null

  // MapView는 `spotId`로 핀을 식별합니다. 우리 데이터의 poiId를 그 자리에 넣습니다.
  const spots = useMemo(
    () => (active?.spots ?? []).map((spot) => ({ ...spot, spotId: spot.poiId })),
    [active],
  )

  // 핀 위 순번(①②③) — 코스의 방문 순서입니다.
  const orderBySpotId = useMemo(
    () => new Map((active?.spots ?? []).map((spot) => [spot.poiId, spot.seq])),
    [active],
  )

  // 코스 선을 그립니다. 좌표가 없는 스팟은 빼고, 두 곳 이상 남을 때만 선이 됩니다.
  const routePath = useMemo(() => {
    const ordered = (active?.spots ?? []).filter((s) => s.lat != null && s.lng != null)
    return ordered.length >= 2 ? ordered.map(({ lat, lng }) => ({ lat, lng })) : null
  }, [active])

  const openDetail = () => {
    if (!active) return
    const no = courses.findIndex((c) => c.courseId === active.courseId) + 1
    navigate(`/courses/${active.courseId}?no=${no}`)
  }

  return (
    <Screen data-api="GET /api/courses">
      <div className={styles.mapArea}>
        <MapView
          spots={spots}
          selectedSpotId={selectedSpotId}
          onSelectSpot={setSelectedSpotId}
          onDeselect={() => setSelectedSpotId(null)}
          routePath={routePath}
          orderBySpotId={orderBySpotId}
          topReserved={TOP_RESERVED}
        />

        {/* 몇 곳 코스를 몇 개 고르고 있는지(446:719 condition-pill) */}
        {active && (
          <div className={styles.pill}>
            {t('courseMap.pill', { count: active.spotCount, picked: courses.length })}
          </div>
        )}
      </div>

      {/* 코스 카드 스트립 — 좌우로 넘겨 비교하고 하나를 선택합니다. */}
      <div className={styles.sheet}>
        {result.status === 'error' ? (
          <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
        ) : courses.length === 0 ? (
          <p className={styles.notice}>{t('courseMap.none')}</p>
        ) : (
          <>
            <div className={styles.strip}>
              {courses.map((course, index) => {
                const on = course.courseId === active?.courseId
                return (
                  <button
                    key={course.courseId}
                    type="button"
                    className={on ? `${styles.card} ${styles.cardOn}` : styles.card}
                    onClick={() => setActiveId(course.courseId)}
                    aria-pressed={on}
                  >
                    <span className={styles.cardHead}>
                      <span className={styles.cardTitle}>
                        {t('courses.cardTitle', { n: index + 1 })}
                      </span>
                      <span className={styles.cardTime}>{course.approxTotalText}</span>
                    </span>
                    <span className={styles.order}>
                      {course.spots.map((spot, i) => (
                        <Fragment key={spot.poiId}>
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
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={styles.actions}>
              <Button onClick={openDetail} disabled={!active}>
                {t('courseMap.select')}
              </Button>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </Screen>
  )
}
