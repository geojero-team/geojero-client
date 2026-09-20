import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

/* 링크 미리보기(카카오톡 · 메시지 앱에서 주소를 보낼 때 뜨는 카드) — index.html 의 og 태그가 정본입니다.
   2026-09-20 사용자: 주소를 보내면 제목만 뜨고 로고가 안 뜬다. */
// jsdom 에서 import.meta.url 은 http 주소라 파일 경로로 못 씁니다 — 저장소 뿌리에서 읽습니다.
const html = readFileSync(resolve(cwd(), 'index.html'), 'utf8')
const meta = (property) =>
  html.match(new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`))?.[1]

describe('링크 미리보기 — 주소를 보내면 로고와 한 줄 소개가 뜬다(2026-09-20 사용자)', () => {
  it('그림 주소는 전체 주소여야 한다 — 카카오톡은 「/og-2.png」 같은 상대 주소를 받아 가지 못한다', () => {
    expect(meta('og:image')).toBe('https://www.geojero.com/og-2.png')
    expect(meta('og:image:width')).toBe('1200')
    expect(meta('og:image:height')).toBe('630')
  })

  it('제목 · 소개 · 주소를 준다 — 소개가 없으면 카카오톡이 「여기를 눌러 링크를 확인하세요」로 채운다', () => {
    expect(meta('og:title')).toBe('거제로')
    expect(meta('og:description')).toBe('거제시 원문 버스·배 시간표로 짜는 여행 코스')
    expect(meta('og:url')).toBe('https://www.geojero.com/')
    expect(meta('og:type')).toBe('website')
  })
})

describe('화면에 「뚜벅이」를 쓰지 않는다(2026-09-20 사용자 — 타깃은 맞지만 화면 문구로는 쓰지 않는다)', () => {
  it('index.html 의 설명 · 미리보기 글에 그 말이 없다', () => {
    expect(html).not.toContain('뚜벅이')
  })
})
