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

  // 성립한 코스가 없을 때. "안 된다"가 아니라 "안내할 게 없다"입니다.
  'noRoutes.title': '이 조건으로 안내할 코스가 없어요',
  'noRoutes.text': '출발 시각이나 스팟을 바꾸면 짤 수 있는 조합이 생길 수 있어요.',
  // 사용자가 고른 스팟이 확인된 이유로 막혀 있을 때만 씁니다.
  // 시각을 바꾸라고 시키면 헛수고가 되므로 문구를 나눕니다.
  'noRoutes.blocked': '{name} — {reason}',
  'noRoutes.blockedHint': '위 스팟을 빼면 짤 수 있는 조합이 생길 수 있어요.',

  /* ── 탭바 ─────────────────────────────────────────────────────────────── */
  'nav.aria': '주요 화면',
  'nav.home': '홈',
  'nav.spots': '스팟',
  'nav.map': '지도',
  'nav.myPlans': '내 일정',

  /* ── 판정 배지 ────────────────────────────────────────────────────────── */
  'status.YES': '성립',
  'status.NO': '불성립',
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
  'home.wordmark': '거제로',
  'home.headline1': '스케줄만 고르세요.',
  'home.headline2': '코스는 맡기세요',
  'home.rowOrigin': '출발지',
  'home.rowDate': '날짜',
  'home.rowDepart': '출발 시간',
  'home.rowReturn': '복귀 시간 · {origin} 도착',
  'home.rowAria': '{label} {value}, 바꾸기',
  'home.cta': '가고 싶은 곳 고르기',
  'home.todayTitle': '오늘 버스로 되는 코스',
  'home.loading': '코스를 찾는 중',
  'home.empty':
    '이 조건으로 당일에 다녀올 수 있는 코스가 없습니다. 출발 시간을 앞당기거나 복귀 시간을 늦춰보세요.',

  /* ── 조건 시트 (274:529 / 274:571) ────────────────────────────────────── */
  'condition.untilLastBus': '막차까지',
  'condition.pillText': '{origin} · {date} · {depart} → {returnBy}',
  'condition.pillAria': '판정 조건 {text}, 바꾸기',
  'condition.sheetAria': '조건',
  'condition.sheetTitle': '조건',
  'condition.originLabel': '출발지',
  'condition.originPlaceholder': '도시나 터미널 이름',
  'condition.originClear': '출발지 지우기',
  'condition.originHint':
    '시간표가 있는 곳은 판정에 들어가고, 그 밖은 가까운 터미널까지 카카오맵 길찾기로 안내해요',
  'condition.dateTimeLabel': '날짜 · 시간',
  'condition.dateLabel': '날짜',
  'condition.departShort': '출발',
  'condition.returnRow': '복귀',
  'condition.returnRowWithOrigin': '복귀 ({origin} 도착)',
  'condition.returnHintLine':
    '복귀를 안 정하면 막차 기준으로 판정해요 · 출발보다 이르면 다음 날 도착(+1)',
  'condition.needOrigin': '출발지를 고르면 코스를 추천해 드려요',
  'condition.submit': '코스 추천 받기',

  /* ── 조건 편집 하위 시트 ──────────────────────────────────────────────── */
  'condition.titleOrigin': '어디서 출발하세요?',
  'condition.titleDate': '언제 가세요?',
  'condition.titleTime': '몇 시에 오가세요?',
  'condition.searchPlaceholder': '터미널·지역명 검색',
  'condition.searchAria': '터미널 검색',
  'condition.searchClear': '검색어 지우기',
  'condition.originCount': '시간표 확인된 터미널 {count}곳',
  'condition.originEmptyTitle': '‘{keyword}’ 은 없습니다',
  'condition.originEmptyText': '아직 안 만든 게 아니라 시간표를 확인하지 못한 터미널입니다.',
  'condition.originBadge': '시간표 있음 · 판정에 포함',
  'condition.trustNote':
    '시간표를 확인한 터미널만 판정에 넣습니다. 추정 시간표로 판정하면 막차를 놓칩니다.',
  'condition.prevMonth': '이전 달',
  'condition.nextMonth': '다음 달',
  'condition.monthLabel': '{year}년 {month}월',
  'condition.stepEarlier': '{label} 30분 앞당기기',
  'condition.stepLater': '{label} 30분 미루기',
  'condition.departLabel': '출발 시각',
  'condition.departHint': '터미널에서 버스 타는 시각',
  'condition.returnLabel': '귀가 시각',
  'condition.returnHint': '이 시각까지는 돌아와야 합니다',
  'condition.done': '이 시간으로 볼게요',

  /* ── 스팟 목록 (233:378) ──────────────────────────────────────────────── */
  'spots.title': '스팟',
  'spots.loading': '스팟을 불러오는 중',

  /* ── 스팟 고르기 (233:417 / 285:419) ──────────────────────────────────── */
  'pick.title': '스팟 고르기',
  'pick.headline': '방문하시고 싶은 곳을 선택해주세요.',
  'pick.sub': '여러 곳도 가능해요',
  'pick.needConditions': '출발지 · 출발 시간을 정해주세요',
  'pick.selectAria': '{name} 선택',
  'pick.deselectAria': '{name} 선택 해제',
  'pick.chipRemoveAria': '{name} 빼기',
  'pick.submit': '{count}곳으로 코스짜기',
  'pick.submitEmpty': '스팟을 골라주세요',

  /* ── 스팟 상세 (264:227) ──────────────────────────────────────────────── */
  'spotDetail.loading': '불러오는 중',
  'spotDetail.credit': '출처 TourAPI',
  'spotDetail.photosLabel': '사진 {count}장 — 좌우로 넘겨보세요',
  'spotDetail.goToPhoto': '{n}번째 사진 보기',
  'spotDetail.addToPlan': '일정에 담기',
  'spotDetail.introHead': '소개',

  /* ── 일정 고르기 (285:67 / 285:148) ───────────────────────────────────── */
  // ── 스팟 시간표 (02-2 · Figma 453:210 · 453:288 · 453:415) ───────────────
  'spotTime.board': '{stop}에서 타요.',
  // 내리는 정류장과 시간표를 읽는 정류장이 다를 때. 숨기면 "지세포 시간표"를
  // "신촌 시간표"라고 거짓말하는 것이 됩니다.
  'spotTime.boardDiffers': '{alight}에서 내려요. 시간표는 {stop} 정류장 기준이에요.',
  'spotTime.toOrigin': '{spot} → {origin}',
  'spotTime.fromOrigin': '{origin} → {spot}',
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
  'courseDetail.stay': '{min}분 머물러요',
  'courseDetail.source': '출처 {source} · {date}',
  'courseDetail.save': '이 코스 저장하기',
  'courseDetail.loading': '코스를 불러오는 중',
  'courseDetail.weekday': '평일',
  'courseDetail.holiday': '휴일',
  // ★ 추정 시각. 값이 없는 게 아니라 **앞뒤 정류장으로 감싼 값**이라 [미확인]과 다릅니다.
  // 배지만 달고 왜 추정인지 안 적으면 사용자가 판단할 수 없습니다.
  'courseDetail.estimated': '시각 추정',
  'courseDetail.estimatedNote':
    '{stops} 정류장은 원문 시간표에 시각 칸이 없어, 앞뒤 정류장 시각으로 잡았어요. 실제 버스는 적힌 시각보다 늦게 오고 적힌 도착 시각보다 일찍 닿습니다.',

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

  'plan.title': '일정 고르기',
  'plan.headline1': '사용자님의 일정에 맞춘 코스를',
  'plan.headline2': '추천해드려요',
  'plan.stateSubset': '{picked}곳을 다 넣으면 막차를 놓쳐요. {kept}곳으로 짜봤어요.',
  'plan.stateAll': '총 코스 {count}가지',
  'plan.condition': '{origin} · {date} · {depart} 출발',
  'plan.loading': '코스를 짜는 중',
  'plan.caption': '순서와 머무는 시간은 버스 시간에 맞춰 정했어요',
  'plan.recommended': '추천 · 막차 여유 가장 큼',
  'plan.excluded': '{name} 빼면',
  'plan.editSpots': '스팟 수정하기',
  'plan.openMap': '이 코스로 지도 확인',

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
  'map.entryTag': '⚑ {origin}에서 {duration}',
  'map.rejudging': '다시 판정하는 중',
  'map.browseTitle': '거제 주요 스팟입니다.',
  'map.browseText': '가고 싶은 곳과 시간을 홈을 통해 정하면, 코스를 안내해드려요.',
  'map.pinCourseAria': '선택한 코스',
  'map.clusterLabel': '{name} 외 {count}곳 — 눌러서 확대',
  'map.pinSpotAria': '선택한 스팟',
  'map.factDepartArrive': '출발 → 도착',
  'map.factLastBus': '돌아오는 막차',
  'map.lastStop': '{time} {stop}발',
  'map.openDetail': '자세히 보기 ›',

  /* ── 코스 스트립 (285:251) ────────────────────────────────────────────── */
  'course.sheetAria': '추천 코스',
  'course.recommended': '추천',
  'course.lastBus': '막차 {time}',
  'course.openVerdict': '코스 상세보기 ›',

  /* ── 판정 결과 (268:295) ──────────────────────────────────────────────── */
  'verdict.headerTitle': '{origin} → 거제',
  'verdict.headerTitleWithRoute': '{origin} → 거제 · {route}',
  'verdict.loading': '판정하는 중',
  'verdict.dirOut': '가는 편',
  'verdict.dirBack': '오는 편',
  'verdict.summaryRange': '{depart} - {arrive} · {legs}구간 · 돌아오는 막차 {lastBus}',
  'verdict.timetableMore': '{routeNo}번 시간표 더보기',
  'verdict.timetableCollapse': '{routeNo}번 시간표 접기',
  'verdict.source': '출처 {source} · {date}',
  'verdict.arrival': '{time} {origin} 도착',
  'verdict.saveHint': '일정을 저장하실 수 있어요',
  'verdict.save': '저장',
  // 저장 직후 하단 바 — Figma 384:294
  'verdict.saved': '내 일정에 저장했어요',
  'verdict.openMyPlans': '내 일정 보기',
  'verdict.saveUnavailable': '이 조합은 아직 저장할 수 없어요',

  /* ── 로그인 (240:209) ─────────────────────────────────────────────────── */
  'login.kakao': '카카오로 로그인',
  'login.sheetAria': '로그인',
  'login.title': '코스를 저장하려면 로그인 해주세요',
  'login.later': '나중에',
  'login.connecting': '카카오와 연결하는 중이에요',
  'login.failed': '로그인하지 못했어요',
  'login.failedHint': '잠시 뒤 다시 시도해 주세요.\n코스 판정과 시간표는 로그인 없이도 볼 수 있어요.',
  'login.goHome': '홈으로',

  /* ── 내 일정 (233:562) ────────────────────────────────────────────────── */
  'myPlans.title': '내 일정',
  'myPlans.emptyTitle': '코스를 저장하려면 로그인이 필요해요',
  'myPlans.emptyText1': '성립한 코스를 저장할 수 있어요.',
  'myPlans.emptyText2': '코스 추천은 로그인 없이 가능해요.',
  // 로그인 후 — Figma 379:246(저장 0건) · 380:259(저장 목록)
  'myPlans.logout': '로그아웃',
  'myPlans.loading': '불러오는 중…',
  'myPlans.savedEmptyTitle': '아직 저장한 일정이 없어요',
  'myPlans.savedEmptyText': '성립한 코스를 저장하면 여기에 모여요.',
  'myPlans.getCourses': '코스 추천 받기',
  'myPlans.delete': '삭제',
  'myPlans.deleteAria': '{title} 삭제',
  'myPlans.rejudge': '오늘 기준 재판정',
  'myPlans.rejudging': '확인 중…',
  'myPlans.meta': '{date} {time} 출발 · {legs}구간',
  'myPlans.metaNoLegs': '{date} {time} 출발',
  'myPlans.unknownCourse': '저장한 코스',

  /* ── 자리표시자 (/conditions — 아직 만들지 않은 화면) ─────────────────── */
  'placeholder.conditionsTitle': '판정 조건',
  'placeholder.conditionsLead':
    '이 화면은 다음 작업입니다. 지금은 메인 지도에서 넘어오는 경로만 연결해뒀습니다.',
  'placeholder.conditionsItem1': '출발지 — 검색창 + 부산서부 / 서울남부 / 통영 칩',
  'placeholder.conditionsItem2': '날짜 · 출발 시각',
  'placeholder.conditionsItem3': '귀가 시각 — 기본값 막차까지(제한 없음)',
  'placeholder.conditionsItem4': '코스 테마 필터 — 전체 / 언덕·전망 / 유람선 / 해수욕장 / 식물원 / 성',
  'placeholder.conditionsItem5': '코스 카드 가로 캐러셀',
  'placeholder.conditionsItem6': '하단 CTA — 판정하기',
}
