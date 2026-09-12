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
import { getToken, stashReturnTo } from './session'

const BASE = import.meta.env.VITE_API_BASE_URL
const TIMEOUT_MS = 8000

/** 카카오를 거쳐 돌아올 우리 쪽 주소. 카카오 콘솔에 등록된 값과 글자까지 같아야 합니다. */
export const KAKAO_CALLBACK_PATH = '/auth/callback'

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
    // 다른 사이트라 쿠키가 안 붙습니다. 서버가 준 같은 토큰을 헤더로 보냅니다 —
    // 같은 사이트(geojero.com)가 되면 서버가 쿠키를 먼저 보므로 이 헤더는 무해합니다.
    const token = session ? getToken() : null
    const headers = {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const res = await fetch(BASE + path, {
      method,
      // 세션 쿠키가 필요한 경로에만 자격증명을 붙입니다. 서버 CORS가
      // allowCredentials + 정확한 Origin이어야 동작합니다(와일드카드로는 안 됩니다).
      credentials: session ? 'include' : 'omit',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
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
  /**
   * PoisRes { pois: [{ poiId, name, shortName, kind, theme, region, category,
   *                    tier, hasEnglish, lat, lng, imageUrl }] }
   *
   * withImages=true면 서버가 POI마다 TourAPI를 부릅니다(24h 캐시). 사진이 필요한 화면만
   * 켭니다 — 이름→id 해석은 사진이 필요 없고, 켜면 첫 요청이 느려집니다.
   * 저작권 보류(cpyrhtDivCd Type3)인 POI는 imageUrl이 null로 옵니다.
   */
  pois: (withImages = false) => request(`/api/pois${withImages ? '?withImages=true' : ''}`),

  /**
   * PoiDetailRes { poiId, name, kind, tier, lang, langFallback,
   *                detail: { source, overview, imageUrl }, checkUrl, lastDeparture }
   */
  poi: (poiId, lang = 'ko') => request(`/api/pois/${poiId}?lang=${lang}`),

  /**
   * 카카오 인증 화면으로 보내는 앞단. REST 키가 서버에만 있으므로 서버가 302합니다.
   * fetch가 아니라 주소창을 옮깁니다 — 카카오 로그인 화면을 사용자가 봐야 합니다.
   */
  kakaoStart(redirectUri) {
    if (!BASE) throw new ApiError('API 주소가 설정되지 않았습니다 (VITE_API_BASE_URL)')
    const query = new URLSearchParams({ redirectUri })
    window.location.assign(`${BASE}/api/auth/kakao/start?${query}`)
  },

  /** 콜백에서 받은 code를 세션으로 바꿉니다. { ok, nickname, token } */
  kakaoLogin: (code, redirectUri) =>
    request('/api/auth/kakao', { method: 'POST', body: { code, redirectUri }, session: true }),

  logout: () => request('/api/auth/logout', { method: 'POST', session: true }),

  me: () => request('/api/me', { session: true }),

  /**
   * 추천 코스 목록 — 「코스 추천」 화면(Figma 446:559).
   *
   * spotCount(3·4·5)로 걸러도 counts는 **전량**을 셉니다. 칩은 코스가 0개여도 개수를
   * 보여주고 비활성해야 하기 때문입니다 — 지금 4곳이 0개입니다(배 시간표 대기).
   *
   * CoursesRes {
   *   counts: { '3': 1, '4': 0, '5': 2 },
   *   courses: [{ courseId, courseCode, spotCount, rank, nineScenicCount,
   *               name, summary, departAt, returnAt, approxTotalMin, approxTotalText,
   *               spots: [{ seq, poiId, name, shortName, theme, lat, lng }] }] }
   */
  courses: (spotCount) =>
    request(`/api/courses${spotCount ? `?spotCount=${spotCount}` : ''}`),

  /**
   * 코스 상세 — 「코스 상세」 화면(Figma 446:929).
   *
   * legs가 타임라인입니다. **leg.estimated가 참이면 그 구간 시각은 추정값**이라
   * 화면이 확정 시각과 갈라 말해야 합니다(절대규칙 1) — 원문 시간표에 정류장 칸이 없어
   * 앞뒤 정류장 시각으로 감싼 값이고, 버스를 놓치지 않는 쪽으로만 틀립니다.
   * mode가 SAME_STOP이면 같은 정류장이라 버스를 타지 않습니다(rides가 빕니다).
   *
   * CourseDetail { courseId, courseCode, name, summary, spotCount, nineScenicCount,
   *   departAt, returnAt, totalMin, approxTotalMin, approxTotalText,
   *   legCount, estimatedLegCount, service, baseDate, source, originName,
   *   stops: [{ seq, poiId, name, shortName, theme, lat, lng,
   *             arriveAt, leaveAt, stayMin }],
   *   legs: [{ seq, mode, fromPoiId, fromName, toPoiId, toName,
   *            departAt, arriveAt, durationMin, transfers, estimated,
   *            rides: [{ routeNo, boardStop, boardAt, boardEstimated,
   *                      alightStop, alightAt, alightEstimated }] }] }
   */
  course: (courseId) => request(`/api/courses/${courseId}`),

  /**
   * 스팟 시간표 — 「스팟 시간표」 화면(Figma 453:210 · 453:288 · 453:415).
   *
   * from='origin'이면 고현터미널 → 스팟 방향으로 뒤집습니다.
   * toPoiId를 주면 목적지가 그 스팟, 없으면 고현터미널입니다.
   *
   * ★ **byRoute는 노선별로 갈라진 소요시간**입니다. 섞어 평균을 내면 실제로 운행하지
   * 않는 값이 나옵니다. durationMin은 **늦게 닿는 쪽**이고 durationVaries가 참이면
   * durationMinLow까지 폭이 있습니다(같은 회차가 두 시트에 2~5분 다르게 실린 탓).
   * 화면은 늦은 쪽을 써야 사용자가 버스를 놓치지 않습니다.
   *
   * ★★ **emptyReason이 빈 결과의 이유**입니다. 이유 없는 빈칸을 내보내면
   * 우리가 기준문서 §4에서 비판하는 것을 우리가 하는 것입니다(절대규칙 3).
   *   UNKNOWN_TIME         정차는 하는데 원문에 시각이 없다 (unknownTimeRoutes가 노선을 댑니다)
   *   NO_SERVICE           그 노선이 거기 서지 않는다
   *   NO_STOP_IN_TIMETABLE 원문 시간표에 이 스팟의 정류장 칸이 없다 (boardStop이 null)
   *
   * SpotDeparturesRes { poiId, name, shortName, boardStop, alightLabel,
   *   boardStopDiffers, to: { poiId, stop, name }, date, dayClass,
   *   departures: [{ routeNo, depart, arrive, durationMin }], count,
   *   firstDeparture, lastDeparture, next, byRoute, emptyReason, unknownTimeRoutes,
   *   source, baseDate }
   */
  spotDepartures: (poiId, { date, from, toPoiId, after } = {}) => {
    const query = new URLSearchParams({ date })
    if (from) query.set('from', from)
    if (toPoiId) query.set('toPoiId', String(toPoiId))
    if (after) query.set('after', after)
    return request(`/api/pois/${poiId}/departures?${query}`)
  },

  /**
   * 저장 일정. 판정 제거(2026-09-12)로 verdictAtSave·verdictNow가 응답에서 빠졌습니다 —
   * 「내 일정」은 단순 열람입니다(기준문서 §6 컷 순서 3번).
   * SavedTripRes { savedTripId, courseId, title, chain,
   *                travelDate, arrivalTime, returnTime }
   */
  savedTrips: () => request('/api/saved-trips', { session: true }),

  /**
   * body { courseId, travelDate } → 201 SavedTripRes
   *
   * 출발·복귀 시각은 **보내지 않습니다.** 코스에 이미 박혀 있어 서버가 채웁니다 —
   * 판정 시절엔 사용자가 입력하는 값이었고(막차 역산의 입력) 판정이 빠지며 고를 자리가
   * 없어졌습니다. 보내면 보낸 값이 쓰이지만 화면에 그 입력이 없습니다.
   */
  saveTrip: ({ courseId, travelDate }) =>
    request('/api/saved-trips', {
      method: 'POST',
      body: { courseId, travelDate },
      session: true,
    }),

  /** 204 No Content. request가 204를 null로 돌려줍니다. */
  deleteTrip: (savedTripId) =>
    request(`/api/saved-trips/${savedTripId}`, { method: 'DELETE', session: true }),
}

/**
 * 로그인 시작 — 돌아올 화면을 맡기고 카카오로 보냅니다.
 * 진입점이 둘(판정 결과의 저장 시트 · 내 일정 빈 상태)이라 여기 한 번만 씁니다.
 */
export function beginKakaoLogin() {
  stashReturnTo(`${window.location.pathname}${window.location.search}`)
  api.kakaoStart(`${window.location.origin}${KAKAO_CALLBACK_PATH}`)
}
