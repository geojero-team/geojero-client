import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

/* 손가락 확대(pinch)를 막는다 — 2026-09-21 사용자가 시작화면에서 잡아냈습니다.
   앱은 390 폭 틀을 창에 맞춰 통째로 키우므로(lib/frameZoom) 더 확대해 봐야 잘린 부분만 보입니다.
   실측(pinch 1.8배): innerWidth · --frame-zoom 은 그대로인데 보이는 창만 390×844 → 217×469 로 줄었습니다.

   두 곳에 거는 이유: `user-scalable=no` 는 **아이폰 사파리가 무시합니다**(iOS 10~).
   `touch-action` 은 아이폰도 지킵니다. 하나만 두면 한쪽 기기가 뚫립니다. */
// jsdom 에서 import.meta.url 은 http 주소라 파일 경로로 못 씁니다 — 저장소 뿌리에서 읽습니다(linkPreview.test.js 와 같은 방식).
const html = readFileSync(resolve(cwd(), 'index.html'), 'utf8')
const css = readFileSync(resolve(cwd(), 'src/index.css'), 'utf8')
const viewport = html.match(/<meta\s+name="viewport"[\s\S]*?content="([^"]*)"/)?.[1]

describe('손가락 확대를 막는다(2026-09-21 사용자 — 시작화면이 확대돼 일부만 보였다)', () => {
  it('viewport 가 확대를 막는다 — 안드로이드 · 원스토어 앱', () => {
    expect(viewport).toContain('maximum-scale=1')
    expect(viewport).toContain('user-scalable=no')
  })

  it('touch-action 으로 한 번 더 막는다 — 아이폰 사파리는 user-scalable 을 무시한다', () => {
    expect(css).toMatch(/touch-action:\s*pan-x pan-y/)
  })

  it('있던 것은 그대로 둔다 — 폭을 기기에 맞추고 노치 밑까지 그린다', () => {
    expect(viewport).toContain('width=device-width')
    expect(viewport).toContain('initial-scale=1.0')
    expect(viewport).toContain('viewport-fit=cover')
  })
})
