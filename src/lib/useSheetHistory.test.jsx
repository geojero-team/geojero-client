import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SHEET_STATE_KEY, useSheetHistory } from './useSheetHistory'

/* 지도 화면 흉내 — 시트를 열고(핀) · 화면에서 닫고(✕ · 지도 빈 곳) · 폰 뒤로가기(history -1)를 누른다. */
function MapScreen() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  useSheetHistory(open, () => setOpen(false))
  return (
    <>
      <div data-testid="loc">{location.pathname + location.search}</div>
      <div data-testid="open">{String(open)}</div>
      <button type="button" onClick={() => setOpen(true)}>핀</button>
      <button type="button" onClick={() => setOpen(false)}>닫기</button>
      <button type="button" onClick={() => navigate(-1)}>폰 뒤로</button>
    </>
  )
}

function renderAt(initialEntries, initialIndex) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path="/" element={<MapScreen />} />
        <Route path="/timetable" element={<div>시간표 화면</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const press = (name) => act(() => fireEvent.click(screen.getByRole('button', { name })))

describe('useSheetHistory — 폰 뒤로가기는 지도 위 시트부터 닫는다(2026-09-20 사용자)', () => {
  it('시트가 떠 있으면 뒤로가기 한 번에 시트만 닫히고 지도(같은 주소)에 남는다 — 한 번 더 누르면 앞 화면', async () => {
    renderAt(['/timetable', '/?layer=food'], 1)
    press('핀')
    expect(screen.getByTestId('open')).toHaveTextContent('true')

    press('폰 뒤로')
    expect(screen.getByTestId('open')).toHaveTextContent('false')
    expect(screen.getByTestId('loc')).toHaveTextContent('/?layer=food')

    press('폰 뒤로')
    expect(await screen.findByText('시간표 화면')).toBeInTheDocument()
  })

  it('화면에서 닫으면(✕ · 지도 빈 곳) 쌓았던 기록도 지운다 — 다음 뒤로가기가 헛돌지 않는다', async () => {
    renderAt(['/timetable', '/?layer=food'], 1)
    press('핀')
    press('닫기')
    expect(screen.getByTestId('loc')).toHaveTextContent('/?layer=food')

    press('폰 뒤로')
    expect(await screen.findByText('시간표 화면')).toBeInTheDocument()
  })

  it('시트에서 다른 화면으로 갔다가 돌아와 시트 기록 위에 서면, 그 기록을 건너뛴다 — 닫힌 시트를 닫느라 헛돌지 않게', async () => {
    renderAt(['/timetable', '/', { pathname: '/', state: { [SHEET_STATE_KEY]: true } }], 2)
    expect(screen.getByTestId('open')).toHaveTextContent('false')

    press('폰 뒤로')
    expect(await screen.findByText('시간표 화면')).toBeInTheDocument()
  })
})
