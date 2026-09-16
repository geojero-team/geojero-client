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

/**
 * 사진 올리기만 더 기다립니다. 클라가 1MB 안으로 줄여 보내도 모바일 상향 회선에서는
 * 8초를 넘길 수 있습니다. 적정값은 실측 전이라 [미확인]입니다.
 */
export const UPLOAD_TIMEOUT_MS = 30000

/** 카카오를 거쳐 돌아올 우리 쪽 주소. 카카오 콘솔에 등록된 값과 글자까지 같아야 합니다. */
export const KAKAO_CALLBACK_PATH = '/auth/callback'

export class ApiError extends Error {
  constructor(message, status = 0, code = undefined) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    // 서버 ProblemDetail의 code(예: UNSUPPORTED_IMAGE_TYPE). 없을 수 있습니다 —
    // 호출부는 status로 먼저 가르고 code는 있으면 씁니다.
    this.code = code
  }
}

/**
 * 오류 응답이 problem+json이면 code만 꺼냅니다. 본문이 HTML(프록시가 준 413 등)이거나
 * 깨져 있으면 조용히 undefined — 공통 경로라 여기서 새 예외가 나면 다른 화면의 오류 처리까지 깨집니다.
 */
async function readProblemCode(res) {
  try {
    if (!res.headers.get('Content-Type')?.includes('application/problem+json')) return undefined
    const problem = await res.json()
    return typeof problem?.code === 'string' ? problem.code : undefined
  } catch {
    return undefined
  }
}

async function request(path, { method = 'GET', body, session = false, timeoutMs = TIMEOUT_MS } = {}) {
  if (!BASE) throw new ApiError('API 주소가 설정되지 않았습니다 (VITE_API_BASE_URL)')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // FormData(사진 올리기)는 Content-Type을 브라우저가 boundary와 함께 붙여야 합니다 —
    // 우리가 application/json을 붙이거나 문자열로 바꾸면 업로드가 조용히 깨집니다.
    const isForm = body instanceof FormData

    // 다른 사이트라 쿠키가 안 붙습니다. 서버가 준 같은 토큰을 헤더로 보냅니다 —
    // 같은 사이트(geojero.com)가 되면 서버가 쿠키를 먼저 보므로 이 헤더는 무해합니다.
    const token = session ? getToken() : null
    const headers = {
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const res = await fetch(BASE + path, {
      method,
      // 세션 쿠키가 필요한 경로에만 자격증명을 붙입니다. 서버 CORS가
      // allowCredentials + 정확한 Origin이어야 동작합니다(와일드카드로는 안 됩니다).
      credentials: session ? 'include' : 'omit',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new ApiError(`${method} ${path} → ${res.status}`, res.status, await readProblemCode(res))
    }
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
   *                    tier, hasEnglish, lat, lng, imageUrl,
   *                    alightLabel, timetableStop, boardStopDiffers, ferryDocks[] }] }
   *
   * alightLabel·timetableStop·boardStopDiffers 는 상세와 같은 값(시간표 탭 목록 둘째 줄).
   * ferryDocks 는 배로만 가는 곳(외도보타니아)의 선착장 이름 넷, 나머지는 빈 배열입니다.
   *
   * withImages=true면 서버가 POI마다 TourAPI를 부릅니다(24h 캐시). 사진이 필요한 화면만
   * 켭니다 — 이름→id 해석은 사진이 필요 없고, 켜면 첫 요청이 느려집니다.
   * 저작권 보류(cpyrhtDivCd Type3)인 POI는 imageUrl이 null로 옵니다.
   */
  pois: (withImages = false) => request(`/api/pois${withImages ? '?withImages=true' : ''}`),

  /**
   * PoiDetailRes { poiId, name, kind, tier, lang, langFallback,
   *                detail: { source, overview, imageUrl, images, address }, checkUrl, lastDeparture,
   *                alightLabel, timetableStop, boardStopDiffers }
   * address 는 TourAPI addr1 런타임 값(폴백이면 없음). alightLabel·timetableStop 은 V18 하차 이름 둘 —
   * 스팟 상세의 「내리는 곳」 줄(Figma 607:4). boardStopDiffers 는 스팟 시간표와 같은 규칙입니다.
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
   * 회원 탈퇴 — 서버에 있는 그 사람의 것을 전부 지웁니다(계정 · 저장한 코스 · 올린 사진).
   * 되돌릴 수 없어서 화면이 한 번 더 묻고 부릅니다. 카카오 쪽 연결 해제는 카카오 설정에서 합니다.
   */
  deleteAccount: () => request('/api/me', { method: 'DELETE', session: true }),

  /**
   * 추천 코스 목록 — 「코스 추천」 화면(v3 대표 코스 카드 · Figma 585:417).
   *
   * featured=true 면 서버가 규칙(9경 많은 순 · 버스 시간 짧은 순 · 곳 수 · 코드 순)으로 고른
   * **대표 10개**만 줍니다. 없으면 전량 — 지도(CourseMapPage)가 고른 courseId 를 거기서 찾습니다.
   * spotCount 필터는 3/4/5곳 칩과 함께 뺐습니다(2026-09-14). counts 는 그대로 옵니다.
   *
   * CoursesRes {
   *   counts: { '3': 10, '4': 10, '5': 3 },
   *   courses: [{ courseId, courseCode, spotCount, rank, nineScenicCount,
   *               name, summary, title, intro, nineScenicNos, busRoutes,
   *               tripsPerDay: { weekday, holiday } | null, holidayService,
   *               departAt, returnAt, approxTotalMin, approxTotalText, busMinTotal, busTotalText,
   *               spots: [{ seq, poiId, name, shortName, theme, lat, lng }] }] }
   * title·intro 는 null 일 수 있고, tripsPerDay 는 busRoutes 가 하나일 때만 옵니다.
   */
  courses: ({ featured = false } = {}) =>
    request(`/api/courses${featured ? '?featured=true' : ''}`),

  /**
   * 코스 상세 — 「코스 상세」 화면(Figma 446:929).
   *
   * legs가 타임라인입니다. **leg.estimated가 참이면 그 구간 시각은 추정값**이라
   * 화면이 확정 시각과 갈라 말해야 합니다(절대규칙 1) — 원문 시간표에 정류장 칸이 없어
   * 앞뒤 정류장 시각으로 감싼 값이고, 버스를 놓치지 않는 쪽으로만 틀립니다.
   * mode가 SAME_STOP이면 같은 정류장이라 버스를 타지 않습니다(rides가 빕니다).
   *
   * CourseDetail { courseId, courseCode, name, title, intro, summary, spotCount, nineScenicCount,
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
   *   TIMETABLE_PENDING    정류장도 배 연결도 없다 — 아직 시간표를 모으지 않은 곳(2026-09-15 공곶이·내도 · 지심도)
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
   * 유람선 시간표 — 스팟 시간표 화면의 배 칩(2026-09-14 · Figma 프레임 없음).
   *
   * **값이 있는 파라미터만 붙입니다.** date를 빼면 서버가 KST 오늘로 잡는데, `date=undefined`를
   * 보내면 400입니다. 화면은 버스와 같은 date·after를 넘겨 한 화면에서 "오늘"이 갈리지 않게 합니다.
   * 선착장이 전부 한 응답에 들어 있어 칩을 바꿔도 다시 부르지 않습니다.
   *
   * ★ rows[].status가 날짜마다 답의 종류입니다 — 배에는 요일 구분(dayClass)이 없습니다.
   *   PUBLISHED      원문이 그날을 공개했다. sailings가 비면 그날 예정된 배가 없다
   *   UNPUBLISHED    수집 때 원문에 아직 없었다 → 시각 미확인
   *   NOT_COLLECTED  수집하지 않은 날짜 → 시각 미확인
   * 서버는 지난 편을 거르지 않습니다 — 오늘 줄에서 빼는 것은 화면 몫입니다.
   *
   * SpotFerriesRes { poiId, shortName, hasBusStop, toPoiId, toIsFerryDestination,
   *   towardEmptyReason, asOf: { date, time, zone }, days,
   *   ferries: [{ key, relation(DESTINATION|DOCK|TOWARD), landingOnly,
   *     dock: { dockCode, operatorName, shortName, address }, access: { quote, sourceUrl } | null,
   *     courses: [{ courseId, landsOnOedo, legendLabel, name, totalMin, totalText, oedoStayMin, bookingUrl }],
   *     next: [{ courseId, date, depart, returnApprox }],
   *     rows: [{ date, status, sailings: [{ depart, courseId, returnApprox }] }],
   *     coverage: { publishedThrough, fetchedAt, source, sourceUrl, crossCheckUrl } }] }
   */
  spotFerries: (poiId, { date, after, toPoiId } = {}) => {
    const query = new URLSearchParams()
    if (date) query.set('date', date)
    if (after) query.set('after', after)
    if (toPoiId != null) query.set('toPoiId', String(toPoiId))
    const qs = query.toString()
    return request(`/api/pois/${poiId}/ferries${qs ? `?${qs}` : ''}`)
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

  /**
   * 방문자 사진 목록 — 스팟 상세의 「방문자 사진」 섹션(Figma 268:478 · 268:531).
   *
   * **보기는 비로그인입니다.** 토큰이 있으면 붙여 보내 서버가 isMine을 계산하게 하고,
   * 만료된 토큰이어도 서버는 401이 아니라 isMine=false로 줍니다. 0장은 정상 응답입니다.
   * TourAPI 사진(`/api/pois/{id}`의 detail.images)과는 호출도 필드도 섞지 않습니다.
   *
   * VisitorPhotosRes { poiId, count, photos: [{ photoId, imageUrl, width, height,
   *                    caption, uploadedDate, isMine }] }
   */
  getVisitorPhotos: async (poiId) => {
    const res = await request(`/api/pois/${poiId}/visitor-photos`, { session: true })
    return { ...res, photos: res.photos.map(withAbsoluteImage) }
  },

  /**
   * multipart: file(1장) + caption(선택). → 201 photo(목록 항목과 같은 모양)
   * 캡션은 앞뒤 공백을 떼고, 비면 보내지 않습니다(서버도 빈 문자열을 null로 봅니다).
   */
  uploadVisitorPhoto: async (poiId, blob, caption) => {
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    const trimmed = caption?.trim()
    if (trimmed) form.append('caption', trimmed)
    const photo = await request(`/api/pois/${poiId}/visitor-photos`, {
      method: 'POST',
      body: form,
      session: true,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    })
    return withAbsoluteImage(photo)
  },

  /** 204 No Content — 본인 사진만. 남의 사진이면 403, 없으면 404. */
  deleteVisitorPhoto: (photoId) =>
    request(`/api/visitor-photos/${photoId}`, { method: 'DELETE', session: true }),
}

/**
 * 서버는 imageUrl을 API 상대 경로(`/api/visitor-photos/42/image`)로 줍니다.
 * 프론트와 API가 다른 사이트라 그대로 `<img src>`에 넣으면 프론트 주소로 가므로 API 주소에 붙입니다.
 */
function withAbsoluteImage(photo) {
  return { ...photo, imageUrl: new URL(photo.imageUrl, new URL(BASE, window.location.origin)).href }
}

/**
 * 로그인 시작 — 돌아올 화면을 맡기고 카카오로 보냅니다.
 * 진입점이 둘(판정 결과의 저장 시트 · 내 일정 빈 상태)이라 여기 한 번만 씁니다.
 */
export function beginKakaoLogin() {
  beginKakaoLoginTo(`${window.location.pathname}${window.location.search}`)
}

/**
 * 돌아올 곳이 지금 주소가 아닐 때. 지도의 스팟 시트는 주소를 바꾸지 않으므로
 * 그대로 돌아오면 시트가 닫힌 지도가 나옵니다 — 사진 올리기는 `/spots/{id}?upload=1`로 돌려보냅니다.
 * (`beginKakaoLogin`에 인자를 더하지 않은 이유: onClick에 그대로 넘겨 이벤트 객체가 첫 인자로 옵니다.)
 */
export function beginKakaoLoginTo(returnTo) {
  stashReturnTo(returnTo)
  api.kakaoStart(`${window.location.origin}${KAKAO_CALLBACK_PATH}`)
}
