import { useParams } from 'react-router-dom'
import PlaceholderScreen from '../components/PlaceholderScreen'
import { findMockSpot } from '../data/mockPlan'

/** 스팟 상세 — Figma `스팟 상세 — 바람의언덕`. 다음 작업입니다. */
export default function SpotDetailPage() {
  const { spotId } = useParams()
  const spot = findMockSpot(Number(spotId))

  return (
    <PlaceholderScreen
      title={spot?.name ?? '스팟 상세'}
      lead="아직 안 만들었습니다. 지도에서 스팟 카드의 [자세히 보기]로 넘어오는 경로만 연결해뒀습니다."
      items={[
        '상단 — TourAPI 관광사진 캐러셀',
        '이름 · 분류',
        'verdict-card — 판정 배지 + 왕복 이동 / 머무는 시간 + 근거',
        '소개 — TourAPI overview',
      ]}
    />
  )
}
