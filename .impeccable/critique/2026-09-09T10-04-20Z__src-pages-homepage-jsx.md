---
target: 홈 화면 (src/pages/HomePage.jsx)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/dohyun/KNU 4th/geojero-client/src/pages/HomePage.jsx"
target_fingerprint: "sha256:a9b1f346099e3aaff0fe27f0b1b2dbc09c23c44cad75c4ab278d39f260127fe0"
target_path: /Users/dohyun/KNU 4th/geojero-client/src/pages/HomePage.jsx
timestamp: 2026-09-09T10-04-20Z
slug: src-pages-homepage-jsx
---
# 거제로 홈 화면 — 디자인 크리틱

Method: dual-agent (A: 디자인 리뷰 Opus / B: 디텍터·측정 Sonnet). B의 브라우저 오버레이 주입은 실패(주입 가능한 브라우저 도구 부재), 정적 스캔·대비 계산으로 대체. A는 헤드리스 크롬 CDP로 390/520/360 실측.

## Design Health Score — 21/40

| # | 휴리스틱 | 점수 | 핵심 문제 |
|---|---|---|---|
| 1 | 시스템 상태 가시성 | 1 | 조건 변경 시 `courses.length === 0` 가드 때문에 화면 무변화 — 낡은 판정이 현재인 척 |
| 2 | 실세계와의 일치 | 3 | 성립/불성립·복귀 시간 정의는 최상급. `<h2>오늘...` 하드코딩 |
| 3 | 사용자 통제와 자유 | 2 | Escape 핸들러 0개, 포커스 트랩·스크롤 락 없음 |
| 4 | 일관성과 표준 | 2 | 텍스트 글리프 vs Lucide 혼용, 성립 색이 코드/Figma 불일치 |
| 5 | 오류 방지 | 3 | DEPART_RANGE/RETURN_RANGE로 시간 역전 구조적 차단 — 잘 됨 |
| 6 | 회상보다 인식 | 3 | 조건 4개를 값으로 노출 — 옳은 선택 |
| 7 | 유연성과 효율 | 1 | 07:00→09:30이 34×34px 5탭, 프리셋 없음, 날짜·시간 미저장 |
| 8 | 심미성과 미니멀 | 2 | 무의미한 점 4개, 중복 성립 칩 4개, 행 여백 63~73% |
| 9 | 오류 복구 | 1 | 원시 예외 노출 + 재시도 없음 |
| 10 | 도움말 | 3 | trustNote는 훌륭하나 홈은 성립 뜻·출처 미표기 |

n/a 없음 (전면 Operate 서피스).

## Design Specificity Verdict
카피는 대체 불가, 구성은 교체 가능. 레이아웃은 표준 예약앱 홈(워드마크→헤드라인→흰 카드 4행+CTA→가로 레일)이라 라벨만 바꾸면 야놀자/에어비앤비. 판정하는 앱이라는 사실이 레이아웃에 안 드러남. [철회] 헤드라인 지적은 잘못된 전제였음 — 이 제품은 판정만 하는 게 아니라 스팟이 많으면 알아서 빼서 코스를 자동 구성함. "코스는 맡기세요"는 제품이 실제로 하는 일이며 공모전 마케팅 톤도 의도된 것.

결정적 스캔: 정적 0건(exit 0). 라이브 URL에서 clipped-overflow-container 1건 → `.screen overflow:hidden`은 의도된 폰 프레임이므로 오탐.
시각 오버레이: 주입 도구 부재로 미생성. 390/520 실물 스크린샷으로 대체 확인.

## Overall Impression
포팅 자체는 정확(390px에서 Figma 대비 오차 10px 이내). 문제는 껍데기가 그 설계를 배신한다는 것. 최대 기회: 이 화면은 폼이 아니라 결과 화면이어야 함.

## What's Working
1. 첫 화면이 폼이 아니라 판정 — defaultTripParams + 마운트 즉시 fetchCourses.
2. 조건 라벨이 하중을 견디는 도메인 글 — `복귀 시간 · 부산서부 도착`이 판정의 정오를 가름.
3. 카드 메타의 스팟별 판정 — 부분 실패 코스를 레일에서 바로 읽힘.

## Priority Issues

### [P2 — 정정됨, 최초 P0] 조건을 바꿔도 판정이 조용히 낡음
updateTrip이 status:'loading'을 세우나 prev.data 유지, 가드가 `status==='loading' && courses.length===0`. 카드가 있으면 화면 무변화(60ms/500ms 후 바이트 동일 확인). 다른 조건으로 계산된 판정이 현재로 보임 — 노출 경로는 출발지·날짜 두 곳뿐(시간 시트는 열린 채 레일을 덮음). MOCK_DELAY_MS=250이라 실제 노출은 250ms 깜빡임 — 사용자 확인 후 P0에서 P2로 강등.
Fix: `stale = loading && courses.length>0` → .cards opacity .45 + pointer-events none, h2 옆 "다시 판정 중" 칩, aria-busy.
명령: /impeccable harden

### [P1] 520px 껍데기가 390px 설계를 33% 늘림 (사용자 불만의 정체)
Screen.module.css:4 max-width:520px vs Figma 390×826. 본문 350→480px(+37%), .cta 6.6:1→9.3:1, .rowValue 뒤 여백 221→351px(73%), 타입·높이는 불변.
Fix: max-width 430px, @media 560px → 470px.
명령: /impeccable adapt

### [P1] 타입 스케일 압축 + 카드 위계 역전
display 24/32 → title 20/28 = 1.20 비율. 네 단계가 전부 700. h1 잉크 178.3px vs h2 169.4px(5% 차). .cardName 14/400이 .cardMeta 12/500보다 가벼움.
Fix: display 700 30px/38px, --type-section 700 17px/24px 신설, .cardName 600 15px/22px + meta 400, 워드마크 전용 토큰, --type-time 삭제(body-strong와 동일값).
명령: /impeccable typeset

### [P1] 조건 카드가 뷰포트 43%, 작은 폰에서 증거 미노출
.inputCard 359px. 360×640에서 clientHeight 582 vs scrollHeight 757, 레일 168px 중 17px만 보임. 390×844에선 스크롤 자체가 없고 레일 아래 53px 낭비.
Fix: 날짜+출발+복귀를 한 행으로 접어 4행→2행(−140px), 결정 지점 5→3개로 인지부하 규칙 통과. `›`를 ChevronRight로.
명령: /impeccable layout

### [P2] 빈 상태·에러 상태 방치 + 날짜 하드코딩
빈 상태는 14px 회색 한 줄 + 250px 공백, 해법을 말하나 실행 컨트롤 없음. 에러는 원시 예외 + 재시도 없음. 셋 다 같은 .notice 클래스. ConditionEditor .empty는 이미 아이콘+제목+본문을 갖춤(품질 기준 이원화). h2가 "오늘" 하드코딩인데 trip.date는 3개월 뒤까지 선택 가능.
명령: /impeccable onboard + /impeccable harden

## 접근성 (별도 트랙)
- --status-no-soft #cf6363 on white = 3.80:1 → AA 실패(캘린더 주말 16px/700).
- 스팟 판정이 aria-hidden 색점에만 실려 스크린리더에서 완전 소실 — WCAG 1.4.1.
- .stepButton 34×34px — iOS 44pt/Android 48dp 미달, 최다 사용 컨트롤.
- src/ 전체 :hover 규칙 1개 — 520px 데스크톱에서 마우스 무반응.
- B 대비 계산(홈 요소 한정): rowLabel/cardMeta 7.69:1, notice 7.35:1, badge 5.10:1, badgeNo 4.78:1 — 전부 통과하나 배지 둘은 여유 없음.
명령: /impeccable audit

## Persona Red Flags
- 첫 방문 관광객(360×640): 증거 전에 527px 소모/가용 582px. 카드 17px만 보여 렌더 버그로 읽힘. 판정 앱이란 걸 모른 채 이탈.
- 재방문 지역민: 09:30까지 34×34px 5탭, 시트(525–844)가 레일(565–733)을 100% 가림. 프리셋·직접입력 없음, 날짜·시간 미저장.
- 저시력/스크린리더: 하드 px라 OS 글자크기 무효. 200% 확대 시 .card 고정 210px가 뷰포트 초과. .rowValue nowrap+ellipsis가 라벨을 잘라먹음.

## Minor Observations
- 데스크톱에서 레일 마우스 조작 불가. Figma의 `더보기` 링크가 포팅에서 누락.
- scroll-padding-inline 없어 스냅 카드가 거터가 아닌 x=0에 붙음.
- .inputCard 일회성 box-shadow(토큰 미사용) 드리프트 위험.
- key={label}이 출발지 변경 시 바뀌어 행 리마운트.
- 모든 썸네일이 동일 추상 SVG. Figma엔 실제 거제 사진.
- 목 데이터 전부 YES라 성립 칩 4중복. 그러나 불성립 분기 존재 — 필터되면 배지가 노이즈, 아니면 제목이 거짓.
- PROJECT_CONTEXT는 민트 #35C5F0인데 코드는 남색 #0069b3. 파랑이 브랜드·CTA·점·성립을 동시 의미 — 판정이 자기 색 상실. Figma 보드는 status/yes 초록 #15803d.
- Pretendard가 jsdelivr 렌더블로킹 + 로컬 폴백 없음(URL 자체는 200). 자체 호스팅 권장.

## Questions to Consider
1. [철회] 히어로 교체 제안 — 제품 이해 오류에서 나온 질문.
2. 홈이 폼일 필요가 있나 — 접힌 요약 칩 + 남는 359px을 레일에. 홈은 실제로 결과 화면.
3. 시간 시트가 자기가 바꾸는 레일을 가림. 상시 하단 스테퍼면 불성립→성립 전환이 보이고, 그게 곧 제품 데모.
4. 성공만 보여주는 앱은 추천 엔진과 구분 불가. `되는 코스 8 · 안 되는 코스 4`가 정직한 목록 아닌가.


---

## 정정 이력 (2026-09-09, 사용자 확인 후)
- P0 → P2 강등: 스테일 판정의 실제 노출은 250ms.
- 헤드라인 지적 철회: 코스 자동 구성은 제품의 실제 기능이고 마케팅 톤은 의도된 것.
- 크리틱이 놓쳤던 항목 2개 추가(사용자 지적): `.body` 좌우 여백 20px 부족, gap 20px 단일 값이라 블록 내부와 섹션 전환 간격이 동일.
- P1 5건 적용 완료(껍데기 430px, 타입 스케일, 세로 리듬, 좌우 24px, 화살표 아이콘).
