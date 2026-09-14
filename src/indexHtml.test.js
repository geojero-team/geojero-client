import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

// index.html은 앱이 아니라 링크 미리보기(검색·메신저 공유)에 나가는 문구입니다.
// 판정은 2026-09-12에 제품에서 뺐습니다(기준문서 §0).
// jsdom 환경에서는 import.meta.url이 file:이 아니라서 저장소 루트(vitest 실행 위치) 기준으로 읽습니다.
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const doc = new DOMParser().parseFromString(html, 'text/html')

describe('index.html 미리보기 문구', () => {
  it('설명에 판정 약속이 없다', () => {
    const description = doc.querySelector('meta[name="description"]').getAttribute('content')
    expect(description).not.toContain('판정')
  })
})
