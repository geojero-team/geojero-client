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
  // 타는 곳 거리(2026-09-14 · Figma 프레임 없음 — 사용자 결정). 「약」은 쓰는 문구가 붙입니다.
  'format.distance.m': '{m}m',
  'format.distance.km': '{km}km',
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

  // ── 유람선 시간표 (스팟 시간표의 배 칩) ──────────────────────────────────
  // Figma 프레임 없음 — 2026-09-14 사용자 결정. 원천은 외도유람선 예약센터 배시간표입니다.
  // ★ 배 화면에는 「운행 없음」을 쓰지 않습니다. 원문이 공개한 날의 0편만 「예정된 배 없음」,
  // 공개 전·수집 전 날은 전부 「시각 미확인」입니다 — 안 올라온 달을 운휴로 말하면 §4의 '이유 없는 빈칸'입니다.
  'ferry.dirToSpot': '{dock} 선착장 → {spot}',
  'ferry.dockChip': '{dock} 선착장 배 시간표',
  'ferry.board': '{dock} 선착장에서 타요.',
  'ferry.access': '예약센터 안내 — “{quote}”',
  // 「같은 배로」라고 쓰지 않습니다 — 외도에서 타는 배가 같은 배라는 근거는 원문에 없습니다(사용자 결정).
  'ferry.roundTrip': '왕복이에요. 외도에 내려 {stay} 구경한 뒤 출발한 {dock} 선착장으로 돌아와요.',
  'ferry.cruiseNoLanding': '외도에 내리지 않아요',
  // 복귀 시각은 늘 「약」 — 원문이 기상·인원에 따라 10~30분 앞당기거나 늦출 수 있다고 적습니다.
  'ferry.next': '다음 배 {time} · 약 {ret} 복귀',
  'ferry.nextOn': '다음 배 {day} {time} · 약 {ret} 복귀',
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
  'ferry.caution': '출항은 기상·인원에 따라 10~30분 앞당겨지거나 늦어질 수 있어요. 복귀 시각은 그래서 "약"이에요. (예약센터 안내)',
  // {source}는 서버 coverage.source(원천 이름) — 데이터라 사전에 박지 않습니다.
  'ferry.source': '출처 {source} · {fetched} 확인 · {through}까지 공개',
  'ferry.crossChecked': '도장포유람선 누리집과 대조',
  'ferry.loadFailed': '배 시간표를 불러오지 못했어요 — {error}',
  'ferry.noDock': '{spot} 근처에서 {to}에 가는 배를 타는 선착장을 원문에서 찾지 못했어요.',
  'ferry.noDockHint': '{to} 시간표에서 선착장 4곳의 배를 볼 수 있어요.',

  // ── 타는 곳 (스팟 시간표의 버스 칩 · 다음 버스 카드 아래) ─────────────────
  // Figma 09-14 개정 530:231(접힘) · 530:282 / 541:408(펼침). 정류장 좌표는 서버가 TAGO에서 받아 줍니다.
  // 거리는 좌표 사이 직선이라 「약」을 붙입니다. 이 자리에도 「운행 없음」을 쓰지 않습니다.
  'boarding.title': '타는 곳', // 카드의 읽기 도구 이름(화면 제목은 그림에서 빠졌다)
  'boarding.stopName': '{name} 정류장',
  'boarding.distance': '{place}에서 약 {dist}',
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
  'boarding.directions': '카카오맵으로 길찾기 ↗',
  'boarding.directionsA11y': '{name} 정류장 카카오맵 길찾기 — 새 창에서 열려요',
  // 지도 마커 아래 태그(530:324 「55」 · 541:451 「55 +2」)
  // 541:451(2026-09-14 저녁 수정) — 지도 마커 태그. 접힌 줄의 routeMore 와 같은 말(「55번 외 2」). 노선 하나면 번호만(「55」, 530:282).
  'boarding.pinMore': '{first}번 외 {count}',
  'boarding.opposite': '{route}번 {time} 버스는 길 건너편 정류장에서 타요.',
  'boarding.otherStop': '{route}번 {time} 버스는 {name} 정류장(약 {dist} 떨어진 곳)에서 타요.',
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
  'courseDetail.busChip': '버스 약 {time}',
  'courseDetail.legChip': '{n}구간',
  'courseDetail.departNode': '{origin} 출발',
  'courseDetail.arriveNode': '{origin} 도착',
  'courseDetail.leg': '{route}번 · {min}분',
  // 앞뒤 정류장으로 감싼 구간(leg.estimated)만 「약」. 확정값에 붙이면 정확히 아는 값을 흐립니다.
  'courseDetail.legApprox': '{route}번 · 약 {min}분',
  'courseDetail.legSameStop': '같은 정류장 · 바로 이동',
  'courseDetail.timetable': '시간표',
  'courseDetail.timetableA11y': '{name} 시간표',
  // 추정 구간이 있을 때만 — 확정값뿐인 코스에 쓰면 정확한 분을 「짧다」고 말하게 됩니다.
  'courseDetail.estimatedNote': '실제 이동 시간은 적힌 것보다 짧습니다 — 버스를 놓치지 않는 쪽으로만 어긋납니다.',
  'courseDetail.source': '출처 {source} · {date}',
  'courseDetail.originNote': '모든 첫 출발지는 {origin}로 가정합니다',
  'courseDetail.noLegs': '이 코스는 구간별 버스 정보가 없어요.',
  'courseDetail.save': '이 코스 저장하기',
  'courseDetail.loading': '코스를 불러오는 중',
  'courseDetail.weekday': '평일',
  'courseDetail.holiday': '휴일',

  // ── 코스 추천 (v3 대표 코스 카드 · Figma 02-2 585:417 · 585:485 · 582:416) ───────
  // 2026-09-14 저녁 사용자 결정 — 3/4/5곳 칩을 없애고 **대표 코스 10개**를 카드로 보여줍니다
  // (어느 10개인지는 서버 featured=true 가 정합니다). plan.* 과 키를 따로 둡니다 — plan.* 은 판정 유물입니다.
  'courses.title': '코스 추천',
  'courses.headline1': '거제 9경을 버스로 잇는',
  'courses.headline2': '대표 코스',
  // 출발지 가정과 근거를 한 줄에 — 모든 시각이 이 위에 서 있어서 숨기면 안 됩니다.
  'courses.originNote': '출발은 고현터미널 · 노선과 시간은 거제시 BIS 원문 기준',
  'courses.total': '대표 코스 {count}가지 · 여러 개 고를 수 있어요',
  // hero 에 사진이 없을 때. 자리그림 SVG 를 쓰지 않고 이유를 적습니다 — 0장은 버그가 아니라 사실입니다(저작권 Type3 · 기준문서 §5).
  'courses.noPhoto': '사진 없음 — TourAPI 사진 0장',
  // 9경 배지 — nineScenicNos 를 「{n}경」으로 띄어 잇습니다(「거제 9경 · 1경 2경 4경」). 0곳이면 배지 자체가 없습니다.
  'courses.nineBadge': '거제 9경 · {list}',
  'courses.nineNo': '{n}경',
  // 태그 넷 — 값은 전부 서버 데이터(busMinTotal · 권역(/api/pois) · tripsPerDay · holidayService)에서 옵니다(절대규칙 1).
  // 권역 태그는 데이터 값 그대로(「남부권」 · 「동부권·남부권」)라 키가 없습니다. 노선 번호 태그는 2026-09-14 밤 뺐습니다(사용자 결정).
  // {time}은 formatDuration(busMinTotal) — 서버 busTotalText 는 60분 미만이면 「약 0시간 40분」이 되어 쓰지 않습니다.
  'courses.tagBus': '버스 약 {time}',
  // 배차는 노선이 하나일 때만 옵니다(tripsPerDay). 평일·휴일 회차가 같으면 「매일」, 다르면 평일 값만.
  'courses.tagDaily': '매일 {n}회',
  'courses.tagWeekday': '평일 {n}회',
  'courses.tagServiceAll': '평일·휴일',
  'courses.tagServiceWeekday': '평일만',
  // 지도의 코스 카드 스트립(CourseMapPage)이 씁니다 — 코스 추천 카드는 코스 제목(title)을 씁니다.
  'courses.cardTitle': '코스 {n}',
  // 하단 고정 바 — 고른 게 1개 이상일 때만 뜹니다(0개면 바 자체가 없어 단수형이 없습니다).
  'courses.selectN': '코스 {count}개 선택하기',
  'courses.loading': '코스를 불러오는 중',
  'courses.empty': '코스가 아직 없어요',


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
  // 저장 카드 둘째 줄 — 머무는 시간까지 넣은 전체 일정 길이(approxTotalMin, 30분 단위).
  'myPlans.duration': '약 {time} 소요 예정',
  'myPlans.openDetail': '코스 상세 확인',
  'myPlans.openAria': '{title} 코스 상세 보기',
  'myPlans.unknownCourse': '저장한 코스',

  /* ── 자리표시자 (/conditions — 아직 만들지 않은 화면) ─────────────────── */
}
