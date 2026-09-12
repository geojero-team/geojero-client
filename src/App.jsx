import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ApiOverlay from './dev/ApiOverlay'
import AuthCallbackPage from './pages/AuthCallbackPage'
import CourseDetailPage from './pages/CourseDetailPage'
import CourseMapPage from './pages/CourseMapPage'
import CoursesPage from './pages/CoursesPage'
import HomePage from './pages/HomePage'
import MyPlansPage from './pages/MyPlansPage'
import SpotDetailPage from './pages/SpotDetailPage'
import SpotsPage from './pages/SpotsPage'
import SpotTimetablePage from './pages/SpotTimetablePage'
import TimetableListPage from './pages/TimetableListPage'

/**
 * 하단 탭 4개 — 홈 / 스팟 / 시간표 / 내 일정 (Figma 02-2 TabBar4).
 *
 * 흐름: 홈(지도) → 코스 추천(개수) → 지도(고른 코스 비교) → 코스 상세 → 스팟 시간표 → 저장.
 *
 *   /                     홈 — 지도 + '코스 추천 받기' (02-2 · 446:453)
 *   /courses?spots=3      코스 추천 — 개수를 고르면 우리가 짠 코스 (446:559)
 *   /course-map?courses=  지도 — 고른 코스를 넘겨 비교 (446:717)
 *   /courses/:id?no=1     코스 상세 — 구간별 노선·이동시간·추정 (446:929)
 *   /timetable            시간표 탭 — 스팟 목록 (451:518)
 *   /timetable/:poiId     스팟 시간표 — 방향 칩·다음 버스 (453:288)
 *   /spots                스팟 목록 (기능 02-1과 같음)
 *   /spots/:spotId        스팟 상세 (기능 02-1과 같음)
 *   /my                   내 일정 (기능 02-1과 같음)
 *
 * 2026-09-12에 판정 화면 다섯을 지웠습니다 — /map(판정 지도) · /spots/pick(스팟 고르기) ·
 * /plan(일정 고르기) · /verdict/:routeId(판정 결과) · /conditions(판정 조건).
 * 판정을 제품에서 뺐고(기준문서 §9) 그 화면들이 하던 일은 코스 추천·코스 상세가 대신합니다.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* 홈이 '/'로 올라오기 전에 나간 링크가 죽지 않게 남겨둡니다. */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/spots" element={<SpotsPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/course-map" element={<CourseMapPage />} />
        <Route path="/timetable" element={<TimetableListPage />} />
        <Route path="/timetable/:poiId" element={<SpotTimetablePage />} />
        <Route path="/spots/:spotId" element={<SpotDetailPage />} />
        <Route path="/my" element={<MyPlansPage />} />
        {/* 카카오가 돌려보내는 자리. 이 경로가 카카오 콘솔의 Redirect URI와 같아야 합니다. */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 개발용 API 오버레이(`?debug=api`). DEV 분기라 프로덕션 번들에서는 통째로 빠집니다. */}
      {import.meta.env.DEV && <ApiOverlay />}
    </BrowserRouter>
  )
}
