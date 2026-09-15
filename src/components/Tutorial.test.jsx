import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import Screen from './Screen'
import Tutorial from './Tutorial'

/*
 * 튜토리얼은 화면이 `data-tour` 로 표시한 곳을 짚고, 지금 화면 프레임(Screen `data-screen`) 안에 그립니다.
 * jsdom 은 크기를 재지 못해 창(하이라이트) 없이 카드만 가운데에 뜹니다 — 흐름 · 문구 · 저장만 봅니다.
 */

function Loc() {
  const location = useLocation()
  return <output data-testid="loc">{location.pathname}</output>
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={
            <Screen>
              <p>홈 화면</p>
              <button type="button" data-tour="terminal">
                고현터미널 핀
              </button>
              <button type="button" data-tour="get-courses">
                코스 추천 받기
              </button>
            </Screen>
          }
        />
        <Route
          path="/spots"
          element={
            <Screen>
              <button type="button" data-tour="first-spot">
                바람의언덕 카드
              </button>
            </Screen>
          }
        />
        <Route
          path="/timetable"
          element={
            <Screen>
              <button type="button" data-tour="first-timetable">
                바람의언덕 줄
              </button>
            </Screen>
          }
        />
        <Route path="/spots/:id" element={<Screen>스팟 상세</Screen>} />
      </Routes>
      <Tutorial />
      <Loc />
    </MemoryRouter>,
  )
}

beforeEach(() => localStorage.clear())

describe('Tutorial — 첫 방문 1회(Figma 02-2 558:200)', () => {
  it('홈에서 네 단계 — 3·4단계는 스팟 · 시간표 탭으로 옮기고, 「시작하기」로 끝내면 홈으로 · 다시 뜨지 않는다', async () => {
    const user = userEvent.setup()
    const { unmount } = renderAt('/')

    expect(await screen.findByRole('dialog', { name: '고현터미널에서 출발해요' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4단계 중 1단계' })).toBeInTheDocument()
    expect(screen.getByText('그래서 모든 코스는 고현터미널에서 시작해요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByRole('heading', { name: '여행 코스를 추천받을 수 있어요' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByRole('heading', { name: '스팟을 둘러보세요' })).toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent('/spots')

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByRole('heading', { name: '스팟마다 버스 시간표가 있어요' })).toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent('/timetable')
    // 마지막은 건너뛸 게 없어 「시작하기」만. 배 시간표는 운항사 자료라 「모든 시간표는 거제시가」라고 쓰지 않는다.
    expect(screen.queryByRole('button', { name: '건너뛰기' })).not.toBeInTheDocument()
    expect(screen.getByText('버스 시간표는 거제시가 직접 제공하는 데이터예요.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '시작하기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)
    expect(localStorage.getItem('gj_onboarded_v1')).not.toBeNull()

    // 다시 열어도 뜨지 않는다
    unmount()
    renderAt('/')
    expect(await screen.findByText('홈 화면')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('「건너뛰기」 · Esc 로 끝내도 표시를 남긴다', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await screen.findByRole('dialog', { name: '고현터미널에서 출발해요' })
    await user.click(screen.getByRole('button', { name: '건너뛰기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('gj_onboarded_v1')).not.toBeNull()

    localStorage.clear()
    const { unmount } = renderAt('/')
    // 앞 렌더와 겹치지 않게 새로 띄운 쪽만 봅니다
    const dialogs = await screen.findAllByRole('dialog', { name: '고현터미널에서 출발해요' })
    await user.keyboard('{Escape}')
    expect(screen.queryAllByRole('dialog')).toHaveLength(dialogs.length - 1)
    expect(localStorage.getItem('gj_onboarded_v1')).not.toBeNull()
    unmount()
  })

  it('공유 링크로 다른 화면에 먼저 들어오면 띄우지 않고 표시도 남기지 않는다 — 홈에 처음 올 때 본다', async () => {
    renderAt('/spots/4')

    expect(await screen.findByText('스팟 상세')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('gj_onboarded_v1')).toBeNull()
  })
})
