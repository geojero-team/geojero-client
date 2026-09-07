# 거제로 (geojero-client)

대중교통으로 거제도 당일치기가 **오늘 실제로 가능한지 판정**하는 서비스의 프론트엔드입니다.
기획·디자인·API 명세는 [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)를 먼저 읽으세요.

## 실행

```bash
npm install
cp .env.example .env.local   # 그리고 VITE_KAKAO_MAP_KEY 를 채웁니다
npm run dev                  # http://localhost:5173
```

`VITE_KAKAO_MAP_KEY`는 카카오 개발자 콘솔 > 내 애플리케이션 > **앱 키 > JavaScript 키**입니다.
같은 콘솔의 **플랫폼 > Web**에 아래 도메인이 등록돼 있어야 지도가 뜹니다.

- `http://localhost:5173`
- `https://geojero-client.vercel.app`

> 포트는 `vite.config.js`에서 5173으로 고정해뒀습니다. 카카오에 등록된 도메인이
> 5173뿐이라, 포트가 밀리면 지도가 조용히 죽는 대신 실행이 바로 실패하도록 한 것입니다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint |

## 구조

```
src/
  App.jsx                   라우팅 (화면 3개)
  index.css                 리셋 + 전역 스타일
  styles/tokens.css         디자인 토큰 (Figma 토큰과 1:1)
  lib/
    kakaoLoader.js          카카오맵 SDK 로더
    tripParams.js           판정 조건 기본값 · localStorage
    format.js               시간 · 금액 · 날짜 포매터
  data/mockCourses.js       목 데이터 (GET /api/courses 응답 형태)
  components/               Screen · SummaryChip · MapView · CourseSheet
  pages/                    MapPage · ConditionsPage · CourseDetailPage
```

## 라우트

| 경로 | 화면 | 상태 |
|---|---|---|
| `/` | ① 메인 지도 | 구현 |
| `/conditions` | ② 판정 조건 입력 | 자리표시자 |
| `/courses/:courseId` | ③ 코스 상세 — 역산 타임라인 | 자리표시자 |

## API 연결

지금은 `src/data/mockCourses.js`의 목 데이터를 씁니다. 백엔드가 나오면
`fetchCourses()` 안의 주석 처리된 `fetch`를 살리고 목 반환만 지우면 됩니다.
화면 코드는 목 데이터를 직접 참조하지 않습니다.
