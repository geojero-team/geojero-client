import { describe, expect, it } from 'vitest'
import { formatCountWord, formatDistance, sentenceLines } from './format'

describe('sentenceLines — 소개문 문장마다 줄바꿈 (글자는 그대로, 공백만 바꾼다)', () => {
  it('문장 끝 띄어쓰기를 줄바꿈으로 바꾼다', () => {
    expect(sentenceLines('거제도 남쪽에 있다. 소리가 난다. 꼭 들른다.')).toBe(
      '거제도 남쪽에 있다.\n소리가 난다.\n꼭 들른다.',
    )
  })

  it('마침표 뒤에 띄어쓰기가 없어도 끊는다 — 바람의언덕 원문 「입었다.섬도」', () => {
    expect(sentenceLines('한가함을 입었다.섬도 한가하다.')).toBe('한가함을 입었다.\n섬도 한가하다.')
  })

  it('숫자 뒤 점은 끊지 않고, 원문의 빈 줄은 그대로 둔다', () => {
    const src = '길이는 약 1.5km이다.\n\n(출처 : 거제 문화관광 홈페이지)'
    expect(sentenceLines(src)).toBe(src)
  })

  it('물음표·느낌표와 닫는 따옴표 뒤에서도 끊는다', () => {
    expect(sentenceLines('정말 그럴까? 그렇다! ‘바람의 언덕’이다.’ 끝.')).toBe(
      '정말 그럴까?\n그렇다!\n‘바람의 언덕’이다.’\n끝.',
    )
  })

  it('글자는 한 자도 바꾸지 않는다 — 공백을 빼고 비교하면 원문과 같다', () => {
    const src =
      '원래의 지명은 ‘띠밭늘’로 불렸으나, 2002년부터 ‘바람의 언덕’으로 바뀌어 불리고 있다. 6·25 전쟁 당시 17만 3천여 명이었다.섬도 한가하다.'
    expect(sentenceLines(src).replace(/\s/g, '')).toBe(src.replace(/\s/g, ''))
  })

  it('<br> 태그는 줄바꿈으로, 빈 값은 그대로', () => {
    expect(sentenceLines('첫 줄<br />둘째 줄')).toBe('첫 줄\n둘째 줄')
    expect(sentenceLines(null)).toBeNull()
    expect(sentenceLines('')).toBe('')
  })
})

describe('formatDistance — 타는 곳 거리 (「약」은 문구 쪽이 붙입니다)', () => {
  it('1000m 미만은 10m 단위로 반올림한다', () => {
    expect(formatDistance(311)).toBe('310m')
    expect(formatDistance(315)).toBe('320m')
    expect(formatDistance(4)).toBe('0m')
    expect(formatDistance(994)).toBe('990m')
  })

  it('1000m 이상은 km 소수 한 자리', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(1080)).toBe('1.1km')
    expect(formatDistance(1449)).toBe('1.4km')
  })

  it('10m 반올림이 1000m가 되면 km로 적는다 — 「1000m」라고 쓰지 않는다', () => {
    expect(formatDistance(996)).toBe('1.0km')
  })
})

describe('formatCountWord — 곳 수를 한글 수 낱말로 (코스 상세 「여섯 곳 중 네 곳」, 2026-09-17 사용자 결정)', () => {
  it('1~20 — 「곳」 앞에 붙는 꼴(한 곳 · 스무 곳)', () => {
    const words = [
      '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
      '열한', '열두', '열세', '열네', '열다섯', '열여섯', '열일곱', '열여덟', '열아홉', '스무',
    ]
    expect(words.map((_, i) => formatCountWord(i + 1))).toEqual(words)
  })

  it('스물을 넘으면 「스물한」 — 「스무」는 스물 딱 하나일 때만', () => {
    expect(formatCountWord(21)).toBe('스물한')
    expect(formatCountWord(30)).toBe('서른')
    expect(formatCountWord(99)).toBe('아흔아홉')
  })

  it('셀 수 없는 값은 null — 「undefined 곳」 · 「0 곳」을 만들지 않는다', () => {
    for (const n of [0, -1, 1.5, 100, null, undefined, '4']) expect(formatCountWord(n)).toBeNull()
  })
})
