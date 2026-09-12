import { api } from './api'

/**
 * 스팟 사진 — poiId → imageUrl.
 *
 * 코스 API(`/api/courses`)는 사진을 주지 않습니다. 일부러 그렇습니다 — 코스를 내려주려고
 * TourAPI를 카드마다 부르면 코스 조회가 TourAPI 장애에 묶입니다. 기준문서 §6이
 * "인증·저장·TourAPI 장애가 조회를 막지 않는다"라 그 둘을 갈라 둡니다.
 *
 * 그래서 사진은 **따로 한 번** 받아 붙입니다. `/api/pois?withImages=true`가 22곳을
 * 한 번에 주고 서버가 24h 캐시하므로, 카드 수와 무관하게 호출이 한 번입니다.
 *
 * 실패하면 **빈 Map**을 돌려줍니다. 화면은 테마별 자리 그림으로 떨어지고 죽지 않습니다
 * (`lib/courseImage.js`). 저작권 보류(cpyrhtDivCd Type3)인 스팟은 서버가 imageUrl을
 * null로 주므로 여기서 걸러집니다 — 사진 없음은 버그가 아니라 사실입니다.
 */
let cached = null

export async function loadSpotPhotos() {
  if (cached) return cached
  try {
    const res = await api.pois(true)
    cached = new Map(
      (res.pois ?? []).filter((poi) => poi.imageUrl).map((poi) => [poi.poiId, poi.imageUrl]),
    )
  } catch {
    // 사진이 없는 것과 화면이 죽는 것은 다릅니다. 자리 그림으로 갑니다.
    cached = new Map()
  }
  return cached
}

/** 스팟 배열에 사진을 얹습니다. 사진이 없는 스팟은 손대지 않습니다. */
export function withPhotos(spots, photos) {
  if (!photos || photos.size === 0) return spots
  return spots.map((spot) => {
    const url = photos.get(spot.poiId)
    return url ? { ...spot, thumbnailUrl: url } : spot
  })
}
