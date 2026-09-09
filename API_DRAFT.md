# 거제로 API 명세 (프론트 기준)

> **작성** 2026-09-08 · 프론트 · **개정** 2026-09-09 (3장 검토 반영)
> **근거** Figma `02 화면` / `02-1 화면 수정` + 구현된 지도 화면
> **범위** v2(방문자 사진·업로드·뷰어)는 보류. 아래에 포함하지 않음

## 확정된 구조 (2026-09-08 팀 결정)

| | 결정 | 결과 |
|---|---|---|
| ① 출발지 | **터미널만** | `origin`은 코드 문자열. 집→터미널 구간은 다루지 않음 |
| ② 판정 상태 | **성립 / 불성립 2개** | `verdict: "YES" \| "NO"`. 미확인 상태 없음 |
| ③ 방향 | **가는 편 / 오는 편 따로** | 응답이 `outbound` / `inbound`로 나뉨 |

이 셋이 스키마를 바꾸는 항목이었고, 이제 정해졌습니다.
남은 결정은 5장에 있으며 **전부 나중에 바꿔도 스키마가 안 흔들립니다.**

> **2026-09-09 검토 중:** ②(판정 2상태)는 3.3·3.4를 보류로 돌리면서 다시 열려 있습니다.
> 여기서 3상태로 뒤집으면 `verdict`를 쓰는 모든 응답이 바뀌므로, 백엔드에 넘기기 전에
> 결론을 내야 합니다. 나머지 두 항목(①·③)은 그대로 확정입니다.

---

## 1. 화면 흐름

```
홈 ─ 조건 편집 시트 ─→ 스팟 고르기(다중) ─→ 일정 고르기 ─→ 지도 ─→ 판정 결과
                          │                                          │
                          └─→ 스팟 상세                    저장(로그인) ─→ 내 일정
```

- 판정은 전부 **로그인 없이** 동작
- **내 일정**만 로그인 필요

---

## 2. 화면 → API 매핑

| 화면 | API |
|---|---|
| 홈 — 조건 카드 / 조건 편집 시트 | `GET /api/origins` |
| 홈 — 오늘 되는 코스 | `GET /api/courses` |
| 홈 — 최근에 본 코스 | 없음 (localStorage) |
| 스팟 고르기 · 스팟 탭 | `GET /api/spots` |
| 스팟 상세 | `GET /api/spots/{spotId}` |
| 일정 고르기 · 지도 | `GET /api/routes` |
| 판정 결과 | `GET /api/routes/timeline` |
| 판정 결과 — 시간표 더보기 | `GET /api/routes/{routeNo}/timetable` |
| 판정 결과 — 운항 캘린더 | `GET /api/ferries/{ferryId}/calendar` |
| 로그인 | `POST /api/auth/kakao` |
| 내 일정 · 저장 | `GET/POST/DELETE /api/plans` |
| 장애·폴백 배너 | `GET /api/notices` |

---

## 3. 공통 규칙

**검토 상태 (2026-09-09)**

| | 항목 | 상태 |
|---|---|---|
| 3.1 | 전부 GET · 서버에 조건 저장 안 함 | ✅ 동의 |
| 3.2 | 공통 조건 파라미터 4종 | ✅ 동의 |
| 3.3 | 판정은 2상태 | ⏸ **보류** |
| 3.4 | "당일 확인"은 구간 주석 | ⏸ **보류** (3.3에 딸림) |
| 3.5 | 모든 판정 응답에 출처 | ✅ 동의 |
| 3.6 | 에러 `code` 문자열 | ✅ 동의 |

### 3.1 전부 GET · 서버에 조건을 저장하지 않음 — ✅ 동의

조건(출발지·날짜·시각·고른 스팟)은 클라이언트가 들고 있다가 요청마다 통째로 보냅니다.
게스트 판정이 기본이라 서버에 세션이 필요 없고, 같은 조건이면 같은 응답이라 캐시됩니다.
프론트 URL과 쿼리스트링이 그대로 대응합니다.

```
프론트  /map?spots=5,2,7
API     GET /api/routes?origin=BUSAN_SEOBU&date=2026-09-08&departTime=07:00&returnBy=23:00&spots=5,2,7
```

### 3.2 공통 조건 파라미터 — ✅ 동의

| 이름 | 예시 | 설명 |
|---|---|---|
| `origin` | `BUSAN_SEOBU` | 출발 터미널 코드 |
| `date` | `2026-09-08` | 여행 날짜 |
| `departTime` | `07:00` | 터미널에서 버스 타는 시각 |
| `returnBy` | `23:00` | 이 시각까지는 돌아와야 함 |
| `spots` | `5,2,7` | 고른 스팟 id (쉼표 구분) |

### 3.3 판정은 2상태 — ⏸ 보류

```
YES  성립    파랑(brand/strong)
NO   불성립  빨강(status/no)
```

**전체 판정 = 가는 편과 오는 편을 합친 값**

```
outbound YES && inbound YES  →  YES
그 외                        →  NO
```

지도 마커 색과 코스 카드 배지는 이 합쳐진 값을 씁니다.

> **보류 사유:** 2상태로 갈지 자체를 다시 봅니다. 3.4와 한 덩어리라 같이 결정합니다.
> **이건 스키마를 바꾸는 항목입니다** — 백엔드 착수 전에 닫아야 합니다.

### 3.4 "당일 확인" 은 판정이 아니라 구간 주석 — ⏸ 보류

Figma 판정 결과 화면에 `가는 편 [? 미확인]`, `외도유람선 출발 시각은 당일 확인`이 있고
토큰 보드에도 `status/unknown`(앰버 `#B45309`)이 잡혀 있습니다.
판정을 2상태로 정했으니 이 정보를 담을 자리가 필요합니다.

**프론트 제안: 판정은 YES/NO로 두고, "당일 확인이 필요한 구간"을 따로 표시**

- 유람선 출항 시각처럼 **우리가 확정할 수 없는 값**은 판정을 흔들지 않고 주석으로 답니다
- 판정은 "확인된 시간표만으로도 성립하는가"로 계산합니다
- 화면에는 `⚠ 외도유람선 출발 시각은 당일 확인` 배너 + 해당 구간에 앰버 표시

```json
"checks": [
  {
    "type": "FERRY_DEPARTURE",
    "legSeq": 6,
    "message": "외도유람선 출발 시각은 당일 확인",
    "link": { "label": "운항 캘린더", "url": "https://..." }
  }
]
```

- [ ] **확인:** 이 방식으로 갈지, 아니면 Figma의 `미확인` 표시를 아예 뺄지

### 3.5 모든 판정 응답에 출처를 실어주세요 — ✅ 동의

Figma 판정 결과 하단에 `출처 거제시 BIS 원문 · 2026-08-18`이 고정으로 들어갑니다.
"추정이 아니라 원문"이 이 서비스의 근거라 화면에 항상 보여야 합니다.

```json
{ "source": "거제시 BIS 원문", "baseDate": "2026-08-18" }
```

### 3.6 에러 — ✅ 동의

HTTP 상태코드만으로는 화면별 폴백을 못 고릅니다. **`code` 문자열이 필요합니다.**

| code | 상황 | 프론트 처리 |
|---|---|---|
| `TOUR_API_UNAVAILABLE` | TourAPI 응답 없음 | 사진만 폴백, 판정은 정상 표시 |
| `TOUR_API_QUOTA_EXCEEDED` | 일일 한도(개발계정 1,000건) 도달 | 위와 동일 + 안내 배너 |
| `KAKAO_AUTH_UNAVAILABLE` | 카카오 인증 불가 | 저장 버튼 비활성 + 사유 안내 |
| `TIMETABLE_OUTDATED` | 시간표 개편분 미반영 | 판정 결과에 경고 배너 |

```json
{ "code": "TOUR_API_QUOTA_EXCEEDED", "message": "사진을 불러오지 못했습니다" }
```

---

## 4. API 상세

### 4.1 `GET /api/origins`

출발 터미널 목록. **시간표를 확인한 터미널만** 내려주세요 — 목록에 있다는 것 자체가
"판정에 넣을 수 있다"는 뜻입니다.

```json
{
  "origins": [
    { "code": "BUSAN_SEOBU", "name": "부산서부", "region": "부산",
      "firstDepartTime": "06:00", "lastReturnTime": "22:40" },
    { "code": "SEOUL_NAMBU", "name": "서울남부", "region": "서울",
      "firstDepartTime": "06:30", "lastReturnTime": "22:10" },
    { "code": "TONGYEONG",   "name": "통영",     "region": "경남",
      "firstDepartTime": "05:40", "lastReturnTime": "23:10" }
  ],
  "source": "거제시 BIS 원문",
  "baseDate": "2026-08-18"
}
```

*(시각 값은 예시입니다. 실제 첫차·막차로 채워주세요.)*

**필드별 이유**

- `code` — **식별자.** URL 쿼리(`/?origin=BUSAN_SEOBU`), localStorage(`geojero.origin`),
  `plans.origin` 컬럼에 그대로 들어갑니다. 여기에 한글 표시명을 쓰면 공유 링크가
  퍼센트 인코딩 덩어리가 되고, 표시명을 한 번 다듬는 순간 저장된 일정과 북마크가
  전부 매칭에 실패합니다. **한 번 정하면 안 바꾸는 값입니다.**
- `name` — **표시용.** 기획이 언제든 바꿔도 되는 값이라 `code`와 수명이 다릅니다.
- `region` — **출발지 검색 키워드.** `ConditionEditor.jsx:36`이
  `label.includes(q) || region.includes(q)`로 거르고 있어서, `경남`을 치면 `통영`이
  나오려면 별도 필드여야 합니다. 목록의 지역 태그 칩(`:93`)도 이 값을 씁니다.
  `name`에 `"통영(경남)"`처럼 합쳐 내리면 화면에 괄호가 그대로 찍히고, 지역별 그룹
  헤더가 필요해지는 순간 표시 문자열을 역파싱해야 합니다.
- `firstDepartTime` / `lastReturnTime` — **터미널별 운행 범위. 새로 요청합니다.**
  현재 프론트는 시각 선택 범위가 하드코딩돼 있습니다
  (`tripParams.js` — `DEPART_RANGE = ['04:00','13:00']`, `RETURN_RANGE = ['14:00','23:30']`).
  서울남부 첫차가 06:30인데 04:00을 고를 수 있으면, 사용자는 되는 줄 알고 골랐다가
  불성립을 받습니다. 이 값이 있으면 출발지를 고르는 순간 시각 선택기가 그 터미널
  범위로 좁아져 **애초에 불가능한 조건을 못 고르게** 됩니다. 판정 전에 거르는 쪽이
  판정 후 "불성립"을 보여주는 것보다 낫습니다.

**프론트 현황:** 3개가 하드코딩돼 있습니다 (`src/lib/tripParams.js`의 `ORIGINS`).
API가 나오면 교체합니다. 현재 프론트 필드명이 `label`인데 **명세의 `name`으로 통일**합니다.

---

### 4.2 `GET /api/spots`

관광지 목록. 스팟 탭과 스팟 고르기(다중 선택)가 씁니다.

```
GET /api/spots?theme=VIEW&q=바람
GET /api/spots?origin=BUSAN_SEOBU&date=2026-09-08&departTime=07:00&returnBy=23:00
```

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `theme` | 아니오 | 미지정 = 전체 |
| `q` | 아니오 | 이름 검색 |
| 조건 4종 | **아니오** | 주면 `verdict`가 붙고, 안 주면 안 붙음 |

**부르는 자리 세 곳**

| 화면 | 조건 4종 | 응답 | 프론트 |
|---|---|---|---|
| 탭바 → 지도 (둘러보기) | 안 붙임 | `verdict` 없음 → 마커 회색 | `MapPage.jsx:75` `fetchSpots()` |
| 스팟 탭 | 안 붙여도 됨 | 훑어보기 | 미구현 (`SpotsPage.jsx`) |
| 스팟 고르기 | **붙임** | 스팟별 `verdict` | 미구현 |

**이 API를 "조건 없을 때 쓰는 API"로 이해하면 안 됩니다.** 관광지 목록이 필요한
자리가 전부 쓰는 하나의 API이고, 조건을 붙이냐 마냐로 응답이 달라질 뿐입니다.
스팟 고르기에서 조건을 붙이는 쪽이 오히려 이 API의 존재 이유에 가깝습니다 —
고르는 단계에서 "어차피 안 되는 곳"을 알려줘야 사용자가 헛수고를 안 합니다.

> **조건 없이도 호출됩니다.** 탭바에서 지도로 바로 들어오면 조건을 **아직 안 고른**
> 상태입니다. (조건 기본값은 `defaultTripParams()`로 메모리에 늘 있지만, 둘러보기
> 화면에서는 서버로 보내지도, 조건 칩으로 띄우지도 않습니다 — `MapPage.jsx:166`.)
> 그럴 땐 판정을 하지 않았으므로 `verdict`를 내려주지 마세요 — 프론트도 그 경우
> 마커를 중립 회색으로 칠합니다. 판정 안 한 걸 색으로 말하면 거짓말이 됩니다.

> **스팟을 고른 뒤로는 이 API를 안 부릅니다.** 4.4 `GET /api/routes` 응답 안에
> `spots[]`가 통째로 들어 있어 요청 한 번으로 끝납니다 (`MapPage.jsx:74-75`의 분기).
> 백엔드에서는 스팟 직렬화 로직 하나를 두 응답이 공유하는 형태가 됩니다.

```json
{
  "spots": [
    {
      "spotId": 2,
      "name": "바람의언덕",
      "shortName": "바람의언덕",
      "theme": "VIEW",
      "category": "언덕·전망",
      "region": "남부권",
      "thumbnailUrl": "https://.../baram.jpg",
      "lat": 34.7849,
      "lng": 128.6558,
      "verdict": "YES",
      "summary": "왕복 4시간 50분 · 머무는 시간 2시간"
    }
  ],
  "source": "거제시 BIS 원문",
  "baseDate": "2026-08-18"
}
```

- `shortName` — `name`이 길 때 지도 마커 라벨로 씁니다. 없으면 `name`으로 폴백
- `verdict` — 조건이 없으면 필드 자체를 생략

---

### 4.3 `GET /api/spots/{spotId}`

스팟 상세. Figma `스팟 상세` 기준.

```
GET /api/spots/2?origin=BUSAN_SEOBU&date=2026-09-08&departTime=07:00&returnBy=23:00
```

```json
{
  "spotId": 2,
  "name": "바람의언덕",
  "category": "언덕·전망",
  "theme": "VIEW",
  "region": "남부권",
  "lat": 34.7849,
  "lng": 128.6558,
  "images": ["https://.../baram-1.jpg", "https://.../baram-2.jpg"],
  "overview": "TourAPI overview 원문 텍스트",
  "verdict": {
    "status": "YES",
    "headline": "오늘 버스로 갈 수 있어요",
    "facts": [
      { "label": "고정비용", "value": "59분" },
      { "label": "돌아오는 막차", "value": "20:05" }
    ],
    "basis": "부산서부 · 9/8(화) 평일 · 07:00 출발 기준"
  },
  "source": "거제시 BIS 원문",
  "baseDate": "2026-08-18"
}
```

- `images` — TourAPI 실패 시 빈 배열 + 에러 `code` (3.6)
- `verdict` — **조건이 없으면 통째로 생략.** 스팟 고르기에서 들어온 상세는 아직 시간을
  안 정한 상태라 판정을 할 수 없습니다
- `verdict.facts` — 화면에 2개만 들어갑니다

---

### 4.4 `GET /api/routes` — 맞춤 경로 후보

**지도 화면과 일정 고르기 화면의 본체.** 고른 스팟으로 만들 수 있는 경로 후보를 돌려줍니다.

```
GET /api/routes?origin=BUSAN_SEOBU&date=2026-09-08&departTime=07:00&returnBy=23:00&spots=5,2,7,1
```

**순위 규칙 (팀 결정)**

| rank | strategy | 기준 |
|---|---|---|
| 1 | `MOST_SPOTS` | 가장 많이 갈 수 있는 조합 |
| 2 | `FASTEST` | 최소 시간 동선 |
| 3 | `RELAXED` | +α (기준 미정 — 5장 참고) |

- **최대 3개**만 내려주세요
- 방문 순서만 다르면(A→B→C vs B→C→A) **서로 다른 경로**로 칩니다
- 고른 스팟을 다 넣을 수 없으면 **일부만 넣은 조합**을 내려주세요 (Figma `2곳이면 돼요` 화면)

```json
{
  "arrivalTime": "08:40",

  "spots": [
    {
      "spotId": 2, "name": "바람의언덕", "shortName": "바람의언덕",
      "theme": "VIEW", "category": "언덕·전망", "region": "남부권",
      "thumbnailUrl": "https://.../baram.jpg",
      "lat": 34.7849, "lng": 128.6558,
      "verdict": "YES", "summary": "왕복 4시간 50분 · 머무는 시간 2시간"
    }
  ],

  "routes": [
    {
      "routeId": 1,
      "rank": 1,
      "strategy": "MOST_SPOTS",
      "strategyLabel": "많이 도는",
      "name": "거제식물원 · 바람의언덕 · 학동몽돌해변 · 해금강",
      "spotIds": [5, 2, 7, 1],
      "verdict": "YES",
      "reason": null,
      "travelMin": 195,
      "stayMin": 330,
      "returnAnchorTime": "20:00",
      "lastBusTime": "21:20",
      "bufferMin": 80,
      "estimatedCost": 43800,
      "directions": { "outbound": "YES", "inbound": "YES" }
    }
  ],

  "droppedSpotIds": [],

  "source": "거제시 BIS 원문",
  "baseDate": "2026-08-18"
}
```

- `spotIds` — **방문 순서**입니다. 지도의 선도 이 순서로 이어집니다
- `name` — 코스명은 줄이지 말고 풀로 주세요. 경로 1·2·3을 이름으로 구분합니다
- `verdict` — 3.3의 합침 규칙 적용. `directions`에 방향별 값도 같이
- `droppedSpotIds` — 고른 것 중 어느 경로에도 못 들어간 스팟. 없으면 빈 배열
- `spots[]` 는 **고른 스팟 전부**를 내려주세요. 경로를 안 고른 상태에서 지도에 다 찍습니다

---

### 4.5 `GET /api/routes/timeline` — 판정 결과

한 경로의 정류장 타임라인. Figma `판정 결과 — 네이버형` 기준.

```
GET /api/routes/timeline?origin=BUSAN_SEOBU&date=2026-09-08&departTime=07:00&returnBy=23:00&spots=5,2,7,1
```

> `spots`는 **4.4가 돌려준 그 경로의 순서 그대로** 보냅니다. `routeId`는 서버에 저장된
> 게 아니라 응답 안에서만 유효한 번호라 다시 조회할 수 없습니다.

```json
{
  "title": "부산서부 → 거제 · 외도",
  "date": "2026-09-08",
  "dayType": "WEEKDAY",
  "verdict": "YES",

  "summary": {
    "totalMin": 930,
    "startTime": "07:00",
    "endTime": "22:30",
    "legCount": 5,
    "lastReturnTime": "20:05",
    "modes": ["시외", "55", "외도유람선", "55", "시외"]
  },

  "checks": [
    {
      "type": "FERRY_DEPARTURE",
      "legSeq": 6,
      "message": "외도유람선 출발 시각은 당일 확인",
      "link": { "label": "운항 캘린더", "url": "https://..." }
    }
  ],

  "directions": {
    "outbound": { "verdict": "YES", "legs": [] },
    "inbound":  { "verdict": "YES", "legs": [] }
  },

  "savable": true,
  "source": "거제시 BIS 원문",
  "baseDate": "2026-08-18"
}
```

**`legs[]` 타입** — Figma 타임라인의 행 종류와 1:1

| `type` | 화면 | 주요 필드 |
|---|---|---|
| `BOARD` | 정류장 승차 | `stop`, `time`, `mode`, `durationMin` |
| `ALIGHT` | 정류장 하차 | `stop`, `time`, `note` |
| `RIDE` | 노선 탑승 (회차 여러 개) | `stop`, `routeNo`, `trips[]`, `viaNote`, `moreLink` |
| `TRANSFER` | 환승 대기 | `note` ("같은 터미널 · 대기 45분") |
| `WALK` | 도보 | `note` ("선착장 이동") |
| `FERRY` | 승선·하선 | `stop`, `time`, `timeLabel`, `note`, `link` |
| `STAY` | 체류 | `note` ("외도 왕복"), `stayMin` |
| `EXTERNAL` | 우리 시간표 밖 (카카오맵 위임) | `from`, `to`, `note`, `deeplink` |

> `EXTERNAL`은 출발지를 터미널로 정하면서 **맨 앞에는 안 붙습니다.**
> 거제 안에서 시간표가 없는 구간이 나올 때만 씁니다.

```json
"legs": [
  { "seq": 1, "type": "BOARD",  "stop": "부산서부 출발", "time": "07:00",
    "mode": "시외버스", "durationMin": 80 },
  { "seq": 2, "type": "ALIGHT", "stop": "고현 하차", "time": "08:20",
    "note": "같은 터미널 · 대기 45분" },
  { "seq": 3, "type": "RIDE",   "stop": "고현 승차", "routeNo": "55",
    "trips": [
      { "time": "09:05", "label": "2회차 · 해금강행" },
      { "time": "11:05", "label": "3회차" }
    ],
    "viaNote": "학동 경유 · 50분",
    "moreLink": "/api/routes/55/timetable?stopId=GOHYEON&date=2026-09-08" },
  { "seq": 4, "type": "ALIGHT", "stop": "해금강 하차", "time": "09:55",
    "note": "선착장 이동" },
  { "seq": 5, "type": "FERRY",  "stop": "해금강 승선",
    "timeLabel": "출항 시각 당일 확인", "note": "외도유람선 · 매일 달라요",
    "link": { "label": "운항 캘린더", "url": "https://..." } },
  { "seq": 6, "type": "STAY",   "note": "외도 왕복", "stayMin": 120 }
]
```

---

### 4.6 `GET /api/courses` — 홈의 "오늘 되는 코스"

홈 화면에 미리 만들어둔 추천 코스를 보여줍니다. 사용자가 고른 스팟이 아니라
**큐레이션된 코스**라 4.4와 별개입니다.

```
GET /api/courses?origin=BUSAN_SEOBU&date=2026-09-08&departTime=07:00&returnBy=23:00&limit=6
```

```json
{
  "courses": [
    {
      "courseId": 1,
      "name": "부산발 당일치기 · 해금강",
      "shortName": "해금강",
      "theme": "VIEW",
      "region": "남부권",
      "thumbnailUrl": "https://.../haegeumgang.jpg",
      "spotIds": [1],
      "verdict": "YES",
      "reason": null,
      "summary": "07:00 → 22:30 · 막차 21:20"
    }
  ],
  "source": "거제시 BIS 원문",
  "baseDate": "2026-08-18"
}
```

- `spotIds` — 카드를 누르면 이 값으로 지도(`/map?spots=...`)로 넘어갑니다

---

### 4.7 `GET /api/routes/{routeNo}/timetable`

`55번 시간표 더보기 ›` 를 눌렀을 때.

```
GET /api/routes/55/timetable?stopId=GOHYEON&date=2026-09-08
```

```json
{
  "routeNo": "55",
  "stopName": "고현",
  "dayType": "WEEKDAY",
  "trips": [
    { "seq": 1, "time": "06:25", "label": "해금강행" },
    { "seq": 2, "time": "09:05", "label": "해금강행" },
    { "seq": 3, "time": "11:05", "label": null }
  ],
  "lastTripTime": "19:15",
  "source": "거제시 BIS 원문",
  "baseDate": "2026-08-18"
}
```

---

### 4.8 `GET /api/ferries/{ferryId}/calendar`

유람선은 날짜마다 운항 여부·출항 시각이 달라 별도 조회가 필요합니다.

```
GET /api/ferries/OEDO/calendar?month=2026-09
```

```json
{
  "ferryId": "OEDO",
  "name": "외도유람선",
  "days": [
    { "date": "2026-09-08", "operating": true,  "departures": ["09:00", "11:00", "14:00"] },
    { "date": "2026-09-09", "operating": false, "reason": "기상 악화" },
    { "date": "2026-09-10", "operating": null,  "reason": "당일 확인" }
  ],
  "note": "출항 시각은 당일 기상에 따라 바뀝니다",
  "source": "외도해상농원",
  "baseDate": "2026-09-01"
}
```

- `operating: null` = 당일 확인 → 3.4의 `checks[]`를 만드는 원인

---

### 4.9 `POST /api/auth/kakao`

내 일정 진입과 코스 저장에만 필요합니다. **판정은 로그인 없이 동작해야 합니다.**

```json
// 요청
{ "code": "카카오 인가 코드", "redirectUri": "https://geojero-client.vercel.app/auth/kakao" }

// 응답
{
  "accessToken": "...",
  "user": { "userId": 1, "nickname": "도현", "profileImageUrl": "https://..." }
}
```

---

### 4.10 내 일정

```
GET    /api/plans           저장한 코스 목록
POST   /api/plans           저장
DELETE /api/plans/{planId}  삭제
```

전부 `Authorization: Bearer {accessToken}` 필요.

```json
// GET /api/plans
{
  "plans": [
    {
      "planId": 3,
      "title": "부산발 당일치기 · 해금강",
      "thumbnailUrl": "https://.../haegeumgang.jpg",
      "verdict": "YES",
      "date": "2026-09-08",
      "summary": "07:00 출발 · 22:30 도착",
      "savedAt": "2026-09-07T11:20:00+09:00"
    }
  ]
}
```

```json
// POST /api/plans — 판정 결과 화면의 "저장" 버튼
{
  "origin": "BUSAN_SEOBU",
  "date": "2026-09-08",
  "departTime": "07:00",
  "returnBy": "23:00",
  "spotIds": [5, 2, 7, 1]
}
```

---

### 4.11 `GET /api/notices`

운영상태 배너(도로 유실 우회, 시간표 개편 등). 앱 진입 시 1회.

```json
{
  "notices": [
    {
      "id": 4,
      "level": "WARN",
      "title": "도로 유실로 명사해수욕장앞 우회 중",
      "body": "53·53-1 해당 구간 이용 불가",
      "affectedRoutes": ["53", "53-1"],
      "startDate": "2026-08-20",
      "endDate": null
    }
  ]
}
```

---

## 5. 남은 결정 사항

> **스키마를 바꾸는 항목은 전부 정해졌습니다.** 아래는 나중에 바꿔도 구조가 안 흔들립니다.

### ① "당일 확인"을 어떻게 표시할지 — 3.4 참고

판정은 2상태로 정했는데 Figma에는 `미확인` 탭과 `status/unknown` 토큰이 남아 있습니다.
프론트 제안은 **판정은 YES/NO, 당일 확인은 `checks[]` 주석**입니다.

- [ ] **결정:** 위 방식 / Figma의 미확인 표시를 제거

---

### ② 3순위 `RELAXED`의 기준

1순위 = 많이 도는, 2순위 = 최소 시간까지는 정해졌습니다. 3순위 "+α"가 미정입니다.

| 후보 | 화면 라벨 |
|---|---|
| 막차까지 여유가 가장 많은 | 여유 있는 |
| 환승이 가장 적은 | 환승 적은 |
| 요금이 가장 싼 | 저렴한 |

- [ ] **결정:** (프론트는 현재 `여유 있는`으로 가정)

---

### ③ `theme` 코드값 확정

프론트는 아래로 구현돼 있습니다.

| 화면 라벨 | 코드 |
|---|---|
| 전체 | (파라미터 생략) |
| 언덕·전망 | `VIEW` |
| 유람선 | `CRUISE` |
| 해수욕장 | `BEACH` |
| 식물원 | `GARDEN` |
| 성 | `CASTLE` |

- [ ] **결정:** 위 코드로 확정

---

### ④ 화면 문구를 서버가 주는가

`verdict.headline`("오늘 버스로 갈 수 있어요"), `reason`("주말 배차 감축으로 당일 왕복 불가")
같은 문장들.

- [ ] **결정:** 문장은 서버 / 수치만 서버

---

### ⑤ 저장할 때 무엇을 저장하는가

- **조건만 저장** → 열 때마다 다시 판정. 정확하지만 저장 당시 성립이던 게 불성립이 될 수 있음
- **결과 통째로 저장** → 열면 그대로. 시간표 개편되면 낡은 정보

- [ ] **결정:** (현재 명세는 조건만 저장으로 작성)

---

### ⑥ TourAPI 호출 주체

개발계정 일일 한도 1,000건이라 Figma에 폴백 화면까지 그려져 있습니다.
프론트가 직접 부르면 키가 노출되고 한도가 금방 찹니다.

- [ ] **결정:** 백엔드 프록시 + 캐싱 (프론트 의견: 그게 맞습니다)

---

### ⑦ "최근에 본 코스"를 서버가 기억하는가

게스트도 보이는 자리라 localStorage로 충분해 보입니다.

- [ ] **결정:** localStorage / 서버

---

### ⑧ 디자인 — `status/yes`를 초록으로 갈지

- Figma 토큰 보드: `status/yes` = 초록 `#15803D`
- 현재 프론트: **브랜드 파랑** `#0069B3`

- [ ] **결정:** 토큰 2줄이면 바뀝니다

---

### ⑨ 디자인 — `bg/page` ↔ `bg/surface`가 뒤바뀐 것 같음

토큰 보드는 `bg/page`=흰색, `bg/surface`=연회색인데 보통은 반대입니다.

- [ ] **결정:** 보드가 맞는지 확인

---

## 6. 프론트 구현 현황

| API | 상태 |
|---|---|
| `GET /api/routes` | 목 데이터로 지도 화면 완성 (`src/data/mockPlan.js`) |
| `GET /api/spots` | 위와 같은 파일. 조건 없는 둘러보기도 구현됨 |
| `GET /api/courses` | 목 데이터로 홈 화면 완성 (2026-09-09) |
| `GET /api/origins` | 터미널 3개 하드코딩 (`src/lib/tripParams.js`) |
| 나머지 | 미착수 |

**화면 경로 (2026-09-09 변경):** 홈이 첫 진입 화면이 되면서 `/`로 올라오고 지도가
`/map`으로 내려갔습니다. 지도로 보내는 코드는 `BottomNav`의 `MAP_PATH` 상수를 씁니다.

**개발용 API 오버레이:** 아무 화면에나 `?debug=api`를 붙이면 어떤 요소가 어떤 API를
부르는지 화면 위에 뱃지로 뜹니다. 표만 필요하면 `npm run api:map`.

**연결 방법:** `mockPlan.js`의 `fetchSpots` / `fetchPlan` 안에 주석 처리된 `fetch`를 살리고
목 반환만 지우면 됩니다. 화면 코드는 목 데이터를 직접 참조하지 않습니다.

- [x] `fetchPlan`의 주석이 `POST /api/verdict`로 남아 있던 것을 명세대로
      `GET /api/routes?origin=…&spots=…`로 수정 (2026-09-09)

### 확정 반영으로 프론트가 손봐야 할 것

- [ ] 판정 결과 라우트를 `/verdict/:routeId` → `/verdict?spots=5,2,7,1` 로 변경
      (`routeId`는 응답 안에서만 유효한 번호라 URL로 다시 조회할 수 없음)
- [ ] `ORIGINS`의 `label` → `name`으로 필드명 통일 (4.1)
- [ ] `DEPART_RANGE` / `RETURN_RANGE` 하드코딩을 `/api/origins`의
      `firstDepartTime` · `lastReturnTime` 기반으로 교체 (4.1)
- [ ] `verdict`에서 `UNKNOWN` 분기 제거 — **3.3 보류 해제 후**로 미룹니다.
      2상태로 확정되면 지우고, 3상태로 뒤집히면 되살려야 하는 코드입니다.

### 손대지 않기로 한 것

- **둘러보기 지도의 회색 마커.** 기본 조건(부산서부·오늘·07:00~23:00)으로 판정해
  색을 칠할지 검토했으나, 색을 칠하려면 근거가 보이도록 조건 칩도 같이 띄워야 하고
  그러면 안내 문구("시간을 홈을 통해 정하면")와 앞뒤가 안 맞습니다. 현재 구조
  — 둘러보기는 판정 없음, 판정은 조건+스팟이 갖춰져야 시작 — 가 일관되어 유지합니다.
  `PROJECT_CONTEXT 6-①`("첫 진입은 이미 판정된 상태")은 홈 화면 얘기이고,
  홈의 "오늘 되는 코스"가 기본 조건으로 판정돼 나오므로 거기서 충족됩니다.
