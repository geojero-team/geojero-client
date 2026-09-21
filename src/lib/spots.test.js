import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({ api: { pois: vi.fn(), poi: vi.fn() } }))

const POIS = [
  { poiId: 1, name: '바람의언덕', shortName: '바람의언덕', theme: 'VIEW', imageUrl: null, likeCount: 3, liked: false },
  {
    poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', theme: 'BEACH',
    imageUrl: 'https://tong.visitkorea.or.kr/a.jpg', likeCount: 12, liked: true,
  },
]

/** 캐시가 모듈 스코프라 케이스마다 모듈을 새로 읽습니다(api 목도 같은 등록에서 새 vi.fn 으로 다시 만들어집니다). */
async function fresh(pois = POIS) {
  vi.resetModules()
  const [{ api }, spots] = await Promise.all([import('./api'), import('./spots')])
  api.pois.mockResolvedValue({ pois: pois.map((poi) => ({ ...poi })) })
  return { api, ...spots }
}

/** 스팟 하트(2026-09-21 사용자 결정 · 부록 Q) — 상세에서 누른 뒤 목록 캐시를 고쳐, 뒤로 갔을 때 카드의 수가 맞게 합니다. */
describe('patchSpot — 목록 캐시 고치기', () => {
  it('캐시가 없으면 아무것도 하지 않는다 — 서버를 부르지도, 항목을 만들지도 않는다', async () => {
    const { api, patchSpot, loadSpots } = await fresh()

    patchSpot(4, { likeCount: 13, liked: true })

    expect(api.pois).not.toHaveBeenCalled()
    expect((await loadSpots()).get(4).likeCount).toBe(12)
  })

  it('받아 둔 목록의 그 스팟만 고치고, 다음 loadSpots · loadVisibleSpots 가 새 값을 준다 — 서버를 다시 부르지 않는다', async () => {
    const { api, patchSpot, loadSpots, loadVisibleSpots } = await fresh()
    await loadSpots()

    // 주소(:spotId)에서 온 문자열 id 도 같은 항목이어야 합니다
    patchSpot('4', { likeCount: 13, liked: true })

    expect((await loadSpots()).get(4)).toMatchObject({ likeCount: 13, liked: true, shortName: '학동몽돌해변' })
    expect((await loadSpots()).get(1)).toMatchObject({ likeCount: 3, liked: false })
    expect((await loadVisibleSpots()).find((spot) => spot.poiId === 4).likeCount).toBe(13)
    expect(api.pois).toHaveBeenCalledTimes(1)
  })

  it('없는 poiId 는 만들지 않는다', async () => {
    const { patchSpot, loadSpots } = await fresh()
    await loadSpots()

    patchSpot(999, { likeCount: 1 })

    expect((await loadSpots()).has(999)).toBe(false)
  })
})

describe('loadSpotDetail — 하트 값', () => {
  it('상세 응답의 likeCount · liked 를 쓴다 — 목록 캐시보다 새 값이다', async () => {
    const { api, loadSpotDetail } = await fresh()
    api.poi.mockResolvedValue({ poiId: 4, name: '학동흑진주몽돌해변', detail: { source: 'TourAPI' }, likeCount: 14, liked: false })

    expect(await loadSpotDetail('4')).toMatchObject({ likeCount: 14, liked: false })
  })

  it('상세 호출이 실패하면 목록 값으로 떨어진다', async () => {
    const { api, loadSpotDetail } = await fresh()
    api.poi.mockRejectedValue(new Error('서버에 연결하지 못했습니다'))

    expect(await loadSpotDetail(4)).toMatchObject({ likeCount: 12, liked: true })
  })

  it('둘 다 없으면(옛 응답) likeCount 는 null, liked 는 false — 화면이 버튼을 그리지 않는다', async () => {
    const { api, loadSpotDetail } = await fresh([{ poiId: 4, name: '학동흑진주몽돌해변', shortName: '학동몽돌해변', theme: 'BEACH', imageUrl: null }])
    api.poi.mockResolvedValue({ poiId: 4, name: '학동흑진주몽돌해변', detail: {} })

    const detail = await loadSpotDetail(4)

    expect(detail.likeCount).toBeNull()
    expect(detail.liked).toBe(false)
  })
})
