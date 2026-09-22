import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import mongkkuArmRest from '../assets/mongkku-arm-rest.png'
import mongkkuBody from '../assets/mongkku-body.png'
import Button from '../components/Button'
import OptionChip from '../components/OptionChip'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { heroPhotos } from '../lib/courseHero'
import { courseTitle } from '../lib/courseTitle'
import { fitOneLine } from '../lib/fitOneLine'
import { formatDuration, sentenceLines, THEME_LABELS } from '../lib/format'
import { getToken } from '../lib/session'
import { ICON_PATHS } from '../lib/spotIcons'
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
 * 카드는 사진(첫 스팟 사진, 위 카드와 겹치면 다음 스팟 — lib/courseHero) · 배지(2026-09-17 부터 축마다 하나 — 거제시 코스 · 분류 · 9경, 아래 CourseBadge) · 제목 · 스팟 체인 · 소개 ·
 * 태그(버스 시간 · 권역 · 휴일에 버스 없는 구간 — 2026-09-17 배차 · 요일 태그를 뺐습니다, 아래 tagsOf)입니다.
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

/* 칩에 걸 곳 수는 **받은 코스에서 만듭니다**(2026-09-22) — 전에는 [3, 4, 5] 로 박혀 있어서
   여섯 곳 코스(6-01)는 칩이 없어 걸러 볼 수 없었고, 두 곳 코스가 들어오면 또 손으로 고쳐야 했습니다.
   저장해서 뺀 코스의 곳 수도 함께 셉니다 — 저장하는 순간 칩이 사라지면 목록이 들썩입니다
   (0개인 칩은 지우지 않고 비활성으로 남깁니다 — 2026-09-16 사용자 결정). */
function spotCountsOf(courses, hidden) {
  return [...new Set([...courses.map((course) => course.spotCount), ...hidden])]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
}

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
 * 태그 — 버스 시간 · 권역 · (휴일에 버스 없는 구간이 있으면) 그 사실. 권역은 /api/pois 를 못 받으면 빠집니다(빈 태그를 남기지 않게).
 *
 * 배차(「매일 6회」) · 요일(「평일만」 · 「평일·휴일」) 태그는 2026-09-17 뺐습니다(사용자 결정). 둘 다 서버가 「이 순서가 버스로
 * 이어지는가」를 확인하려고 저장한 **편 사슬 하나**에서 나온 값이라, 「평일만」은 사슬이 우연히 탄 한 편이 휴일에 없다는 뜻인데
 * 「휴일엔 못 가는 코스」로 읽혔습니다. 대신 서버가 **구간마다** 휴일에도 다니는 버스가 있는지 보고, 없는 구간이 있을 때만
 * `holidayNoBusLegs` 를 채웁니다. 노선은 코스 상세가 구간마다, 횟수는 스팟 시간표가 말합니다. 필드가 없는 옛 응답이면 태그가 없습니다.
 */
function tagsOf(course) {
  return [
    t('courses.tagBus', { time: formatDuration(course.busMinTotal) }),
    /* 권역 태그를 뺐습니다(2026-09-20) — 바로 위 스팟 체인이 어디를 도는지 이미 말합니다.
       카드에 같은 말이 두 번 있으면 무엇을 보라는 말인지 흐려지고, 카드만 길어집니다. */
    course.holidayNoBusLegs?.length > 0 ? t('courses.tagHolidayNoBus') : null,
  ].filter(Boolean)
}

/**
 * 분류 배지의 분류 하나 — 코스의 **중심 분류**(2026-09-17 저녁 사용자 결정). 스팟 분류(TourAPI contentTypeId → theme)를 세어
 * 가장 많은 분류, 같은 수면 가는 순서에서 먼저 나오는 분류입니다. 분류는 한국관광공사가 정한 값이라 우리가 지은 이야기가 아닙니다(코스재설계 §1-3).
 * 분류가 없거나 라벨이 없는 분류(V29 에서 없어진 CASTLE 등)의 스팟은 세지 않습니다. 셀 스팟이 하나도 없으면 null — 9경 배지로 물러납니다.
 *
 * 전에는 「전망·명소만」 · 「정원·숲 2곳과 전망·명소 1곳」처럼 곳 수까지 적었는데, 사진 위 배지는 숫자 없는 짧은 이름 하나로 갑니다
 * (분류별 곳 수는 카드의 스팟 순서 줄이 이미 보여줍니다). 아이콘도 이 분류의 것이라 이름과 어긋나지 않습니다 —
 * 전에는 배 구간이 있으면 늘 유람선 아이콘이었는데, 이름이 「전망·명소」인데 배가 그려지면 두 가지를 말하게 됩니다.
 */
function centerThemeOf(course) {
  const counts = new Map() // 넣은 순서 = 가는 순서. 정렬이 안정적이라 같은 수면 이 순서가 남습니다.
  for (const spot of course.spots) {
    if (THEME_LABELS[spot.theme]) counts.set(spot.theme, (counts.get(spot.theme) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/**
 * 사진 위 배지 — **축마다 색 하나**(2026-09-17 코스재설계 §5-2 사용자 결정). 어느 축으로 고른 코스인지는 서버가 줍니다(`badgeAxis`).
 *   OFFICIAL  초록 면 + 흰 테 + 흰 원 메달(경로 표식) 「거제시 추천 관광코스」
 *   THEME     어두운 반투명 유리 면 + 분류 아이콘 「전망·명소」(중심 분류 하나 — centerThemeOf)
 *   NINE      밝은 라벨(연한 보라 면 + 보라 테) + 해 메달 「거제 9경」
 * 규칙: 남이 정한 목록(거제시 코스 · 9경)은 원 메달, 우리가 붙인 분류는 아이콘만 — 초록 면 + 흰 메달 = 거제시 코스 · 밝은 라벨 + 보라 메달 = 9경 · 유리 + 아이콘 = 분류(2026-09-17 밤 사용자 결정 — 흰 알약 → 토스식 음영 유리, ◎ 도장 → 해 메달).
 * 경마다 다른 색은 쓰지 않습니다 — 아홉 색은 못 외우고 뜻이 없습니다.
 * **글자에 숫자를 넣지 않습니다**(2026-09-17 저녁 사용자 결정 — *"한눈에 알아보게"*). 사진 위 배지는 2~6자 짧은 이름이 보통이고
 * (에어비앤비 「게스트 선호」 · 비짓제주 「관광지」). 원문 코스 이름 · 몇 곳 중 몇 곳 · 순서를 코스 상세 머리 한 줄로 옮겼다가
 * 2026-09-18 그 줄도 뺐습니다(사용자 — 「너무 번잡해 보인다」).
 *
 * ★ **9경 배지를 다른 축과 같이 그리지 않습니다.** 확정 7개(§5-1)는 전부 9경 스팟을 한 곳 이상 품고 있어서,
 * 같이 그리면 **모든 카드에 9경 색이 다시 올라갑니다** — 「배지가 전부 9경이라 무엇이 다른지 말하지 않는다」(§0)로 되돌아갑니다.
 * 한 카드에 축 색이 둘이면 「색만 봐도 어느 축인지 읽힌다」도 깨집니다(초록 + 보라 카드는 어느 축인가).
 * 9경은 사라지지 않습니다 — 지도 핀의 보라 테두리와 스팟 시트 「거제9경 · N경」이 말합니다.
 *
 * 폴백: `badgeAxis` 가 없는 옛 응답이거나 그 축을 그릴 근거가 없으면(OFFICIAL 인데 officialCourse 가 없거나 코스 이름이 빠짐 ·
 * 겹치는 곳이 0 · THEME 인데 셀 분류가 없음) 9경 배지만 — 서버가 아직 새 필드를 주지 않아도 카드가 비지 않고,
 * 거제시 코스와 겹치는지 확인되지 않은 코스에 「거제시 추천 관광코스」를 달지 않습니다. 9경이 0곳이면 배지가 없습니다.
 */
function CourseBadge({ course }) {
  const oc = course.officialCourse
  if (course.badgeAxis === 'OFFICIAL' && oc?.name && oc.matched > 0) {
    // 흰 메달 초록 알약(2026-09-17 밤) — 9경 배지와 같은 틀에 밝기만 뒤집었습니다. 표식은 **핀 하나**이고 장식이라 숨깁니다.
    // 처음엔 경로(출발 고리 → 점 두 개 → 핀)였는데 22px 원 안에서 자잘해 사용자가 핀만 남기자고 했습니다(같은 밤).
    // 16 격자 가운데: 핀 반지름 4.6 · 구멍 1.8. 뾰족한 끝까지 합친 높이의 가운데가 원 가운데에 오게 위로 조금 올렸습니다.
    return (
      <span className={`${styles.badge} ${styles.badgeOfficial}`}>
        <span className={styles.badgeOfficialMark}>
          <svg className={styles.badgeIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8 1.2a4.6 4.6 0 0 1 4.6 4.6c0 3.4-4.6 8.9-4.6 8.9S3.4 9.2 3.4 5.8A4.6 4.6 0 0 1 8 1.2zm0 2.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span>{t('courses.officialBadge')}</span>
      </span>
    )
  }

  const theme = course.badgeAxis === 'THEME' ? centerThemeOf(course) : null
  if (theme) {
    return (
      <span className={`${styles.badge} ${styles.badgeTheme}`}>
        {/* 분류 칩 · 지도 핀과 같은 패스(lib/spotIcons). 패스가 28 칸의 6~22 안에 있어 그 영역만 잘라 18px 에 넣습니다. */}
        <svg className={styles.badgeIcon} width="18" height="18" viewBox="6 6 16 16" fill="none" aria-hidden="true">
          <path d={ICON_PATHS[theme]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{THEME_LABELS[theme]}</span>
      </span>
    )
  }

  if (!course.nineScenicNos?.length) return null
  // 밝은 라벨 + 해 메달(2026-09-17 밤 1안). 표식은 해 + 물결 두 줄(日本三景 마크를 줄인 모양) — 명승 목록이라 월계관 · 별 같은 「상」 표식을 쓰지 않습니다.
  // 16 격자: 반원 해(면) · 물결 두 줄 같은 위상(선 1.5, 틈 1.9). 물결 쪽 잉크가 무거워 전체를 2 올려 메달 가운데에 맞췄습니다.
  return (
    <span className={`${styles.badge} ${styles.badgeNine}`}>
      <span className={styles.badgeNineMark}>
        <svg className={styles.badgeIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4.6 5.4a3.4 3.4 0 0 1 6.8 0z" fill="currentColor" />
          <path
            d="M2 8.4q1.5-1.5 3 0t3 0t3 0t3 0M2 11.8q1.5-1.5 3 0t3 0t3 0t3 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>{t('nineScenic.stamp')}</span>
    </span>
  )
}

/** 카드 한 장 — 카드 전체가 버튼이고 누르면 고름이 토글됩니다. */
function CourseCard({ course, photoUrl, selected, onToggle }) {
  // 사진은 목록이 정해 넘깁니다(photoUrl — /api/pois 대표 사진, 코스 API는 사진을 주지 않습니다). 링크가 죽으면(onError)
  // 사진이 없을 때와 같은 「사진 없음」 상태로 — 깨진 그림 아이콘을 남기지 않습니다.
  // 죽은 **주소**를 기억합니다: 칩으로 거르면 같은 카드가 자리를 지킨 채 사진 주소만 바뀌는데, 참/거짓으로 두면 새 사진까지 「사진 없음」이 됩니다.
  const [brokenUrl, setBrokenUrl] = useState(null)
  const photo = photoUrl && photoUrl !== brokenUrl ? photoUrl : null
  const names = course.spots.map((spot) => spot.shortName)
  const title = courseTitle(course.title, names) ?? names[0]

  /* 제목은 한 줄로 앉힙니다 — 넘치면 글자만 조금 줄입니다(2026-09-18 사용자: 「자동 개행된 줄이
     가로 절반도 못 채우면 글자 크기를 줄여서라도 한 줄로」). 16px 까지 줄여도 안 되는 긴 제목만 두 줄로 되돌아갑니다.
     글꼴이 늦게 오면 폭이 달라지므로 fonts.ready 뒤에 한 번 더 재고, 화면 폭이 바뀌어도 다시 잽니다. */
  const titleRef = useRef(null)
  useLayoutEffect(() => {
    const fit = () => fitOneLine(titleRef.current, { max: 20, min: 16 })
    fit()
    document.fonts?.ready?.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [title])

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
          /* alt="" — 장식 사진입니다. 카드 버튼의 이름은 제목 · 스팟 체인 글이라, 사진이 어느 스팟 것이든 틀린 말을 하지 않습니다. */
          <img className={styles.heroImg} src={photo} alt="" onError={() => setBrokenUrl(photo)} />
        ) : (
          /* 자리그림 SVG 를 쓰지 않습니다 — 그림이 그렇습니다. 0장은 버그가 아니라 사실이라 이유를 적습니다. */
          <span className={styles.noPhoto}>{t('courses.noPhoto')}</span>
        )}
      </span>

      {/* 배지 — hero 아래 경계에 반쯤 걸칩니다. 축마다 모양 · 색이 다릅니다(CourseBadge). */}
      <CourseBadge course={course} />

      <span className={styles.content}>
        <span className={styles.titleRow}>
          <span ref={titleRef} className={styles.cardTitle}>
            {title}
          </span>
          <Check on={selected} />
        </span>
        <span className={styles.chain}>{names.join(' → ')}</span>
        {/* 소개가 없는 코스는 문단 자체를 그리지 않습니다 — 빈 줄이 남지 않게. */}
        {/* 문장마다 줄을 바꿉니다(2026-09-18 사용자) — 스팟 상세 요약과 같은 규칙(sentenceLines). */}
        {course.intro && <span className={styles.intro}>{sentenceLines(course.intro)}</span>}
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
  const spotCounts = spotCountsOf(courses, result.hidden)
  // 주소 값이 3·4·5 가 아니거나 그 개수 코스가 0개면 「전체」 — 비활성 칩이 골라진 채로 빈 목록을 보이지 않게.
  const wanted = Number(searchParams.get('spots'))
  const spotCount = spotCounts.includes(wanted) && countOf(wanted) > 0 ? wanted : null
  const shown = spotCount ? courses.filter((course) => course.spotCount === spotCount) : courses
  // 칩으로 걸렀으면 그 곳 수에서 뺀 코스만 셉니다 — 4곳 코스를 뺐는데 3곳 목록 아래 「1개는 빼고」라 적지 않게.
  const hiddenCount = spotCount ? result.hidden.filter((n) => n === spotCount).length : result.hidden.length
  // 카드 사진은 **보이는 카드** 순서대로 정합니다 — 칩으로 가려진 카드가 사진을 선점하지 않게(lib/courseHero).
  const photos = heroPhotos(shown)

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
          <ChevronLeft size={24} strokeWidth={2} aria-hidden="true" />
        </button>
        <h1 className={styles.title}>{t('courses.title')}</h1>
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.body}>
          {/* 제목(「거제 9경을 버스로 잇는 대표 코스」)은 2026-09-17에 뺐습니다 — 문장이 어색하고,
              화면 제목(「코스 추천」)과 카드가 이미 같은 말을 하고 있었습니다(사용자 결정). */}

          {/* 성향으로 찾기 입구(2026-09-20 사용자) — 목록을 **대신하지 않고** 옆에 둡니다.
              이미 뭘 볼지 아는 사람에게 질문 셋은 방해라, 목록이 먼저 있고 이 줄은 건너뛸 수 있습니다. */}
          <button type="button" className={styles.quiz} onClick={() => navigate('/course-quiz')}>
            <span className={styles.quizText}>
              <span className={styles.quizTitle}>
                {t('courseQuiz.entry')}
                {/* 제목에 붙은 화살표 — 「누르면 어디로 간다」를 말합니다. 오른쪽 끝 화살표(목록 줄 문법)와 다릅니다. */}
                <ChevronRight className={styles.quizGo} size={20} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className={styles.quizHint}>{t('courseQuiz.entryHint')}</span>
            </span>
            {/* 몽꾸 — 9경을 설명하던 그 캐릭터가 여기서도 권합니다. 장식이라 읽기 도구에서 뺍니다.
                **몸 · 팔 두 장을 겹칩니다**(MascotButton 과 같은 방식) — 몸 그림은 든 팔을 떼어 낸 것이라
                혼자 쓰면 한쪽 팔이 없습니다(2026-09-20 사용자). 여기 몽꾸는 팔을 들지 않으므로 평소 팔만 깝니다. */}
            <span className={styles.quizMascot} aria-hidden="true">
              <img className={styles.quizMascotLayer} src={mongkkuArmRest} alt="" draggable="false" />
              <img className={styles.quizMascotLayer} src={mongkkuBody} alt="" draggable="false" />
            </span>
          </button>

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
              {/* 623:451 — OptionChip 넷. 헤더 아래 붙습니다(카드 한 장이 500px 를 넘어 — 메모 623:520).
                  2026-09-20: 칩 위 설명줄(「코스를 몇 개의 스팟으로…」)을 뺐습니다 — 칩 넷이 이미 같은 말을 하고,
                  그 두 줄 때문에 첫 카드가 화면 40% 아래에서 시작했습니다(실측 y=340). */}
              <div className={styles.chips} role="group" aria-label={t('courses.countAria')} ref={chipsRef}>
                <OptionChip selected={spotCount === null} onClick={() => pickCount(null)}>
                  {t('courses.countAll')}
                </OptionChip>
                {spotCounts.map((n) => (
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
              {/* 출발지 가정과 근거는 숨기지 않습니다 — 모든 시각이 이 위에 서 있습니다(기준문서 §0).
                  다만 카드 위 머리말이 길어 칩 **아래** 한 줄로 내렸습니다(2026-09-20).
                  role="status" — 칩을 누르면 바뀐 코스 수를 읽기 도구가 읽습니다(목록이 제자리에서 바뀌므로). */}
              <p className={styles.total} ref={totalRef} role="status">
                {/* 코스 수는 읽기 도구에만 — 칩을 누르면 바뀐 개수를 말합니다(화면에는 칩과 카드가 이미 답합니다). */}
                <span className={styles.srOnly}>
                  {spotCount
                    ? t('courses.totalN', { n: spotCount, count: shown.length })
                    : t('courses.total', { count: courses.length })}
                </span>
                {t('courses.originNote')}
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
                {shown.map((course, i) => (
                  <CourseCard
                    key={course.courseId}
                    course={course}
                    photoUrl={photos[i]}
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
