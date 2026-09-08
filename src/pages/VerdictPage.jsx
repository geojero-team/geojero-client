import { useParams } from 'react-router-dom'
import PlaceholderScreen from '../components/PlaceholderScreen'
import { findMockRoute } from '../data/mockPlan'

/** 판정 결과 — Figma `판정 결과 … (미확인)`. 다음 작업입니다. */
export default function VerdictPage() {
  const { routeId } = useParams()
  const route = findMockRoute(Number(routeId))

  return (
    <PlaceholderScreen
      title={route?.name ?? '판정 결과'}
      lead="아직 안 만들었습니다. 지도에서 코스 카드의 [자세히 보기]로 넘어오는 경로만 연결해뒀습니다."
      items={[
        '상단 — 총 소요 시간 / 시간 범위 / 구간 수 / 돌아오는 막차',
        '교통수단 체인 — 시외 › 55 › 유람선 › 55 › 시외',
        '가는 편 / 오는 편 탭 (각각 성립·불성립·미확인)',
        '정류장 타임라인 — 승하차 시각, 노선 회차, 시간표 더보기',
        '출처 · 기준일',
        '하단 고정 — 도착 시각 + 저장',
      ]}
    />
  )
}
