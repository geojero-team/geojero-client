import { describe, expect, it } from 'vitest'
import { t } from '../i18n'
import { QUESTIONS, profileOf, quizPool, rankCourses } from './courseQuiz'

/** 서버 /api/courses 응답에서 점수가 보는 값만 추린 코스 하나(2026-09-20 실측 모양). */
const course = ({ code, themes, spotCount, totalMin = 510, busMin = 150, ferryMin = 0, nine = 0, featuredRank = null }) => ({
  courseId: Number(code.replace('-', '')),
  courseCode: code,
  spotCount: spotCount ?? themes.length,
  approxTotalMin: totalMin,
  busMinTotal: busMin,
  ferryMinTotal: ferryMin,
  nineScenicCount: nine,
  featuredRank,
  title: `${code} 제목`,
  intro: `${code} 소개`,
  spots: themes.map((theme, i) => ({ seq: i + 1, shortName: `${code}-${i}`, theme })),
})

describe('profileOf — 코스 성격은 서버 값을 세기만 한다', () => {
  it('분류마다 몇 곳인지 세고, 시간 · 9경 수를 그대로 옮긴다', () => {
    const p = profileOf(course({ code: '3-12', themes: ['VIEW', 'VIEW', 'BEACH'], nine: 3, busMin: 220, totalMin: 600 }))
    expect(p.themes).toEqual({ VIEW: 2, BEACH: 1 })
    expect(p).toMatchObject({ spotCount: 3, totalMin: 600, busMin: 220, nineCount: 3, ferryMin: 0 })
  })

  it('분류가 없는 스팟은 세지 않는다 — 옛 응답에 theme 가 비어 올 수 있다', () => {
    expect(profileOf({ spots: [{ theme: 'BEACH' }, {}] }).themes).toEqual({ BEACH: 1 })
  })
})

describe('quizPool — 제목 · 소개가 있는 코스만 후보', () => {
  it('문구가 비면 뺀다 — 카드에 제목 없는 칸이 생기지 않게', () => {
    const ok = course({ code: '3-12', themes: ['VIEW'] })
    const noTitle = { ...course({ code: '3-07', themes: ['BEACH'] }), title: null }
    const noIntro = { ...course({ code: '4-04', themes: ['BEACH'] }), intro: null }
    expect(quizPool([ok, noTitle, noIntro]).map((c) => c.courseCode)).toEqual(['3-12'])
  })
})

describe('rankCourses — 답에 가까운 코스가 위로', () => {
  const beach = course({ code: '3-01', themes: ['BEACH', 'BEACH', 'VIEW'], nine: 1 })
  const view = course({ code: '3-12', themes: ['VIEW', 'VIEW', 'VIEW'], nine: 3, busMin: 220 })
  const garden = course({ code: '3-13', themes: ['GARDEN', 'VIEW', 'GARDEN'], nine: 2 })
  const big = course({ code: '5-04', themes: ['VIEW', 'EXHIBIT', 'BEACH', 'HISTORY', 'HISTORY'], spotCount: 5, nine: 3, busMin: 243, totalMin: 660 })
  const ferry = course({ code: '3-11', themes: ['CRUISE', 'CRUISE', 'VIEW'], ferryMin: 160, busMin: 105, nine: 2 })
  const all = [beach, view, garden, big, ferry]

  it('바다를 고르면 바다 두 곳인 코스가 1등', () => {
    expect(rankCourses(all, { scene: 'BEACH' })[0].course.courseCode).toBe('3-01')
  })

  it('정원을 고르면 정원 두 곳인 코스가 1등 — 다섯 자리뿐이어도 거르지 않고 점수로 올린다', () => {
    expect(rankCourses(all, { scene: 'GARDEN' })[0].course.courseCode).toBe('3-13')
  })

  it('배를 고르면 배가 있는 한 코스가 1등', () => {
    expect(rankCourses(all, { taste: 'ferry' })[0].course.courseCode).toBe('3-11')
  })

  it('알차게 네다섯 곳을 고르면 곳 수가 많은 코스가 1등', () => {
    expect(rankCourses(all, { pace: 'full' })[0].course.courseCode).toBe('5-04')
  })

  it('이동이 짧은 쪽을 고르면 버스가 짧은 코스가 1등', () => {
    expect(rankCourses(all, { pace: 'short' })[0].course.courseCode).toBe('3-11')
  })

  it('세 답을 모두 세서 합친다 — 전망 + 여유 + 9경이면 전망 셋 · 9경 셋인 코스', () => {
    const top = rankCourses(all, { scene: 'VIEW', pace: 'easy', taste: 'nine' })[0]
    expect(top.course.courseCode).toBe('3-12')
    // 이유는 답마다 하나씩 — 화면이 「왜 이 코스인지」로 그립니다.
    expect(top.reasons).toEqual(['전망·명소 3곳', '3곳 · 총 8시간 30분', '거제 9경 3곳'])
  })

  /* 2026-09-20 실측으로 고친 자리 — 뒤 두 답이 첫 답을 덮어 바다 없는 코스가 1등이 됐습니다. */
  it('고른 풍경이 있는 코스가 먼저 — 뒤 답의 점수가 더 커도 앞지르지 못한다', () => {
    // 3-16: 바다가 없지만 여유(6) + 숨은 곳(6)으로 12점. 3-05: 바다 한 곳(3) + 여유(4) + 숨은 곳(4)로 11점.
    const noBeach = course({ code: '3-16', themes: ['EXHIBIT', 'EXHIBIT', 'GARDEN'], nine: 0, totalMin: 450 })
    const oneBeach = course({ code: '3-05', themes: ['BEACH', 'HISTORY', 'VIEW'], nine: 1, totalMin: 510 })
    const ranked = rankCourses([noBeach, oneBeach], { scene: 'BEACH', pace: 'easy', taste: 'hidden' })
    expect(ranked[0].course.courseCode).toBe('3-05')
    expect(ranked[0].reasons[0]).toBe('바다·해변 1곳')
    // 점수 자체는 바다 없는 코스가 높습니다 — 순서만 풍경이 먼저입니다.
    expect(ranked[1].score).toBeGreaterThan(ranked[0].score)
  })

  /* 2026-09-20 실측 — 「여유롭게 세 곳」을 골랐는데 여섯 곳짜리 코스가 1등이었습니다. 어긋나면 깎습니다. */
  it('답과 정면으로 어긋나면 깎는다 — 여유를 골랐는데 여섯 곳인 코스는 내려간다', () => {
    const six = course({ code: '6-01', themes: ['BEACH', 'EXHIBIT', 'EXHIBIT', 'EXHIBIT', 'HISTORY', 'GARDEN'], spotCount: 6, nine: 1, busMin: 212 })
    const three = course({ code: '3-01', themes: ['BEACH', 'BEACH', 'VIEW'], nine: 3 })
    const ranked = rankCourses([six, three], { scene: 'BEACH', pace: 'easy', taste: 'hidden' })
    expect(ranked[0].course.courseCode).toBe('3-01')
    expect(ranked[1].score).toBeLessThan(ranked[0].score)
    // 깎인 자리는 이유로 적지 않습니다 — 여섯 곳 코스에 「여유롭게」가 근거로 붙으면 거짓말이 됩니다.
    expect(ranked[1].reasons).not.toContain(expect.stringContaining('총'))
  })

  it('덜 붐비는 곳은 9경 수로만 본다 — 스팟이 많다고 한적한 코스가 되지 않는다', () => {
    const many = course({ code: '5-02', themes: ['HISTORY', 'BEACH', 'EXHIBIT', 'EXHIBIT', 'EXHIBIT'], spotCount: 5, nine: 1 })
    const small = course({ code: '3-16', themes: ['EXHIBIT', 'EXHIBIT', 'GARDEN'], nine: 0 })
    const ranked = rankCourses([many, small], { taste: 'hidden' })
    expect(ranked[0].course.courseCode).toBe('3-16')
    expect(ranked[0].reasons).toEqual(['거제 9경 없이 한적하게'])
  })

  it('안 맞는 축은 이유를 만들지 않는다 — 근거 없는 말을 붙이지 않게', () => {
    const entry = rankCourses(all, { scene: 'GARDEN' }).find((e) => e.course.courseCode === '3-01')
    expect(entry.score).toBe(0)
    expect(entry.reasons).toEqual([])
  })

  it('답이 없으면 모두 0점 — 대표 코스 · 버스가 짧은 순으로만 선다', () => {
    const featured = { ...course({ code: '4-11', themes: ['BEACH'] }), featuredRank: 1 }
    const ranked = rankCourses([beach, featured], {})
    expect(ranked.every((entry) => entry.score === 0)).toBe(true)
    expect(ranked[0].course.courseCode).toBe('4-11')
  })

  it('모르는 선지 값은 무시한다 — 주소를 손으로 고쳐도 깨지지 않게', () => {
    expect(rankCourses(all, { scene: 'UNKNOWN' })[0].score).toBe(0)
  })
})

describe('QUESTIONS — 화면이 이 목록만 보고 그린다', () => {
  it('질문 셋, 선지는 셋에서 다섯', () => {
    expect(QUESTIONS).toHaveLength(3)
    for (const question of QUESTIONS) {
      expect(question.options.length).toBeGreaterThanOrEqual(3)
      expect(question.options.length).toBeLessThanOrEqual(5)
    }
  })

  /* 문구 없는 선지를 막습니다 — t() 는 없는 키를 **키 이름 그대로** 돌려주므로
     화면에 「courseQuiz.opt.scene.CRUISE」가 그대로 찍힙니다(선지를 늘릴 때 실제로 겪을 수 있는 실수). */
  it('선지마다 문구가 있고, 설명 줄을 쓰는 질문은 설명도 있다', () => {
    for (const { id, options, hint } of QUESTIONS) {
      for (const option of options) {
        const labelKey = `courseQuiz.opt.${id}.${option}`
        expect(t(labelKey), labelKey).not.toBe(labelKey)
        if (hint) {
          const hintKey = `courseQuiz.hint.${id}.${option}`
          expect(t(hintKey), hintKey).not.toBe(hintKey)
        }
      }
    }
  })
})

/**
 * 2026-09-22 회귀 — 섬 코스(서버 V54)는 스팟이 **섬(CRUISE) + 전시(EXHIBIT)** 뿐이라
 * 1번 질문에 섬 선지가 없던 동안 **답을 하나도 못 가져 늘 뒤로 밀렸습니다**.
 * 점수가 2등보다 높은데도 20위였습니다(운영 37개 코스 실측) — sceneHit 가 점수보다 먼저 정렬되기 때문입니다.
 * 그래서 「어떤 풍경」의 선지는 **후보 코스에 실제로 있는 분류를 덮어야** 합니다.
 */
describe('1번 질문은 코스가 가진 분류를 덮는다', () => {
  it('섬을 고르면 섬 스팟이 있는 코스가 1등 — 점수만 높고 순위는 밀리는 일이 없다', () => {
    const island = course({ code: '2-01', themes: ['CRUISE', 'EXHIBIT'], spotCount: 2, ferryMin: 40, busMin: 79, nine: 1 })
    const land = course({ code: '3-12', themes: ['VIEW', 'VIEW', 'VIEW'], nine: 3 })
    expect(rankCourses([land, island], { scene: 'CRUISE' })[0].course.courseCode).toBe('2-01')
  })

  it('후보 코스의 분류 가운데 1번 질문이 묻지 않는 것은 실내(EXHIBIT)뿐이다 — 그건 3번 질문이 묻는다', () => {
    const asked = new Set(QUESTIONS[0].options)
    const inCourses = new Set(['BEACH', 'VIEW', 'HISTORY', 'GARDEN', 'CRUISE', 'EXHIBIT'])
    expect([...inCourses].filter((theme) => !asked.has(theme))).toEqual(['EXHIBIT'])
  })
})
