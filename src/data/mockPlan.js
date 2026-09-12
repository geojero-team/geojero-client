/**
 * 스팟 목 데이터 — 스팟 목록·스팟 상세 두 화면만 씁니다.
 *
 * ⚠️ 2026-09-12에 863줄에서 여기까지 줄였습니다. 전에는 이 파일이 **브라우저에서 도는
 * 판정 엔진**이었습니다 — 55번 시간표를 상수로 들고, 스팟 조합의 순서를 전부 만들어보고,
 * 막차를 역산해 성립을 판정했습니다(buildOut·buildBack·buildItineraries·judgeCourse).
 * 판정을 제품에서 뺐고(기준문서 §9) 코스·시간표·이동시간은 전부 서버가 계산하므로
 * 그 654줄을 지웠습니다. CLAUDE.md가 이 파일을 "낡았다, 정답지로 쓰지 말 것"이라 적은 것이
 * 그 엔진을 가리킵니다.
 *
 * 남은 것은 **스팟의 정체(이름·분류·좌표)를 쥔 목**뿐입니다. 스팟 목록·스팟 상세는
 * 02-2에서 "기능 02-1과 같음"이라 손대지 않았고, 두 화면이 아직 이 목의 spotId에
 * 묶여 있습니다. 사진만 서버에서 받아 얹습니다(withPhotos).
 *
 * 새로 만든 화면(코스 추천·코스 상세·스팟 시간표·시간표 탭·홈)은 이 파일을 쓰지 않습니다 —
 * 서버 poi_id 로 직접 조회합니다.
 */
import { api } from '../lib/api'
import { loadSpotImages, resolvePoiId } from './poiIndex'

/**
 * 목 데이터 — 화면이 쓰는 네 덩어리
 *
 *   spots[]    지도·목록에 찍히는 관광지                       fetchSpots
 *   courses[]  홈 '오늘 버스로 되는 코스'(큐레이션)            fetchCourses
 *   routes[]   고른 스팟으로 짠 추천 코스 = 일정 고르기 카드     fetchPlan
 *   verdict    코스 하나의 판정 결과(가는 편·오는 편 타임라인)   fetchVerdict
 *
 * 실제 API가 나오면 fetch* 안의 주석만 풀면 됩니다.
 * 화면 코드는 이 파일 밖에서 목 데이터를 알지 못하게 유지하세요.
 *
 * 숫자 규칙 — 기준문서(§2 55번 시간표 · §3 진입·해상)에 있는 값만 씁니다. 없는 값은
 * '[미확인]'으로 내보내고 그 구간의 판정은 UNKNOWN으로 둡니다. 성립으로 추정하지 않습니다.
 *
 * [백엔드와 맞출 것]
 *  1) 판정은 POST /api/courses/{id}/judge → JudgeRes { feasible, dayClass, legs[{ok, depart, arrive, reason}], alerts }.
 *     정류장 출발편은 GET /api/stops/{stop}/departures?to=&date=&after=, 시간표는 GET /api/routes/{no}/timetable?date=.
 *     아래 타임라인 rows는 그 셋을 엮은 화면용 형태입니다 — Phase 6 어댑터가 같은 형태로 변환합니다.
 *  2) 추천 코스 순위·부분집합('○○ 빼면') 규칙은 서버가 정합니다. 여기 규칙은 화면 확인용입니다.
 *  3) 좌표는 TourAPI 실측(geojero data/seed/pois.json). 확정 좌표는 백엔드 POI 테이블 기준으로 교체.
 */

const SPOTS = [
  // Figma 233:378 순서. 좌표는 TourAPI 실측(geojero data/seed/pois.json, 2026-09-06).
  // notice = 조건과 무관한 사실(기준문서 §2·§3).
  //
  // **지금 어느 화면도 그리지 않습니다.** 2026-09-10 결정("고른 것만 이유를 준다")으로
  // 목록의 둘째 줄을 뺐기 때문입니다. 값은 남겨둡니다 — 외도의 '당일 확인'은 기준문서
  // §6이 유지하라고 한 유람선 안내(당일 확인 링크)의 근거이고, 그 자리는 판정 결과의
  // check-line(Figma 268:295 'check-line (미확인일 때만)')입니다. 링크 문구·URL이
  // 정해지면 여기서 그쪽으로 옮깁니다.
  spot(2, '바람의언덕', 'VIEW', '언덕·전망', '남부권', 34.7440458, 128.6633111),
  spot(8, '도장포유람선', 'CRUISE', '유람선', '남부권', 34.7421508, 128.6626096),
  spot(1, '해금강', 'VIEW', '언덕·전망', '남부권', 34.7333, 128.6839),
  // 스팟 이름은 장소를, 아래 ACCESS의 stop은 BIS 정류장을 가리킵니다 — 둘은 다릅니다.
  // '학동'만 쓰면 마을로 읽히고, 정식 '학동흑진주몽돌해변'은 지도 이름표로 너무 깁니다.
  // 모래가 아니라 몽돌해변이라는 점이 이름에 남아야 해서 '학동몽돌해변'으로 둡니다.
  spot(7, '학동몽돌해변', 'BEACH', '해수욕장', '남부권', 34.774752, 128.641498),
  // Figma 내부 불일치: 목록(233:378)은 '식물원', 고르기(285:419)는 '식물원 · 유람선' — 최신 프레임을 따름
  // 지도에 '외도'로만 적으면 섬 이름으로 읽혀, 카카오 지도가 같은 자리에 찍는
  // '외도보타니아'와 다른 곳처럼 보입니다. 공식 명칭(서버 poi_name)과 맞춥니다.
  spot(6, '외도보타니아', 'GARDEN', '식물원 · 유람선', '동부권', 34.7694723, 128.7113921, {
    kind: 'UNKNOWN',
    text: '당일 확인',
  }),
  /*
   * 거제 9경 중 유일하게 **고현(진입 관문)** 에 있는 스팟입니다.
   *
   * 나머지 일곱은 전부 남부·동부·북부·서부 외곽이라, 서울남부·부산사상에서 온 사람이
   * 처음 밟는 땅에는 보여줄 스팟이 하나도 없었습니다. §2 기준 접근성 최상 티어입니다
   * (고현 시내 · 평일 편도 130회+).
   *
   * 여기 있던 명사해수욕장은 뺐습니다 — 9경도 아니고, 방문객 통계도 없고, TourAPI
   * 사진이 전 장 Type3라 쓸 수 없고, 53·53-1 도로 유실로 코스가 성립하지 않습니다.
   * ACCESS·SPOT_VERDICTS의 9번은 남겨뒀습니다(우회 해제 시 되살리기 — 기준문서 §9).
   */
  spot(3, '포로수용소', 'HISTORY', '유적공원', '중부권', 34.8764184, 128.6253954),
  spot(4, '매미성', 'CASTLE', '성', '북부권', 34.9682131, 128.7050934),
  spot(5, '거제식물원', 'GARDEN', '식물원', '서부권', 34.8568211, 128.5780987),
]

function spot(spotId, name, theme, category, region, lat, lng, notice = null) {
  return { spotId, name, shortName: name, theme, category, region, thumbnailUrl: null, lat, lng, notice }
}

/**
 * 스팟별 판정. 조건(출발지·날짜·시각)이 정해졌을 때만 붙습니다.
 * 매미성·거제식물원은 기준문서 §9 미해결 항목(하차 정류소·운영 재개)이라 미확인입니다.
 */
const SPOT_VERDICTS = {
  1: { verdict: 'YES', summary: '왕복 5시간 20분 · 머무는 시간 1시간 40분' },
  2: { verdict: 'YES', summary: '왕복 4시간 50분 · 머무는 시간 2시간' },
  // 고현 시내라 §2 기준 접근성 최상 티어지만, 최인접 정류장이 [미확인]입니다(BIS 확인 대기).
  // 값이 오면 ACCESS의 3번과 함께 채웁니다 — 그때 판정이 그대로 붙습니다.
  3: { verdict: 'UNKNOWN', summary: null, reason: '포로수용소 하차 정류소 미확인 (BIS 확인 중)' },
  4: { verdict: 'UNKNOWN', summary: null, reason: '매미성 하차 정류소 미확인 (BIS 정류소검색 대금·시방)' },
  5: { verdict: 'UNKNOWN', summary: null, reason: '거제식물원 운영 재개 상태 미확인' },
  6: {
    verdict: 'UNKNOWN',
    summary: null,
    reason: '외도유람선은 매일 출항 시각이 달라요 · 당일 확인',
  },
  7: { verdict: 'YES', summary: '왕복 5시간 · 머무는 시간 1시간 20분' },
  8: { verdict: 'YES', summary: null },
  9: {
    verdict: 'NO',
    summary: null,
    reason: '도로 유실로 명사해수욕장앞 우회 중 (53·53-1 해당 구간 이용 불가)',
  },
}

const SOURCE = { source: '거제시 BIS 원문', baseDate: '2026-08-18' }

/**
 * 목 스팟에 서버 사진을 얹습니다.
 *
 * 스팟의 정체(spotId·분류·좌표)는 아직 목이 쥐고 있습니다 — 판정·코스 조립이 전부 그
 * spotId에 묶여 있어서, 서버 poi_id로 갈아끼우면 화면이 통째로 흔들립니다. 사진만 먼저
 * 서버 것으로 바꿉니다. 사진이 없는 스팟은 손대지 않아 기존 자리 그림이 그대로 남습니다.
 */
async function withPhotos(spots) {
  const images = await loadSpotImages()
  if (images.size === 0) return spots

  return spots.map((spot) => {
    const url = images.get(spot.spotId)
    return url ? { ...spot, thumbnailUrl: url } : spot
  })
}

// eslint-disable-next-line no-unused-vars
export async function fetchSpots({ theme, q } = {}) {
  // const query = new URLSearchParams({ ...(theme && { theme }), ...(q && { q }) })
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/spots?${query}`)
  // if (!res.ok) throw new Error(`스팟을 불러오지 못했습니다 (${res.status})`)
  // return res.json()

  const spots = await withPhotos(SPOTS)
  return { spots: theme ? spots.filter((spot) => spot.theme === theme) : spots, ...SOURCE }
}

/**
 * 스팟 상세 — 이름·분류는 목에서, 소개(overview)와 사진은 **서버 실호출**로 받습니다.
 *
 * TourAPI overview는 런타임 호출값이라 목에 넣을 수 없습니다(원문 수정 금지 · 저작권).
 * 서버가 아직 안 떠 있으면 소개·사진 없이 이름과 분류만 나옵니다 — 지어내지 않습니다.
 * 서버 응답은 PoiController.PoiDetailRes 모양입니다.
 */
export async function fetchSpotDetail(spotId) {
  const base = findMockSpot(spotId)
  if (!base) return null

  // 서버가 없거나 그 스팟을 모를 때 그리는 모양. 지어내지 않고 비웁니다.
  // 서버를 못 붙었을 때의 모습. poiId가 없으므로 시간표 버튼이 안 나옵니다.
  const withoutServer = {
    ...base,
    overview: null,
    overviewSource: null,
    photos: [],
    checkUrl: null,
    lastDeparture: null,
  }

  try {
    // spotId를 poi_id로 넘기면 안 됩니다 — 두 번호는 서로 다릅니다(poiIndex 참고).
    const poiId = await resolvePoiId(spotId)
    if (poiId == null) return withoutServer

    const data = await api.poi(poiId)
    // detail.source가 'TourAPI'가 아니면 자체 소개문(intro_text) 폴백입니다 —
    // 그때는 '출처 TourAPI' 칩을 달면 안 됩니다.
    const detail = data.detail ?? {}
    // detail.images는 대표 사진이 첫 장이고 저작권(Type3)은 서버가 이미 걸렀습니다.
    // imageUrl 폴백은 클라이언트가 서버보다 먼저 배포됐을 때를 위한 것입니다.
    const images = Array.isArray(detail.images) ? detail.images.filter(Boolean) : []
    return {
      ...base,
      // 시간표는 **서버 poi_id**로 조회합니다. 목의 spotId로는 못 부릅니다 —
      // 스팟 상세의 '버스 시간표 보기'가 이 값을 씁니다. 서버가 없으면 null이라
      // 화면이 그 버튼을 감춥니다.
      poiId,
      overview: detail.overview ?? null,
      overviewSource: detail.source ?? null,
      photos: images.length > 0 ? images : detail.imageUrl ? [detail.imageUrl] : [],
      checkUrl: data.checkUrl ?? null,
      lastDeparture: data.lastDeparture ?? null,
    }
  } catch {
    // 서버가 없거나 TourAPI가 실패해도 화면은 떠야 합니다(비로그인 판정과 같은 원칙).
    return withoutServer
  }
}

export function findMockSpot(spotId) {
  const spot = SPOTS.find((item) => item.spotId === spotId)
  return spot ? { ...spot, ...SPOT_VERDICTS[spot.spotId] } : null
}
