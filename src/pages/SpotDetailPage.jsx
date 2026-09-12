import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Screen from '../components/Screen'
import SpotDetail from '../components/SpotDetail'

/**
 * 스팟 상세 화면 — Figma 02-2 `446:1160`. 주소는 `/spots/:spotId`입니다.
 *
 * 내용은 `components/SpotDetail`에 있습니다. 2026-09-13에 갈랐습니다 — 같은 내용이
 * 지도의 **스팟 시트**에도 들어가기 때문입니다(핀을 누르면 아래에서 올라오고 끌어올리면
 * 이 화면이 그대로 나옵니다). 여기는 그 내용을 **자기 화면으로** 여는 껍데기입니다.
 *
 * 이 경로는 살려둡니다 — 스팟 탭 목록에서 누르면 이리로 오고, 공유된 링크도 여기로 옵니다.
 * 390×754, 탭바 없음(push 화면).
 */
export default function SpotDetailPage() {
  const { spotId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // 새 탭으로 바로 열었을 때 뒤로 갈 곳이 없으면 홈으로 보냅니다.
  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  return (
    <Screen data-api="GET /api/pois/{poiId}">
      <SpotDetail key={spotId} poiId={spotId} onBack={goBack} />
    </Screen>
  )
}
