import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import TimetableListPage from './TimetableListPage'

vi.mock('../lib/api', () => ({ api: { pois: vi.fn() } }))

const POIS = [
  { poiId: 1, name: '바람의언덕', shortName: '바람의언덕', kind: 'SPOT', theme: 'VIEW', region: '남부권', category: '언덕·전망', imageUrl: 'https://tong.visitkorea.or.kr/wind.jpg',
    alightLabel: '도장포 정류장', timetableStop: '도장포', boardStopDiffers: false, ferryDocks: [], likeCount: 7, liked: false },
  // 외도보타니아는 버스 정류장이 없고 선착장 4곳의 배 시간표를 엽니다 — 이 화면이 「버스」라고 말하면 안 되는 이유.
  { poiId: 5, name: '외도보타니아', shortName: '외도보타니아', kind: 'SPOT', theme: 'GARDEN', region: '동부권', category: '식물원 · 유람선', imageUrl: null,
    alightLabel: null, timetableStop: null, boardStopDiffers: false, ferryDocks: ['도장포', '와현', '장승포', '지세포'], likeCount: 0, liked: false },
  // 거제씨월드는 신촌에서 내리지만 시간표는 지세포 기준 — 「신촌 정류장」만 적으면 신촌 시간표로 읽힙니다.
  { poiId: 18, name: '거제씨월드', shortName: '거제씨월드', kind: 'SPOT', theme: 'EXHIBIT', region: '동부권', category: '체험', imageUrl: null,
    alightLabel: '신촌 정류장', timetableStop: '지세포', boardStopDiffers: true, ferryDocks: [], likeCount: 2, liked: false },
  { poiId: 23, name: '고현터미널', shortName: '고현터미널', kind: 'TERMINAL', theme: null, region: null, category: null, imageUrl: null,
    alightLabel: null, timetableStop: null, boardStopDiffers: false, ferryDocks: [] },
]

function Probe() {
  return <p>{`at ${useLocation().pathname}`}</p>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/timetable']}>
      <Routes>
        <Route path="/timetable" element={<TimetableListPage />} />
        <Route path="/timetable/:id" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  api.pois.mockResolvedValue({ pois: POIS })
})

/** Figma 02-2 `451:518` 시간표 탭 — 한 줄 목록(사진 · 이름 · 정류장 · ›). 2026-09-14 밤 안내 문장에서 「버스」를 뗐다(사용자 결정). */
describe('시간표 탭', () => {
  it('안내 문장은 그림(451:613)에서 「버스」만 뺀 것이고, 화면 어디에도 「버스」가 없다', async () => {
    renderPage()

    expect(await screen.findByText('스팟을 고르면 가까운 정류장의 시간표를 보여드려요')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /외도보타니아/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /고현터미널/ })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('버스')
  })

  it('둘째 줄은 정류장 이름이다 — 기준 정류장이 다르면 그 사실을, 정류장이 없는 외도는 선착장 넷을 적는다', async () => {
    renderPage()

    const wind = await screen.findByRole('button', { name: /바람의언덕/ })
    expect(within(wind).getByText('도장포 정류장')).toBeInTheDocument()
    expect(within(wind).queryByText(/남부권/)).not.toBeInTheDocument()

    const seaworld = screen.getByRole('button', { name: /거제씨월드/ })
    expect(within(seaworld).getByText('신촌 정류장 · 시간표는 지세포 기준')).toBeInTheDocument()

    const oedo = screen.getByRole('button', { name: /외도보타니아/ })
    expect(within(oedo).getByText('도장포 · 와현 · 장승포 · 지세포 선착장')).toBeInTheDocument()
  })

  it('줄을 누르면 그 스팟의 시간표로 간다', async () => {
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /바람의언덕/ }))
    expect(await screen.findByText('at /timetable/1')).toBeInTheDocument()
  })

  /**
   * 하트 수는 **이 화면에 그리지 않는다**(2026-09-21 사용자 결정 · 부록 Q).
   * 시간표 탭은 「어느 정류장 시간표를 볼지」 고르는 곳이라 인기와 무관하다 — 줄에 하트를 두면 고를 근거가 아닌 것이 줄에 앉는다.
   * 순서는 그대로 추천순(하트 많은 순)이다 — 스팟 탭과 같은 filterAndSort 를 쓴다.
   */
  it('줄에 하트 수를 그리지 않는다 — 순서는 추천순 그대로다', async () => {
    renderPage()

    await screen.findByRole('button', { name: /바람의언덕/ })
    expect(screen.queryAllByRole('img', { name: /하트/ })).toHaveLength(0)

    const rows = screen.getAllByRole('button', { name: /바람의언덕|외도보타니아|거제씨월드/ })
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('바람의언덕'),
      expect.stringContaining('거제씨월드'),
      expect.stringContaining('외도보타니아'),
    ])
  })
})
