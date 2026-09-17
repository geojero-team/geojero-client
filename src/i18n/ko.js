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
  // 코스 제목 규칙 — 코스 추천 카드와 코스 상세가 같이 씁니다(lib/courseTitle). 서버 title 이 없을 때만.
  // 첫 스팟과 끝 스팟의 짧은 이름(2026-09-14 사용자 결정) — 그림의 「몽돌에서 바람의언덕까지」처럼 줄이진 못합니다.
  'common.courseTitleRange': '{first}에서 {last}까지',

  /* ── 탭바 ─────────────────────────────────────────────────────────────── */
  // 홈 — 02-2에서 조건·판정 카드가 빠지고 이 버튼 하나가 남았습니다(446:453).
  'home.getCourses': '코스 추천 받기',

  /* ── 거제9경 — 홈 왼쪽 위 버튼 · 설명 시트 · 스팟 시트 배지 (2026-09-14 사용자 결정) ──
     9경 이름 목록은 여기 두지 않습니다. 거제시가 정한 데이터라 lib/nineScenic.js 에 있습니다.
     설명은 문장마다 키를 나눕니다 — 시트가 문장마다 줄을 바꿉니다.
     한 문장이 390 화면에서 **한 줄**에 들어가게 줄였습니다. 두 줄로 넘어가면 "아홉 / 곳이에요"처럼
     말 중간에서 끊겨 문장마다 줄을 바꾼 의미가 없어집니다. */
  'nineScenic.title': '거제9경이란?',
  'nineScenic.lead1': '2024년 거제시가 새로 뽑은 대표 경관 아홉 곳이에요.',
  'nineScenic.lead2': '시민 여론조사와 전문가 위원 평가를 함께 반영했어요.',
  'nineScenic.lead3': '현지인이 인정한 곳이라 자신 있게 추천해요.',
  'nineScenic.legend1': '지도의 주황색 테두리 스팟이 거제9경이에요.',
  'nineScenic.legend2': '누르면 자세한 정보를 볼 수 있어요.',
  'nineScenic.rank': '{rank}경',
  // 9경 이름과 스팟 이름이 다를 때(정글돔 → 상세 제목은 거제식물원) 이름 아래 한 줄.
  'nineScenic.mapName': '{name} 안',
  'nineScenic.offMap': '지도에 없음',
  'nineScenic.linkAria': '{rank}경 {name} 상세 보기',
  'nineScenic.badge': '거제9경 · {rank}경',
  // 9경 배지 글자(코스 카드 배지, 2026-09-17 코스재설계 §5-2). 앞에 해 메달(장식)이 붙는다 — 2026-09-17 밤 1안.
  // 번호 원(①②④)은 2026-09-17 저녁 뺐습니다(사용자 결정 — 사진 위 배지에 숫자 없이). 「9」는 목록 이름의 일부라 남깁니다.
  'nineScenic.stamp': '거제 9경',
  'nineScenic.confirm': '확인',

  /* ── 첫 방문 튜토리얼 — Figma 02-2 558:200(09-14). 문장마다 키를 나눕니다(문장마다 한 줄). ──
     4단계 셋째 줄은 그림의 「모든 시간표는 거제시가 직접 제공하는 데이터예요.」에서 고쳤습니다(2026-09-15) —
     배 시간표(외도 · 내도 · 지심도)는 운항사 자료라 「모든」이 틀린 말이 됐습니다. 둘째 줄의 「버스 시간표」도 「버스·배 시간표」로. */
  'tutorial.progress': '{total}단계 중 {n}단계',
  'tutorial.skip': '건너뛰기',
  'tutorial.next': '다음',
  'tutorial.start': '시작하기',
  'tutorial.1.title': '고현터미널에서 출발해요',
  'tutorial.1.line1': '거제로 들어오는 시외버스가 도착하고, 섬 곳곳으로 가는 시내버스가 출발하는 곳이에요.',
  'tutorial.1.line2': '그래서 모든 코스는 고현터미널에서 시작해요.',
  'tutorial.2.title': '여행 코스를 추천받을 수 있어요',
  'tutorial.2.line1': '버스 시간표에 맞춰 코스를 짜 드려요.',
  'tutorial.2.line2': '차가 없어도 걱정하지 마세요.',
  'tutorial.3.title': '스팟을 둘러보세요',
  'tutorial.3.line1': '관광지를 누르면 상세 정보와 방문자들이 직접 찍은 사진 후기까지 볼 수 있어요.',
  'tutorial.4.title': '스팟마다 버스 시간표가 있어요',
  'tutorial.4.line1': '추천 코스가 아니어도 괜찮아요.',
  'tutorial.4.line2': '가고 싶은 스팟을 누르면 그곳의 버스·배 시간표를 볼 수 있어요.',
  'tutorial.4.line3': '버스 시간표는 거제시가 직접 제공하는 데이터예요.',

  'nav.aria': '주요 화면',
  'nav.home': '홈',
  'nav.spots': '스팟',
  'nav.timetable': '시간표',
  'nav.myPlans': '내 일정',

  'status.UNKNOWN': '미확인',

  /* ── 분류 ─────────────────────────────────────────────────────────────── */
  'category.aria': '분류',
  'category.all': '전체',
  // 2026-09-15 여행자 관점 6칸(사용자 결정 · 서버 V29). 코드는 그대로, 이름표만 바꿨습니다 — CASTLE(성)은 없어졌습니다.
  // 칩은 가로 스크롤이라(CategoryBar) 네 글자 라벨도 들어갑니다.
  'theme.BEACH': '바다·해변',
  'theme.CRUISE': '섬·유람선',
  'theme.VIEW': '전망·명소',
  'theme.GARDEN': '정원·숲',
  'theme.HISTORY': '역사·유적',
  'theme.EXHIBIT': '전시·체험',

  /* ── 서식 ─────────────────────────────────────────────────────────────── */
  'format.empty': '—',
  'format.duration.hourMinute': '{hours}시간 {minutes}분',
  'format.duration.hour': '{hours}시간',
  'format.duration.minute': '{minutes}분',
  'format.cost': '{amount}원',
  // 타는 곳 거리(2026-09-14 · Figma 프레임 없음 — 사용자 결정). 「약」은 쓰는 문구가 붙입니다.
  'format.distance.m': '{m}m',
  'format.distance.km': '{km}km',
  // 한글 수 낱말(formatCountWord — 코스 상세 「여섯 곳 중 네 곳」, 2026-09-17). 띄어 쓴 목록 한 줄씩: 일의 자리 1~9 · 십의 자리 10~90.
  // 스물은 단위 앞에서 「스무 곳」이 되고 「스물한 곳」은 그대로라 20만 따로 둡니다.
  'format.count.ones': '한 두 세 네 다섯 여섯 일곱 여덟 아홉',
  'format.count.tens': '열 스물 서른 마흔 쉰 예순 일흔 여든 아흔',
  'format.count.twenty': '스무',
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
  // 그림(451:613)은 「… 버스 시간표를 보여드려요」인데 2026-09-14 밤 「버스」를 뗐습니다(사용자 결정) —
  // 외도보타니아·도장포유람선은 배 시간표를 엽니다(스팟 상세 「시간표 보기」와 같은 이유).
  'timetableList.hint': '스팟을 고르면 가까운 정류장의 시간표를 보여드려요',
  // 목록 둘째 줄(451:619)은 하차 정류장 이름(서버 alightLabel 그대로)입니다. 시간표 기준 정류장이 다르면(씨월드·조선해양문화관)
  // 그 사실을 같이 적고, 정류장이 없는 외도보타니아는 배를 타는 선착장 넷을 적습니다(2026-09-14 밤 사용자 확인).
  'timetableList.stopDiffers': '{alight} · 시간표는 {stop} 기준',
  'timetableList.docks': '{docks} 선착장',
  'spots.loading': '스팟을 불러오는 중',

  /* ── 스팟 고르기 (233:417 / 285:419) ──────────────────────────────────── */

  /* ── 스팟 시트 (지도에서 핀을 누를 때 · 2026-09-13) ───────────────────── */
  // 시트를 끌어올리면 스팟 상세가 그대로 나옵니다. 끄는 것 말고 **누를 수 있는** 길도
  // 남깁니다 — 마우스·키보드만 쓰는 사람에게는 세로로 끄는 동작이 어렵습니다.
  // 고현터미널(Figma 02-2 501:213) — 시트·상세에서 권역·분류 자리에 들어갑니다.
  'terminal.startPoint': '모든 코스의 출발 지점',
  'spotSheet.expand': '자세히 보기',
  'spotSheet.collapse': '시트 내리기',

  /* ── 스팟 상세 (264:227) ──────────────────────────────────────────────── */
  'spotDetail.loading': '불러오는 중',
  'spotDetail.credit': '출처 TourAPI',
  'spotDetail.photosLabel': '사진 {count}장 — 좌우로 넘겨보세요',
  'spotDetail.goToPhoto': '{n}번째 사진 보기',
  // 02-1에서는 '일정에 담기'였고 스팟 고르기로 보냈습니다. 판정을 빼면서 그 화면이
  // 없어져 버튼이 홈으로 떨어졌습니다 — 새 흐름에 맞는 행동은 시간표 보기입니다.
  // 2026-09-14 「버스」를 뗐습니다(사용자 결정) — 외도보타니아·도장포유람선은 배 시간표도 엽니다.
  'spotDetail.openTimetable': '시간표 보기',
  'spotDetail.introHead': '소개',
  // 주소 · 내리는 곳(613:3, 2026-09-14 밤). 둘째 줄은 내리는 곳과 시간표 기준 정류장이 다를 때만 —
  // 스팟 시간표의 boardDiffers 와 같은 말입니다. 내리는 곳 줄은 **줄 전체가 시간표로 가는 버튼**입니다(613:11 — 「시간표 보기」 버튼 대체).
  'spotDetail.alight': '{label}에서 내려요',
  'spotDetail.timetableBasis': '시간표는 {stop} 정류장 기준이에요',
  // 정류장이 없는 외도보타니아 — 배를 타는 선착장 넷(스팟 시간표의 「{선착장} 선착장에서 타요.」와 같은 말). 그림에 없어 정한 것.
  'spotDetail.docks': '{docks} 선착장에서 타요',

  /* ── 방문자 사진 (02-2 · 484:212 섹션 · 268:499 뷰어) ── */
  // 제목·더보기·타일·빈 사진 칸은 Figma 원문 그대로입니다. 작성자 줄은 날짜만 씁니다 —
  // 서버가 작성자를 내려주지 않습니다(표기 규칙 미정). 「신고」는 그리지 않습니다(본인 삭제만).
  'visitorPhotos.title': '방문자 사진',
  'visitorPhotos.more': '더보기',
  'visitorPhotos.uploadTile': '내 사진 올리기',
  'visitorPhotos.slot': '방문자 사진',
  // 여기부터는 Figma에 없는 문구입니다. 0장과 실패는 다른 답이라 문구도 다릅니다.
  // 「더보기」가 소개의 「더보기」와 같은 글자라 읽는 이름만 구분합니다.
  // 「삭제」는 02-1 「신고」(268:512) 자리, 뷰어 캡션 아래에 내 사진일 때만 둡니다(기준문서 §6).
  'visitorPhotos.moreAria': '방문자 사진 더보기',
  'visitorPhotos.delete': '삭제',

  /* 신고(2026-09-16) — 사진마다 우측 위. 누르면 한 번 더 묻고, 신고하면 그 사진은 바로 감춰집니다. */
  'visitorPhotos.report': '신고',
  'visitorPhotos.reportAria': '{n}번째 방문자 사진 신고하기',
  'visitorPhotos.reportConfirm': '이 사진을 신고할까요?',
  'visitorPhotos.reportCancel': '취소',
  'visitorPhotos.reported': '신고했어요. 이 사진은 바로 보이지 않게 했어요.',
  'visitorPhotos.reportFailed': '신고하지 못했어요',
  'visitorPhotos.reportLoginTitle': '사진을 신고하려면 로그인 해주세요',
  'visitorPhotos.loading': '사진을 불러오는 중',
  'visitorPhotos.loadFailed': '사진을 불러오지 못했어요',
  'visitorPhotos.retry': '다시 시도',
  'visitorPhotos.tileAria': '{n}번째 방문자 사진',
  'visitorPhotos.deleteConfirm': '이 사진을 지울까요?',
  'visitorPhotos.deleteCancel': '취소',
  'visitorPhotos.deleteFailed': '사진을 지우지 못했어요',
  'visitorPhotos.uploaded': '사진을 올렸어요',
  'visitorPhotos.loginTitle': '사진을 올리려면 로그인 해주세요',
  'visitorPhotos.viewerAria': '방문자 사진 크게 보기',
  'visitorPhotos.prev': '이전 사진',
  'visitorPhotos.next': '다음 사진',

  /* ── 내 사진 올리기 시트 (02-1 v2 · 268:518) ─────────────────────────────── */
  'visitorPhotoUpload.title': '{name}에서 찍은 사진',
  'visitorPhotoUpload.preview': '선택한 사진',
  'visitorPhotoUpload.captionPlaceholder': '한 줄 남기기 (선택)',
  'visitorPhotoUpload.notice': '날짜는 자동으로 붙어요 · 사진 속 위치 정보는 저장하지 않아요',
  'visitorPhotoUpload.submit': '올리기',
  // 여기부터는 Figma에 없는 상태의 문구입니다(시트는 활성 상태 하나만 그려져 있습니다).
  'visitorPhotoUpload.sheetAria': '사진 올리기',
  'visitorPhotoUpload.pick': '사진 고르기',
  'visitorPhotoUpload.change': '사진 바꾸기',
  'visitorPhotoUpload.submitting': '올리는 중',
  'visitorPhotoUpload.errTooLarge': '사진이 너무 커요',
  // 형식 이름(JPEG·PNG)을 적지 않습니다 — 브라우저가 열 수 있으면 JPEG로 바꿔 올리므로 실제와 달라집니다.
  'visitorPhotoUpload.errUnreadable': '이 사진은 올릴 수 없어요',
  'visitorPhotoUpload.errCaption': '한 줄은 {max}자까지예요',
  'visitorPhotoUpload.errNetwork': '올리지 못했어요. 잠시 뒤 다시 시도해 주세요',

  /* ── 일정 고르기 (285:67 / 285:148) ───────────────────────────────────── */
  // ── 저장 (02-2 · Figma 446:1112 로그인 시트 · 446:1120 하단 바) ───────────
  'courseDetail.saving': '저장하는 중',
  'courseDetail.saved': '내 일정에 저장했어요',
  // 이미 저장한 코스(2026-09-15 — 같은 코스는 한 번만 저장. 서버도 409로 막습니다).
  'courseDetail.alreadySaved': '이미 내 일정에 저장한 코스예요',
  'courseDetail.savedGo': '내 일정 보기',
  'courseDetail.saveFailed': '저장하지 못했어요 — {error}',

  // ── 지도 · 고른 코스 (02-2 · Figma 446:717) ──────────────────────────────
  'courseMap.pill': '{count}곳 코스 · 고른 코스 {picked}개',
  'courseMap.select': '코스 선택',
  // 지도 카드는 폭이 좁아 '총 … 소요'를 뺀 짧은 꼴입니다.
  'courseMap.busTotal': '{time} 예정',
  'courseMap.none': '고른 코스가 없어요. 코스 추천에서 다시 골라 주세요.',

  // ── 스팟 시간표 (02-2 · Figma 453:210 · 453:288 · 453:415) ───────────────
  'spotTime.board': '{stop}에서 타요.',
  // 내리는 정류장과 시간표를 읽는 정류장이 다를 때. 숨기면 "지세포 시간표"를
  // "신촌 시간표"라고 거짓말하는 것이 됩니다.
  'spotTime.boardDiffers': '{alight}에서 내려요. 시간표는 {stop} 정류장 기준이에요.',
  // 방향 칩 — 어디서 타서 어디로 가는가(2026-09-13, 네 방향). {from}·{to}는 스팟 이름 또는 고현터미널.
  'spotTime.dir': '{from} → {to}',
  'spotTime.next': '다음 버스 {time} · {route}번',
  'spotTime.noNext': '오늘 남은 버스가 없어요',
  // 노선 칩을 골랐을 때 — 그 노선만 끝났는데 오늘 전체가 끝났다고 말하면 막차를 틀리게 알리는 셈입니다(§4).
  'spotTime.noNextRoute': '오늘 남은 {route}번 버스가 없어요',
  // 다음 버스 카드 둘째 줄(530:299) — 오늘을 볼 때만. 출발 시각이 추정이면 「시간표 기준」 대신 추정이라고 말합니다.
  'spotTime.nextSub': '{when} · {basis}',
  'spotTime.inTime': '약 {time} 뒤',
  'spotTime.soon': '곧 출발',
  'spotTime.basisTimetable': '시간표 기준',
  'spotTime.basisEstimated': '앞뒤 정류장 시각으로 추정',
  'spotTime.tableTitle': '{day} 시간표',
  // 요약 셋(530:332 · 541:246 · 541:360) — 노선 하나 / 여럿 · 전체 / 노선 칩을 고름
  'spotTime.summary': '첫차 {first} · 막차 {last} · 하루 {count}회',
  'spotTime.summaryCount': '하루 {count}회',
  'spotTime.summaryRoute': '{route}번 {count}회',
  'spotTime.routeAll': '전체 {count}',
  'spotTime.routeChip': '{route}번 {count}',
  // 노선 칩을 골랐을 때만(541:371). 같은 노선인데 편마다 다르면 범위로 — 한 값으로 뭉개면 늦은 차를 놓칩니다(부록 D).
  'spotTime.duration': '약 {min}분',
  'spotTime.durationRange': '약 {low}~{high}분',
  'spotTime.durationEstimated': '{duration} · 앞뒤 정류장 시각으로 추정',
  'spotTime.hour': '{h}시',
  'spotTime.nextTag': '다음',
  // ★ 출발 시각이 앞뒤 정류장으로 감싼 값일 때(departures[].departEstimated). 감싼 방향이 정해져 있어
  //   적힌 출발은 실제보다 이르거나 같습니다 — 그 시각에 나가 있으면 놓치지 않습니다(SpotLayer 규칙 3). 절대규칙 1.
  'spotTime.estimatedTag': '추정',
  'spotTime.estimatedAll': '이 정류장 시각은 원문 시간표에 칸이 없어 앞뒤 정류장 시각으로 추정했어요. 적힌 시각에 나가 있으면 버스를 놓치지 않아요.',
  'spotTime.estimatedSome': '「추정」 시각은 원문 시간표에 칸이 없어 앞뒤 정류장 시각으로 추정했어요. 적힌 시각에 나가 있으면 버스를 놓치지 않아요.',
  // 맨 아래 출처(530:366). 정류소 좌표 줄은 서버 boarding.source 그대로입니다.
  'spotTime.sourceTime': '시각 {source} · {date}',
  'spotTime.loading': '시간표를 불러오는 중',
  // ★ 세 갈래. 빈 목록에 이유를 붙이지 않으면 §4에서 비판한 '이유 없는 빈칸'입니다.
  'spotTime.emptyUnknown': '{routes} 버스가 이 정류장에 서지만, 원문 시간표에 이 정류장의 시각 칸이 없어요.',
  'spotTime.emptyUnknownHint': '시각은 BIS에서 확인해 주세요 — 없는 시각을 지어내지 않습니다.',
  'spotTime.emptyNoService': '이 날은 이 구간을 가는 버스가 없어요.',
  'spotTime.emptyNoStop': '원문 시간표에 이 스팟의 정류장 칸이 없어요.',
  'spotTime.emptyNoStopHint': '버스가 지나가더라도 몇 시에 닿는지는 원문에 적혀 있지 않습니다.',
  // 정류장도 배 연결도 없는 스팟(서버 emptyReason TIMETABLE_PENDING · 2026-09-15 공곶이·내도 · 지심도) —
  // 시각을 아직 모으지 못했습니다. 위 「정류장 칸이 없어요」(원문에 칸이 없음)와 다른 이유라 문구를 가릅니다.
  'spotTime.pendingTitle': '이 스팟의 시간표는 아직 준비 중이에요.',
  'spotTime.pendingText': '가는 배와 버스 시각을 모으고 있어요.',

  // ── 유람선 시간표 (스팟 시간표의 배 칩) ──────────────────────────────────
  // Figma 프레임 없음 — 2026-09-14 사용자 결정. 원천은 외도유람선 예약센터 배시간표입니다.
  // ★ 배 화면에는 「운행 없음」을 쓰지 않습니다. 원문이 공개한 날의 0편만 「예정된 배 없음」,
  // 공개 전·수집 전 날은 전부 「시각 미확인」입니다 — 안 올라온 달을 운휴로 말하면 §4의 '이유 없는 빈칸'입니다.
  'ferry.dirToSpot': '{dock} 선착장 → {spot}',
  'ferry.dockChip': '{dock} 선착장 배 시간표',
  'ferry.board': '{dock} 선착장에서 타요.',
  'ferry.access': '예약센터 안내 — “{quote}”',
  // 「같은 배로」라고 쓰지 않습니다 — 외도에서 타는 배가 같은 배라는 근거는 원문에 없습니다(사용자 결정).
  // 2026-09-15 재배치 — 왕복 문장을 따로 두지 않고 다음 배 카드 둘째 줄과 이용 안내의 코스 줄로 옮겼습니다.
  'ferry.stay': '외도에서 {stay}',
  'ferry.returnTo': '약 {ret} {dock} 선착장 복귀',
  'ferry.courseStay': '외도에 내려 {stay} 구경하고 돌아와요',
  'ferry.tableTitle': '배 시간표',
  'ferry.tableSummary': '앞으로 {days}일 · 날마다 달라요',
  'ferry.cruiseNoLanding': '외도에 내리지 않아요',
  // 복귀 시각은 늘 「약」 — 원문이 기상·인원에 따라 10~30분 앞당기거나 늦출 수 있다고 적습니다.
  // 다음 배 카드 — 큰 줄은 시각만(버스 「다음 버스 13:00 · 55번」과 같은 결), 복귀 · 체류는 둘째 줄.
  'ferry.nextBig': '다음 배 {time}',
  'ferry.nextBigOn': '다음 배 {day} {time}',
  'ferry.nextOther': '{course} {time} · 약 {ret} 복귀',
  'ferry.nextUnknown': '다음 배 시각 미확인 — 배시간표에 아직 안 올라왔어요',
  'ferry.noNext': '앞으로 {days}일 동안 예정된 배가 없어요',
  'ferry.today': '오늘',
  // 오늘 줄에서 이미 떠난 배는 흐리게가 아니라 뺍니다 — 회색이 선상관광 색과 헷갈리지 않게(사용자 결정).
  'ferry.todayDone': '오늘 남은 배 없음',
  'ferry.nextTag': '다음',
  'ferry.sailingA11y': '{time} 출발 · {course} · 약 {ret} 복귀',
  'ferry.noSailing': '예정된 배 없음',
  'ferry.unpublished': '시각 미확인 · 배시간표에 아직 안 올라왔어요 ({fetched} 확인)',
  'ferry.notCollected': '시각 미확인 · 이 날짜는 수집하지 않았어요',
  'ferry.range': '{from}~{to}',
  'ferry.book': '예약센터에서 예약 ↗',
  'ferry.bookA11y': '{course} 예약 — 새 창에서 열려요',
  // 문장마다 줄을 바꿉니다(\n — 화면이 pre-line 으로 그림, 2026-09-15 사용자 요청). 「(예약센터 안내)」는 출처라 둘째 문장에 붙입니다.
  'ferry.caution': '출항은 기상·인원에 따라 10~30분 앞당겨지거나 늦어질 수 있어요.\n복귀 시각은 그래서 "약"이에요. (예약센터 안내)',
  // {source}는 서버 coverage.source(원천 이름) — 데이터라 사전에 박지 않습니다.
  'ferry.source': '출처 {source} · {fetched} 확인 · {through}까지 공개',
  'ferry.crossChecked': '도장포유람선 누리집과 대조',
  'ferry.loadFailed': '배 시간표를 불러오지 못했어요 — {error}',
  'ferry.noDock': '{spot} 근처에서 {to}에 가는 배를 타는 선착장을 원문에서 찾지 못했어요.',
  'ferry.noDockHint': '{to} 시간표에서 선착장 4곳의 배를 볼 수 있어요.',

  /* ── 도선(섬으로 들어가는 작은 배) — 내도(구조라) · 지심도(장승포 지심도 터미널) · 2026-09-15 사용자 입력 ──
     외도 유람선(ferry.*)과 같은 모양이지만 요일별 고정 시각이라 날짜 줄이 없습니다(ShuttleTimetable). */
  'shuttle.dirIn': '{dock} 선착장 → {island}',
  'shuttle.dirOut': '{island} → {dock} 선착장',
  'shuttle.boardIn': '{dock} 선착장에서 타요.',
  'shuttle.boardOut': '{island}에서 타요.',
  'shuttle.summary': '첫 배 {first} · 막배 {last} · 하루 {count}편',
  'shuttle.next': '다음 배 {time}',
  'shuttle.firstLast': '첫 배 {first} · 막배 {last}',
  'shuttle.todayDone': '오늘 남은 배가 없어요',
  // 그날 정해진 시각이 없을 때(내도 주말·공휴일) — 시각을 지어내지 않고 운항사 원문을 그대로 보입니다.
  'shuttle.flexibleTitle': '주말·공휴일은 정해진 시각이 없어요',
  'shuttle.flexibleNote': '운항사 안내 — {note}',
  'shuttle.holidayCaption': '주말·공휴일 — {note}',
  'shuttle.call': '전화 {phone}',
  'shuttle.callA11y': '{operator}에 전화 걸기 {phone}',
  'shuttle.book': '예약하기 ↗',
  'shuttle.bookA11y': '{operator} 예약 — 새 창에서 열려요',
  'shuttle.caution': '배 시각은 운항사 사정으로 바뀔 수 있어요.\n가기 전에 전화로 확인해 주세요.',
  'shuttle.source': '출처 {source} · {entered} 입력',

  /* ── 배 칩 공통 — 선착장 타는 곳 카드(DockCard) · 이용 안내 (2026-09-15 재배치) ── */
  'boat.dockName': '{name} 선착장',
  'boat.directionsA11y': '{name} 선착장 카카오맵 길찾기 — 새 창에서 열려요',
  'boat.infoTitle': '이용 안내',
  'boat.operator': '운항',
  'boat.fare': '요금',
  'boat.notice': '안내',
  'boat.arriveDock': '내리는 곳',

  // ── 타는 곳 (스팟 시간표의 버스 칩 · 다음 버스 카드 아래) ─────────────────
  // Figma 09-14 개정 530:231(접힘) · 530:282 / 541:408(펼침). 정류장 좌표는 서버가 TAGO에서 받아 줍니다.
  // 거리는 좌표 사이 직선이라 「약」을 붙입니다. 이 자리에도 「운행 없음」을 쓰지 않습니다.
  'boarding.title': '타는 곳', // 카드의 읽기 도구 이름(화면 제목은 그림에서 빠졌다)
  'boarding.stopName': '{name} 정류장',
  // 「직선」(2026-09-16 사용자 결정) — 그림은 「약 380m」(접힌 줄 530:240 · 목록 줄 541:456). 도보 길찾기 버튼이 카카오맵의
  // 걷는 거리(더 긴 값)를 열게 되어, 두 숫자가 다른 이유가 화면에 있어야 합니다. 거리를 적는 자리는 전부 이 말투입니다(otherStop 포함).
  'boarding.distance': '{place}에서 직선 약 {dist}',
  // 고현터미널에서 30m 안 — 「약 0m」 대신
  'boarding.near': '{place} 앞',
  'boarding.summary': '{where} · {routes}',
  'boarding.routeOne': '{route}번',
  'boarding.routeMore': '{first}번 외 {count}',
  // 541:436(2026-09-14 저녁 수정) — 펼친 카드 둘째 줄. 노선을 다 적는다(「노선 3개가 같은 정류장」은 옛 그림). {routes}는 「55·67-1·67」.
  'boarding.allHere': '{routes}번 모두 여기서 타요',
  // 그림(정류장 한 곳)에 없는 경우 — 한 이름으로 뭉개지 않습니다.
  'boarding.stopsCount': '정류장 {count}곳',
  'boarding.perRoute': '노선마다 타는 정류장이 달라요',
  'boarding.perTrip': '편마다 타는 쪽이 달라요',
  // 출발이 스팟이면 도보 길찾기(스팟 → 정류장, 2026-09-16 사용자 결정 — 그림은 「카카오맵으로 길찾기 ↗」). 고현터미널 출발 · 선착장(DockCard)은 목적지만.
  'boarding.walk': '카카오맵으로 도보 길찾기 ↗',
  'boarding.walkA11y': '{place}에서 {name} 정류장까지 카카오맵 도보 길찾기 — 새 창에서 열려요',
  'boarding.directions': '카카오맵으로 길찾기 ↗',
  'boarding.directionsA11y': '{name} 정류장 카카오맵 길찾기 — 새 창에서 열려요',
  // 지도 마커 아래 태그(530:324 「55」 · 541:451 「55 +2」)
  // 541:451(2026-09-14 저녁 수정) — 지도 마커 태그. 접힌 줄의 routeMore 와 같은 말(「55번 외 2」). 노선 하나면 번호만(「55」, 530:282).
  'boarding.pinMore': '{first}번 외 {count}',
  'boarding.opposite': '{route}번 {time} 버스는 길 건너편 정류장에서 타요.',
  'boarding.otherStop': '{route}번 {time} 버스는 {name} 정류장({place}에서 직선 약 {dist})에서 타요.',
  'boarding.split': '{route}번은 편마다 타는 쪽이 달라요 — {list}',
  'boarding.splitItem': '{time} 버스',
  'boarding.unresolved': '{routes}번은 타는 곳을 지도에 표시하지 못했어요.',
  'boarding.mapFailed': '지도를 불러오지 못했어요',

  // ── 코스 상세 (09-14 확정 · Figma 547:200) ───────────────────────────────
  'courseDetail.back': '코스',
  // 권역은 /api/pois 에서 붙입니다. 여러 권역이면 방문 순서대로 한 번씩(「남부권·동부권」).
  'courseDetail.meta': '{regions} · {count}곳',
  'courseDetail.metaCount': '{count}곳',
  // 제목은 서버 title, 없으면 common.courseTitleRange 규칙(lib/courseTitle).
  // {time}은 formatDuration(busMinTotal) — 서버 busTotalText는 60분 미만이면 「약 0시간 40분」이 되어 쓰지 않습니다.
  // 거제시 추천 관광코스 코스만(서버 officialCourse) 제목 · 스팟 체인 아래 한 줄 — 카드 배지(courses.officialBadge)에서 뺀 숫자가 여기 옵니다(2026-09-17 저녁 사용자 결정).
  // {name}은 원문 코스 이름(「당일코스」), {total} · {matched}는 한글 수 낱말(formatCountWord — 「여섯」 · 「네」).
  // 「원문 순서대로」는 방문 순서까지 원문 그대로일 때만(officialCourse.orderKept).
  // 수 낱말과 「곳」 사이는 붙는 공백(\u00a0)입니다 — 두 줄이 될 때 「열여섯 / 곳」으로 갈리지 않게.
  'courseDetail.official': '거제시 추천 관광코스 「{name}」 {total}\u00a0곳 중 {matched}\u00a0곳',
  'courseDetail.officialOrderKept': '거제시 추천 관광코스 「{name}」 {total}\u00a0곳 중 {matched}\u00a0곳 · 원문 순서대로',
  'courseDetail.officialSource': '원문 보기 ↗',
  'courseDetail.officialSourceA11y': '거제시 추천 관광코스 원문 보기 — 새 창에서 열려요',
  'courseDetail.busChip': '버스 약 {time}',
  // 「구간」은 방문하는 곳 수로 읽혔다 — 왼쪽 「남부권 · 3곳」과 나란히 보여 곳 수를 두 번 말하는 것처럼 됐다(2026-09-16 사용자 결정).
  // 타임라인의 버스 줄 개수와 같은 값이라 눈으로 맞춰볼 수 있다. 걸어서 옮기는 구간(같은 정류장)은 세지 않는다.
  'courseDetail.legChip': '버스 {n}번',
  'courseDetail.departNode': '{origin} 출발',
  'courseDetail.arriveNode': '{origin} 도착',
  // 되짚기(2026-09-17 코스재설계 §3-3) — 가운데 구간이 고현터미널로 갔다가 다시 나옵니다(구간 둘: A → 터미널 · 터미널 → B).
  // 2026-09-17 한 줄로 줄였습니다. 「갈아타요」 — 내려서 다음 버스를 기다린다는 것을 덜어 말하지 않습니다.
  // 코스 규칙의 「환승 없음」은 구간마다 버스 한 대라는 뜻이라 부딪히지 않습니다. 문구는 사용자가 시안을 보고 정했습니다(2026-09-17).
  'courseDetail.viaNode': '{origin}에서 갈아타요',
  // 거쳐 가는 이유 — **읽기 도구에만**(화면 srOnly). 코스 규칙이 되짚기를 직행이 없는 구간에만 허락해서 사실입니다.
  // 「직행버스」(시외 버스 종류)로 읽히지 않게 「바로 잇는」이라 적습니다.
  'courseDetail.viaNote': '두 곳을 바로 잇는 버스가 없어요',
  // 옛 응답(service 없음) — 노선 번호는 알약이 적고 여기는 분만. 앞뒤 정류장으로 감싼 구간(leg.estimated)만 「약」.
  // 확정값에 붙이면 정확히 아는 값을 흐립니다.
  'courseDetail.legMin': '{min}분',
  'courseDetail.legMinApprox': '약 {min}분',
  'courseDetail.legSameStop': '같은 정류장 · 바로 이동',
  // 버스 구간(2026-09-17 사용자 결정) — 코스가 저장한 편 사슬의 노선이 아니라 **그 구간을 가장 자주 다니는 직행 노선**(서버 leg.service).
  // 사슬이 우연히 탄 하루 1회 노선을 적으면 시간을 스스로 정하는 사용자가 하루 한 번 오는 버스를 기다린다.
  // 노선 번호는 글이 아니라 알약(화면 routePill)이 적습니다 — 이 문장은 알약 뒤 「약 40분」.
  // {time}은 formatDuration(60분 넘으면 「1시간 5분」) 또는 아래 폭. 노선 전체의 값이라 늘 「약」. 「약 / 58분」으로 갈리지 않게 붙는 공백(\u00a0).
  // 하루 · 평일 · 휴일 횟수는 적지 않습니다(2026-09-17 사용자 결정 — 「어차피 들어가면 보이잖아」 · 「휴일 6회를 보고 무슨 의민지 알 수 있을까?」).
  // 횟수는 스팟 옆 「시간표 ›」 화면이 노선마다 보여줍니다.
  'courseDetail.legServiceTime': '약\u00a0{time}',
  // 알약 안 읽기 도구용 — 「55」만 읽히면 무엇의 번호인지 모릅니다.
  'courseDetail.routeSuffix': '번',
  // 같은 노선인데 편마다 소요가 다르면 폭 — 한 값으로 뭉개면 늦은 차를 놓친다(부록 D). 60분을 넘으면 양 끝을 시간 단위로.
  'courseDetail.minRange': '{low}~{high}분',
  'courseDetail.timeRange': '{low}~{high}',
  // 휴일에 이 구간을 잇는 직행이 어느 노선으로도 없고, 그게 시각 미상이 아니라 정말 운행이 없을 때만(서버 holidayNoBus).
  'courseDetail.holidayNoBus': '휴일엔 이 구간 버스가 없어요',
  // 배 구간(2026-09-16) — 버스 줄과 자리를 맞춥니다. 「55번」 자리에 유람선 코스 이름, 「40분」 자리에 총 소요시간.
  // 총 소요시간은 **왕복 + 섬 체류를 합친 원문 값**이라 늘 「약」이 붙어 옵니다(서버 totalText 그대로).
  'courseDetail.ferryLeg': '{course} · {time}',
  // 머무는 시간은 **스팟 이름 아래**에 붙습니다(2026-09-16 사용자 결정 — Tripadvisor·Booking 투어와 같은 자리).
  // 정류장 이름은 버스에 대한 것이라 구간 줄에 두지만, 체류는 그 스팟에 대한 것이라 부제가 맞습니다.
  // 이름이 바로 위에 있어 「외도보타니아에」를 되풀이하지 않습니다.
  // 이 값은 우리가 정한 것이 아니라 **배가 정한 것**입니다 — 2시간 뒤에 배가 떠납니다.
  // 다른 스팟에 이 줄이 없는 이유는 얼마나 머물지를 사용자가 정하기 때문입니다(2026-09-13 결정).
  // 「입장료 별도」는 상품 원문 코스명에 든 사실이라 화면 어딘가에 남아야 합니다(디자인브리프 부록 G).
  'courseDetail.ferryStay': '{stay} 머물러요 · 입장료 별도',
  // 돌아오는 구간. 「같은 배로」라고 적지 않습니다 — 원문이 같은 배인지 말하지 않습니다(기준문서 §3).
  'courseDetail.ferryReturn': '{dock} 선착장으로 돌아와요',
  'courseDetail.ferryChip': '배 약 {time}',
  'courseDetail.timetable': '시간표',
  'courseDetail.timetableA11y': '{name} 시간표',
  // 추정 구간이 있을 때만 — 확정값뿐인 코스에 쓰면 정확한 분을 「짧다」고 말하게 됩니다.
  'courseDetail.estimatedNote': '실제 이동 시간은 적힌 것보다 짧습니다 — 버스를 놓치지 않는 쪽으로만 어긋납니다.',
  'courseDetail.source': '출처 {source} · {date}',
  'courseDetail.originNote': '모든 첫 출발지는 {origin}로 가정합니다',
  // 버스가 내려주는 곳은 스팟이 아니라 정류장이다 — 「55번 · 10분」이 「10분 뒤 도착」으로 읽히는 것을 막는다(2026-09-16 사용자 결정).
  // 거리는 정류장 좌표(TAGO)와 스팟 좌표(TourAPI) 사이 **직선**이다. 걷는 거리·시간은 어느 원문에도 없다(절대규칙 1) —
  // 그래서 「직선」을 적고, 걷는 길은 시간표 화면의 「카카오맵으로 도보 길찾기」가 연다.
  // 정류소 원문 이름만으로는 그게 정류장인지 모른다(「대금교차로」 — 2026-09-16 사용자 확인). 이름 뒤에 「정류장」을 붙이되
  // 이미 「종점」으로 끝나면 그대로 둔다(「해금강종점 정류장」은 같은 말을 두 번 한다).
  'courseDetail.stopName': '{stop} 정류장',
  'courseDetail.alight': '{stop}에서 내려요',
  // 「직선 약 380m」는 붙는 공백(\u00a0) — 좁은 폰에서 「직선 약 / 380m」로 갈리지 않고 「직선」 앞에서만 줄이 바뀝니다
  // (2026-09-17 320 폭 실측: 코스 33개의 정류장 문장 30개 중 23개가 두 줄, 전부 「직선」 앞에서).
  'courseDetail.alightWithDistance': '{stop}에서 내려 직선\u00a0약\u00a0{dist}',
  // 타는 곳 — 앞 구간에서 내린 정류장과 **다른** 정류장에서 탈 때만(화면 isSameStop, 2026-09-17).
  // 마지막 구간은 고현터미널로 돌아가는 길이라 내릴 스팟이 없어 이 줄만 남습니다(2026-09-16 사용자 지적).
  // 학동으로 끝나는 코스 셋은 내린 곳(학동삼거리 110m)과 타는 곳(학동 310m)이 다른 정류장이고 3배 멀다.
  'courseDetail.board': '{stop}에서 타요',
  'courseDetail.boardWithDistance': '{stop}에서 타요\u00a0· 직선\u00a0약\u00a0{dist}',
  // 앞에서 내린 정류장과 이름만 같은 다른 정류장에서 탈 때 — 버스가 가는 곳을 붙인다(2026-09-17 밤 사용자 결정 C안).
  // 「길 건너편」은 정류장 번호가 없어 단정하지 않는다. 신촌 184m 에 내려 176m 에서 타면 둘 다 「약 180m」라 같은 줄로 읽혔다.
  'courseDetail.boardToward': '{stop}({toward} 방향)에서 타요',
  'courseDetail.boardTowardWithDistance': '{stop}({toward} 방향)에서 타요 · 직선 약 {dist}',
  'courseDetail.walkNote': '버스 시간에는 정류장에서 스팟까지 걷는 시간이 빠져 있어요. 걷는 길은 스팟 옆 「시간표 ›」에서 카카오맵으로 열 수 있어요.',
  'courseDetail.noLegs': '이 코스는 구간별 버스 정보가 없어요.',
  'courseDetail.save': '이 코스 저장하기',
  'courseDetail.loading': '코스를 불러오는 중',
  'courseDetail.weekday': '평일',
  'courseDetail.holiday': '휴일',

  // ── 코스 추천 (v3 대표 코스 카드 · Figma 02-2 585:417 · 585:485 · 582:416) ───────
  // 2026-09-14 저녁 사용자 결정 — 3/4/5곳 칩을 없애고 **대표 코스 10개**를 카드로 보여줍니다
  // (어느 10개인지는 서버 featured=true 가 정합니다). plan.* 과 키를 따로 둡니다 — plan.* 은 판정 유물입니다.
  // 2026-09-16 개수 칩을 되살렸습니다(Figma 623:444 · 메모 623:520) — 대표 코스 10개 안에서 거릅니다.
  'courses.title': '코스 추천',
  'courses.headline1': '거제 9경을 버스로 잇는',
  'courses.headline2': '대표 코스',
  // 출발지 가정과 근거를 한 줄에 — 모든 시각이 이 위에 서 있어서 숨기면 안 됩니다.
  'courses.originNote': '출발은 고현터미널 · 노선과 시간은 거제시 BIS 원문 기준',
  'courses.total': '대표 코스 {count}가지 · 여러 개 고를 수 있어요',
  // 개수 칩(OptionChip 넷)과 칩을 고른 뒤의 상태줄 — 전체면 위 courses.total 을 씁니다.
  'courses.countAria': '코스 곳 수',
  'courses.countAll': '전체',
  'courses.countN': '{n}곳',
  'courses.totalN': '{n}곳 코스 {count}가지 · 여러 개 고를 수 있어요',
  // hero 에 사진이 없을 때. 자리그림 SVG 를 쓰지 않고 이유를 적습니다 — 0장은 버그가 아니라 사실입니다(저작권 Type3 · 기준문서 §5).
  'courses.noPhoto': '사진 없음 — TourAPI 사진 0장',
  // 카드 사진 위 배지 — **축마다 색 하나**(2026-09-17 코스재설계 §5-2). 어느 축인지는 서버 badgeAxis 가 정합니다.
  // **숫자 없는 짧은 이름 하나**(2026-09-17 저녁 사용자 결정 — 「한눈에 알아보게」). 원문 코스 이름 · 곳 수 · 순서는 코스 상세 줄(courseDetail.official*)로 옮겼습니다.
  // 9경 축은 nineScenic.stamp(해 메달 + 글자 — 2026-09-17 밤 1안)이고, 분류 축은 분류 칩 라벨(theme.*) 그대로라 여기 키가 없습니다. 9경이 0곳이면 배지 자체가 없습니다.
  // 거제시 공식 관광코스(초록) — 고정 문구. 거제시 사이트 메뉴 「추천여행코스 > 관광코스」의 말입니다.
  // 우리가 지은 이야기가 아니라 거제시가 묶은 곳이라는 사실 라벨입니다(§1-3).
  'courses.officialBadge': '거제시 추천 관광코스',
  // 태그 — 값은 전부 서버 데이터(busMinTotal · 권역(/api/pois) · holidayNoBusLegs)에서 옵니다(절대규칙 1).
  // 권역 태그는 데이터 값 그대로(「남부권」 · 「동부권·남부권」)라 키가 없습니다. 노선 번호 태그는 2026-09-14 밤 뺐습니다(사용자 결정).
  // 배차(「매일 6회」) · 요일(「평일만」 · 「평일·휴일」) 태그는 2026-09-17 뺐습니다 — 코스가 확인용으로 저장한 편 사슬 하나의 값이라
  // 「휴일엔 못 가는 코스」로 읽혔습니다(사용자 결정).
  // {time}은 formatDuration(busMinTotal) — 서버 busTotalText 는 60분 미만이면 「약 0시간 40분」이 되어 쓰지 않습니다.
  'courses.tagBus': '버스 약 {time}',
  // 휴일에 직행이 어느 노선으로도 없는 구간이 하나라도 있을 때만(holidayNoBusLegs). 시각 미상인 구간은 서버가 넣지 않습니다.
  'courses.tagHolidayNoBus': '휴일엔 버스 없는 구간이 있어요',
  // 지도의 코스 카드 스트립(CourseMapPage)이 씁니다 — 코스 추천 카드는 코스 제목(title)을 씁니다.
  'courses.cardTitle': '코스 {n}',
  // 하단 고정 바 — 고른 게 1개 이상일 때만 뜹니다(0개면 바 자체가 없어 단수형이 없습니다).
  'courses.selectN': '코스 {count}개 선택하기',
  'courses.loading': '코스를 불러오는 중',
  'courses.empty': '코스가 아직 없어요',
  // 저장한 코스는 추천에서 뺍니다(2026-09-15 사용자 요청). 뺀 이유를 한 줄로 — 목록이 이유 없이 줄어 보이지 않게.
  'courses.savedHidden': '저장한 코스 {count}개는 빼고 보여줘요',
  'courses.allSaved': '추천 코스를 모두 내 일정에 저장했어요',
  'courses.goMyPlans': '내 일정 보기',


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
  'map.nineScenicSuffix': '거제9경',

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

  /* 회원 탈퇴 — 되돌릴 수 없어 무엇이 사라지는지 먼저 말하고 묻습니다(2026-09-16). */
  'myPlans.withdraw': '회원 탈퇴',
  'myPlans.withdrawTitle': '정말 탈퇴할까요?',
  'myPlans.withdrawText':
    '저장한 코스와 올린 사진이 모두 지워져요.\n다시 되돌릴 수 없어요.',
  'myPlans.withdrawKakao': '카카오 계정은 그대로예요. 연결 해제는 카카오 설정에서 할 수 있어요.',
  'myPlans.withdrawConfirm': '탈퇴하기',
  'myPlans.withdrawCancel': '취소',
  'myPlans.withdrawing': '탈퇴하는 중',
  'myPlans.withdrawFailed': '탈퇴하지 못했어요 — {error}',
  'myPlans.privacy': '개인정보처리방침',
  'myPlans.loading': '불러오는 중…',
  'myPlans.savedEmptyTitle': '아직 저장한 일정이 없어요',
  'myPlans.savedEmptyText': '저장한 코스가 여기에 모여요.',
  'myPlans.getCourses': '코스 추천 받기',
  'myPlans.delete': '삭제',
  'myPlans.deleteAria': '{title} 삭제',
  'myPlans.openDetail': '코스 상세 확인',
  'myPlans.openAria': '{title} 코스 상세 보기',
  'myPlans.unknownCourse': '저장한 코스',

  /* ── 자리표시자 (/conditions — 아직 만들지 않은 화면) ─────────────────── */
}
