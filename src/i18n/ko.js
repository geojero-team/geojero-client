/**
 * 국문 사전. 키는 `화면.용도` 꼴이고, 두 화면 이상이 같은 문장을 쓰면 common/noRoutes로 뺍니다.
 *
 * 여기 없어야 하는 것: 스팟 이름, 소개문, 운휴 사유, 터미널 목록, 노선 번호.
 * 전부 서버가 내려주는 데이터입니다(§6 "poi_i18n, 번역 데이터 제외").
 */
export default {
  /* ── 여러 화면이 함께 쓰는 것 ─────────────────────────────────────────── */
  'common.back': '뒤로',
  'common.close': '닫기',
  'common.more': '더보기',
  'common.loadFailed': '불러오지 못했습니다 — {error}',

  /* ── 탭바 ─────────────────────────────────────────────────────────────── */
  // 홈 — 02-2에서 조건·판정 카드가 빠지고 이 버튼 하나가 남았습니다(446:453).
  'home.getCourses': '코스 추천 받기',

  'nav.aria': '주요 화면',
  'nav.home': '홈',
  'nav.spots': '스팟',
  'nav.timetable': '시간표',
  'nav.myPlans': '내 일정',

  'status.UNKNOWN': '미확인',

  /* ── 분류 ─────────────────────────────────────────────────────────────── */
  'category.aria': '분류',
  'category.all': '전체',
  'theme.VIEW': '언덕·전망',
  'theme.CRUISE': '유람선',
  'theme.BEACH': '해수욕장',
  'theme.GARDEN': '식물원',
  'theme.CASTLE': '성',
  'theme.HISTORY': '유적',
  // 전시관·기념관·체험시설·조각공원을 묶습니다. 칩 칸이 38px이라 '전시·체험'(약 60px)은
  // 넘칩니다 — '유적'·'성'과 같은 짧은 라벨로 맞췄습니다.
  'theme.EXHIBIT': '전시',

  /* ── 서식 ─────────────────────────────────────────────────────────────── */
  'format.empty': '—',
  'format.duration.hourMinute': '{hours}시간 {minutes}분',
  'format.duration.hour': '{hours}시간',
  'format.duration.minute': '{minutes}분',
  'format.cost': '{amount}원',
  'format.date.short': '{month}/{day}',
  'format.date.long': '{month}/{day}({weekday}) · {dayType}',
  'format.date.weekday': '{month}/{day}({weekday})',
  // 저장 목록 카드(Figma 380:259)는 '9월 14일(월)' 꼴을 씁니다 — 다른 화면의 '9/14(월)'과 다릅니다.
  'format.date.monthDay': '{month}월 {day}일({weekday})',
  'format.date.day': '{month}/{day}({weekday}) {dayType}',
  'format.dayType.weekday': '평일',
  'format.dayType.weekend': '주말',
  'weekday.sun': '일',
  'weekday.mon': '월',
  'weekday.tue': '화',
  'weekday.wed': '수',
  'weekday.thu': '목',
  'weekday.fri': '금',
  'weekday.sat': '토',

  /* ── 홈 (233:296) ─────────────────────────────────────────────────────── */

  /* ── 조건 시트 (274:529 / 274:571) ────────────────────────────────────── */

  /* ── 조건 편집 하위 시트 ──────────────────────────────────────────────── */

  /* ── 스팟 목록 (233:378) ──────────────────────────────────────────────── */
  'spots.title': '스팟',
  'timetableList.title': '시간표',
  'timetableList.hint': '스팟을 누르면 그 스팟의 버스 시간표를 볼 수 있어요',
  'spots.loading': '스팟을 불러오는 중',

  /* ── 스팟 고르기 (233:417 / 285:419) ──────────────────────────────────── */

  /* ── 스팟 시트 (지도에서 핀을 누를 때 · 2026-09-13) ───────────────────── */
  // 시트를 끌어올리면 스팟 상세가 그대로 나옵니다. 끄는 것 말고 **누를 수 있는** 길도
  // 남깁니다 — 마우스·키보드만 쓰는 사람에게는 세로로 끄는 동작이 어렵습니다.
  'spotSheet.expand': '자세히 보기',
  'spotSheet.collapse': '시트 내리기',

  /* ── 스팟 상세 (264:227) ──────────────────────────────────────────────── */
  'spotDetail.loading': '불러오는 중',
  'spotDetail.credit': '출처 TourAPI',
  'spotDetail.photosLabel': '사진 {count}장 — 좌우로 넘겨보세요',
  'spotDetail.goToPhoto': '{n}번째 사진 보기',
  // 02-1에서는 '일정에 담기'였고 스팟 고르기로 보냈습니다. 판정을 빼면서 그 화면이
  // 없어져 버튼이 홈으로 떨어졌습니다 — 새 흐름에 맞는 행동은 시간표 보기입니다.
  'spotDetail.openTimetable': '버스 시간표 보기',
  'spotDetail.introHead': '소개',

  /* ── 일정 고르기 (285:67 / 285:148) ───────────────────────────────────── */
  // ── 저장 (02-2 · Figma 446:1112 로그인 시트 · 446:1120 하단 바) ───────────
  'courseDetail.saving': '저장하는 중',
  'courseDetail.saved': '내 일정에 저장했어요',
  'courseDetail.savedGo': '내 일정 보기',
  'courseDetail.saveFailed': '저장하지 못했어요 — {error}',

  // ── 지도 · 고른 코스 (02-2 · Figma 446:717) ──────────────────────────────
  'courseMap.pill': '{count}곳 코스 · 고른 코스 {picked}개',
  'courseMap.select': '코스 선택',
  'courseMap.none': '고른 코스가 없어요. 코스 추천에서 다시 골라 주세요.',

  // ── 스팟 시간표 (02-2 · Figma 453:210 · 453:288 · 453:415) ───────────────
  'spotTime.board': '{stop}에서 타요.',
  // 내리는 정류장과 시간표를 읽는 정류장이 다를 때. 숨기면 "지세포 시간표"를
  // "신촌 시간표"라고 거짓말하는 것이 됩니다.
  'spotTime.boardDiffers': '{alight}에서 내려요. 시간표는 {stop} 정류장 기준이에요.',
  'spotTime.toOrigin': '{spot} → {origin}',
  'spotTime.toSpot': '{spot} → {to}',
  'spotTime.next': '다음 버스 {time} · {route}번',
  'spotTime.noNext': '오늘 남은 버스가 없어요',
  'spotTime.duration': '{to}까지 {min}',
  'spotTime.durationMore': '{route}번은 {min}',
  'spotTime.min': '약 {min}분',
  // 같은 노선·방향인데도 소요시간이 흔들립니다(같은 회차가 두 시트에 2~5분 다르게 실림).
  // 한 값으로 뭉개지 않고 폭을 적습니다 — 늦은 쪽을 믿어야 버스를 놓치지 않습니다.
  'spotTime.minRange': '약 {low}~{high}분',
  'spotTime.tableTitle': '{day} 시간표',
  'spotTime.summary': '첫차 {first} · 막차 {last} · 하루 {count}회',
  'spotTime.hour': '{h}시',
  'spotTime.nextTag': '다음',
  'spotTime.source': '출처 {source} · {date} · {day} 기준',
  'spotTime.loading': '시간표를 불러오는 중',
  // ★ 세 갈래. 빈 목록에 이유를 붙이지 않으면 §4에서 비판한 '이유 없는 빈칸'입니다.
  'spotTime.emptyUnknown': '{routes} 버스가 이 정류장에 서지만, 원문 시간표에 이 정류장의 시각 칸이 없어요.',
  'spotTime.emptyUnknownHint': '시각은 BIS에서 확인해 주세요 — 없는 시각을 지어내지 않습니다.',
  'spotTime.emptyNoService': '이 날은 이 구간을 가는 버스가 없어요.',
  'spotTime.emptyNoStop': '원문 시간표에 이 스팟의 정류장 칸이 없어요.',
  'spotTime.emptyNoStopHint': '버스가 지나가더라도 몇 시에 닿는지는 원문에 적혀 있지 않습니다.',

  // ── 코스 상세 (02-2 · Figma 446:929) ─────────────────────────────────────
  'courseDetail.title': '코스 {n} · {count}곳',
  'courseDetail.range': '{origin}에서 출발해 {origin}로 돌아와요 · {legs}구간',
  'courseDetail.hint': '스팟을 누르면 그 스팟의 버스 시간표를 볼 수 있어요',
  'courseDetail.departNode': '{origin} 출발',
  'courseDetail.arriveNode': '{origin} 도착',
  'courseDetail.leg': '{route}번 · {min}분',
  'courseDetail.legSameStop': '같은 정류장 · 바로 이동',
  'courseDetail.timetable': '시간표',
  'courseDetail.source': '출처 {source} · {date}',
  'courseDetail.save': '이 코스 저장하기',
  'courseDetail.loading': '코스를 불러오는 중',
  'courseDetail.weekday': '평일',
  'courseDetail.holiday': '휴일',
  // ★ 감싼 소요시간. 값이 없는 게 아니라 **앞뒤 정류장으로 감싼 값**이라 [미확인]과 다릅니다.
  // 화면에서 시각을 뺐으므로(2026-09-13) 이 각주도 시각이 아니라 소요시간을 말합니다.
  // 감싸는 방향이 정해져 있어 — 하차는 상한, 승차는 하한 — 늘 넉넉한 쪽으로만 어긋납니다.
  'courseDetail.estimatedNote':
    '{stops} 정류장은 원문 시간표에 칸이 없어, 앞뒤 정류장 시각으로 감싼 값이에요. 실제 이동 시간은 적힌 것보다 짧습니다 — 버스를 놓치지 않는 쪽으로만 어긋납니다.',

  // ── 코스 추천 (02-2 · Figma 446:559) ─────────────────────────────────────
  // 판정을 뺀 뒤 "스팟을 고르면 판정해준다"에서 "개수를 고르면 우리가 짠 코스를 준다"로
  // 바뀌었습니다. 그래서 plan.* 과 키를 따로 둡니다 — plan.* 은 판정 유물입니다.
  'courses.title': '코스 추천',
  'courses.headline1': '방문하시고 싶은',
  'courses.headline2': '스팟 개수를 고르시면',
  'courses.headline3': '코스를 추천해드립니다.',
  'courses.originNote': '주의 사항 : 모든 첫 출발지는 고현터미널로 가정합니다.',
  'courses.countChip': '{n}곳',
  'courses.total': '총 코스 {count}가지',
  // ★ 우리가 소유한 숫자. 출발·복귀 시각과 경과 시간(약 8시간 30분)은 2026-09-13에 화면에서
  // 뺐습니다 — 그 대부분이 머무는 시간이고, 얼마나 머물지는 사용자가 정하는 것입니다.
  'courses.busTotal': '버스 {min}',
  'courses.cardTitle': '코스 {n}',
  'courses.nineScenic': '거제9경 {count}곳',
  'courses.multiHint': '코스는 여러 개 고를 수 있어요',
  'courses.select': '코스 선택하기',
  'courses.selectN': '코스 {count}개 선택하기',
  'courses.loading': '코스를 불러오는 중',
  // 빈 칩의 이유를 밝힙니다. 이유 없는 빈칸은 우리가 기준문서 §4에서 비판하는 것입니다.
  'courses.emptyTitle': '{n}곳 코스는 아직 안내할 수 없어요',
  'courses.emptyFerry': '배로 가는 스팟이 들어가는 코스라, 배 시각을 확인하는 중입니다.',
  'courses.chipDisabled': '{n}곳 코스 없음',


  /* ── 지도 (285:208 / 240:164) ─────────────────────────────────────────── */
  'map.zoomIn': '확대',
  'map.zoomOut': '축소',
  'map.loading': '지도를 불러오는 중',
  'map.errorTitle': '지도를 표시할 수 없습니다',
  'map.retry': '다시 시도',
  'map.errorNoKey':
    '카카오 JavaScript 키가 없습니다. 프로젝트 루트의 .env.local에 VITE_KAKAO_MAP_KEY를 채우고 dev 서버를 재시작하세요.',
  'map.errorSdk':
    'SDK를 불러오지 못했습니다. 카카오 개발자 콘솔에서 ① 제품 설정 > 카카오맵이 ON인지, ② 플랫폼 > Web에 현재 도메인이 등록됐는지, ③ 앱키가 JavaScript 키가 맞는지 순서로 확인하세요.',
  'map.clusterLabel': '{name} 외 {count}곳 — 눌러서 확대',

  /* ── 코스 스트립 (285:251) ────────────────────────────────────────────── */

  /* ── 로그인 (240:209) ─────────────────────────────────────────────────── */
  'login.kakao': '카카오로 로그인',
  'login.sheetAria': '로그인',
  'login.title': '코스를 저장하려면 로그인 해주세요',
  'login.later': '나중에',
  'login.connecting': '카카오와 연결하는 중이에요',
  'login.failed': '로그인하지 못했어요',
  'login.failedHint': '잠시 뒤 다시 시도해 주세요.\n코스와 시간표는 로그인 없이도 볼 수 있어요.',
  'login.goHome': '홈으로',

  /* ── 내 일정 (233:562) ────────────────────────────────────────────────── */
  'myPlans.title': '내 일정',
  'myPlans.emptyTitle': '코스를 저장하려면 로그인이 필요해요',
  'myPlans.emptyText1': '마음에 드는 코스를 저장할 수 있어요.',
  'myPlans.emptyText2': '코스 추천은 로그인 없이 가능해요.',
  // 로그인 후 — Figma 379:246(저장 0건) · 380:259(저장 목록)
  'myPlans.logout': '로그아웃',
  'myPlans.loading': '불러오는 중…',
  'myPlans.savedEmptyTitle': '아직 저장한 일정이 없어요',
  'myPlans.savedEmptyText': '저장한 코스가 여기에 모여요.',
  'myPlans.getCourses': '코스 추천 받기',
  'myPlans.delete': '삭제',
  'myPlans.deleteAria': '{title} 삭제',
  'myPlans.meta': '{date} · {depart} 출발 → {back} 복귀',
  'myPlans.metaNoBack': '{date} · {depart} 출발',
  'myPlans.unknownCourse': '저장한 코스',

  /* ── 자리표시자 (/conditions — 아직 만들지 않은 화면) ─────────────────── */
}
