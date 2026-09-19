import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PlaceDetail from '../components/PlaceDetail'
import Screen from '../components/Screen'

/**
 * 맛집 · 숙소 상세 화면 — `/places/:placeId` (2026-09-19). 내용은 `components/PlaceDetail` 이다 — 홈 지도의 시트도 같은 것을 그린다.
 */
export default function PlaceDetailPage() {
  const { placeId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  /* 바로 연 주소(공유 링크)면 앞 기록이 없어 앱 밖으로 나가므로 스팟 탭으로 보낸다. 이 화면은 주소를 replace 하지 않아 key 로 가른다. */
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/spots', { replace: true }))

  return (
    <Screen data-api="GET /api/places/{placeId}">
      <PlaceDetail placeId={placeId} onBack={goBack} />
    </Screen>
  )
}
