import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import SpotSheet from '../components/SpotSheet'
import { PEEK_HEIGHT } from '../components/spotSheetHeight'
import { t } from '../i18n'
import { api } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import { formatDuration } from '../lib/format'
import { loadSpotPhotos, loadVisibleSpots, withPhotos } from '../lib/spots'
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

/** 지도 위에 얹히는 것(왼쪽 위 뒤로가기 버튼)만큼 위쪽을 비워 핀 이름표가 가려지지 않게 합니다.
    16(여백) + 36(버튼) + 12(틈) = 64. 버튼 크기나 자리를 바꾸면 이 값도 같이 바꿉니다. */
const TOP_RESERVED = 64

export default function CourseMapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const idsParam = searchParams.get('courses') ?? ''
  const ids = useMemo(
    () => idsParam.split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0),
    [idsParam],
  )

  const [result, setResult] = useState({ status: 'loading', data: null, all: [], error: '' })
  const [activeId, setActiveId] = useState(null)
  // 핀을 누른 스팟. 홈과 같은 동작입니다 — 화면을 옮기지 않고 시트만 올립니다.
  const [picked, setPicked] = useState(null)
  /* 시트를 끝까지 올려 스팟 상세를 보는 중인지. 그동안은 아래 코스 카드를 감춥니다
     (2026-09-18 사용자) — 지금 하는 일은 이 스팟을 읽는 것이고, 상세를 닫으면 카드가 그대로 돌아옵니다. */
  const [sheetFull, setSheetFull] = useState(false)

  useEffect(() => {
    let cancelled = false
    // loadVisibleSpots·loadSpotPhotos는 같은 `/api/pois` 캐시를 씁니다 — 호출은 한 번입니다.
    Promise.all([api.courses(), loadSpotPhotos(), loadVisibleSpots()])
      .then(([data, photos, all]) => {
        if (cancelled) return
        // 이름이 `picked`였는데 핀으로 고른 스팟 상태와 겹쳐서 바꿨습니다.
        const pickedCourses = (data.courses ?? [])
          .filter((course) => ids.includes(course.courseId))
          .map((course) => ({ ...course, spots: withPhotos(course.spots, photos) }))
        setResult({ status: 'ready', data: pickedCourses, all, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, all: [], error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [ids])

  const courses = result.data ?? []
  const active = courses.find((c) => c.courseId === activeId) ?? courses[0] ?? null

  /* 핀은 **17곳 전부** 찍습니다. 코스가 떴다고 나머지 스팟이 사라지면, 근처에 뭐가 더
     있는지 볼 수 없어 코스를 고를 근거가 줄어듭니다. 코스에 든 곳은 번호 정류소 마커로,
     나머지는 사진 마커로 나뉩니다(orderBySpotId가 그 구분을 만듭니다).
     MapView는 `spotId`로 핀을 식별하므로 poiId를 그 자리에 넣습니다. */
  const spots = useMemo(() => {
    const byId = new Map((result.all ?? []).map((spot) => [spot.poiId, spot]))
    /* 코스 스팟에 목록 값을 덮어 씌웁니다. `/api/courses`의 spots 는 seq·shortName·theme·
       좌표만 주고 **region·category 를 주지 않습니다** — 그대로 시트에 넘기면 peek 이
       `· ` 만 적힌 빈칸이 됩니다(라이브에서 그렇게 나갔습니다). 코스 쪽 값이 이깁니다. */
    const course = (active?.spots ?? []).map((spot) => ({ ...byId.get(spot.poiId), ...spot }))
    const inCourse = new Set(course.map((spot) => spot.poiId))
    const rest = (result.all ?? []).filter((spot) => !inCourse.has(spot.poiId))
    return [...course, ...rest].map((spot) => ({ ...spot, spotId: spot.poiId }))
  }, [active, result.all])

  // 화면은 코스에만 맞춥니다 — 17곳에 맞추면 섬 전체로 밀려나 코스가 안 읽힙니다.
  const fitSpots = useMemo(
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

  /* 뒤로가기 — 바로 연 주소(공유 링크)면 기록이 없어 navigate(-1)이 앱 밖으로 나갑니다.
     그때는 코스 추천으로 보냅니다(CoursesPage.goBack 과 같은 방법). */
  const goBack = () =>
    (window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/courses', { replace: true })

  const openDetail = () => {
    if (!active) return
    const no = courses.findIndex((c) => c.courseId === active.courseId) + 1
    navigate(`/courses/${active.courseId}?no=${no}`)
  }

  return (
    <Screen data-api="GET /api/courses">
      <div className={styles.mapArea}>
        {/* 핀을 누르면 스팟 시트가 올라옵니다(홈과 같은 동작). 코스를 비교하던 중에
            "이게 뭐지"를 확인하려고 화면을 떠나면, 돌아왔을 때 고른 코스가 풀립니다. */}
        <div className={styles.mapWrap} style={{ bottom: picked ? PEEK_HEIGHT : 0 }}>
          <MapView
            spots={spots}
            fitSpots={fitSpots}
            selectedSpotId={picked?.poiId ?? null}
            onSelectSpot={setPicked}
            onDeselect={() => setPicked(null)}
            routePath={routePath}
            orderBySpotId={orderBySpotId}
            topReserved={TOP_RESERVED}
          />
        </div>

        {/* 뒤로가기 — 지도 위 왼쪽 위(2026-09-19 사용자: 이 화면에 뒤로가기가 없었습니다).
            머리말 띠 대신 떠 있는 원형 버튼입니다 — 띠를 두면 그 높이만큼 지도가 줄어듭니다. */}
        <button type="button" className={styles.back} onClick={goBack} aria-label={t('common.back')}>
          ‹
        </button>

        <SpotSheet
          key={picked?.poiId ?? 'none'}
          spot={picked}
          onClose={() => setPicked(null)}
          onFullChange={setSheetFull}
        />
      </div>

      {/* 코스 카드 스트립 — 좌우로 넘겨 비교하고 하나를 선택합니다.
          스팟 상세를 펼친 동안에는 감춥니다(지우지 않습니다 — 닫으면 고르던 코스가 그대로 있어야 합니다). */}
      <div className={sheetFull ? `${styles.sheet} ${styles.sheetHidden}` : styles.sheet}>
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
                      {/* 경과 시간(약 8시간 30분)이 아니라 버스 이동시간의 합입니다 — 위 CoursesPage 주석 참고 */}
                      <span className={styles.cardTime}>
                        {t('courseMap.busTotal', { time: formatDuration(course.busMinTotal) })}
                      </span>
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
