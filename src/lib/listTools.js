/**
 * 목록 거르기·정렬 — 스팟 탭과 시간표 탭이 함께 씁니다(2026-09-17 사용자 결정).
 *
 * 순수 함수로 떼어 둔 이유: 두 화면이 같은 규칙을 써야 하고, 규칙 자체를 테스트로 못 박기 위해서입니다.
 *
 * 찾기는 **이름 · 권역 · 분류**를 봅니다. 「몽돌」로 학동몽돌해변이, 「남부」로 남부권 스팟이 나옵니다.
 * 띄어쓰기는 지우고 견줍니다 — 「바람의 언덕」이라고 띄어 써도 「바람의언덕」이 나와야 합니다.
 *
 * 정렬은 셋입니다.
 *   default  서버 순서 그대로. 9경과 대표 스팟이 앞에 옵니다 — 처음 온 사람에게 가장 좋은 순서입니다
 *   name     가나다순(localeCompare 'ko')
 *   region   권역 먼저, 같은 권역 안에서는 가나다순 — 「오늘은 남부만 돈다」 같은 계획에 맞습니다
 *
 * 「최신순」은 두지 않습니다. 스팟은 고정된 19곳이라 새로 들어오는 것이 없어 뜻을 갖지 않습니다.
 */

/** 화면에 쓰는 이름(shortName)이 있으면 그것, 없으면 정식 이름. */
const displayName = (spot) => spot.shortName ?? spot.name ?? ''

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
  }
  return out
}
