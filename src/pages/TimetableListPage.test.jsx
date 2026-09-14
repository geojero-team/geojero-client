import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import TimetableListPage from './TimetableListPage'

vi.mock('../lib/api', () => ({ api: { pois: vi.fn() } }))

const POIS = [
  { poiId: 1, name: '바람의언덕', shortName: '바람의언덕', kind: 'SPOT', theme: 'VIEW', region: '남부권', category: '언덕·전망', imageUrl: null },
  // 외도보타니아는 버스 정류장이 없고 선착장 4곳의 배 시간표를 엽니다 — 이 화면이 「버스」라고 말하면 안 되는 이유.
  { poiId: 5, name: '외도보타니아', shortName: '외도보타니아', kind: 'SPOT', theme: 'GARDEN', region: '동부권', category: '식물원 · 유람선', imageUrl: null },
  { poiId: 23, name: '고현터미널', shortName: '고현터미널', kind: 'TERMINAL', theme: null, region: null, category: null, imageUrl: null },
]

beforeEach(() => {
  vi.clearAllMocks()
  api.pois.mockResolvedValue({ pois: POIS })
})

/** Figma 02-2 `451:518` 시간표 탭. 2026-09-14 밤 안내 문장에서 「버스」를 뗐다(사용자 결정 — 스팟 상세 「시간표 보기」와 같은 이유). */
describe('시간표 탭', () => {
  it('안내 문장은 그림(451:613)에서 「버스」만 뺀 것이고, 화면 어디에도 「버스」가 없다', async () => {
    render(
      <MemoryRouter>
        <TimetableListPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('스팟을 고르면 가까운 정류장의 시간표를 보여드려요')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /외도보타니아/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /고현터미널/ })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('버스')
  })
})
