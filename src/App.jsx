import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MAP_PATH } from './components/BottomNav'
import ApiOverlay from './dev/ApiOverlay'
import ConditionsPage from './pages/ConditionsPage'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import MyPlansPage from './pages/MyPlansPage'
import PlanPage from './pages/PlanPage'
import SpotDetailPage from './pages/SpotDetailPage'
import SpotPickPage from './pages/SpotPickPage'
import SpotsPage from './pages/SpotsPage'
import VerdictPage from './pages/VerdictPage'

/**
 * 하단 탭 4개 — 홈 / 스팟 / 지도 / 내 일정.
 *
 * 홈이 첫 진입 화면입니다. 조건을 정하고 스팟을 고르러 들어가는 순서라
 * 판정 결과(지도)보다 조건 세팅이 먼저 옵니다.
 *
 *   /                     홈
 *   /map                  지도 — 스팟을 아직 안 고른 둘러보기 상태
 *   /map?spots=5,2,7      지도 — 스팟 고르기에서 넘어온 판정 상태
 *   /spots                스팟 목록
 *   /spots/pick           스팟 고르기 (조건은 쿼리로; 없으면 시트에서 정함)
 *   /plan?spots=…         일정 고르기 — 고른 스팟으로 짠 추천 코스 카드 → 지도
 *   /spots/:spotId        스팟 상세
 *   /verdict/:routeId     판정 결과 (가는 편·오는 편 타임라인; 조건·스팟은 쿼리로)
 *   /my                   내 일정
 *   /conditions           판정 조건 — 지도 상단 칩이 인라인 편집으로 바뀌어
 *                         지금은 아무 데서도 링크하지 않습니다
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path={MAP_PATH} element={<MapPage />} />
        {/* 홈이 '/'로 올라오기 전에 나간 링크가 죽지 않게 남겨둡니다. */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/spots" element={<SpotsPage />} />
        <Route path="/spots/pick" element={<SpotPickPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/spots/:spotId" element={<SpotDetailPage />} />
        <Route path="/verdict/:routeId" element={<VerdictPage />} />
        <Route path="/my" element={<MyPlansPage />} />
        <Route path="/conditions" element={<ConditionsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 개발용 API 오버레이(`?debug=api`). DEV 분기라 프로덕션 번들에서는 통째로 빠집니다. */}
      {import.meta.env.DEV && <ApiOverlay />}
    </BrowserRouter>
  )
}
