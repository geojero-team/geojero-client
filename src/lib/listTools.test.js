import { describe, expect, it } from 'vitest'
import { filterAndSort } from './listTools'

const SPOTS = [
  { poiId: 1, shortName: '바람의언덕', name: '바람의언덕', region: '남부권', category: '언덕·전망' },
  { poiId: 6, shortName: '매미성', name: '매미성', region: '북부권', category: '성' },
  { poiId: 4, shortName: '학동몽돌해변', name: '학동흑진주몽돌해변', region: '남부권', category: '해수욕장' },
  { poiId: 5, shortName: '외도보타니아', name: '외도보타니아', region: '동부권', category: '식물원 · 유람선' },
]
const names = (list) => list.map((s) => s.shortName)

/**
 * 「추천순」(default) = 하트 수 순(2026-09-21 사용자 결정 · 부록 Q). 같으면 거제 9경 번호 순(9경이 아닌 곳은 뒤) →
 * 대표 코스에 든 횟수 → 가나다. 셋 다 서버 값(likeCount · nineScenicNo · featuredCourseCount)이라 화면이 만드는 수가 없다.
 */
describe('filterAndSort — 추천순', () => {
  const ranked = (list) => names(filterAndSort(list, {}))

  it('하트 많은 순', () => {
    expect(ranked([
      { shortName: '학동몽돌해변', likeCount: 5 },
      { shortName: '바람의언덕', likeCount: 12 },
      { shortName: '해금강', likeCount: 7 },
    ])).toEqual(['바람의언덕', '해금강', '학동몽돌해변'])
  })

  it('하트가 같으면 9경 번호 순 — 9경이 아닌 곳은 뒤', () => {
    expect(ranked([
      { shortName: '거제씨월드', likeCount: 5, nineScenicNo: null },
      { shortName: '학동몽돌해변', likeCount: 5, nineScenicNo: 4 },
      { shortName: '해금강', likeCount: 5, nineScenicNo: 1 },
    ])).toEqual(['해금강', '학동몽돌해변', '거제씨월드'])
  })

  it('9경도 같으면(둘 다 아니면) 대표 코스에 든 횟수 순', () => {
    expect(ranked([
      { shortName: '청마기념관', likeCount: 5, nineScenicNo: null, featuredCourseCount: 0 },
      { shortName: '거제씨월드', likeCount: 5, nineScenicNo: null, featuredCourseCount: 3 },
    ])).toEqual(['거제씨월드', '청마기념관'])
  })

  it('그것도 같으면 가나다', () => {
    expect(ranked([
      { shortName: '조선해양문화관', likeCount: 5, nineScenicNo: null, featuredCourseCount: 3 },
      { shortName: '거제씨월드', likeCount: 5, nineScenicNo: null, featuredCourseCount: 3 },
    ])).toEqual(['거제씨월드', '조선해양문화관'])
  })

  it('네 규칙이 차례로 적용된다', () => {
    expect(ranked([
      { shortName: '학동몽돌해변', likeCount: 5, nineScenicNo: 4, featuredCourseCount: 6 },
      { shortName: '바람의언덕', likeCount: 12, nineScenicNo: 2, featuredCourseCount: 5 },
      { shortName: '해금강', likeCount: 12, nineScenicNo: 1, featuredCourseCount: 4 },
      { shortName: '거제씨월드', likeCount: 5, nineScenicNo: null, featuredCourseCount: 3 },
      { shortName: '조선해양문화관', likeCount: 5, nineScenicNo: null, featuredCourseCount: 3 },
      { shortName: '거제식물원', likeCount: 0, nineScenicNo: 5, featuredCourseCount: 1 },
      { shortName: '청마기념관', likeCount: 5, nineScenicNo: null, featuredCourseCount: 0 },
    ])).toEqual(['해금강', '바람의언덕', '학동몽돌해변', '거제씨월드', '조선해양문화관', '청마기념관', '거제식물원'])
  })

  it('필드가 없는 옛 응답(undefined)도 깨지지 않는다 — 전부 같은 값으로 보아 가나다', () => {
    expect(ranked(SPOTS)).toEqual(['매미성', '바람의언덕', '외도보타니아', '학동몽돌해변'])
  })
})

describe('filterAndSort', () => {

  it('이름 일부로 찾는다 — 띄어 써도 찾는다', () => {
    expect(names(filterAndSort(SPOTS, { query: '몽돌' }))).toEqual(['학동몽돌해변'])
    expect(names(filterAndSort(SPOTS, { query: '바람의 언덕' }))).toEqual(['바람의언덕'])
  })

  it('정식 이름 · 권역 · 분류로도 찾는다', () => {
    // 화면 이름은 「학동몽돌해변」이지만 정식 이름은 「학동흑진주몽돌해변」입니다
    expect(names(filterAndSort(SPOTS, { query: '흑진주' }))).toEqual(['학동몽돌해변'])
    expect(names(filterAndSort(SPOTS, { query: '남부' }))).toEqual(['바람의언덕', '학동몽돌해변'])
    expect(names(filterAndSort(SPOTS, { query: '식물원' }))).toEqual(['외도보타니아'])
  })

  it('맞는 것이 없으면 빈 배열 — 화면이 「찾지 못했어요」를 그린다', () => {
    expect(filterAndSort(SPOTS, { query: '한라산' })).toEqual([])
  })

  it('가나다순 · 권역순으로 정렬한다', () => {
    expect(names(filterAndSort(SPOTS, { sort: 'name' }))).toEqual([
      '매미성',
      '바람의언덕',
      '외도보타니아',
      '학동몽돌해변',
    ])
    // 권역도 가나다로 줄 세웁니다(남부권 → 동부권 → 북부권), 같은 권역 안에서는 이름 가나다순
    expect(names(filterAndSort(SPOTS, { sort: 'region' }))).toEqual([
      '바람의언덕',
      '학동몽돌해변',
      '외도보타니아',
      '매미성',
    ])
  })

  it('원본 배열을 건드리지 않는다', () => {
    const before = names(SPOTS)
    filterAndSort(SPOTS, { sort: 'name' })
    expect(names(SPOTS)).toEqual(before)
  })
})
