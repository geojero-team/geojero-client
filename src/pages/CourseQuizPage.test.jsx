import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { loadSpotPhotos } from '../lib/spots'
import CourseQuizPage from './CourseQuizPage'

vi.mock('../lib/api', () => ({ api: { courses: vi.fn() } }))

vi.mock('../lib/spots', async (importOriginal) => ({
  ...(await importOriginal()),
  loadSpotPhotos: vi.fn(),
}))

const spot = (seq, poiId, shortName, theme) => ({ seq, poiId, name: shortName, shortName, theme, lat: 34.7, lng: 128.6 })

/** 서버 응답 모양 그대로(2026-09-20 /api/courses 실측). */
const course = ({ id, code, themes, nine = 0, busMin = 150, totalMin = 510, ferryMin = 0, featuredRank = null, title, intro }) => ({
  courseId: id,
  courseCode: code,
  spotCount: themes.length,
  nineScenicCount: nine,
  nineScenicNos: [],
  name: code,
  title,
  intro,
  featuredRank,
  approxTotalMin: totalMin,
  busMinTotal: busMin,
  ferryMinTotal: ferryMin,
  holidayNoBusLegs: [],
  spots: themes.map((theme, i) => spot(i + 1, id * 10 + i, `${code}스팟${i + 1}`, theme)),
})

const BEACH = course({
  id: 101,
  code: '3-01',
  themes: ['BEACH', 'BEACH', 'VIEW'],
  nine: 1,
  busMin: 117,
  title: '파도가 몽돌을 굴리는 소리 따라',
  intro: '바다를 따라 걷는 코스입니다.',
})
const VIEW = course({
  id: 102,
  code: '3-12',
  themes: ['VIEW', 'VIEW', 'VIEW'],
  nine: 3,
  busMin: 220,
  featuredRank: 3,
  title: '남쪽 바다를 내려다보며',
  intro: '전망 좋은 곳만 이었습니다.',
})
const GARDEN = course({
  id: 103,
  code: '3-13',
  themes: ['GARDEN', 'VIEW', 'GARDEN'],
  nine: 2,
  busMin: 178,
  title: '초록 사이를 걷는 하루',
  intro: '정원과 숲을 지납니다.',
})
/** 문구가 없는 코스 — 후보에서 빠져야 합니다(대표 10개 밖에는 이런 코스가 12개 있습니다). */
const NO_TEXT = { ...course({ id: 104, code: '3-07', themes: ['BEACH', 'BEACH', 'BEACH'], busMin: 100 }), title: null, intro: null }

function Harness() {
  const location = useLocation()
  return (
    <Routes>
      <Route path="/course-quiz" element={<CourseQuizPage />} />
      <Route path="*" element={<p>다른 화면 {location.pathname}</p>} />
    </Routes>
  )
}

const renderQuiz = () =>
  render(
    <MemoryRouter initialEntries={['/course-quiz']}>
      <Harness />
    </MemoryRouter>,
  )

/** 질문 셋에 차례로 답합니다. */
const answer = async (user, ...labels) => {
  for (const label of labels) {
    await user.click(await screen.findByRole('button', { name: new RegExp(label) }))
  }
}

beforeEach(() => {
  vi.mocked(api.courses).mockResolvedValue({ courses: [BEACH, VIEW, GARDEN, NO_TEXT] })
  vi.mocked(loadSpotPhotos).mockResolvedValue(new Map())
})

describe('성향으로 코스 찾기(2026-09-20)', () => {
  it('질문 셋을 차례로 묻고, 답에 맞는 코스와 그 이유를 보여준다', async () => {
    const user = userEvent.setup()
    renderQuiz()

    // 1번 질문 — 몇 번째인지 보입니다.
    expect(await screen.findByText('어떤 풍경을 보고 싶어요?')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    await answer(user, '바다·해변', '여유롭게 세 곳', '덜 붐비는 곳')

    expect(await screen.findByText('이 코스가 가장 잘 맞아요')).toBeInTheDocument()
    // 1등 카드 안에서 — 같은 이유 알약이 아래 후보 카드에도 붙습니다.
    const best = screen.getByRole('button', { name: /파도가 몽돌을 굴리는 소리 따라/ })
    // 왜 골랐는지 — 값은 서버 데이터 그대로입니다.
    expect(within(best).getByText('바다·해변 2곳')).toBeInTheDocument()
    expect(within(best).getByText('3곳 · 총 8시간 30분')).toBeInTheDocument()
  })

  it('대표 코스 밖이어도 고르고, 제목 · 소개가 없는 코스는 후보에서 뺀다', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await screen.findByText('어떤 풍경을 보고 싶어요?')

    // 바다 세 곳인 3-07 이 점수로는 1등이지만 문구가 없어 빠지고, 문구가 있는 3-01 이 남습니다.
    await answer(user, '바다·해변', '이동이 짧은 쪽', '덜 붐비는 곳')

    expect(await screen.findByText('파도가 몽돌을 굴리는 소리 따라')).toBeInTheDocument()
    expect(screen.queryByText(/3-07/)).not.toBeInTheDocument()
  })

  it('1등 말고 다른 후보 둘을 함께 보여준다', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await screen.findByText('어떤 풍경을 보고 싶어요?')
    await answer(user, '전망·명소', '여유롭게 세 곳', '거제 9경 위주')

    expect(await screen.findByText('남쪽 바다를 내려다보며')).toBeInTheDocument()
    expect(screen.getByText('이런 코스도 맞아요')).toBeInTheDocument()
    expect(screen.getByText('초록 사이를 걷는 하루')).toBeInTheDocument()
  })

  it('결과에서 코스를 누르면 코스 상세로 간다', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await screen.findByText('어떤 풍경을 보고 싶어요?')
    await answer(user, '정원·숲', '여유롭게 세 곳', '덜 붐비는 곳')

    await user.click(await screen.findByRole('button', { name: /초록 사이를 걷는 하루/ }))
    expect(screen.getByText('다른 화면 /courses/103')).toBeInTheDocument()
  })

  it('뒤로는 앞 질문으로 돌아가고, 고른 답이 그대로 남는다', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await screen.findByText('어떤 풍경을 보고 싶어요?')
    await answer(user, '바다·해변')

    expect(await screen.findByText('하루를 어떻게 보내고 싶어요?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '뒤로' }))

    expect(await screen.findByText('어떤 풍경을 보고 싶어요?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /바다·해변/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('다시 답해 보기를 누르면 첫 질문으로', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await screen.findByText('어떤 풍경을 보고 싶어요?')
    await answer(user, '바다·해변', '여유롭게 세 곳', '덜 붐비는 곳')

    await user.click(await screen.findByRole('button', { name: '다시 답해 보기' }))
    expect(await screen.findByText('어떤 풍경을 보고 싶어요?')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  /* 코스를 못 받으면 **질문을 시작하기 전에** 말합니다 — 셋 다 답하게 두고 마지막에 실패하면 그 시간이 버려집니다. */
  it('코스를 못 받으면 질문 대신 이유를 적는다', async () => {
    vi.mocked(api.courses).mockRejectedValue(new Error('500'))
    renderQuiz()

    expect(await screen.findByText(/500/)).toBeInTheDocument()
    expect(screen.queryByText('어떤 풍경을 보고 싶어요?')).not.toBeInTheDocument()
  })
})
