import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MAP_PATH } from './components/BottomNav'
import ConditionsPage from './pages/ConditionsPage'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import MyPlansPage from './pages/MyPlansPage'
import SpotDetailPage from './pages/SpotDetailPage'
import SpotsPage from './pages/SpotsPage'
import VerdictPage from './pages/VerdictPage'

/**
 * 하단 탭 4개 — 홈 / 스팟 / 지도 / 내 일정.
 *
 * 지도는 아직 '/'에 있습니다. 홈 화면이 만들어지면 지도를 '/map'으로 옮기고
 * BottomNav의 MAP_PATH만 바꾸면 나머지는 따라옵니다.
 *
 *   /                     지도 — 스팟을 아직 안 고른 둘러보기 상태
 *   /?spots=5,2,7         지도 — 스팟 고르기에서 넘어온 판정 상태
 *   /home                 홈
 *   /spots                스팟 목록
 *   /spots/:spotId        스팟 상세
 *   /verdict/:routeId     판정 결과 (정류장 타임라인)
 *   /my                   내 일정
 *   /conditions           판정 조건 — 지도 상단 칩이 인라인 편집으로 바뀌어
 *                         지금은 아무 데서도 링크하지 않습니다
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={MAP_PATH} element={<MapPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/spots" element={<SpotsPage />} />
        <Route path="/spots/:spotId" element={<SpotDetailPage />} />
        <Route path="/verdict/:routeId" element={<VerdictPage />} />
        <Route path="/my" element={<MyPlansPage />} />
        <Route path="/conditions" element={<ConditionsPage />} />
        <Route path="*" element={<Navigate to={MAP_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
