/**
 * 서버 호출이 지나가는 한 자리.
 *
 * 기준문서 §6: "인증·저장·TourAPI 장애가 판정을 막지 않는다." 그래서 여기서 나가는
 * 실패는 전부 ApiError 하나로 모읍니다. 호출부는 그걸 잡아서 목으로 떨어지거나
 * 그 부분만 비우면 됩니다 — 화면이 죽으면 안 됩니다.
 *
 * **타임아웃이 필요한 이유**: 서버가 떠 있는데 응답을 못 주는 상태(DB 대기, TourAPI 지연)면
 * fetch는 기본적으로 끝없이 기다립니다. 그러면 스팟 상세가 '불러오는 중'에서 멈춥니다.
 * 죽은 서버보다 느린 서버가 화면에는 더 나쁩니다.
 */
const BASE = import.meta.env.VITE_API_BASE_URL
const TIMEOUT_MS = 8000

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, session = false } = {}) {
  if (!BASE) throw new ApiError('API 주소가 설정되지 않았습니다 (VITE_API_BASE_URL)')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(BASE + path, {
      method,
      // 세션 쿠키가 필요한 경로에만 자격증명을 붙입니다. 서버 CORS가
      // allowCredentials + 정확한 Origin이어야 동작합니다(와일드카드로는 안 됩니다).
      credentials: session ? 'include' : 'omit',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (!res.ok) throw new ApiError(`${method} ${path} → ${res.status}`, res.status)
    return res.status === 204 ? null : await res.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    // AbortError(타임아웃) · 네트워크 단절 · CORS 차단이 전부 여기로 옵니다.
    throw new ApiError(
      error.name === 'AbortError'
        ? '서버가 제때 응답하지 않았습니다'
        : '서버에 연결하지 못했습니다',
    )
  } finally {
    clearTimeout(timer)
  }
}

/**
 * geojero-server 계약 그대로. 화면이 아직 안 쓰는 엔드포인트는 여기 두지 않습니다 —
 * 쓰지 않는 줄은 계약이 맞는지 확인할 방법도 없습니다.
 */
export const api = {
  /** PoisRes { pois: [{ poiId, name, kind, tier, hasEnglish }] } — 좌표 없음(BE 추가 필요) */
  pois: () => request('/api/pois'),

  /**
   * PoiDetailRes { poiId, name, kind, tier, lang, langFallback,
   *                detail: { source, overview, imageUrl }, checkUrl, lastDeparture }
   */
  poi: (poiId, lang = 'ko') => request(`/api/pois/${poiId}?lang=${lang}`),
}
