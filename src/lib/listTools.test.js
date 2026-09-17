import { describe, expect, it } from 'vitest'
import { filterAndSort } from './listTools'

const SPOTS = [
  { poiId: 1, shortName: '바람의언덕', name: '바람의언덕', region: '남부권', category: '언덕·전망' },
  { poiId: 6, shortName: '매미성', name: '매미성', region: '북부권', category: '성' },
  { poiId: 4, shortName: '학동몽돌해변', name: '학동흑진주몽돌해변', region: '남부권', category: '해수욕장' },
  { poiId: 5, shortName: '외도보타니아', name: '외도보타니아', region: '동부권', category: '식물원 · 유람선' },
]
const names = (list) => list.map((s) => s.shortName)

describe('filterAndSort', () => {
  it('기본은 서버 순서 그대로 — 9경과 대표 스팟이 앞에 오는 순서를 지킨다', () => {
    expect(names(filterAndSort(SPOTS, {}))).toEqual(['바람의언덕', '매미성', '학동몽돌해변', '외도보타니아'])
  })

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
