import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, beginKakaoLogin, beginKakaoLoginTo } from '../lib/api'
import { UploadImageError, makePreviewUrl, resizeForUpload } from '../lib/resizeForUpload'
import Screen from './Screen'
import VisitorPhotos from './VisitorPhotos'

vi.mock('../lib/api', () => ({
  api: {
    getVisitorPhotos: vi.fn(),
    uploadVisitorPhoto: vi.fn(),
    deleteVisitorPhoto: vi.fn(),
    me: vi.fn(),
  },
  beginKakaoLogin: vi.fn(),
  beginKakaoLoginTo: vi.fn(),
}))

vi.mock('../lib/resizeForUpload', async (importOriginal) => ({
  ...(await importOriginal()),
  resizeForUpload: vi.fn(),
  makePreviewUrl: vi.fn(() => 'blob:preview'),
  releasePreviewUrl: vi.fn(),
}))

const PHOTOS = [
  {
    photoId: 42,
    imageUrl: 'https://api.example.test/api/visitor-photos/42/image',
    width: 1600,
    height: 1200,
    caption: '몽돌 소리가 좋아요',
    uploadedDate: '2026-09-13',
    isMine: true,
  },
  {
    photoId: 41,
    imageUrl: 'https://api.example.test/api/visitor-photos/41/image',
    width: 1200,
    height: 1600,
    caption: null,
    uploadedDate: '2026-09-10',
    isMine: false,
  },
]

const NEW_PHOTO = {
  photoId: 43,
  imageUrl: 'https://api.example.test/api/visitor-photos/43/image',
  width: 1600,
  height: 1200,
  caption: '몽돌 소리',
  uploadedDate: '2026-09-13',
  isMine: true,
}

const LOGIN_TITLE = '사진을 올리려면 로그인 해주세요'
const SHEET_TITLE = '학동몽돌해변에서 찍은 사진'
const NOTICE = '날짜는 자동으로 붙어요 · 사진 속 위치 정보는 저장하지 않아요'

const listOf = (photos) => ({ poiId: 3, count: photos.length, photos })
const httpError = (status, code) => Object.assign(new Error(`POST /api/x → ${status}`), { status, code })

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="loc">{location.pathname + location.search}</output>
}

/** 지도 시트 호스트(주소 그대로)면 uploadInUrl 없이, 스팟 상세 화면이면 uploadInUrl로 그립니다. */
function renderSection({ route = '/', uploadInUrl = false, wrap = (node) => node } = {}) {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="*"
          element={wrap(
            <>
              <VisitorPhotos poiId={3} spotName="학동몽돌해변" uploadInUrl={uploadInUrl} />
              <LocationProbe />
            </>,
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
  return user
}

/** 줄이기를 손으로 끝내는 약속 — 먼저 고른 사진이 늦게 끝나는 경우를 만듭니다. */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const jpegFile = (name) => new File(['raw'], name, { type: 'image/jpeg' })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // clearAllMocks는 구현을 남깁니다. 테스트가 바꾼 미리보기 주소를 되돌립니다.
  makePreviewUrl.mockImplementation(() => 'blob:preview')
})

describe('방문자 사진 — 보기', () => {
  /** 사진 칸 자리(484:220~224)의 「방문자 사진」 글자 — 같은 글자인 제목은 뺍니다. */
  const slotLabels = () => screen.queryAllByText('방문자 사진').filter((el) => el.tagName !== 'H2')

  it('0장이면 02-2 스팟 상세 그림(484:212) 그대로 — 올리기 칸 + 빈 사진 칸 3개, 누를 사진 타일은 없다', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    renderSection()

    expect(await screen.findByRole('button', { name: '내 사진 올리기' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '방문자 사진' })).toBeInTheDocument()
    expect(slotLabels()).toHaveLength(3)
    expect(screen.queryAllByRole('button', { name: /번째 방문자 사진$/ })).toHaveLength(0)
    expect(api.getVisitorPhotos).toHaveBeenCalledWith(3)

    // 더보기는 피그마(485:213)대로 0장이어도 보입니다 — 열 사진이 없어 누를 수는 없습니다(사용자 요청 2026-09-14).
    expect(screen.getByRole('button', { name: '방문자 사진 더보기' })).toBeDisabled()
    // 02-1의 빈 상태 카드 문구는 쓰지 않습니다.
    for (const absent of ['0장', '12장', '신고', '아직 올라온 사진이 없어요', '첫 사진 올리기']) {
      expect(screen.queryByText(absent)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/여행자 A/)).not.toBeInTheDocument()
    expect(screen.queryByText(/55번 09:05/)).not.toBeInTheDocument()
  })

  it('불러오는 중에는 더보기 없이 로딩 문구만', () => {
    api.getVisitorPhotos.mockReturnValue(new Promise(() => {}))
    renderSection()

    expect(screen.getByText('사진을 불러오는 중')).toBeInTheDocument()
    expect(screen.queryByText('더보기')).not.toBeInTheDocument()
    expect(slotLabels()).toHaveLength(0)
  })

  it('불러오기 실패는 빈 상태가 아니라 실패 문구 — 다시 시도하면 다시 부른다', async () => {
    api.getVisitorPhotos.mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce(listOf(PHOTOS))
    const user = renderSection()

    expect(await screen.findByText('사진을 불러오지 못했어요')).toBeInTheDocument()
    expect(slotLabels()).toHaveLength(0)
    expect(screen.queryByText(/→ 500/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })).toHaveLength(2)
    expect(api.getVisitorPhotos).toHaveBeenCalledTimes(2)
  })

  it('2장: 더보기·올리기 타일·사진 타일 2개 — 개수와 캡션 카드는 없다 (02-2 `484:212`)', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf(PHOTOS))
    renderSection()

    const tiles = await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })
    expect(tiles).toHaveLength(2)
    expect(screen.getByRole('button', { name: '방문자 사진 더보기' })).toHaveTextContent('더보기')
    expect(screen.getByRole('button', { name: '방문자 사진 더보기' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '내 사진 올리기' })).toBeInTheDocument()
    // 타일 사진은 장식(alt="")이라 역할로 찾지 않습니다 — 버튼의 이름이 사진을 말합니다.
    expect(tiles[0].querySelector('img')).toHaveAttribute('src', PHOTOS[0].imageUrl)

    expect(slotLabels()).toHaveLength(0)
    expect(screen.queryByText('2장')).not.toBeInTheDocument()
    expect(screen.queryByText('몽돌 소리가 좋아요')).not.toBeInTheDocument()
    expect(screen.queryByText('9/13(일)')).not.toBeInTheDocument()
  })

  it('더보기를 누르면 뷰어가 1장부터 열린다', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf(PHOTOS))
    const user = renderSection()

    await user.click(await screen.findByRole('button', { name: '방문자 사진 더보기' }))

    const viewer = screen.getByRole('dialog', { name: '방문자 사진 크게 보기' })
    expect(within(viewer).getByText('1 / 2')).toBeInTheDocument()
  })

  it('타일을 한 번 누르면 바로 그 사진의 뷰어 — 넘기고 닫는다', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf(PHOTOS))
    const user = renderSection()
    const tiles = await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })

    await user.click(tiles[1])
    let viewer = screen.getByRole('dialog', { name: '방문자 사진 크게 보기' })
    expect(within(viewer).getByText('2 / 2')).toBeInTheDocument()
    await user.click(within(viewer).getByRole('button', { name: '닫기' }))

    await user.click(tiles[0])
    viewer = screen.getByRole('dialog', { name: '방문자 사진 크게 보기' })
    expect(within(viewer).getByText('1 / 2')).toBeInTheDocument()
    expect(within(viewer).getByText('9/13(일)')).toBeInTheDocument()
    expect(within(viewer).getByText('몽돌 소리가 좋아요')).toBeInTheDocument()
    expect(within(viewer).getByRole('button', { name: '이전 사진' })).toBeDisabled()

    await user.click(within(viewer).getByRole('button', { name: '다음 사진' }))
    expect(within(viewer).getByText('2 / 2')).toBeInTheDocument()
    expect(within(viewer).getByText('9/10(목)')).toBeInTheDocument()
    expect(within(viewer).getByRole('button', { name: '다음 사진' })).toBeDisabled()
    expect(within(viewer).getByRole('button', { name: '이전 사진' })).toBeEnabled()

    await user.click(within(viewer).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('내 사진이면 뷰어에 「삭제」, 남의 사진이면 없다 — 「신고」는 어디에도 없다', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf(PHOTOS))
    const user = renderSection()
    const tiles = await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })

    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()

    await user.click(tiles[1])
    const viewer = screen.getByRole('dialog')
    expect(within(viewer).queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
    await user.click(within(viewer).getByRole('button', { name: '이전 사진' }))
    expect(within(viewer).getByRole('button', { name: '삭제' })).toBeInTheDocument()

    expect(screen.queryByText('신고')).not.toBeInTheDocument()
  })

  it('내 사진 삭제 — 한 번 더 확인한 뒤 deleteVisitorPhoto를 부르고 뷰어를 닫고 목록을 다시 받는다', async () => {
    api.getVisitorPhotos
      .mockResolvedValueOnce(listOf(PHOTOS))
      .mockResolvedValueOnce(listOf([PHOTOS[1]]))
    api.deleteVisitorPhoto.mockResolvedValue(null)
    const user = renderSection()
    const tiles = await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })

    await user.click(tiles[0])
    const viewer = screen.getByRole('dialog')
    await user.click(within(viewer).getByRole('button', { name: '삭제' }))
    expect(within(viewer).getByText('이 사진을 지울까요?')).toBeInTheDocument()
    expect(api.deleteVisitorPhoto).not.toHaveBeenCalled()

    await user.click(within(viewer).getByRole('button', { name: '삭제' }))
    expect(api.deleteVisitorPhoto).toHaveBeenCalledWith(42)
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /번째 방문자 사진$/ })).toHaveLength(1),
    )
    expect(api.getVisitorPhotos).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  /** 내 사진(42)의 뷰어를 열어 「삭제」 → 확인 「삭제」까지 누릅니다. */
  async function confirmDeleteOfMine(user) {
    const tiles = await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })
    await user.click(tiles[0])
    const viewer = screen.getByRole('dialog')
    await user.click(within(viewer).getByRole('button', { name: '삭제' }))
    await user.click(within(viewer).getByRole('button', { name: '삭제' }))
  }

  it.each([
    [401, '세션을 지운다', null],
    [403, '세션은 둔다', 'tok'],
  ])('삭제가 %i로 실패하면 %s — 「사진을 지우지 못했어요」 · 목록을 다시 받는다', async (status, _, tokenAfter) => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf(PHOTOS))
    api.deleteVisitorPhoto.mockRejectedValue(httpError(status))
    const user = renderSection()

    await confirmDeleteOfMine(user)

    expect(await screen.findByText('사진을 지우지 못했어요')).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBe(tokenAfter)
    await waitFor(() => expect(api.getVisitorPhotos).toHaveBeenCalledTimes(2))
    expect(screen.queryByText(/→ \d+/)).not.toBeInTheDocument()
  })

  it('삭제가 404면 이미 없는 사진이라 알리지 않고 목록만 다시 받는다', async () => {
    api.getVisitorPhotos
      .mockResolvedValueOnce(listOf(PHOTOS))
      .mockResolvedValueOnce(listOf([PHOTOS[1]]))
    api.deleteVisitorPhoto.mockRejectedValue(httpError(404))
    const user = renderSection()

    await confirmDeleteOfMine(user)

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /번째 방문자 사진$/ })).toHaveLength(1),
    )
    expect(screen.queryByText('사진을 지우지 못했어요')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('뷰어는 지도 시트처럼 갇힌 자리에서 열어도 화면 프레임에 그린다', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf(PHOTOS))
    const user = renderSection({
      wrap: (node) => (
        <Screen data-testid="frame">
          <div data-testid="sheet" style={{ overflow: 'hidden', position: 'absolute', zIndex: 3 }}>
            {node}
          </div>
        </Screen>
      ),
    })
    const tiles = await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })

    await user.click(tiles[0])

    expect(screen.getByRole('dialog').parentElement).toBe(screen.getByTestId('frame'))
  })
})

describe('방문자 사진 — 올리기 진입 (지도 시트: 주소를 바꾸지 않는다)', () => {
  it('비로그인이면 사진용 로그인 시트 — 로그인은 /spots/{id}?upload=1 로 돌아오게 맡긴다', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    const user = renderSection()

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    expect(screen.getByRole('heading', { name: LOGIN_TITLE })).toBeInTheDocument()
    expect(screen.queryByText('코스를 저장하려면 로그인 해주세요')).not.toBeInTheDocument()
    expect(api.me).not.toHaveBeenCalled()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLoginTo).toHaveBeenCalledWith('/spots/3?upload=1')
    expect(beginKakaoLogin).not.toHaveBeenCalled()
  })

  it('로그인 상태면 /api/me 로 세션을 확인하고 200이면 그 자리에서 올리기 시트', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf(PHOTOS))
    api.me.mockResolvedValue({ nickname: '뚜벅이' })
    const user = renderSection()

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    expect(await screen.findByRole('heading', { name: SHEET_TITLE })).toBeInTheDocument()
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    expect(api.me).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)
  })

  it('/api/me 가 401이면 세션을 지우고 로그인 시트', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    api.me.mockRejectedValue(httpError(401))
    const user = renderSection()

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    expect(await screen.findByRole('heading', { name: LOGIN_TITLE })).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBeNull()
    expect(screen.queryByRole('heading', { name: SHEET_TITLE })).not.toBeInTheDocument()
  })

  it('/api/me 가 403이어도 세션을 지우고 로그인 시트', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    api.me.mockRejectedValue(httpError(403))
    const user = renderSection()

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    expect(await screen.findByRole('heading', { name: LOGIN_TITLE })).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBeNull()
  })

  it.each([
    [500, '서버 장애'],
    [0, '타임아웃·연결 실패'],
  ])('/api/me 가 %i(%s)면 세션 문제가 아니다 — 토큰을 두고 올리기 시트를 연다', async (status) => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    api.me.mockRejectedValue(httpError(status))
    const user = renderSection()

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    expect(await screen.findByRole('heading', { name: SHEET_TITLE })).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBe('tok')
    expect(screen.queryByRole('heading', { name: LOGIN_TITLE })).not.toBeInTheDocument()
  })

  it('올리기 시트도 지도 시트처럼 갇힌 자리에서 열면 화면 프레임에 그린다', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    api.me.mockResolvedValue({ nickname: '뚜벅이' })
    const user = renderSection({
      wrap: (node) => (
        <Screen data-testid="frame">
          <div data-testid="sheet" style={{ overflow: 'hidden', position: 'absolute', zIndex: 3 }}>
            {node}
          </div>
        </Screen>
      ),
    })

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    const sheet = await screen.findByRole('dialog', { name: '사진 올리기' })
    expect(sheet.parentElement).toBe(screen.getByTestId('frame'))
  })
})

describe('방문자 사진 — 올리기 진입 (스팟 상세 화면: ?upload=1)', () => {
  it('누르면 ?upload=1 을 붙이고, 비로그인이면 로그인 시트 → beginKakaoLogin', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    const user = renderSection({ route: '/spots/3', uploadInUrl: true })

    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))

    expect(screen.getByTestId('loc')).toHaveTextContent('/spots/3?upload=1')
    expect(screen.getByRole('heading', { name: LOGIN_TITLE })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '카카오로 로그인' }))
    expect(beginKakaoLogin).toHaveBeenCalled()
    expect(beginKakaoLoginTo).not.toHaveBeenCalled()
  })

  it('?upload=1 로 들어오면(로그인 복귀) /api/me 200 뒤 올리기 시트', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    api.me.mockResolvedValue({ nickname: '뚜벅이' })
    renderSection({ route: '/spots/3?upload=1', uploadInUrl: true })

    expect(await screen.findByRole('heading', { name: SHEET_TITLE })).toBeInTheDocument()
    expect(api.me).toHaveBeenCalledTimes(1)
  })

  it('?upload=1 인데 /api/me 가 401이면 clearSession 후 로그인 시트', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    api.me.mockRejectedValue(httpError(401))
    renderSection({ route: '/spots/3?upload=1', uploadInUrl: true })

    expect(await screen.findByRole('heading', { name: LOGIN_TITLE })).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBeNull()
  })

  it('시트를 닫으면 ?upload=1 을 지운다', async () => {
    api.getVisitorPhotos.mockResolvedValue(listOf([]))
    const user = renderSection({ route: '/spots/3?upload=1', uploadInUrl: true })

    await user.click(screen.getByRole('button', { name: '나중에' }))

    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/spots\/3$/)
    expect(screen.queryByRole('heading', { name: LOGIN_TITLE })).not.toBeInTheDocument()
  })
})

describe('방문자 사진 — 올리기 시트', () => {
  /** 로그인 상태에서 시트를 엽니다. 목록은 처음 0장, 다음 호출부터 새 사진 1장. */
  async function openSheet() {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValueOnce(listOf([])).mockResolvedValue(listOf([NEW_PHOTO]))
    api.me.mockResolvedValue({ nickname: '뚜벅이' })
    const user = renderSection()
    await user.click(await screen.findByRole('button', { name: '내 사진 올리기' }))
    await screen.findByRole('heading', { name: SHEET_TITLE })
    return user
  }

  async function pickPhoto(user) {
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    resizeForUpload.mockResolvedValue(blob)
    const file = new File(['raw'], 'IMG_0001.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('사진 고르기'), file)
    await screen.findByRole('img', { name: '선택한 사진' })
    return { blob, file }
  }

  it('사진이 없으면 「올리기」 비활성, 캡션 입력은 200자 제한과 자리글 원문', async () => {
    await openSheet()

    expect(screen.getByRole('button', { name: '올리기' })).toBeDisabled()
    const caption = screen.getByPlaceholderText('한 줄 남기기 (선택)')
    expect(caption).toHaveAttribute('maxlength', '200')
  })

  it('사진을 고르면 줄여서 미리보기 → 올리기 → uploadVisitorPhoto · 시트 닫고 목록 갱신', async () => {
    const user = await openSheet()
    api.uploadVisitorPhoto.mockResolvedValue(NEW_PHOTO)

    const { blob, file } = await pickPhoto(user)
    expect(resizeForUpload).toHaveBeenCalledWith(file)
    expect(screen.getByRole('img', { name: '선택한 사진' })).toHaveAttribute('src', 'blob:preview')
    expect(screen.getByLabelText('사진 바꾸기')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('한 줄 남기기 (선택)'), '몽돌 소리')
    await user.click(screen.getByRole('button', { name: '올리기' }))

    expect(api.uploadVisitorPhoto).toHaveBeenCalledWith(3, blob, '몽돌 소리')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: SHEET_TITLE })).not.toBeInTheDocument(),
    )
    expect(await screen.findAllByRole('button', { name: /번째 방문자 사진$/ })).toHaveLength(1)
    expect(screen.getByText('사진을 올렸어요')).toBeInTheDocument()
  })

  it('스팟 상세 화면(?upload=1)에서 올리기에 성공하면 주소에서 upload를 지우고 시트를 닫는다', async () => {
    localStorage.setItem('gj_token', 'tok')
    api.getVisitorPhotos.mockResolvedValueOnce(listOf([])).mockResolvedValue(listOf([NEW_PHOTO]))
    api.me.mockResolvedValue({ nickname: '뚜벅이' })
    api.uploadVisitorPhoto.mockResolvedValue(NEW_PHOTO)
    const user = renderSection({ route: '/spots/3?upload=1', uploadInUrl: true })
    await screen.findByRole('heading', { name: SHEET_TITLE })
    await pickPhoto(user)

    await user.click(screen.getByRole('button', { name: '올리기' }))

    expect(await screen.findByText('사진을 올렸어요')).toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/spots\/3$/)
    expect(screen.queryByRole('heading', { name: SHEET_TITLE })).not.toBeInTheDocument()
  })

  it('올리는 중에는 「올리는 중」으로 비활성', async () => {
    const user = await openSheet()
    api.uploadVisitorPhoto.mockReturnValue(new Promise(() => {}))
    await pickPhoto(user)

    await user.click(screen.getByRole('button', { name: '올리기' }))

    expect(screen.getByRole('button', { name: '올리는 중' })).toBeDisabled()
  })

  it.each([
    [413, undefined, '사진이 너무 커요'],
    [415, 'UNSUPPORTED_IMAGE_TYPE', '이 사진은 올릴 수 없어요'],
    [400, 'CAPTION_TOO_LONG', '한 줄은 200자까지예요'],
    [0, undefined, '올리지 못했어요. 잠시 뒤 다시 시도해 주세요'],
    // 캡션 초과가 아닌 400은 전부 사진 문제입니다 — 서버 ErrorCode 이름 그대로.
    [400, 'FILE_REQUIRED', '이 사진은 올릴 수 없어요'],
    [400, 'IMAGE_UNREADABLE', '이 사진은 올릴 수 없어요'],
    [400, 'IMAGE_TOO_MANY_PIXELS', '이 사진은 올릴 수 없어요'],
    [400, undefined, '이 사진은 올릴 수 없어요'],
    // 사진 탓이 아닌 실패는 다시 시도하라고만 말합니다.
    [403, 'ACCESS_DENIED', '올리지 못했어요. 잠시 뒤 다시 시도해 주세요'],
    [404, 'POI_NOT_FOUND', '올리지 못했어요. 잠시 뒤 다시 시도해 주세요'],
    [500, 'INTERNAL_SERVER_ERROR', '올리지 못했어요. 잠시 뒤 다시 시도해 주세요'],
  ])('%i(%s) 오류 → 「%s」, 시트와 입력은 그대로', async (status, code, message) => {
    const user = await openSheet()
    api.uploadVisitorPhoto.mockRejectedValue(httpError(status, code))
    await pickPhoto(user)
    await user.type(screen.getByPlaceholderText('한 줄 남기기 (선택)'), '몽돌 소리')

    await user.click(screen.getByRole('button', { name: '올리기' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: SHEET_TITLE })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('한 줄 남기기 (선택)')).toHaveValue('몽돌 소리')
    expect(screen.getByRole('img', { name: '선택한 사진' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '올리기' })).toBeEnabled()
    expect(screen.queryByText(/→ \d+/)).not.toBeInTheDocument()
  })

  it('401 오류 → clearSession 후 로그인 시트', async () => {
    const user = await openSheet()
    api.uploadVisitorPhoto.mockRejectedValue(httpError(401))
    await pickPhoto(user)

    await user.click(screen.getByRole('button', { name: '올리기' }))

    expect(await screen.findByRole('heading', { name: LOGIN_TITLE })).toBeInTheDocument()
    expect(localStorage.getItem('gj_token')).toBeNull()
    expect(screen.queryByRole('heading', { name: SHEET_TITLE })).not.toBeInTheDocument()
  })

  it.each([
    ['UNREADABLE', '이 사진은 올릴 수 없어요'],
    ['TOO_LARGE', '사진이 너무 커요'],
  ])('고른 사진을 줄이지 못하면(%s) 「%s」, 올리기는 비활성', async (reason, message) => {
    const user = await openSheet()
    resizeForUpload.mockRejectedValue(new UploadImageError(reason))

    await user.upload(
      screen.getByLabelText('사진 고르기'),
      new File(['raw'], 'IMG.heic', { type: 'image/heic' }),
    )

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '올리기' })).toBeDisabled()
    expect(api.uploadVisitorPhoto).not.toHaveBeenCalled()
  })

  it('늦게 끝난 앞 사진이 뒤에 고른 사진을 덮지 않는다 — 올라가는 것도 뒤 사진', async () => {
    const user = await openSheet()
    api.uploadVisitorPhoto.mockReturnValue(new Promise(() => {}))
    const blobA = new Blob(['A'], { type: 'image/jpeg' })
    const blobB = new Blob(['B'], { type: 'image/jpeg' })
    const slowA = deferred()
    resizeForUpload.mockReturnValueOnce(slowA.promise).mockResolvedValueOnce(blobB)
    makePreviewUrl.mockImplementation((blob) => (blob === blobA ? 'blob:A' : 'blob:B'))

    await user.upload(screen.getByLabelText('사진 고르기'), jpegFile('A.jpg'))
    await user.upload(screen.getByLabelText('사진 고르기'), jpegFile('B.jpg'))
    expect(await screen.findByRole('img', { name: '선택한 사진' })).toHaveAttribute('src', 'blob:B')

    await act(async () => slowA.resolve(blobA))

    expect(screen.getByRole('img', { name: '선택한 사진' })).toHaveAttribute('src', 'blob:B')
    await user.click(screen.getByRole('button', { name: '올리기' }))
    expect(api.uploadVisitorPhoto).toHaveBeenCalledWith(3, blobB, '')
  })

  it('늦게 실패한 앞 사진이 뒤에 고른 사진 위에 오류를 띄우지 않는다', async () => {
    const user = await openSheet()
    const slowA = deferred()
    resizeForUpload
      .mockReturnValueOnce(slowA.promise)
      .mockResolvedValueOnce(new Blob(['B'], { type: 'image/jpeg' }))

    await user.upload(screen.getByLabelText('사진 고르기'), jpegFile('A.jpg'))
    await user.upload(screen.getByLabelText('사진 고르기'), jpegFile('B.jpg'))
    await screen.findByRole('img', { name: '선택한 사진' })

    await act(async () => slowA.reject(new UploadImageError('UNREADABLE')))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '올리기' })).toBeEnabled()
  })

  it('앞 사진이 먼저 끝나도 뒤 사진을 줄이는 동안에는 「올리기」가 비활성 — 이전 사진이 올라가지 않는다', async () => {
    const user = await openSheet()
    await pickPhoto(user)
    const slowA = deferred()
    const slowB = deferred()
    resizeForUpload.mockReturnValueOnce(slowA.promise).mockReturnValueOnce(slowB.promise)

    await user.upload(screen.getByLabelText('사진 바꾸기'), jpegFile('A.jpg'))
    await user.upload(screen.getByLabelText('사진 바꾸기'), jpegFile('B.jpg'))
    await act(async () => slowA.resolve(new Blob(['A'], { type: 'image/jpeg' })))

    expect(screen.getByRole('button', { name: '올리기' })).toBeDisabled()

    await act(async () => slowB.resolve(new Blob(['B'], { type: 'image/jpeg' })))
    expect(screen.getByRole('button', { name: '올리기' })).toBeEnabled()
  })
})
