import { api } from './api'

/**
 * 스팟 데이터 계층 — `/api/pois` 한 번을 캐시해 여러 화면이 나눠 씁니다.
 *
 * 2026-09-12에 `spotPhotos.js`에서 이름을 바꿨습니다. 사진만 얹던 파일이었는데,
 * 스팟 목록·스팟 상세가 목(data/mockPlan)에서 서버로 옮겨오면서 **스팟 자체**를
 * 여기서 쥐게 됐습니다.
 *
 * 왜 한 번만 부르나: `withImages=true`면 서버가 POI마다 TourAPI를 부릅니다(24h 캐시).
 * 화면마다 부르면 그만큼 느려지므로 모듈 스코프에 캐시합니다. 코스 API는 사진을
 * 주지 않는데 그건 일부러입니다 — 코스 조회가 TourAPI 장애에 묶이면 안 됩니다
 * (기준문서 §6 "인증·저장·TourAPI 장애가 조회를 막지 않는다").
 *
 * 실패하면 **빈 값**을 돌려줍니다. 화면은 자리 그림으로 떨어지고 죽지 않습니다.
 */
let cached = null

/** poiId → poi 전체. 실패하면 빈 Map. */
export async function loadSpots() {
  if (cached) return cached
  try {
    const res = await api.pois(true)
    cached = new Map((res.pois ?? []).map((poi) => [poi.poiId, poi]))
  } catch {
    cached = new Map()
  }
  return cached
}

/**
 * 화면에 뜨는 스팟만. `theme`이 비어 있으면 분류·아이콘·팔레트를 못 정하고,
 * 그건 곧 "아직 화면에 낼 준비가 안 된 스팟"이라는 뜻입니다
 * (명사해수욕장은 쓸 사진이 없어 theme이 NULL입니다 — 기준문서 §6).
 */
export async function loadVisibleSpots() {
  const spots = [...(await loadSpots()).values()]
  return spots
    .filter((poi) => poi.theme)
    .map((poi) => ({ ...poi, thumbnailUrl: poi.imageUrl }))
}

/** poiId → imageUrl. 사진이 없는 스팟은 맵에 없습니다(저작권 Type3는 서버가 걸러 null로 줍니다). */
export async function loadSpotPhotos() {
  const spots = await loadSpots()
  const images = new Map()
  for (const [poiId, poi] of spots) {
    if (poi.imageUrl) images.set(poiId, poi.imageUrl)
  }
  return images
}

/** 스팟 배열에 사진을 얹습니다. 사진이 없는 스팟은 손대지 않습니다. */
export function withPhotos(spots, photos) {
  if (!photos || photos.size === 0) return spots
  return spots.map((spot) => {
    const url = photos.get(spot.poiId)
    return url ? { ...spot, thumbnailUrl: url } : spot
  })
}

/**
 * 스팟 상세 — 목록 캐시(분류·권역·좌표)와 상세 호출(소개문·사진)을 합칩니다.
 *
 * 두 군데서 오는 이유: `/api/pois/{id}`는 소개문·사진을 주지만 region·category·theme을
 * 주지 않고, 그 셋은 목록에만 있습니다. 화면은 둘 다 필요합니다.
 *
 * TourAPI가 죽어도 이름·분류는 보여줘야 하므로 상세 호출 실패는 삼킵니다
 * (기준문서 §6 "TourAPI 장애가 조회를 막지 않는다"). 목록까지 실패하면 상세 응답의
 * 이름만으로 최소한을 그립니다 — 빈 화면으로 멈추지 않습니다.
 */
export async function loadSpotDetail(poiId) {
  const id = Number(poiId)
  const base = (await loadSpots()).get(id) ?? null

  let detail = {}
  let name = base?.name ?? null
  try {
    const data = await api.poi(id)
    detail = data.detail ?? {}
    name = name ?? data.name ?? null
  } catch {
    // 소개문·사진 없이 그립니다. 아래 photos가 빈 배열이라 자리 그림으로 떨어집니다.
  }

  if (!base && !name) return null

  const images = Array.isArray(detail.images) ? detail.images.filter(Boolean) : []
  return {
    ...(base ?? {}),
    poiId: id,
    name,
    thumbnailUrl: base?.imageUrl ?? null,
    overview: detail.overview ?? null,
    // detail.source가 'TourAPI'가 아니면 자체 소개문(intro_text) 폴백입니다 —
    // 그때는 '출처 TourAPI' 칩을 달면 안 됩니다.
    overviewSource: detail.source ?? null,
    // 대표 사진이 첫 장이고 저작권(Type3)은 서버가 이미 걸렀습니다.
    photos: images.length > 0 ? images : detail.imageUrl ? [detail.imageUrl] : [],
  }
}
