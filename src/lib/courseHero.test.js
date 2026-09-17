import { describe, expect, it } from 'vitest'
import { heroPhotos } from './courseHero'

// 스팟 하나 — 사진이 없으면(저작권 Type3 · 목록 실패) thumbnailUrl 자체가 없습니다(lib/spots withPhotos).
const spot = (poiId, url) => (url ? { poiId, thumbnailUrl: url } : { poiId })
const course = (...spots) => ({ spots })

const HAKDONG = 'https://tong.visitkorea.or.kr/hakdong.jpg'
const WINDHILL = 'https://tong.visitkorea.or.kr/windhill.jpg'
const HAEGEUMGANG = 'https://tong.visitkorea.or.kr/haegeumgang.jpg'
const SEAWORLD = 'https://tong.visitkorea.or.kr/seaworld.jpg'

describe('heroPhotos — 코스 추천 카드 사진이 위 카드와 겹치지 않게', () => {
  it('겹침이 없으면 카드마다 첫 스팟 사진 그대로', () => {
    const courses = [
      course(spot(4, HAKDONG), spot(3, HAEGEUMGANG)),
      course(spot(1, WINDHILL), spot(3, HAEGEUMGANG)),
    ]
    expect(heroPhotos(courses)).toEqual([HAKDONG, WINDHILL])
  })

  it('겹침 두 쌍(①② 학동 · ③④ 바람의언덕) — 아래 카드는 아직 안 쓴 사진이 있는 다음 스팟', () => {
    const courses = [
      course(spot(4, HAKDONG), spot(3, HAEGEUMGANG), spot(1, WINDHILL)),
      course(spot(4, HAKDONG), spot(18, SEAWORLD), spot(1, WINDHILL)),
      course(spot(1, WINDHILL), spot(3, HAEGEUMGANG)),
      course(spot(1, WINDHILL), spot(4, HAKDONG), spot(18, SEAWORLD)),
    ]
    // ③은 첫 스팟 바람의언덕이 아직 안 쓰였으니 그대로 · ④는 바람의언덕 · 학동 · 씨월드가 전부 쓰였다 → 첫 스팟 사진
    expect(heroPhotos(courses)).toEqual([HAKDONG, SEAWORLD, WINDHILL, WINDHILL])
  })

  it('두 번째 쌍에 안 쓴 사진이 있으면 그걸 고른다 — 쌍마다 따로 풀린다', () => {
    const courses = [
      course(spot(4, HAKDONG), spot(3, HAEGEUMGANG)),
      course(spot(4, HAKDONG), spot(18, SEAWORLD)),
      course(spot(1, WINDHILL), spot(4, HAKDONG)),
      course(spot(1, WINDHILL), spot(3, HAEGEUMGANG), spot(21, 'https://tong.visitkorea.or.kr/okpo.jpg')),
    ]
    // ④: 바람의언덕(③이 씀) → 해금강은 아직 안 씀
    expect(heroPhotos(courses)).toEqual([HAKDONG, SEAWORLD, WINDHILL, HAEGEUMGANG])
  })

  it('전부 이미 쓰였으면 첫 스팟 사진으로 돌아간다(겹치더라도 사진은 보인다)', () => {
    const courses = [
      course(spot(4, HAKDONG)),
      course(spot(1, WINDHILL)),
      course(spot(1, WINDHILL), spot(4, HAKDONG)),
    ]
    expect(heroPhotos(courses)).toEqual([HAKDONG, WINDHILL, WINDHILL])
  })

  it('사진 없는 스팟은 건너뛴다 — 첫 스팟이 사진이 없으면 사진 있는 다음 스팟', () => {
    const courses = [course(spot(18), spot(4, HAKDONG), spot(1, WINDHILL))]
    expect(heroPhotos(courses)).toEqual([HAKDONG])
  })

  it('사진 없는 스팟을 건너뛰고 안 쓴 사진을 찾는다 — 빈 스팟이 사이에 있어도', () => {
    const courses = [
      course(spot(4, HAKDONG)),
      course(spot(4, HAKDONG), spot(18), spot(1, WINDHILL)),
    ]
    expect(heroPhotos(courses)).toEqual([HAKDONG, WINDHILL])
  })

  it('전부 쓰였고 첫 스팟이 사진이 없으면 사진 있는 첫 스팟 — 「TourAPI 사진 0장」이라 적지 않게', () => {
    const courses = [
      course(spot(4, HAKDONG)),
      course(spot(18), spot(4, HAKDONG)),
    ]
    expect(heroPhotos(courses)).toEqual([HAKDONG, HAKDONG])
  })

  it('어느 스팟에도 사진이 없으면 null(「사진 없음」) — 그 카드는 다른 카드의 사진을 선점하지 않는다', () => {
    const courses = [course(spot(18), spot(20)), course(spot(4, HAKDONG))]
    expect(heroPhotos(courses)).toEqual([null, HAKDONG])
  })

  it('칩으로 거른 목록 — 넘겨받은 목록만 본다. 가려진 카드는 사진을 선점하지 않는다', () => {
    const three = course(spot(4, HAKDONG), spot(3, HAEGEUMGANG))
    const fourA = course(spot(4, HAKDONG), spot(1, WINDHILL), spot(3, HAEGEUMGANG), spot(18))
    const fourB = course(spot(1, WINDHILL), spot(4, HAKDONG), spot(3, HAEGEUMGANG), spot(18))

    // 전체: ③ 학동 → ④A 학동이 쓰여 바람의언덕 → ④B 바람의언덕 · 학동이 쓰여 해금강
    expect(heroPhotos([three, fourA, fourB])).toEqual([HAKDONG, WINDHILL, HAEGEUMGANG])
    // 4곳만: 3곳 카드가 없으니 ④A 는 첫 스팟 학동 · ④B 는 첫 스팟 바람의언덕
    expect(heroPhotos([fourA, fourB])).toEqual([HAKDONG, WINDHILL])
  })

  it('결정적이다 — 같은 목록이면 몇 번을 불러도 같은 결과 · 넘긴 코스를 바꾸지 않는다', () => {
    const courses = [
      course(spot(4, HAKDONG), spot(1, WINDHILL)),
      course(spot(4, HAKDONG), spot(1, WINDHILL)),
    ]
    const before = JSON.stringify(courses)
    expect(heroPhotos(courses)).toEqual([HAKDONG, WINDHILL])
    expect(heroPhotos(courses)).toEqual([HAKDONG, WINDHILL])
    expect(JSON.stringify(courses)).toBe(before)
  })

  it('빈 목록 · 스팟 없는 코스', () => {
    expect(heroPhotos([])).toEqual([])
    expect(heroPhotos([course()])).toEqual([null])
  })
})
