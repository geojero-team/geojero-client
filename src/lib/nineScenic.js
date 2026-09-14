/**
 * 거제9경 — 거제시가 2024-10-10 선정위원회에서 5년 만에 다시 고른 대표 경관 아홉 곳.
 * 시민 여론조사 60% + 전문가 위원 평가 40%로 뽑았습니다(거제신문·오마이뉴스 2024-10 보도).
 * 2019년판에서 여차홍포 해안비경·거가대교가 빠지고 거제정글돔·매미성이 들어왔습니다.
 *
 * 스팟 이름을 i18n 사전에 두지 않는 규칙(ko.js 머리말)과 같은 이유로 여기 둡니다 — 화면 문구가
 * 아니라 거제시가 정한 데이터입니다.
 *
 *   poiId    운영 /api/pois 의 id(2026-09-14 확인). 서버가 스팟마다 9경 여부를 아직 내려주지 않아
 *            여기서 잇습니다. 서버가 필드를 주면 poiId 는 지우고 그 값을 씁니다.
 *            null — 앱 지도에 없는 곳(공곶이·내도·지심도는 스팟으로 넣지 않았습니다)
 *   mapName  스팟 이름(지도 핀 · 상세 제목)이 9경 이름과 달라 같은 곳인지 헷갈릴 때만 둡니다
 *            (정글돔은 거제식물원 안의 온실이고, 지도와 상세에는 거제식물원으로 나옵니다)
 *
 * 추천 코스의 nineScenicCount(「거제9경 N곳」)도 이 목록 기준입니다 — 운영 /api/courses 23개가 전부 이 표로 센
 * 값과 같습니다(2026-09-14 대조). 서버는 코스마다 nineScenicNos(몇 경인지)도 줍니다.
 * timetable/build_recommended_courses.py 의 9경 표시는 **예전 목록**(포로수용소·매미성 빠짐)이라 기준이 아닙니다.
 * 7경(공곶이·내도)·8경(지심도)은 팀원이 스팟으로 넣는 중입니다 — 들어오면 poiId 를 채웁니다.
 */
export const NINE_SCENIC = [
  { rank: 1, name: '거제해금강', poiId: 3 },
  { rank: 2, name: '바람의언덕과 신선대', poiId: 1 },
  { rank: 3, name: '외도보타니아', poiId: 5 },
  { rank: 4, name: '학동흑진주몽돌해변', poiId: 4 },
  { rank: 5, name: '거제정글돔', poiId: 10, mapName: '거제식물원' },
  { rank: 6, name: '거제포로수용소유적공원', poiId: 13 },
  { rank: 7, name: '공곶이와 내도', poiId: null },
  { rank: 8, name: '동백섬 지심도', poiId: null },
  { rank: 9, name: '매미성', poiId: 7 },
]

const RANK_BY_POI = new Map(
  NINE_SCENIC.filter((item) => item.poiId != null).map((item) => [item.poiId, item.rank]),
)

/** 9경이면 몇 경인지(1~9), 아니면 null. */
export function nineScenicRankOf(poiId) {
  return RANK_BY_POI.get(poiId) ?? null
}
