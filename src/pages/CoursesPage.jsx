import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import OptionChip from '../components/OptionChip'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { courseTitle } from '../lib/courseTitle'
import { formatDuration } from '../lib/format'
import { getToken } from '../lib/session'
import { loadSpotPhotos, loadSpots, regionsOf, withPhotos } from '../lib/spots'
import styles from './CoursesPage.module.css'

/**
 * 코스 추천 — v3 대표 코스 카드(Figma 02-2 `585:417` 고름 · `585:485` 안 고름 · `582:416` 카드 예시).
 *
 * 2026-09-14 저녁 사용자 결정: 3/4/5곳 칩을 없애고 **대표 코스 10개**를 카드로 보여줍니다.
 * 어느 10개인지는 서버가 정합니다(`featured=true` — 9경 많은 순 · 버스 시간 짧은 순 · 곳 수 · 코드 순).
 * 여기서 다시 고르거나 정렬하지 않습니다 — 코스를 다시 적재해도 화면이 그대로 따라오게.
 *
 * 2026-09-16 **개수 칩(전체 · 3곳 · 4곳 · 5곳)을 되살렸습니다**(팀원 의견 → Figma `623:444` · 메모 `623:520`).
 * 칩은 **대표 코스 10개 안에서** 거릅니다(사용자 결정 A) — 「전체」가 3곳 + 4곳 + 5곳의 합이어야 칩 이름이 맞고,
 * 대표 밖 코스는 제목 · 소개가 없습니다. 서버에 다시 묻지 않고 받은 목록을 화면에서 거릅니다.
 * 저장해서 뺀 코스는 칩 개수에서도 빠지고, 0개인 칩은 지우지 않고 비활성으로 남깁니다.
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

const SPOT_COUNTS = [3, 4, 5]

/* 칩 줄(sticky 띠)의 아래 끝과 상태줄 사이 — 띠 margin-bottom −8 + 본문 gap 16. 칩(40)과 상태줄 사이가 그림처럼 16 이 됩니다.
   CoursesPage.module.css 의 .chips 를 바꾸면 같이 바꿉니다. */
const CHIPS_TO_TOTAL = 8

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
  // 고른 개수는 주소에 둡니다(?spots=3) — 지도에서 뒤로 왔을 때 칩이 제자리에 있어야 합니다.
  const [searchParams, setSearchParams] = useSearchParams()
  const scrollRef = useRef(null)
  const chipsRef = useRef(null)
  const totalRef = useRef(null)
  const [selected, setSelected] = useState(() => new Set())
  // hidden — 이미 저장해서 뺀 코스들의 곳 수(spotCount) 목록. 뺀 이유를 한 줄로 말하려고 두고, 칩으로 거르면 그 곳 수만 셉니다.
  const [result, setResult] = useState({ status: 'loading', data: null, hidden: [], error: '' })

  useEffect(() => {
    let cancelled = false
    /* 이미 저장한 코스는 추천에서 뺍니다(2026-09-15 사용자 요청 — 저장했으면 다시 추천받을 때 안 나와야 한다).
       로그인했을 때만 묻습니다. 저장 목록을 못 받아도(만료 · 서버 장애) 추천은 막지 않습니다 — 그때는 빼지 않고 다 보이고,
       같은 코스를 또 저장하려 하면 서버가 409로 막습니다. */
    const savedIds = getToken()
      ? api
          .savedTrips()
          .then((trips) => new Set((trips ?? []).map((trip) => trip.courseId).filter(Boolean)))
          .catch(() => new Set())
      : Promise.resolve(new Set())
    // 코스와 스팟 목록(사진 · 권역)을 함께 기다립니다. 목록은 실패해도 빈 Map으로 와서 코스를 막지 않습니다.
    // loadSpotPhotos 와 loadSpots 는 같은 /api/pois 캐시를 씁니다 — 호출은 한 번입니다.
    Promise.all([api.courses({ featured: true }), loadSpotPhotos(), loadSpots(), savedIds])
      .then(([data, photos, pois, saved]) => {
        if (cancelled) return
        const all = (data.courses ?? []).map((course) => ({
          ...course,
          spots: withPhotos(course.spots, photos),
          regions: regionsOf(course.spots, pois),
        }))
        const courses = all.filter((course) => !saved.has(course.courseId))
        const hidden = all.filter((course) => saved.has(course.courseId)).map((course) => course.spotCount)
        setResult({ status: 'ready', data: courses, hidden, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, hidden: [], error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* 바로 연 화면이면(앞 기록이 없으면) 홈으로. `location.key === 'default'`로는 가를 수 없습니다 — 칩이 주소를
     replace 로 바꾸면 key 가 바뀌어 바로 연 화면에서도 navigate(-1)이 앱 밖으로 나갑니다(SpotDetailPage 와 같은 함정).
     라우터가 history.state 에 적는 idx 는 replace 로 바뀌지 않습니다. */
  const goBack = () =>
    (window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/', { replace: true })

  const courses = result.data ?? []
  const countOf = (n) => courses.filter((course) => course.spotCount === n).length
  // 주소 값이 3·4·5 가 아니거나 그 개수 코스가 0개면 「전체」 — 비활성 칩이 골라진 채로 빈 목록을 보이지 않게.
  const wanted = Number(searchParams.get('spots'))
  const spotCount = SPOT_COUNTS.includes(wanted) && countOf(wanted) > 0 ? wanted : null
  const shown = spotCount ? courses.filter((course) => course.spotCount === spotCount) : courses
  // 칩으로 걸렀으면 그 곳 수에서 뺀 코스만 셉니다 — 4곳 코스를 뺐는데 3곳 목록 아래 「1개는 빼고」라 적지 않게.
  const hiddenCount = spotCount ? result.hidden.filter((n) => n === spotCount).length : result.hidden.length

  // 칩을 누르면 목록 맨 위로(메모 623:520). 칩 줄은 붙어 있으므로, 상태줄이 칩 줄 아래 제자리 간격에 오게 올립니다.
  // 상태줄이 칩 줄 뒤에 가려 있으면 그만큼 내리고, 이미 그 아래에 보이면 움직이지 않습니다.
  // 데스크톱은 화면 틀에 CSS zoom 이 걸려(lib/frameZoom) 잰 상자만 확대되고 offsetHeight · scrollTop 은 확대 전 값이라,
  // 잰 거리를 확대 배율로 나눠 단위를 맞춥니다(useDragScroll · Tutorial 과 같은 방식).
  const scrollToList = () => {
    const scroller = scrollRef.current
    if (!scroller || !chipsRef.current || !totalRef.current) return
    const box = scroller.getBoundingClientRect()
    const scale = box.height && scroller.clientHeight ? box.height / scroller.clientHeight : 1
    const offset =
      (totalRef.current.getBoundingClientRect().top - box.top) / scale -
      chipsRef.current.offsetHeight -
      CHIPS_TO_TOTAL
    if (offset < 0) scroller.scrollTop += offset
  }

  // 고른 코스는 칩을 바꿔도 그대로입니다 — 3곳 둘 + 5곳 하나를 골라 함께 비교할 수 있습니다.
  const pickCount = (n) => {
    if (n === spotCount) return
    scrollToList()
    setSearchParams(n ? { spots: String(n) } : {}, { replace: true })
  }

  const toggle = (courseId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  // 지도가 고른 코스들을 받아 좌우로 넘겨 보여줍니다. 순서는 누른 순서가 아니라 카드 순서입니다.
  // 칩으로 가려진 카드도 고른 것이면 넘깁니다(courses 는 거르기 전 목록).
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

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.body}>
          {/* 제목(「거제 9경을 버스로 잇는 대표 코스」)은 2026-09-17에 뺐습니다 — 문장이 어색하고,
              화면 제목(「코스 추천」)과 카드가 이미 같은 말을 하고 있었습니다(사용자 결정). */}

          {/* 출발지 가정과 근거를 숨기지 않습니다 — 모든 시각이 이 위에 있습니다. */}
          <p className={styles.note}>{t('courses.originNote')}</p>

          {result.status === 'error' ? (
            <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
          ) : result.status === 'loading' ? (
            <p className={styles.notice}>{t('courses.loading')}</p>
          ) : courses.length === 0 ? (
            result.hidden.length > 0 ? (
              // 추천 코스를 전부 저장했다 — 빈 목록의 이유와 갈 곳을 말합니다.
              <p className={styles.savedNote}>
                <span>{t('courses.allSaved')}</span>
                <button type="button" className={styles.savedLink} onClick={() => navigate('/my')}>
                  {t('courses.goMyPlans')} ›
                </button>
              </p>
            ) : (
              <p className={styles.notice}>{t('courses.empty')}</p>
            )
          ) : (
            <>
              {/* 623:451 — OptionChip 넷. 헤더 아래 붙습니다(카드 한 장이 500px 를 넘어 — 메모 623:520). */}
              <div className={styles.chips} role="group" aria-label={t('courses.countAria')} ref={chipsRef}>
                <OptionChip selected={spotCount === null} onClick={() => pickCount(null)}>
                  {t('courses.countAll')}
                </OptionChip>
                {SPOT_COUNTS.map((n) => (
                  <OptionChip
                    key={n}
                    selected={spotCount === n}
                    disabled={countOf(n) === 0}
                    onClick={() => pickCount(n)}
                  >
                    {t('courses.countN', { n })}
                  </OptionChip>
                ))}
              </div>
              {/* role="status" — 칩을 누르면 바뀐 코스 수를 읽기 도구가 읽습니다(목록이 제자리에서 바뀌므로). */}
              <p className={styles.total} ref={totalRef} role="status">
                {spotCount
                  ? t('courses.totalN', { n: spotCount, count: shown.length })
                  : t('courses.total', { count: courses.length })}
              </p>
              {/* 저장한 코스를 뺐으면 한 줄 — 대표 코스가 이유 없이 줄어 보이지 않게(2026-09-15). */}
              {hiddenCount > 0 && (
                <p className={styles.savedNote}>
                  <span>{t('courses.savedHidden', { count: hiddenCount })}</span>
                  <button type="button" className={styles.savedLink} onClick={() => navigate('/my')}>
                    {t('courses.goMyPlans')} ›
                  </button>
                </p>
              )}
              <div className={styles.list}>
                {shown.map((course) => (
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
