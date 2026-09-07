/**
 * 목 데이터 — GET /api/courses 응답 (PROJECT_CONTEXT 9-①)
 *
 * 실제 API가 나오면 아래 fetchCourses()의 주석만 풀고 MOCK 반환을 지우면 됩니다.
 * 화면 코드는 이 파일 밖에서 목 데이터를 알지 못하게 유지하세요.
 *
 * [백엔드와 맞출 것]
 *  1) shortName — 명세에 없는 필드입니다. name("부산발 당일치기 · 해금강")은
 *     지도 마커 라벨로 쓰기엔 너무 길어서 짧은 이름을 따로 받는 편이 좋습니다.
 *     내려주지 않으면 name으로 fallback 하도록 짜뒀습니다.
 *  2) theme — 명세 예시에는 "NATURE"만 있는데, 판정 조건 화면의 필터는
 *     언덕·전망 / 유람선 / 해수욕장 / 식물원 / 성 입니다. 필터에 맞춰
 *     VIEW / CRUISE / BEACH / GARDEN / CASTLE 로 가정했습니다.
 *  3) 좌표는 실제 위치 근사값입니다. 확정 좌표는 백엔드 POI 테이블 기준으로 교체.
 */

const MOCK_RESPONSE = {
  arrivalTime: '08:40',
  courses: [
    {
      courseId: 1,
      name: '부산발 당일치기 · 해금강',
      shortName: '해금강',
      theme: 'VIEW',
      thumbnailUrl: null,
      region: '남부권',
      feasible: true,
      reason: null,
      lat: 34.7398,
      lng: 128.6653,
      travelMin: 130,
      stayMin: 390,
      returnAnchorTime: '20:00',
      lastBusTime: '21:20',
      bufferMin: 80,
      estimatedCost: 41200,
    },
    {
      courseId: 2,
      name: '바람의언덕 · 신선대 코스',
      shortName: '바람의언덕',
      theme: 'VIEW',
      thumbnailUrl: null,
      region: '남부권',
      feasible: true,
      reason: null,
      lat: 34.7849,
      lng: 128.6558,
      travelMin: 145,
      stayMin: 330,
      returnAnchorTime: '19:40',
      lastBusTime: '21:20',
      bufferMin: 100,
      estimatedCost: 38600,
    },
    {
      courseId: 3,
      name: '여차홍포 전망 코스',
      shortName: '여차홍포',
      theme: 'VIEW',
      thumbnailUrl: null,
      region: '남부권',
      feasible: false,
      reason: '주말 배차 감축으로 당일 왕복 불가',
      lat: 34.7085,
      lng: 128.556,
      travelMin: null,
      stayMin: null,
      returnAnchorTime: null,
      lastBusTime: null,
      bufferMin: null,
      estimatedCost: null,
    },
    {
      courseId: 4,
      name: '매미성 · 대금산 조망 코스',
      shortName: '매미성',
      theme: 'CASTLE',
      thumbnailUrl: null,
      region: '동부권',
      feasible: true,
      reason: null,
      lat: 34.8836,
      lng: 128.7263,
      travelMin: 105,
      stayMin: 420,
      returnAnchorTime: '20:20',
      lastBusTime: '21:20',
      bufferMin: 60,
      estimatedCost: 35400,
    },
    {
      courseId: 5,
      name: '거제식물원 정글돔 · 실내 코스',
      shortName: '거제식물원',
      theme: 'GARDEN',
      thumbnailUrl: null,
      region: '중부권',
      feasible: true,
      reason: null,
      lat: 34.858,
      lng: 128.6046,
      travelMin: 80,
      stayMin: 450,
      returnAnchorTime: '20:40',
      lastBusTime: '21:20',
      bufferMin: 40,
      estimatedCost: 32800,
    },
    {
      courseId: 6,
      name: '외도 보타니아 유람선 코스',
      shortName: '외도 보타니아',
      theme: 'CRUISE',
      thumbnailUrl: null,
      region: '남부권',
      feasible: false,
      reason: '외도 막배(16:00) 이후 부산행 막차 연결 불가',
      lat: 34.7472,
      lng: 128.6883,
      travelMin: null,
      stayMin: null,
      returnAnchorTime: null,
      lastBusTime: null,
      bufferMin: null,
      estimatedCost: null,
    },
    {
      courseId: 7,
      name: '학동몽돌해변 · 해안 코스',
      shortName: '학동몽돌해변',
      theme: 'BEACH',
      thumbnailUrl: null,
      region: '남부권',
      feasible: true,
      reason: null,
      lat: 34.7605,
      lng: 128.6402,
      travelMin: 150,
      stayMin: 300,
      returnAnchorTime: '19:20',
      lastBusTime: '21:20',
      bufferMin: 120,
      estimatedCost: 39900,
    },
  ],
}

/** 목 데이터라도 로딩 상태를 한 번은 거치게 해서, 실제 API로 바꿔도 화면이 안 흔들리게 합니다. */
const MOCK_DELAY_MS = 300

// eslint-disable-next-line no-unused-vars
export async function fetchCourses({ origin, date, departTime, returnBy }) {
  // ─── 백엔드 완성 후 아래 주석을 풀고, 그 밑의 목 반환을 지우세요 ───
  // const query = new URLSearchParams({ origin, date, departTime, returnBy })
  // const res = await fetch(
  //   `${import.meta.env.VITE_API_BASE_URL}/api/courses?${query}`,
  // )
  // if (!res.ok) throw new Error(`코스 판정에 실패했습니다 (${res.status})`)
  // return res.json()

  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
  return MOCK_RESPONSE
}

/** 코스 상세 화면 스텁이 이름 정도는 보여줄 수 있게 열어둔 조회용 헬퍼입니다. */
export function findMockCourse(courseId) {
  return (
    MOCK_RESPONSE.courses.find((course) => course.courseId === courseId) ?? null
  )
}
