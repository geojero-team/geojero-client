import { api } from '../lib/api'

/**
 * 화면의 스팟을 서버 `poi_id`로 옮기는 색인.
 *
 * **왜 id를 바로 못 쓰는가**: 서버 `pois.poi_id`는 bigserial이고, 시드(geojero
 * `data/seed/pois.json`)에는 id가 없습니다. 적재 순서대로 붙기 때문에 클라이언트가
 * 미리 알 수 없습니다. 화면의 spotId(Figma 순서)와는 아예 다른 번호입니다.
 * 그래서 spotId를 poi_id인 척 넘기면 **다른 스팟의 소개문이 뜹니다.**
 *
 * 지금 양쪽이 공유하는 키는 이름뿐이라 이름으로 찾습니다. BE가 응답에 안정적인 키
 * (`tour_content_id`처럼 시드에 이미 있는 값)를 넣어주면 이 파일은 지워집니다.
 *
 * 부분일치로 찾지 않습니다 — '도장포유람선'과 '도장포어촌체험마을'이 둘 다 '도장포'를
 * 포함해서 엉뚱한 곳을 집습니다.
 */

/**
 * 화면 이름 → 서버 `pois.poi_name` (geojero `data/seed/pois.json` 기준, 2026-09-10 확인).
 * 값이 없는 스팟은 서버에 대응하는 POI가 없다는 뜻입니다.
 */
const SERVER_POI_NAME = {
  1: '해금강',
  2: '바람의언덕',
  4: '매미성',
  5: '거제식물원',
  6: '외도보타니아',
  7: '학동흑진주몽돌해변',
  8: '도장포유람선',
  9: null, // 명사해수욕장 — 시드에 없음(시드의 무좌표 항목은 덕포해수욕장입니다)
}

let indexPromise = null

/** 목록은 한 번만 받아 이름→id 맵으로 들고 있습니다. 스팟마다 다시 부를 이유가 없습니다. */
function loadIndex() {
  if (!indexPromise) {
    indexPromise = api
      .pois()
      .then(({ pois }) => new Map(pois.map((poi) => [poi.name, poi.poiId])))
      .catch((error) => {
        // 실패한 약속을 캐시에 남기면 다시 시도해도 영원히 같은 에러가 납니다.
        indexPromise = null
        throw error
      })
  }
  return indexPromise
}

/**
 * 화면 spotId → 서버 poi_id. 서버에 없거나 서버가 죽어 있으면 null입니다.
 * null을 받으면 호출부는 서버 호출을 건너뛰고 목이 아는 것만 그리면 됩니다.
 */
export async function resolvePoiId(spotId) {
  const name = SERVER_POI_NAME[spotId]
  if (!name) return null

  try {
    return (await loadIndex()).get(name) ?? null
  } catch {
    return null
  }
}
