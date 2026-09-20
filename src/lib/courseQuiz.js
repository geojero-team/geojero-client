import { t } from '../i18n'
import { formatDuration, THEME_LABELS } from './format'

/**
 * 성향으로 코스 찾기 — 질문 셋에 답하면 33개 코스 중 가장 맞는 것을 고릅니다(2026-09-20 사용자).
 *
 * 코스를 **새로 엮지 않습니다.** 이미 있는 코스 중에서 고르기만 합니다 — 새로 엮으려면 환승 없는 직행 · 시간표 · 배편을
 * 다시 계산해야 하는데 그건 서버가 코스를 적재할 때 이미 끝낸 일입니다.
 *
 * 거르기(필터)가 아니라 **점수**입니다. 정원·숲은 33개 코스를 통틀어 다섯 자리, 배는 한 코스(3-11)뿐이라
 * 거르기로 짜면 「정원 + 이동 짧게 + 9경 위주」 같은 조합에서 결과가 0개가 됩니다. 점수면 가장 가까운 것이 남습니다.
 *
 * 질문은 **실제로 코스가 갈리는 축**만 씁니다(2026-09-20 API 실측 — 코스 33개):
 *   분류    전시·체험 44곳 · 전망 33 · 바다 19 · 역사 19 · 정원 5 · 유람선 2
 *   시간    총 360~780분 · 버스 105~256분
 *   9경     0~4곳 · 곳 수 3~6곳
 * 실내 전시·체험은 거의 모든 코스에 있어 Q1(무엇을 보고 싶은지)에 두면 변별이 없습니다 — Q3 「비 와도 괜찮은 실내」로 옮겼습니다.
 *
 * 점수만 주고 끝내지 않고 **왜 이 코스인지**를 같이 만듭니다(reasons) — 사용자가 매력적이라고 한 부분입니다.
 * 이유는 전부 서버 값 그대로입니다. 「바다 2곳 · 버스 약 1시간 57분」처럼, 화면에서 지어낸 수치가 없습니다(절대규칙 1).
 */

/**
 * 답 하나가 코스에 주는 점수와 이유. 맞지 않으면 null(이유를 만들지 않습니다 — 안 맞는 코스에 근거를 붙이지 않게).
 *
 * **어긋나면 깎습니다**(2026-09-20 실측으로 더함). 0점만 주면 다른 축 점수에 묻혀, 「여유롭게 세 곳」을 고른 사람에게
 * 여섯 곳짜리 코스가 1등으로 나왔습니다. 답과 정면으로 반대인 코스는 아래로 내려야 답을 물은 뜻이 섭니다.
 * 깎은 자리에는 이유를 만들지 않습니다(reason 없이 points 만 음수).
 */
const SCORERS = {
  /* Q1 — 분류. 같은 분류가 둘이면 확실한 취향이라 더 주고, 셋째부터는 더 주지 않습니다(한 분류로만 채운 코스가
     다른 축을 다 이기지 않게). */
  scene: {
    BEACH: themeScorer('BEACH'),
    VIEW: themeScorer('VIEW'),
    HISTORY: themeScorer('HISTORY'),
    GARDEN: themeScorer('GARDEN'),
  },
  /* Q2 — 하루를 어떻게. 곳 수 · 총 시간 · 버스 시간은 서로 다른 축이라 답마다 보는 값이 다릅니다. */
  pace: {
    easy: (p) => {
      if (p.spotCount >= 5) return { points: -4 } // 다섯 곳 넘게 도는 하루는 여유가 아닙니다
      if (p.spotCount > 3) return null
      return { points: p.totalMin <= 480 ? 6 : 4, reason: t('courseQuiz.reason.easy', { n: p.spotCount, time: formatDuration(p.totalMin) }) }
    },
    full: (p) =>
      p.spotCount >= 4
        ? { points: 4 + Math.min(p.spotCount - 4, 2), reason: t('courseQuiz.reason.full', { n: p.spotCount }) }
        : { points: -3 },
    short: (p) => {
      if (p.busMin > 210) return { points: -3 }
      if (p.busMin > 180) return null
      return { points: p.busMin <= 150 ? 6 : 3, reason: t('courseQuiz.reason.short', { time: formatDuration(p.busMin) }) }
    },
  },
  /* Q3 — 취향. 9경 쪽 둘은 서로 반대라 한쪽이 주는 점수를 다른 쪽은 깎습니다. */
  taste: {
    nine: (p) =>
      p.nineCount > 0
        ? { points: Math.min(2 * p.nineCount, 8), reason: t('courseQuiz.reason.nine', { n: p.nineCount }) }
        : { points: -2 },
    /* 9경이 **몇 곳인지**만 봅니다. 「9경이 아닌 곳 N곳」으로 세면 스팟이 많은 코스가 저절로 유리해져
       여섯 곳짜리 코스가 「한적한 코스」로 뽑혔습니다(2026-09-20 실측). */
    hidden: (p) => {
      if (p.nineCount >= 3) return { points: -3 }
      if (p.nineCount === 2) return null
      return {
        points: p.nineCount === 0 ? 6 : 4,
        reason: p.nineCount === 0 ? t('courseQuiz.reason.hiddenNone') : t('courseQuiz.reason.hiddenOne'),
      }
    },
    ferry: (p) =>
      p.ferryMin > 0
        ? { points: 8, reason: t('courseQuiz.reason.ferry', { time: formatDuration(p.ferryMin) }) }
        : null,
    indoor: (p) =>
      p.themes.EXHIBIT > 0
        ? { points: 2 * Math.min(p.themes.EXHIBIT, 3), reason: t('courseQuiz.reason.indoor', { n: p.themes.EXHIBIT }) }
        : { points: -2 },
  },
}

function themeScorer(theme) {
  return (p) => {
    const n = p.themes[theme] ?? 0
    if (n === 0) return null
    return { points: 3 * Math.min(n, 2), reason: t('courseQuiz.reason.theme', { label: THEME_LABELS[theme], n }) }
  }
}

/**
 * 질문 셋 — 선지 문구는 i18n, 점수는 위 SCORERS. 화면은 이 목록만 보고 그립니다(질문을 늘려도 화면은 그대로).
 * 괄호 안은 2026-09-20 실측으로 그 선지가 점수를 줄 수 있는 코스 수입니다 — 0개가 되는 선지를 만들지 않으려고 적어 둡니다.
 */
export const QUESTIONS = [
  { id: 'scene', options: ['BEACH', 'VIEW', 'HISTORY', 'GARDEN'], hint: true }, // 19 · 33 · 19 · 5곳
  /* 2번 질문만 설명 줄이 없습니다(2026-09-20 사용자) — 「여유롭게 세 곳」이 이미 다 말합니다.
     문구가 없는 키를 t() 로 부르면 키 이름이 그대로 화면에 나오므로 여기서 있고 없음을 정합니다. */
  { id: 'pace', options: ['easy', 'full', 'short'], hint: false }, // 16 · 17 · 11개 코스
  { id: 'taste', options: ['nine', 'hidden', 'ferry', 'indoor'], hint: true }, // 5 · 13 · 1 · 20개 코스
]

/** 코스 하나의 성격 — 점수 계산이 보는 값 전부. 서버 응답에서 바로 셉니다(사람이 붙인 라벨이 없습니다). */
export function profileOf(course) {
  const themes = {}
  for (const spot of course.spots ?? []) {
    if (spot.theme) themes[spot.theme] = (themes[spot.theme] ?? 0) + 1
  }
  return {
    themes,
    spotCount: course.spotCount ?? course.spots?.length ?? 0,
    totalMin: course.approxTotalMin ?? 0,
    busMin: course.busMinTotal ?? 0,
    ferryMin: course.ferryMinTotal ?? 0,
    nineCount: course.nineScenicCount ?? course.nineScenicNos?.length ?? 0,
  }
}

/**
 * 추천 후보 — **제목과 소개가 있는 코스만**입니다. 대표 10개 밖의 코스는 문구가 비어 있는 것이 있어
 * 카드로 그리면 제목 없는 칸이 됩니다. 문구가 채워지면 후보가 저절로 늘어납니다.
 */
export function quizPool(courses) {
  return (courses ?? []).filter((course) => course.title && course.intro)
}

/**
 * 점수 매기기 — 답한 질문만 셉니다(아직 안 답한 질문은 0점).
 *
 * 동점이면 대표 코스(featuredRank) → 버스가 짧은 것 → 코드 순입니다. 무작위로 고르지 않습니다 —
 * 같은 답에 늘 같은 코스가 나와야 「왜 이게 나왔지」를 설명할 수 있습니다.
 */
export function rankCourses(courses, answers) {
  const scored = quizPool(courses).map((course) => {
    const profile = profileOf(course)
    const reasons = []
    let score = 0
    let sceneHit = false
    for (const { id, options } of QUESTIONS) {
      const picked = answers[id]
      if (!picked || !options.includes(picked)) continue
      const hit = SCORERS[id][picked](profile)
      if (!hit) continue
      if (id === 'scene') sceneHit = true
      score += hit.points
      // 깎은 자리(reason 없음)는 이유로 적지 않습니다 — 「왜 이 코스인지」에 감점을 쓸 수 없습니다.
      if (hit.reason) reasons.push(hit.reason)
    }
    return { course, score, reasons, sceneHit }
  })

  /* 고른 풍경이 **있는** 코스가 먼저입니다(2026-09-20 실측으로 고침). 점수만 더하면 「바다·해변 → 여유롭게 세 곳 →
     덜 붐비는 곳」에 바다가 한 곳도 없는 코스가 1등이 됐습니다 — 뒤 두 답의 점수가 앞 답을 덮었습니다.
     무엇을 보고 싶은지 묻고서 무시하면 안 됩니다. 그 풍경이 있는 코스들 안에서 나머지 답이 순위를 가립니다. */
  return scored.sort(
    (a, b) =>
      Number(b.sceneHit) - Number(a.sceneHit) ||
      b.score - a.score ||
      (a.course.featuredRank ?? 99) - (b.course.featuredRank ?? 99) ||
      (a.course.busMinTotal ?? 0) - (b.course.busMinTotal ?? 0) ||
      a.course.courseCode.localeCompare(b.course.courseCode),
  )
}
