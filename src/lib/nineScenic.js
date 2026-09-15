/**
 * 거제9경 — 거제시가 2024-10-10 선정위원회에서 5년 만에 다시 고른 대표 경관 아홉 곳.
 * 시민 여론조사 60% + 전문가 위원 평가 40%로 뽑았습니다(거제신문·오마이뉴스 2024-10 보도).
 * 2019년판에서 여차홍포 해안비경·거가대교가 빠지고 거제정글돔·매미성이 들어왔습니다.
 *
 * 스팟 이름을 i18n 사전에 두지 않는 규칙(ko.js 머리말)과 같은 이유로 여기 둡니다 — 화면 문구가
 * 아니라 거제시가 정한 데이터입니다.
 *
 * **어느 스팟이 몇 경인지는 서버가 줍니다**(/api/pois 의 nineScenicNo — pois.nine_scenic_no, V28).
 * 2026-09-14 에는 여기서 poiId 를 박았는데, poi_id 는 환경마다 다를 수 있고 새 스팟(7경 · 8경)을 넣을 때마다
 * 앱을 고쳐야 했습니다(2026-09-15 서버로 옮김). 이 표는 이제 **이름과 순서**만 갖습니다 — 설명 시트가 아홉 줄을 그립니다.
 *
 *   mapName  스팟 이름(지도 핀 · 상세 제목)이 9경 이름과 달라 같은 곳인지 헷갈릴 때만 둡니다
 *            (정글돔은 거제식물원 안의 온실이고, 지도와 상세에는 거제식물원으로 나옵니다)
 *
 * 추천 코스의 nineScenicCount 도 같은 번호로 셉니다(V28 — 운영 /api/courses 23개 대조 2026-09-14).
 * timetable/build_recommended_courses.py 의 9경 표시는 **예전 목록**(포로수용소·매미성 빠짐)이라 기준이 아닙니다.
 */
export const NINE_SCENIC = [
  { rank: 1, name: '거제해금강' },
  { rank: 2, name: '바람의언덕과 신선대' },
  { rank: 3, name: '외도보타니아' },
  { rank: 4, name: '학동흑진주몽돌해변' },
  { rank: 5, name: '거제정글돔', mapName: '거제식물원' },
  { rank: 6, name: '거제포로수용소유적공원' },
  { rank: 7, name: '공곶이와 내도' },
  { rank: 8, name: '동백섬 지심도' },
  { rank: 9, name: '매미성' },
]

/** 스팟 목록(/api/pois) → Map(몇 경 → poiId). 한 경에 스팟이 둘이면 먼저 온 것(poi_id 순)으로 잇습니다. */
export function poiIdsByNineScenic(pois) {
  const out = new Map()
  for (const poi of pois) {
    if (poi.nineScenicNo != null && !out.has(poi.nineScenicNo)) out.set(poi.nineScenicNo, poi.poiId)
  }
  return out
}
