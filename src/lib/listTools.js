/**
 * 목록 거르기·정렬 — 스팟 탭과 시간표 탭이 함께 씁니다(2026-09-17 사용자 결정).
 *
 * 순수 함수로 떼어 둔 이유: 두 화면이 같은 규칙을 써야 하고, 규칙 자체를 테스트로 못 박기 위해서입니다.
 *
 * 찾기는 **이름 · 권역 · 분류**를 봅니다. 「몽돌」로 학동몽돌해변이, 「남부」로 남부권 스팟이 나옵니다.
 * 띄어쓰기는 지우고 견줍니다 — 「바람의 언덕」이라고 띄어 써도 「바람의언덕」이 나와야 합니다.
 *
 * 정렬은 셋입니다.
 *   default  「추천순」 — 하트 많은 순(likeCount ↓). 같으면 거제 9경 번호 순(nineScenicNo ↑ · 9경이 아닌 곳은 뒤) →
 *            대표 코스 10개에 든 횟수 순(featuredCourseCount ↓) → 가나다. 2026-09-21 사용자 결정(전에는 서버 순서 그대로였습니다).
 *            셋 다 서버 값이라 화면이 만드는 수가 없고, 필드가 없는 옛 응답은 0 · 9경 아님으로 보아 가나다로 떨어집니다
 *   name     가나다순(localeCompare 'ko')
 *   region   권역 먼저, 같은 권역 안에서는 가나다순 — 「오늘은 남부만 돈다」 같은 계획에 맞습니다
 *
 * 「최신순」은 두지 않습니다. 스팟은 고정된 19곳이라 새로 들어오는 것이 없어 뜻을 갖지 않습니다.
 */

/** 화면에 쓰는 이름(shortName)이 있으면 그것, 없으면 정식 이름. */
const displayName = (spot) => spot.shortName ?? spot.name ?? ''

/* 9경 번호는 1~9 입니다. 9경이 아닌 곳은 전부 이 값으로 그 뒤에 섭니다. */
const NINE_SCENIC_LAST = 99

/** 「추천순」 — 머리 주석의 네 규칙을 차례로. 앞 규칙이 0(같음)일 때만 다음 규칙으로 넘어갑니다. */
const byRecommended = (a, b) =>
  (b.likeCount ?? 0) - (a.likeCount ?? 0) ||
  (a.nineScenicNo ?? NINE_SCENIC_LAST) - (b.nineScenicNo ?? NINE_SCENIC_LAST) ||
  (b.featuredCourseCount ?? 0) - (a.featuredCourseCount ?? 0) ||
  displayName(a).localeCompare(displayName(b), 'ko')

const squeeze = (text) => (text ?? '').replace(/\s+/g, '').toLowerCase()

function matches(spot, needle) {
  return [displayName(spot), spot.name, spot.region, spot.category]
    .map(squeeze)
    .some((field) => field.includes(needle))
}

/**
 * @param spots 서버가 준 순서 그대로의 배열
 * @param query 찾는 글자(빈 문자열이면 거르지 않음)
 * @param sort  'default' | 'name' | 'region'
 * @returns 새 배열 — 원본을 건드리지 않습니다
 */
export function filterAndSort(spots, { query = '', sort = 'default' } = {}) {
  const needle = squeeze(query)
  const out = needle === '' ? [...spots] : spots.filter((spot) => matches(spot, needle))

  if (sort === 'name') {
    out.sort((a, b) => displayName(a).localeCompare(displayName(b), 'ko'))
  } else if (sort === 'region') {
    out.sort(
      (a, b) =>
        (a.region ?? '').localeCompare(b.region ?? '', 'ko') ||
        displayName(a).localeCompare(displayName(b), 'ko'),
    )
  } else {
    out.sort(byRecommended)
  }
  return out
}
