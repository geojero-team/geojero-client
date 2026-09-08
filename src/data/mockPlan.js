/**
 * 목 데이터 — 지도 화면이 쓰는 두 덩어리
 *
 *   spots[]   지도에 찍히는 관광지. 스팟 고르기에서 고른 것들
 *   routes[]  그 스팟들로 짤 수 있는 추천 코스 (최대 3개)
 *
 * 실제 API가 나오면 fetchSpots / fetchPlan 안의 주석만 풀면 됩니다.
 * 화면 코드는 이 파일 밖에서 목 데이터를 알지 못하게 유지하세요.
 *
 * [백엔드와 맞출 것]
 *  1) 추천 코스 순위 — 팀 결정: 1순위 "많이 갈 수 있는 곳", 2순위 "최소 시간 동선",
 *     3순위 +α. 방문 순서만 다르면(A→B→C vs B→C→A) 서로 다른 코스로 칩니다.
 *  2) verdict — 지금은 YES/NO 둘만 씁니다. Figma에는 UNKNOWN(미확인)이 있는데
 *     API_DRAFT.md 5장 ②번이 정해지면 그때 3상태로 늘립니다.
 *  3) 좌표는 실제 위치 근사값입니다. 확정 좌표는 백엔드 POI 테이블 기준으로 교체.
 */

const SPOTS = [
  {
    spotId: 1,
    name: '해금강',
    shortName: '해금강',
    theme: 'VIEW',
    category: '언덕·전망',
    region: '남부권',
    thumbnailUrl: null,
    lat: 34.7398,
    lng: 128.6653,
  },
  {
    spotId: 2,
    name: '바람의언덕',
    shortName: '바람의언덕',
    theme: 'VIEW',
    category: '언덕·전망',
    region: '남부권',
    thumbnailUrl: null,
    lat: 34.7849,
    lng: 128.6558,
  },
  {
    spotId: 3,
    name: '여차홍포 전망대',
    shortName: '여차홍포',
    theme: 'VIEW',
    category: '언덕·전망',
    region: '남부권',
    thumbnailUrl: null,
    lat: 34.7085,
    lng: 128.556,
  },
  {
    spotId: 4,
    name: '매미성',
    shortName: '매미성',
    theme: 'CASTLE',
    category: '성',
    region: '동부권',
    thumbnailUrl: null,
    lat: 34.8836,
    lng: 128.7263,
  },
  {
    spotId: 5,
    name: '거제식물원 정글돔',
    shortName: '거제식물원',
    theme: 'GARDEN',
    category: '식물원',
    region: '중부권',
    thumbnailUrl: null,
    lat: 34.858,
    lng: 128.6046,
  },
  {
    spotId: 6,
    name: '외도 보타니아',
    shortName: '외도 보타니아',
    theme: 'CRUISE',
    category: '유람선',
    region: '남부권',
    thumbnailUrl: null,
    lat: 34.7472,
    lng: 128.6883,
  },
  {
    spotId: 7,
    name: '학동몽돌해변',
    shortName: '학동몽돌해변',
    theme: 'BEACH',
    category: '해수욕장',
    region: '남부권',
    thumbnailUrl: null,
    lat: 34.7605,
    lng: 128.6402,
  },
]

/** 스팟별 판정. 조건(출발지·날짜·시각)이 정해졌을 때만 붙습니다. */
const SPOT_VERDICTS = {
  1: { verdict: 'YES', summary: '왕복 5시간 20분 · 머무는 시간 1시간 40분' },
  2: { verdict: 'YES', summary: '왕복 4시간 50분 · 머무는 시간 2시간' },
  3: { verdict: 'NO', summary: null, reason: '주말 배차 감축으로 당일 왕복 불가' },
  4: { verdict: 'YES', summary: '왕복 3시간 30분 · 머무는 시간 2시간 20분' },
  5: { verdict: 'YES', summary: '왕복 2시간 40분 · 머무는 시간 3시간' },
  6: {
    verdict: 'NO',
    summary: null,
    reason: '외도 막배(16:00) 이후 부산행 막차 연결 불가',
  },
  7: { verdict: 'YES', summary: '왕복 5시간 · 머무는 시간 1시간 20분' },
}

/**
 * 추천 코스 3개.
 * spotIds는 **방문 순서**입니다. 지도의 선도 이 순서대로 이어집니다.
 */
const ROUTES = [
  {
    routeId: 1,
    rank: 1,
    strategy: 'MOST_SPOTS',
    strategyLabel: '많이 도는',
    name: '거제식물원 · 바람의언덕 · 학동몽돌해변 · 해금강',
    spotIds: [5, 2, 7, 1],
    verdict: 'YES',
    reason: null,
    travelMin: 195,
    stayMin: 330,
    returnAnchorTime: '20:00',
    lastBusTime: '21:20',
    bufferMin: 80,
    estimatedCost: 43800,
  },
  {
    routeId: 2,
    rank: 2,
    strategy: 'FASTEST',
    strategyLabel: '빠른 동선',
    name: '바람의언덕 · 해금강',
    spotIds: [2, 1],
    verdict: 'YES',
    reason: null,
    travelMin: 130,
    stayMin: 390,
    returnAnchorTime: '20:00',
    lastBusTime: '21:20',
    bufferMin: 80,
    estimatedCost: 41200,
  },
  {
    routeId: 3,
    rank: 3,
    strategy: 'RELAXED',
    strategyLabel: '여유 있는',
    name: '매미성 · 거제식물원 · 바람의언덕',
    spotIds: [4, 5, 2],
    verdict: 'YES',
    reason: null,
    travelMin: 165,
    stayMin: 345,
    returnAnchorTime: '19:40',
    lastBusTime: '21:20',
    bufferMin: 100,
    estimatedCost: 40500,
  },
]

const MOCK_DELAY_MS = 250
const SOURCE = { source: '거제시 BIS 원문', baseDate: '2026-08-18' }

/**
 * 조건 없이 지도만 둘러보는 경우 — 스팟 목록만 돌려줍니다.
 * 판정을 안 했으므로 verdict가 없고, 마커도 판정색을 쓰지 않습니다.
 */
// eslint-disable-next-line no-unused-vars
export async function fetchSpots({ theme, q } = {}) {
  // const query = new URLSearchParams({ ...(theme && { theme }), ...(q && { q }) })
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/spots?${query}`)
  // if (!res.ok) throw new Error(`스팟을 불러오지 못했습니다 (${res.status})`)
  // return res.json()

  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
  return { spots: SPOTS, ...SOURCE }
}

/**
 * 스팟을 고르고 넘어온 경우 — 고른 스팟 + 그 조합으로 만든 추천 코스.
 * spotIds가 비어 있으면 전부 고른 것으로 칩니다.
 */
// eslint-disable-next-line no-unused-vars
export async function fetchPlan({ spotIds, origin, date, departTime, returnBy }) {
  // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/verdict`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ spotIds, origin, date, departTime, returnBy }),
  // })
  // if (!res.ok) throw new Error(`판정에 실패했습니다 (${res.status})`)
  // return res.json()

  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

  const picked = spotIds?.length
    ? SPOTS.filter((spot) => spotIds.includes(spot.spotId))
    : SPOTS

  return {
    arrivalTime: '08:40',
    spots: picked.map((spot) => ({ ...spot, ...SPOT_VERDICTS[spot.spotId] })),
    // 고른 스팟으로 만들 수 있는 코스만 남깁니다.
    routes: ROUTES.filter((route) =>
      route.spotIds.every((id) => picked.some((spot) => spot.spotId === id)),
    ),
    ...SOURCE,
  }
}

/** 자리표시자 화면들이 이름 정도는 보여줄 수 있게 열어둔 조회용 헬퍼입니다. */
export function findMockSpot(spotId) {
  const spot = SPOTS.find((item) => item.spotId === spotId)
  return spot ? { ...spot, ...SPOT_VERDICTS[spot.spotId] } : null
}

export function findMockRoute(routeId) {
  return ROUTES.find((route) => route.routeId === routeId) ?? null
}
