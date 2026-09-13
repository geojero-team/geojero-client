import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BASE = 'https://api.example.test'

/** BASE는 모듈을 읽을 때 한 번 정해지므로, 환경변수를 박은 뒤 새로 불러옵니다. */
async function loadApi() {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  return import('./api')
}

function respond(status, body, contentType) {
  return new Response(body, {
    status,
    headers: contentType ? { 'Content-Type': contentType } : {},
  })
}

/** 응답을 주지 않다가 abort 신호가 오면 AbortError로 끝나는 fetch. */
function hangingFetch() {
  return vi.fn((url, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      )
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('request — FormData', () => {
  it('FormData 본문이면 Content-Type을 붙이지 않고 그대로 보낸다', async () => {
    const { api } = await loadApi()
    localStorage.setItem('gj_token', 'tok')
    const fetchMock = vi.fn(async () =>
      respond(201, JSON.stringify({ photoId: 7, imageUrl: '/api/visitor-photos/7/image' }), 'application/json'),
    )
    vi.stubGlobal('fetch', fetchMock)

    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    await api.uploadVisitorPhoto(3, blob, '  바다가 보여요  ')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/api/pois/3/visitor-photos`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' })
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('file')).toBeInstanceOf(Blob)
    expect(init.body.get('caption')).toBe('바다가 보여요')
  })

  it('캡션이 비어 있으면 caption 파트를 보내지 않는다', async () => {
    const { api } = await loadApi()
    const fetchMock = vi.fn(async () =>
      respond(201, JSON.stringify({ photoId: 7, imageUrl: '/api/visitor-photos/7/image' }), 'application/json'),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.uploadVisitorPhoto(3, new Blob(['jpeg']), '   ')

    expect(fetchMock.mock.calls[0][1].body.has('caption')).toBe(false)
  })

  it('JSON 본문은 전과 같이 Content-Type과 문자열로 보낸다', async () => {
    const { api } = await loadApi()
    const fetchMock = vi.fn(async () => respond(201, JSON.stringify({ savedTripId: 1 }), 'application/json'))
    vi.stubGlobal('fetch', fetchMock)

    await api.saveTrip({ courseId: 101, travelDate: '2026-09-14' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"courseId":101,"travelDate":"2026-09-14"}')
  })
})

describe('request — 오류 본문', () => {
  it('problem+json이면 code를 ApiError에 더하고 메시지는 그대로 둔다', async () => {
    const { api, ApiError } = await loadApi()
    vi.stubGlobal('fetch', vi.fn(async () =>
      respond(
        415,
        JSON.stringify({ status: 415, title: 'Unsupported Media Type', code: 'UNSUPPORTED_IMAGE_TYPE' }),
        'application/problem+json',
      ),
    ))

    const error = await api.uploadVisitorPhoto(3, new Blob(['x']), '').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(415)
    expect(error.code).toBe('UNSUPPORTED_IMAGE_TYPE')
    expect(error.message).toBe('POST /api/pois/3/visitor-photos → 415')
  })

  it('JSON이 아닌 오류 본문이면 예외 없이 기존 ApiError로 떨어진다', async () => {
    const { api, ApiError } = await loadApi()
    vi.stubGlobal('fetch', vi.fn(async () => respond(413, '<html>Request Entity Too Large</html>', 'text/html')))

    const error = await api.uploadVisitorPhoto(3, new Blob(['x']), '').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(413)
    expect(error.code).toBeUndefined()
    expect(error.message).toBe('POST /api/pois/3/visitor-photos → 413')
  })

  it('problem+json이라 적고 본문이 깨져 있어도 기존 ApiError로 떨어진다', async () => {
    const { api, ApiError } = await loadApi()
    vi.stubGlobal('fetch', vi.fn(async () => respond(400, '{not json', 'application/problem+json')))

    const error = await api.saveTrip({ courseId: 1, travelDate: '2026-09-14' }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBeUndefined()
    expect(error.message).toBe('POST /api/saved-trips → 400')
  })
})

describe('방문자 사진 호출', () => {
  it('목록은 토큰이 있으면 Bearer를 붙이고 imageUrl을 API 주소 기준으로 붙인다', async () => {
    const { api } = await loadApi()
    localStorage.setItem('gj_token', 'tok')
    const fetchMock = vi.fn(async () =>
      respond(
        200,
        JSON.stringify({
          poiId: 3,
          count: 1,
          photos: [{ photoId: 42, imageUrl: '/api/visitor-photos/42/image', isMine: true }],
        }),
        'application/json',
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await api.getVisitorPhotos(3)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/api/pois/3/visitor-photos`)
    expect(init.method).toBe('GET')
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' })
    expect(res.count).toBe(1)
    expect(res.photos[0].imageUrl).toBe(`${BASE}/api/visitor-photos/42/image`)
  })

  it('목록은 토큰이 없어도 헤더 없이 부른다(보기는 비로그인)', async () => {
    const { api } = await loadApi()
    const fetchMock = vi.fn(async () =>
      respond(200, JSON.stringify({ poiId: 3, count: 0, photos: [] }), 'application/json'),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await api.getVisitorPhotos(3)

    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined()
    expect(res).toEqual({ poiId: 3, count: 0, photos: [] })
  })

  it('올리기 응답의 imageUrl도 API 주소 기준으로 붙인다', async () => {
    const { api } = await loadApi()
    vi.stubGlobal('fetch', vi.fn(async () =>
      respond(201, JSON.stringify({ photoId: 43, imageUrl: '/api/visitor-photos/43/image' }), 'application/json'),
    ))

    const photo = await api.uploadVisitorPhoto(3, new Blob(['x']), '')

    expect(photo.imageUrl).toBe(`${BASE}/api/visitor-photos/43/image`)
  })

  it('삭제는 DELETE를 보내고 204면 null을 돌려준다', async () => {
    const { api } = await loadApi()
    localStorage.setItem('gj_token', 'tok')
    const fetchMock = vi.fn(async () => respond(204, null))
    vi.stubGlobal('fetch', fetchMock)

    const res = await api.deleteVisitorPhoto(42)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/api/visitor-photos/42`)
    expect(init.method).toBe('DELETE')
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' })
    expect(res).toBeNull()
  })
})

describe('타임아웃', () => {
  it('일반 호출은 8초에 끊지만 올리기는 그보다 오래 기다린다', async () => {
    const { api, UPLOAD_TIMEOUT_MS } = await loadApi()
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())

    const me = api.me().catch((e) => e)
    let uploadSettled = false
    const upload = api
      .uploadVisitorPhoto(3, new Blob(['x']), '')
      .catch((e) => e)
      .finally(() => {
        uploadSettled = true
      })

    await vi.advanceTimersByTimeAsync(8000)
    expect((await me).message).toBe('서버가 제때 응답하지 않았습니다')
    expect(uploadSettled).toBe(false)

    expect(UPLOAD_TIMEOUT_MS).toBeGreaterThan(8000)
    await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS - 8000)
    expect((await upload).message).toBe('서버가 제때 응답하지 않았습니다')
  })
})
