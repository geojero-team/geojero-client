import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ApiOverlay from './dev/ApiOverlay'
import Splash from './components/Splash'
import { useSplash } from './lib/useSplash'
import AuthCallbackPage from './pages/AuthCallbackPage'
import CourseDetailPage from './pages/CourseDetailPage'
import CourseMapPage from './pages/CourseMapPage'
import CoursesPage from './pages/CoursesPage'
import HomePage from './pages/HomePage'
import MyPlansPage from './pages/MyPlansPage'
import PlaceDetailPage from './pages/PlaceDetailPage'
import SpotDetailPage from './pages/SpotDetailPage'
import SpotsPage from './pages/SpotsPage'
import SpotTimetablePage from './pages/SpotTimetablePage'
import PrivacyPage from './pages/PrivacyPage'
import TimetableListPage from './pages/TimetableListPage'
import Tutorial from './components/Tutorial'

/**
 * 하단 탭 4개 — 홈 / 스팟 / 시간표 / 내 일정 (Figma 02-2 TabBar4).
 *
 * 흐름: 홈(지도) → 코스 추천(대표 코스 카드) → 지도(고른 코스 비교) → 코스 상세 → 스팟 시간표 → 저장.
 *
 *   /                     홈 — 지도 + '코스 추천 받기' (02-2 · 446:453)
 *   /courses              코스 추천 — 대표 코스 10개 카드, 여러 개 고름 (585:417)
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
  const splash = useSplash()

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
        {/* 맛집 · 숙소 상세(2026-09-19) — 스팟 탭 「맛집」 「숙소」 칩에서 들어온다. */}
        <Route path="/places/:placeId" element={<PlaceDetailPage />} />
        <Route path="/my" element={<MyPlansPage />} />
        {/* 개인정보처리방침 — 스토어 등재에 필요한 공개 주소(www.geojero.com/privacy) */}
        <Route path="/privacy" element={<PrivacyPage />} />
        {/* 카카오가 돌려보내는 자리. 이 경로가 카카오 콘솔의 Redirect URI와 같아야 합니다. */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 첫 방문 튜토리얼(Figma 02-2 558:200) — 홈에 처음 올 때 한 번. 지금 화면 프레임 안에 그립니다. */}
      <Tutorial />

      {/* 시작화면 — 화면을 **대신** 그리지 않고 위에 얹습니다. 그 3초 동안 아래에서 홈이
          이미 뜨고 있어야 넘어간 순간 지도가 준비돼 있습니다. */}
      {splash && <Splash />}

      {/* 개발용 API 오버레이(`?debug=api`). DEV 분기라 프로덕션 번들에서는 통째로 빠집니다. */}
      {import.meta.env.DEV && <ApiOverlay />}
    </BrowserRouter>
  )
}
