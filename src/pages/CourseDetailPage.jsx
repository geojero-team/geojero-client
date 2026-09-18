import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import CourseMiniMap from '../components/CourseMiniMap'
import LoginSheet from '../components/LoginSheet'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, beginKakaoLoginTo } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import { formatDistance } from '../lib/format'
import { courseTitle } from '../lib/courseTitle'
import { fitOneLine } from '../lib/fitOneLine'
import { distanceMeters } from '../lib/geo'
import { getToken } from '../lib/session'
import { formatDuration } from '../lib/format'
import { ICON_PATHS } from '../lib/spotIcons'
import { loadSpots, regionsOf } from '../lib/spots'
import styles from './CourseDetailPage.module.css'

/**
 * 코스 상세 — Figma 09-14 확정 `547:200`(썸네일 · 제목 + 스팟 체인). 이전 판은 개정 `532:318`, 그 전은 02-2 `446:929`.
 *
 * 이 화면이 이 서비스의 주장을 담습니다. 거제시 공식 앱은 코스에 `25분 / 13.0km`를 적고
 * **버스인지 자차인지 밝히지 않습니다**(기준문서 §5). 우리는 구간마다 **노선 번호와
 * 이동시간**을 적습니다 — `55번 · 40분`.
 *
 * 2026-09-13에 시각을 전부 뺐습니다(몇 시에 머물지는 사용자가 정한다 — 디자인브리프 부록 E).
 *
 * 2026-09-14 개정 → 확정(Figma):
 *  · 머리에 지도(끌기·확대 됨), 권역, 제목, 스팟 체인, 칩 둘(버스 합계 · **버스 타는 횟수** — 그림의 「4구간」은 곳 수로 읽혀 2026-09-16 에 「버스 4번」으로 바꿨습니다).
 *    → 2026-09-16 지도를 **300px · 스팟에만 맞춤 · 사진 핀 · 선 없음**으로 바꿨습니다(사용자 결정 — `CourseMiniMap` 머리 주석 · 디자인브리프 부록 H).
 *  · **제목은 규칙으로 짓습니다 — 「{첫 스팟}에서 {끝 스팟}까지」**(2026-09-14 사용자 결정). 그림의 「몽돌에서 바람의언덕까지」는
 *    사람이 지은 이름인데 코스 23개에 그런 이름이 없고, 서버 코스 name 은 전부 줄임말 체인이라(「학동 · 기성관 · …」,
 *    「기성관」·「맹종죽테마파크」는 TourAPI 정본 이름이 아님 — 절대규칙 5) 쓰지 않습니다.
 *    → 2026-09-14 저녁 서버 `title`(V28 · 대표 코스 10개)이 생겨 **있으면 그것을 먼저** 씁니다(`lib/courseTitle` — 코스 추천 카드와 같은 규칙).
 *    체인(「학동몽돌해변 · 해금강 · 바람의언덕」)은 제목 아래 부제로 — 그래서 가운데 스팟도 빠지지 않습니다.
 *    그림에 있던 「고현터미널에서 출발해 고현터미널로 돌아와요」 문장은 확정 그림에서 빠졌습니다(타임라인 양 끝과 각주가 같은 말을 합니다).
 *  · 타임라인 스팟 줄은 **40px 둥근 사진 + 왼쪽 위 20px 번호**. 사진은 /api/pois 대표 사진(코스 API는 사진을 주지 않는다 — TourAPI
 *    장애에 코스 조회가 묶이지 않게), 없으면 분류 자리그림(저작권 Type3 로 0장인 스팟은 버그가 아니라 사실 — 기준문서 §5).
 *  · **추정 구간에 「약」** 과 각주가 돌아왔습니다(9/13에 팀원 커밋이 뺀 각주를 그림이 되살렸다). 각주는 추정 구간이
 *    있는 코스에만 — 확정값뿐인 코스(3-03 등 6개)에 쓰면 정확한 분을 「짧다」고 말하게 됩니다.
 *  · 저장 버튼이 바닥 고정 바에서 본문 흐름으로 들어갔습니다.
 */

/** 출발·도착 노드(고현터미널) — Figma `terminal-bus` 자산 그대로(흰 원 + 브랜드 테두리 + 버스 선 그림 + 그림자). */
function TerminalIcon() {
  return (
    <svg className={styles.terminalIcon} width="26.125" height="26.125" viewBox="0 0 26.125 26.125" fill="none" aria-hidden="true">
      <defs>
        <filter id="course-terminal-shadow" x="0" y="0" width="26.125" height="26.125" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="0.6875" />
          <feGaussianBlur stdDeviation="1.03125" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
      <g filter="url(#course-terminal-shadow)">
        <circle cx="13.0625" cy="12.375" r="11" fill="white" />
        <circle cx="13.0625" cy="12.375" r="10.3125" stroke="#0069B3" strokeWidth="1.375" />
      </g>
      <path d="M15.6406 7.73438H10.4844C9.63006 7.73438 8.9375 8.42693 8.9375 9.28125V13.4062C8.9375 14.2606 9.63006 14.9531 10.4844 14.9531H15.6406C16.4949 14.9531 17.1875 14.2606 17.1875 13.4062V9.28125C17.1875 8.42693 16.4949 7.73438 15.6406 7.73438Z" stroke="#0069B3" strokeWidth="1.03125" />
      <path d="M8.9375 11.3438H17.1875" stroke="#0069B3" strokeWidth="1.03125" />
      <path d="M11 14.9531V16.5" stroke="#0069B3" strokeWidth="1.03125" strokeLinecap="round" />
      <path d="M15.125 14.9531V16.5" stroke="#0069B3" strokeWidth="1.03125" strokeLinecap="round" />
    </svg>
  )
}

/** 타는 정류장 점 원 안 버스 — 스팟 상세(부록 J)의 Figma `607:12` 자산과 같은 그림, 여기서는 14px. 색은 CSS 에서 받습니다. */
function StopBusIcon() {
  return (
    <svg className={styles.alightIcon} width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.66667 5V10 M12.5 5V10 M1.66667 10H18 M15 15H17.5C17.5 15 17.9167 13.5833 18.1667 12.6667C18.25 12.3333 18.3333 12 18.3333 11.6667C18.3333 11.3333 18.25 11 18.1667 10.6667L17 6.5C16.75 5.66667 15.9167 5 15 5H3.33333C2.89131 5 2.46738 5.17559 2.15482 5.48816C1.84226 5.80072 1.66667 6.22464 1.66667 6.66667V15H4.16667 M5.83333 16.6667C6.75381 16.6667 7.5 15.9205 7.5 15C7.5 14.0795 6.75381 13.3333 5.83333 13.3333C4.91286 13.3333 4.16667 14.0795 4.16667 15C4.16667 15.9205 4.91286 16.6667 5.83333 16.6667Z M7.5 15H11.6667 M13.3333 16.6667C14.2538 16.6667 15 15.9205 15 15C15 14.0795 14.2538 13.3333 13.3333 13.3333C12.4129 13.3333 11.6667 14.0795 11.6667 15C11.6667 15.9205 12.4129 16.6667 13.3333 16.6667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * 정류장 점(장소) 한 줄 — 「학동 정류장에서 내려요」 / 「도장포 정류장에서 타요」. 정류장이 없으면 null.
 *
 * 2026-09-18 「점 = 장소, 사이 = 이동」(사용자 결정 — 구글 지도 · 네이버 지도 대중교통 상세). 정류장은 문장 속 단어가 아니라
 * 타임라인의 **점**이고, 거기까지 · 거기서 걷는 거리는 점 앞뒤의 걷는 칸(walkText)이 말합니다.
 * 버스가 서는 곳은 스팟이 아니라 정류장이라, 이 점이 없으면 「33번 · 약 45분」이 「45분 뒤 매미성 도착」으로 읽힙니다.
 * 이름은 그 구간이 **실제로 서는 정류장**이라 스팟이 말하는 내리는 곳과 다를 수 있습니다(씨월드는 시각이 지세포 기준).
 *
 * @param key 'alight'(내리는 곳) · 'board'(타는 곳)
 */
function stationText(near, key, toward = null) {
  if (!near?.stop) return null
  return t(toward ? `courseDetail.${key}Toward` : `courseDetail.${key}`, { stop: stopLabel(near), toward })
}

/** 정류장 이름 — 원문 이름 뒤에 「정류장」(「대금교차로」만으로는 정류장인지 모른다). 이미 「종점」으로 끝나면 그대로. */
function stopLabel(near) {
  return near.stop.endsWith('종점') ? near.stop : t('courseDetail.stopName', { stop: near.stop })
}

/** 걷는 칸 길찾기 양 끝 — 정류장(TAGO 좌표)을 스팟과 같은 모양({shortName, lat, lng})으로. 좌표가 없으면 null. */
function stopPoint(near) {
  return near?.stop && located(near) ? { shortName: stopLabel(near), lat: near.lat, lng: near.lng } : null
}

/**
 * 걷는 칸 글 — 「도보 약 170m」. 어디서 어디로는 위아래 점(정류장 · 스팟)이 말하므로 적지 않습니다.
 * 동사(「걸어가요」)는 뺐고(2026-09-18 사용자 — 「어차피 이미지가 있는데」) 「도보」는 남깁니다 — 스팟에서 시작하는 걷기는
 * 위에 걷기 원이 없어 회색 점선만으로는 무슨 거리인지 모릅니다(네이버지도도 「도보 240m」).
 * 값은 두 점 좌표 사이 **직선**입니다. 줄마다 「직선」을 붙였더니 「도보 · 직선」이 한 줄에 붙어 어색해(같은 날 사용자)
 * 각주(courseDetail.walkNote)가 한 번 말합니다 — 카카오맵 길찾기가 더 긴 거리를 보여줘도 우리 숫자가 틀린 것으로 읽히지 않게.
 * 걷는 시간은 원천이 없어 적지 않습니다(절대규칙 1). 거리를 모르면 「도보」만 — 값 없이 「약」을 남기지 않습니다(절대규칙 3).
 */
function walkText(distanceM) {
  return distanceM == null ? t('courseDetail.walkSeg') : t('courseDetail.walkSegWithDistance', { dist: formatDistance(distanceM) })
}

/**
 * 앞 구간에서 내린 정류장과 이번에 타는 정류장이 **같은 정류장인가** — 이름이 같고 스팟까지 거리가 1m까지 같을 때만(2026-09-17).
 *
 * 이름만 같으면 길 건너편일 수 있습니다. 코스 33개에서 앞 구간 하차와 이름이 같은 승차 78곳 중 35곳은 거리가 다릅니다
 * (도장포 393m 에 내려 376m 에서 탐 · 거제면사무소 40m / 138m). 그 둘을 한 줄로 합치면 반대편에서 버스를 기다리게 됩니다.
 * 응답에 정류장 번호(nodeId)가 없어 거리로 가립니다 — 거리를 모르면 같다고 보지 않습니다.
 */
function isSameStop(a, b) {
  return Boolean(a?.stop) && a.distanceM != null && a.stop === b?.stop && a.distanceM === b?.distanceM
}

/**
 * 고현터미널 줄 — 출발 · 도착, 되짚기면 가운데 「고현터미널에서 갈아타요」.
 *
 * 되짚기 줄은 2026-09-17 두 줄(이름 + 이유)에서 **한 줄**로 줄였습니다. 이유 문장(`note`)은 읽기 도구에만 둡니다.
 * 한 줄이면 출발 · 도착 줄과 같은 모양이라 위아래 구간 선이 아이콘에 닿아 여정이 이어져 보입니다
 * (두 줄일 때는 아이콘 밑이 22px 비어 따로 선을 그었습니다).
 */
function TerminalRow({ label, note }) {
  return (
    <div className={styles.stopRow}>
      <span className={styles.rail}>
        <TerminalIcon />
      </span>
      <span className={styles.terminalName}>{label}</span>
      {note && <span className={styles.srOnly}>{note}</span>}
    </div>
  )
}

/**
 * 배 구간의 아이콘 — 분류 칩·지도 핀·스팟 상세 선착장 줄과 **같은 유람선 패스**(lib/spotIcons CRUISE)를
 * 버스 아이콘과 같은 14px 칸에 넣습니다. 그 패스는 28 칸의 6~22 안에 그려져 있어 그 영역만 잘라 씁니다.
 */
function StopFerryIcon() {
  return (
    <svg className={styles.alightIcon} width="14" height="14" viewBox="6 6 16 16" fill="none" aria-hidden="true">
      <path d={ICON_PATHS.CRUISE} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * 배 구간 한 줄 — 가는 구간은 「외도상륙+해금강선상관광 · 약 2시간 40분」,
 * 돌아오는 구간은 「배로 돌아와요」(뒤에 선착장 점 「도장포 선착장에서 내려요」가 붙는다 — 2026-09-18).
 *
 * 왕복 한 덩어리라 구간이 둘인데, 원문이 주는 시간은 **왕복 + 섬 체류를 합친 총 소요시간 하나뿐**이라
 * 서버가 그 값을 가는 구간에 싣고 돌아오는 구간은 0분으로 준다(V36). 한 방향을 쪼개 만들지 않습니다.
 *
 * ⚠️ **머무는 시간은 여기 없습니다** — 그건 배가 아니라 **그 스팟에 대한 사실**이라 스팟 줄이 그립니다
 * (아래 `stayLine`). 2026-09-16 사용자 결정.
 */
function ferryLine(leg) {
  const f = leg.ferry
  if (!f) return null
  return leg.durationMin === 0
    ? t('courseDetail.ferryReturn')
    : t('courseDetail.ferryLeg', { course: f.legendLabel, time: f.totalText })
}

/**
 * 스팟 이름 아래 한 줄 — 「2시간 머물러요 · 입장료 별도」.
 *
 * 이 값은 **우리가 정한 것이 아니라 배가 정한 것**입니다(2시간 뒤에 배가 떠납니다).
 * 다른 스팟에 이 줄이 없는 이유는 얼마나 머물지를 사용자가 정하기 때문입니다(2026-09-13 결정) —
 * 외도만 다른 것이 아니라 **외도만 우리가 아는 것**입니다.
 *
 * @param leg 그 스팟에 **닿는** 구간. 배로 닿고 그 배가 내려주는 편일 때만 줄이 생깁니다.
 */
function stayLine(leg) {
  const f = leg?.ferry
  if (!f || leg.durationMin === 0 || !f.landsOnOedo || f.stayMin == null) return null
  return t('courseDetail.ferryStay', { stay: formatDuration(f.stayMin) })
}

/**
 * 버스 구간 한 줄의 두 조각 — 노선 알약 「55」와 글 「약 12분」(2026-09-17).
 * 알약은 타는 곳 카드(BoardingMap `.badge`)와 같은 모양이라 코스 상세의 55번과 시간표 화면의 55번이 같은 부품으로 보입니다.
 * 서버 `leg.service` 가 없으면(옛 응답) 사슬이 탄 노선 · 분 — 앞뒤 정류장으로 감싼 구간만 「약」.
 *
 * ★ **코스가 저장한 편 사슬(rides)의 노선을 적지 않습니다**(2026-09-17 사용자 결정). 서버는 「이 순서가 버스로 이어지는가」를
 * 확인하려고 코스마다 하루짜리 편 사슬 하나를 저장하는데, 그 사슬이 우연히 탄 노선이 하루 1회 55-1번이면 같은 구간을
 * 하루 6회 다니는 55번이 있어도 화면이 55-1번을 말했습니다. 몇 시에 갈지는 사용자가 정하므로 필요한 것은
 * **그 구간을 가장 자주 다니는 직행 노선**입니다 — 서버가 스팟 시간표와 같은 엔진으로 골라 줍니다.
 *
 *  · 분은 편마다 다르면 폭(「약 50~55분」), 같으면 한 값. 60분을 넘으면 시간 단위(formatDuration). 늘 「약」 — 노선 전체의 값이라서.
 *  · **하루 몇 번 오는지는 적지 않습니다**(2026-09-17 사용자 결정 — 「어차피 들어가면 보이잖아」 · 「휴일 6회를 보고 무슨 의민지 알 수 있을까?」).
 *    횟수는 스팟 옆 「시간표 ›」가 노선마다 보여줍니다. 서버 `service.tripsWeekday` · `tripsHoliday` 는 그대로 오지만 여기서는 쓰지 않습니다.
 *    휴일에 정말 운행이 없다는 사실만은 구간 줄 아래 `holidayNoBus` 줄이 말합니다.
 */
function busParts(leg) {
  const s = leg.service
  if (!s) {
    return {
      route: leg.rides?.[0]?.routeNo ?? null,
      rest: t(leg.estimated ? 'courseDetail.legMinApprox' : 'courseDetail.legMin', { min: leg.durationMin }),
    }
  }
  const low = s.durationMinLow ?? s.durationMin
  const time =
    low === s.durationMin
      ? formatDuration(s.durationMin)
      : s.durationMin < 60
        ? t('courseDetail.minRange', { low, high: s.durationMin })
        : t('courseDetail.timeRange', { low: formatDuration(low), high: formatDuration(s.durationMin) })
  // 「약 58분~1시간 2분」 안에서 줄이 갈리지 않게 붙는 공백으로(ko.js legServiceTime).
  return { route: s.routeNo, rest: t('courseDetail.legServiceTime', { time: time.replaceAll(' ', '\u00a0') }) }
}

/** 화면에 적힌 분이 추정인가 — service 가 있으면 그 노선의 소요, 없으면 사슬 구간. 각주가 이것을 따릅니다. */
function legEstimated(leg) {
  return leg.service ? Boolean(leg.service.estimated) : Boolean(leg.estimated)
}

/** 걷는 사람 — 내리는 정류장 · 선착장 점 원 안(다음이 걷기). 버스 원의 StopBusIcon 과 같은 14px 입니다(Tabler Icons 「walk」, MIT). */
function StopWalkIcon() {
  return (
    <svg className={styles.alightIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M7 21l3 -4 M16 21l-2 -4l-3 -3l1 -6 M6 12l2 -3l4 -1l3 3l3 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 스팟 좌표(TourAPI)를 아는가 — 모르면 거리도 길찾기도 만들지 않습니다. */
function located(spot) {
  return spot?.lat != null && spot?.lng != null
}

/**
 * 두 스팟 사이 걷는 거리(m) — 서버 mode SAME_STOP(두 스팟이 같은 정류장을 써서 버스 구간이 없다). 좌표를 하나라도 모르면 null.
 * 두 스팟 좌표(TourAPI) 사이 **직선**입니다. 전 문구 「같은 정류장 · 바로 이동」은 데이터 말이라 버스를 또 타는지,
 * 「바로」가 몇 분인지 읽히지 않았습니다(2026-09-18 사용자 지적).
 *
 * @param dest 이 구간이 닿는 스팟(타임라인 바로 아래 줄). 구간에 toPoiId 가 없는 옛 응답에서 씁니다.
 */
function spotDistance(leg, stops, dest) {
  const byId = (id) => (id == null ? null : stops.find((stop) => stop.poiId === id))
  const from = byId(leg.fromPoiId)
  const to = byId(leg.toPoiId) ?? dest
  return located(from) && located(to) ? distanceMeters(from, to) : null
}

/**
 * 이동 칸 — 점과 점 **사이**(2026-09-18 사용자 결정 「점 = 장소, 사이 = 이동」 — 구글 지도 · 네이버 지도 대중교통 상세).
 * 레일의 선 모양이 수단을 말합니다 — 버스 굵은 파란 막대 · 걷기 회색 동그라미 점선 · 배 굵은 점선(네이버지도).
 * 걷기 · 버스 아이콘은 칸이 아니라 정류장 점 원 안(다음 수단)에 두고, 칸 글 옆 아이콘은 배뿐입니다(`icon`).
 * 같은 날 거친 안: 걷기 · 버스를 레일 위 원 아이콘으로 두니 정류장이 문장 속 단어로 남아(「신촌 정류장에서 내려 걸어가요」)
 * 글이 길고, 원이 장소인지 이동인지 섞였습니다.
 */
function SegmentRow({ line, icon = null, note = null, action = null, children }) {
  return (
    <div className={styles.legRow}>
      <span className={styles.rail}>{line}</span>
      <span className={styles.segLines}>
        <span className={styles.segLine}>
          {icon}
          {children}
          {action}
        </span>
        {note && <span className={styles.segNote}>{note}</span>}
      </span>
    </div>
  )
}

/**
 * 걷는 칸 「길찾기 ↗」 — 위 점에서 아래 점까지 카카오맵 도보 길찾기(2026-09-18 사용자 결정). 거리 글 바로 뒤에 둔다 —
 * 오른쪽 끝에 두니 바로 아래 타는 정류장 점의 「시간표 ›」와 세로로 붙어 버튼 두 개가 한 덩어리로 보였다(같은 날 사용자 지적).
 * 정류장 ↔ 스팟 · 스팟 ↔ 스팟 모두 — 걷는 곳마다 걷는 길이 있어야 한다. 한쪽 좌표라도 모르면 걸지 않는다(추측으로 잇지 않는다).
 */
function WalkLink({ from, to }) {
  const url = walkDirectionsUrl(from, to)
  if (!url) return null
  return (
    <a
      className={styles.walkLink}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('courseDetail.walkDirectionsA11y', { from: from.shortName ?? from.name, to: to.shortName ?? to.name })}
    >
      {t('courseDetail.walkDirections')}
    </a>
  )
}

/**
 * 정류장 · 선착장 점 — 원 안에 **다음 수단** 아이콘(2026-09-18 사용자 결정 · 네이버지도 「하차」 줄의 걷기 원 · 「승차」 줄의 버스 원).
 * 타는 정류장은 버스(파란 원) — 다음이 버스다. 내리는 정류장 · 선착장은 걷기(회색 원) — 다음이 걷기다.
 * 스팟(40px 사진) · 고현터미널(22px 원)과 같은 레일 가운데에 22px 로 선다.
 *
 * @param next 'bus' · 'walk'
 */
function StationRow({ next, action = null, children }) {
  return (
    <div className={styles.stationRow}>
      <span className={styles.rail}>
        <span className={next === 'bus' ? `${styles.stationNode} ${styles.stationNodeBus}` : styles.stationNode}>
          {next === 'bus' ? <StopBusIcon /> : <StopWalkIcon />}
        </span>
      </span>
      <span className={styles.stationName}>{children}</span>
      {action}
    </div>
  )
}

/**
 * 「시간표 ›」 — 그 스팟에서 떠나는 버스 · 배 시간표. 버스는 **타는 정류장 점**에, 배와 정류장 점이 없는 구간은 스팟 줄에 둔다
 * (2026-09-18 — 네이버지도는 「시간표 · 실시간」이 승차 줄에 있다). 읽기 도구에는 스팟 이름까지 — 버튼이 서너 개다.
 */
function TimetableButton({ spot, nextPoiId, onOpen }) {
  return (
    <button
      type="button"
      className={styles.timetableLink}
      onClick={() => onOpen(spot.poiId, nextPoiId)}
      aria-label={t('courseDetail.timetableA11y', { name: spot.shortName ?? spot.name })}
    >
      {t('courseDetail.timetable')} ›
    </button>
  )
}

/**
 * 구간 — 움직이는 순서대로 점(장소)과 칸(이동)을 늘어놓습니다(2026-09-18 사용자 결정).
 *  · 버스: ┆ 도보 약 N 길찾기 ↗ → (🚌) {정류장}에서 타요 시간표 › → ┃ [55] 약 12분 → (🚶) {정류장}에서 내려요 → ┆ 도보 약 N 길찾기 ↗
 *  · 두 스팟 사이 걷기(SAME_STOP): ┆ 도보 약 110m 길찾기 ↗
 *  · 배: ╏ 🚢 외도상륙+해금강선상관광 · 약 2시간 40분 / ╏ 🚢 배로 돌아와요 → (🚶) 도장포 선착장에서 내려요
 */
function LegRow({ leg, prev, origin, stops = [], dest = null, onOpenTimetable }) {
  const byId = (id) => (id == null ? null : stops.find((stop) => stop.poiId === id))
  const fromSpot = byId(leg.fromPoiId)
  const walkSeg = (distanceM, from, to) => (
    <SegmentRow line={<span className={styles.lineDots} />} action={from && to ? <WalkLink from={from} to={to} /> : null}>
      <span className={styles.legText}>{walkText(distanceM)}</span>
    </SegmentRow>
  )

  if (leg.mode === 'SAME_STOP') return walkSeg(spotDistance(leg, stops, dest), fromSpot, byId(leg.toPoiId) ?? dest)

  const ferry = leg.mode === 'FERRY' ? ferryLine(leg) : null
  if (ferry) {
    const ferrySeg = (
      <SegmentRow line={<span className={styles.lineFerry} />} icon={<StopFerryIcon />}>
        <span className={styles.legText}>{ferry}</span>
      </SegmentRow>
    )
    // 돌아오는 배(0분)는 떠난 선착장에 내려준다 — 그 선착장이 점이다.
    return leg.durationMin === 0 ? (
      <>
        {ferrySeg}
        <StationRow next="walk">{t('courseDetail.dockAlight', { dock: leg.ferry.dockName })}</StationRow>
      </>
    ) : (
      ferrySeg
    )
  }

  const bus = busParts(leg)
  // 앞에서 내린 정류장과 **이름은 같은데 다른 정류장**이면(거리가 다름 — 신촌 184m 에 내려 176m 에서 탐) 가는 방향을 붙입니다(2026-09-17 밤 사용자 결정).
  // 반올림하면 둘 다 「약 180m」라 같은 줄이 두 번 나온 것처럼 읽혔습니다. 「길 건너편」은 정류장 번호가 없어 단정하지 않고,
  // 사실인 **이 버스가 가는 곳**(다음 스팟 또는 고현터미널)만 적습니다.
  // 내린 정류장으로 돌아와 다시 탈 때(이름 · 거리가 같다)도 점을 찍습니다 — 스팟에서 그 정류장까지 다시 걸어갑니다(2026-09-18).
  const sameNameOther = Boolean(prev?.alight?.stop) && prev.alight.stop === leg.board?.stop && !isSameStop(prev.alight, leg.board)
  // 가는 곳 이름은 구간의 toName — 고현터미널로 가는 구간인데 이름이 빠진 옛 응답이면 코스의 출발지 이름(originName).
  const toward = sameNameOther ? (leg.toName ?? (leg.toPoiId == null ? origin : null)) : null
  const board = stationText(leg.board, 'board', toward)
  const alight = stationText(leg.alight, 'alight')

  return (
    <>
      {board && (
        <>
          {walkSeg(leg.board.distanceM, fromSpot, stopPoint(leg.board))}
          <StationRow
            next="bus"
            action={fromSpot && <TimetableButton spot={fromSpot} nextPoiId={leg.toPoiId ?? null} onOpen={onOpenTimetable} />}
          >
            {board}
          </StationRow>
        </>
      )}
      <SegmentRow
        line={<span className={styles.line} />}
        // 휴일에 이 구간을 잇는 직행이 어느 노선으로도 없을 때만 — 서버가 시각 미상(UNKNOWN_TIME)과 갈라 줍니다(운행 없음 ≠ 시각 미상).
        note={leg.mode === 'BUS' && leg.holidayNoBus ? t('courseDetail.holidayNoBus') : null}
      >
        <span className={styles.legBus}>
          {/* 읽기 도구에는 「55번」 — 「55」만 읽히면 무엇의 번호인지 모릅니다. */}
          {bus.route && (
            <span className={styles.routePill}>
              {bus.route}
              <span className={styles.srOnly}>{t('courseDetail.routeSuffix')}</span>
            </span>
          )}{' '}
          <span className={styles.legText}>{bus.rest}</span>
        </span>
      </SegmentRow>
      {alight && (
        <>
          <StationRow next="walk">{alight}</StationRow>
          {walkSeg(leg.alight.distanceM, stopPoint(leg.alight), dest)}
        </>
      )}
    </>
  )
}

/**
 * 걷는 칸 「길찾기 ↗」의 주소 — 위 점(스팟 · 정류장)에서 아래 점까지 카카오맵 도보 길찾기. 좌표를 하나라도 모르면 null.
 * 형식은 타는 곳 카드(BoardingMap directionsUrl)와 같은 `/link/by/walk/출발/도착` — 걷는 길은 카카오가 그립니다(기준문서 §6 배제 표).
 */
function walkDirectionsUrl(from, to) {
  if (!located(from) || !located(to)) return null
  const point = (spot) => `${encodeURIComponent(spot.shortName ?? spot.name)},${spot.lat},${spot.lng}`
  return `https://map.kakao.com/link/by/walk/${point(from)}/${point(to)}`
}

/**
 * 스팟 줄 — 40px 둥근 사진(왼쪽 위에 20px 번호) + 이름, 오른쪽 끝 「시간표 ›」(547:247).
 * `sub` 가 있으면 이름 아래 한 줄이 붙습니다 — 지금은 배가 정한 체류 시간뿐입니다.
 *
 * @param showTimetable 스팟 줄에 「시간표 ›」를 두는가 — 다음 구간이 버스이고 타는 정류장 점이 있으면 그 점이 갖고(2026-09-18),
 *   다음이 걷기면 없다(버스를 또 타는 것처럼 보였다). 배로 떠나거나 정류장 점이 없는 구간만 스팟 줄에 둔다.
 */
function StopRow({ stop, sub, nextPoiId, onOpenTimetable, showTimetable = true }) {
  return (
    <div className={sub ? styles.stopRowWithSub : styles.stopRow} data-stop={stop.poiId}>
      <span className={styles.rail}>
        <span className={styles.thumb}>
          {/* 이름이 바로 옆에 있어 사진은 장식입니다. 링크가 죽으면 자리그림으로. */}
          <img className={styles.thumbImage} src={courseImage(stop)} alt="" onError={onImageError(stop)} />
          <span className={styles.badge}>{stop.seq}</span>
        </span>
      </span>
      <span className={styles.stopLines}>
        <span className={styles.stopName}>{stop.shortName ?? stop.name}</span>
        {sub && <span className={styles.stopSub}>{sub}</span>}
      </span>
      {showTimetable && <TimetableButton spot={stop} nextPoiId={nextPoiId} onOpen={onOpenTimetable} />}
    </div>
  )
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saveState, setSaveState] = useState({ status: 'idle', error: '' })
  /* 구간 고르기(2026-09-18 사용자 결정) — null 이면 전체 경로, 숫자면 그 스팟에 닿는 구간만 봅니다.
     코스가 길어 스크롤이 깊다는 것이 이유입니다. 주소에 싣지 않습니다 — 다시 들어오면 전체부터 보는 편이 예측하기 쉽습니다. */
  const [segment, setSegment] = useState(null)

  /* 제목은 **한 줄이 먼저입니다**(2026-09-18 사용자 결정) — 넘치면 그만큼만 글자를 줄입니다.
     「파도가 몽돌을 굴리는 소리 따라」가 마지막 줄에 두 글자만 남기고 넘어가던 것을 없앱니다.
     DOM 을 직접 고칩니다(상태를 두지 않습니다). 글꼴이 늦게 오면 폭이 달라지므로 그때 한 번 더 재고,
     화면 폭이 바뀔 때도 다시 잽니다. */
  const titleRef = useRef(null)
  useLayoutEffect(() => {
    const fit = () => fitOneLine(titleRef.current, { max: 30, min: 22 })
    fit()
    document.fonts?.ready?.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  })
  // 이미 내 일정에 있는 코스인지 — 있으면 저장 버튼 대신 「이미 저장한 코스예요」(2026-09-15 사용자 요청: 중복 저장 막기).
  const [alreadySaved, setAlreadySaved] = useState(false)

  /* 로그인했을 때만 묻습니다. 못 받으면(만료 · 서버 장애) 버튼을 그대로 두고, 눌렀을 때 서버가 409로 한 번 더 막습니다. */
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    api
      .savedTrips()
      .then((trips) => {
        if (!cancelled && (trips ?? []).some((trip) => trip.courseId === Number(courseId))) setAlreadySaved(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [courseId])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.course(courseId), loadSpots()])
      .then(([data, pois]) => {
        if (cancelled) return
        // 대표 사진은 목록(/api/pois)에만 있습니다. 못 받았거나(빈 Map) 없으면 null — 자리그림으로 떨어집니다.
        const stops = (data.stops ?? []).map((stop) => ({ ...stop, thumbnailUrl: pois.get(stop.poiId)?.imageUrl ?? null }))
        setResult({
          status: 'ready',
          data: { ...data, stops, regions: regionsOf(stops, pois) },
          error: '',
        })
        /* 로그인하고 돌아왔으면 저장을 이어갑니다(2026-09-17 점검). 표시는 주소에 싣습니다 —
           카카오를 거치는 동안 화면 상태가 사라지기 때문입니다(사진 올리기의 `?upload=1`과 같은 방식).
           표시는 먼저 지웁니다. 남겨 두면 새로고침할 때마다 다시 저장하려 듭니다. */
        if (new URLSearchParams(window.location.search).get('save') === '1') {
          navigate(`/courses/${courseId}`, { replace: true })
          if (getToken()) save()
        }
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
    /* 코스가 바뀔 때만 돕니다. navigate · save 를 넣으면 렌더마다 새로 만들어져 코스를 다시 부르고,
       로그인 복귀 저장(?save=1)도 두 번 돌 수 있습니다. 그 둘은 이 효과 안에서 한 번만 쓰입니다. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const course = result.data
  const origin = course?.originName ?? '고현터미널'

  /**
   * 스팟 → 그 스팟의 버스 시간표. **다음 스팟을 함께 넘깁니다** — 학동 다음이 해금강이면 학동에서 필요한 것은
   * `학동 → 해금강` 시간표입니다. 마지막 스팟은 다음이 고현터미널(복귀)이라 넘길 것이 없습니다.
   *
   * 다음 구간이 **같은 정류장**(조선해양문화관 → 거제씨월드)이면 넘기지 않습니다. 넘기면 서버가 같은 정류장 사이
   * 버스를 찾다 NO_SERVICE 를 주고, 화면이 걸어가는 구간에 「이 날은 이 구간을 가는 버스가 없어요」를 씁니다.
   */
  const openTimetable = (poiId, nextPoiId) =>
    navigate(`/timetable/${poiId}${nextPoiId ? `?to=${nextPoiId}` : ''}`)

  /**
   * 저장 — 비로그인이면 시트를 먼저 띄웁니다(446:1112).
   *
   * 보내는 것은 {courseId, travelDate} 둘뿐입니다. 출발·복귀 시각은 코스에 박혀 있어 서버가 채웁니다.
   *
   * ⚠️ travelDate 는 **오늘**로 보냅니다. 코스 상세에 날짜 선택이 없어서입니다.
   * 코스가 평일 기준이므로 주말에 저장하면 그날 버스와 어긋납니다 —
   * 날짜 선택을 둘지는 디자인 결정이라 여기서 정하지 않았습니다(팀 확인 필요).
   */
  // 함수 선언입니다(화살표 상수가 아닙니다) — 위의 코스 적재 이펙트가 로그인 복귀(`?save=1`) 때 이 함수를
  // 부르는데, 상수로 두면 선언 전에 접근하는 꼴이 됩니다.
  function save() {
    if (!getToken()) {
      setSheetOpen(true)
      return
    }
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const travelDate = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`

    setSaveState({ status: 'saving', error: '' })
    api
      .saveTrip({ courseId: Number(courseId), travelDate })
      .then(() => setSaveState({ status: 'saved', error: '' }))
      // 409 — 이미 저장한 코스(다른 탭 · 다른 기기에서 저장했거나 목록을 못 받았을 때). 오류가 아니라 저장된 상태로 보입니다.
      .catch((error) =>
        setSaveState(error.status === 409 ? { status: 'already', error: '' } : { status: 'error', error: error.message }),
      )
  }

  const header = (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label={t('common.back')}>
        {'‹  '}
        {t('courseDetail.back')}
      </button>
      {/* 요일 알약(547:200)은 뺐습니다(2026-09-17 사용자 결정) — course.service 는 확인용 편 사슬의 요일이라
          「평일용 코스」로 읽혔습니다. 휴일에 버스가 정말 없는 구간은 구간 줄 아래 「휴일엔 이 구간 버스가 없어요」가 말하고,
          평일 · 휴일 횟수는 스팟 「시간표 ›」가 말합니다(2026-09-17 구간 줄에서 횟수를 뺐습니다). */}
    </header>
  )

  if (result.status !== 'ready') {
    return (
      <Screen data-api="GET /api/courses/{id}">
        {header}
        <p className={styles.notice}>
          {result.status === 'error'
            ? t('common.loadFailed', { error: result.error })
            : t('courseDetail.loading')}
        </p>
      </Screen>
    )
  }

  const stops = course.stops ?? []
  const legs = course.legs ?? []
  const hasLegs = stops.length > 0 && legs.length > 0
  // 스팟 체인은 이름을 쪼개지 않습니다(「해 / 금강」). 이름마다 한 덩어리로 묶고 가운뎃점은 앞 이름에 붙여,
  // 줄이 「· 거제씨월드」처럼 가운뎃점으로 시작하지 않게 합니다. 읽기 도구에는 「학동몽돌해변 · 해금강 · …」 그대로입니다.
  const names = stops.map((stop) => stop.shortName ?? stop.name)
  const chain = names.map((name, i) => (
    <Fragment key={`${i}-${name}`}>
      {i > 0 && ' '}
      <span className={styles.chainName}>{i < names.length - 1 ? `${name} ·` : name}</span>
    </Fragment>
  ))
  // 제목 — 서버 title 이 있으면 그것, 없으면 「학동몽돌해변에서 바람의언덕까지」. 한 곳뿐이면 이름 그대로(체인).
  const title = courseTitle(course.title, names) ?? chain
  const hasEstimate = legs.some(legEstimated)

  return (
    <Screen data-api="GET /api/courses/{id}">
      {header}

      <div className={styles.scroll}>
        {hasLegs && <CourseMiniMap stops={stops} />}

        <div className={styles.body}>
          {/* 권역만(/api/pois 에서 붙인다 — 여러 권역이면 방문 순서대로 한 번씩 「남부권·동부권」). 곳 수(「· 4곳」)는 2026-09-18 뺐다 —
              사용자 결정. 스팟 체인과 타임라인 번호가 이미 센다. 권역을 모르면 줄을 그리지 않는다(곳 수만 남기지 않는다). */}
          {hasLegs && course.regions && <p className={styles.meta}>{course.regions}</p>}
          <h1 ref={titleRef} className={styles.title}>
            {hasLegs ? title : course.name}
          </h1>

          {hasLegs ? (
            <>
              {/* 회색 스팟 이름 줄(체인)은 2026-09-18 뺐습니다 — 아래 구간 고르기 칩이 같은 이름을 담고,
                  거기서는 누를 수도 있습니다(사용자 결정). */}

              {/* 거제시 추천 관광코스 안내 줄(「당일코스」 여섯 곳 중 네 곳 · 원문 보기 ↗)은 2026-09-18 뺐다 — 사용자: 「너무 번잡해 보인다」.
                  어느 축으로 고른 코스인지는 카드 배지가 말한다. */}
              <div className={styles.chips}>
                <span className={styles.chipBus}>
                  {t('courseDetail.busChip', { time: formatDuration(course.busMinTotal) })}
                </span>
                {/* 서버 legCount 는 같은 정류장 구간까지 세므로(4-09 는 5) 버스를 타는 구간만 다시 셉니다 — 타임라인의 버스 줄 개수와 같은 값. */}
                {/* 배 시간은 버스와 갈라 적습니다 — 더하면 「버스 약 N분」이 거짓말이 됩니다.
                    배가 없는 코스에는 이 칩이 없습니다(서버가 ferryMinTotal 0 · ferryTotalText null). */}
                {course.ferryMinTotal > 0 && (
                  <span className={styles.chipFerry}>
                    {t('courseDetail.ferryChip', { time: formatDuration(course.ferryMinTotal) })}
                  </span>
                )}
                <span className={styles.chipLegs}>{t('courseDetail.legChip', { n: legs.filter((leg) => leg.mode === 'BUS').length })}</span>
              </div>

              {/* 구간 고르기 — 「전체 경로」와 스팟 이름들. 스팟을 고르면 거기 **닿기까지의 구간**만 남습니다.
                  되짚기가 있는 스팟은 구간이 둘입니다(해금강 → 고현터미널 → 조선해양문화관) — 묶어서 함께 보여줍니다. */}
              <div className={styles.segments} role="group" aria-label={t('courseDetail.segmentAria')}>
                <button
                  type="button"
                  className={segment == null ? `${styles.segment} ${styles.segmentOn}` : styles.segment}
                  aria-pressed={segment == null}
                  onClick={() => setSegment(null)}
                >
                  {t('courseDetail.segmentAll')}
                </button>
                {names.map((name, i) => (
                  <button
                    key={`${i}-${name}`}
                    type="button"
                    className={segment === i ? `${styles.segment} ${styles.segmentOn}` : styles.segment}
                    aria-pressed={segment === i}
                    onClick={() => setSegment(i)}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {/* 고른 구간이면 어디서 어디까지인지 한 줄로 — 시작점(앞 스팟 · 고현터미널)이 타임라인에 없기 때문입니다. */}
              {segment != null && (
                <p className={styles.segmentTitle}>
                  {t('courseDetail.segmentTo', {
                    from: segment === 0 ? origin : names[segment - 1],
                    to: names[segment],
                  })}
                </p>
              )}

              <div className={styles.timeline}>
                {segment == null && <TerminalRow label={t('courseDetail.departNode', { origin })} />}
                {/*
                  구간과 스팟이 번갈아 옵니다 — 구간이 스팟보다 하나 많습니다.
                  ⚠️ **배는 예외입니다.** 배는 떠난 선착장으로 돌아오므로 왕복 한 번마다 구간이 하나 더 있는데,
                  그 돌아오는 구간(0분)이 닿는 곳은 **이미 번호를 받은 선착장**이라 스팟 줄을 다시 그리지 않습니다.
                  그래서 스팟 번호는 구간 번호가 아니라 따로 셉니다.
                  ⚠️ **되짚기도 예외입니다**(2026-09-17 코스재설계 §3-3 · §5-3). 두 스팟 사이에 바로 가는 버스가 없으면
                  고현터미널로 갔다가 다시 나오고, 서버는 그것을 구간 둘로 줍니다 — `A → 고현터미널`(toPoiId null) + `고현터미널 → B`(fromPoiId null).
                  앞 구간이 닿는 곳은 스팟이 아니라 터미널이라 스팟 번호를 쓰지 않고 가운데 터미널 줄을 그립니다.
                  마지막 구간도 toPoiId 가 null 이지만 그건 아래 「도착」 줄이 그립니다. 두 규칙은 서로 다른 구간을 건너뛰므로 함께 돌아도 짝이 맞습니다.
                */}
                {(() => {
                  let si = 0
                  // 구간 번호 — 그 구간이 어느 스팟에 닿는지(0부터). 되짚기 구간은 뒤 스팟과 같은 번호를 갖고,
                  // 마지막 복귀 구간은 어느 스팟에도 닿지 않아 번호가 없습니다(전체 경로에서만 보입니다).
                  let seg = 0
                  return legs.map((leg, i) => {
                    const ferryReturn = leg.mode === 'FERRY' && leg.durationMin === 0
                    const viaTerminal = i < legs.length - 1 && leg.toPoiId === null
                    const lastLeg = i === legs.length - 1
                    const stop = ferryReturn || viaTerminal ? null : stops[si++]
                    const mySeg = lastLeg ? null : seg
                    if (!ferryReturn && !viaTerminal && !lastLeg) seg += 1
                    if (segment != null && mySeg !== segment) return null
                    // 다음 스팟을 목적지로 넘겨 그 스팟 시간표가 「여기 → 다음」을 열게 합니다.
                    // 같은 정류장·배로 이어지는 구간, 고현터미널로 가는 구간에는 넘기지 않습니다 — 버스로 바로 가는 구간이 아니라
                    // 서버가 NO_SERVICE 를 줍니다. 터미널로 가는 구간이면 목적지 없이 열어야 「여기 → 고현터미널」이 열려 그 구간과 맞습니다.
                    const next = legs[i + 1]
                    const walkNext = next?.mode === 'SAME_STOP' || next?.mode === 'FERRY' || next?.toPoiId === null
                    return (
                      <Fragment key={leg.seq}>
                        <LegRow
                          leg={leg}
                          prev={legs[i - 1]}
                          origin={course.originName}
                          stops={stops}
                          dest={stop}
                          onOpenTimetable={openTimetable}
                        />
                        {viaTerminal && <TerminalRow label={t('courseDetail.viaNode', { origin })} note={t('courseDetail.viaNote')} />}
                        {stop && (
                          <StopRow
                            stop={stop}
                            /* 이 스팟에 **닿는** 구간이 곧 이 구간이다 — 배로 닿았으면 체류가 실려 온다 */
                            sub={stayLine(leg)}
                            nextPoiId={walkNext ? null : stops[si]?.poiId}
                            onOpenTimetable={openTimetable}
                            // 다음이 걷기면 없음, 다음 버스에 타는 정류장 점이 있으면 그 점이 갖는다
                            showTimetable={
                              next != null && next.mode !== 'SAME_STOP' && !(next.mode === 'BUS' && next.board?.stop && next.fromPoiId != null)
                            }
                          />
                        )}
                      </Fragment>
                    )
                  })
                })()}
                {segment == null && <TerminalRow label={t('courseDetail.arriveNode', { origin })} />}
              </div>

              <div className={styles.notes}>
                {/* 걷는 시간은 어느 원문에도 없다 — 없는 것을 없다고 말한다(2026-09-16 사용자 결정). */}
                {/* 걷는 칸의 「도보 약 N」은 직선거리라 각주가 한 번 말하고 걷는 길은 「길찾기 ↗」로 보냅니다(2026-09-18). */}
                <p className={styles.estimatedNote}>{t('courseDetail.walkNote')}</p>
                {hasEstimate && <p className={styles.estimatedNote}>{t('courseDetail.estimatedNote')}</p>}
                <p className={styles.note}>
                  {t('courseDetail.source', { source: course.source, date: course.baseDate })}
                </p>
                <p className={styles.note}>{t('courseDetail.originNote', { origin })}</p>
              </div>
            </>
          ) : (
            <p className={styles.subtitle}>{t('courseDetail.noLegs')}</p>
          )}

          {/* 저장 — 본문 흐름 안(532:420). 저장 직후에는 결과와 '내 일정 보기'로 바뀝니다(446:1120).
              구간이 없는 옛 코스는 출발·복귀 시각이 없어 서버가 늘 400을 주므로 버튼을 두지 않습니다. */}
          {hasLegs && (
            <div className={styles.saveArea}>
              {saveState.status === 'saved' || saveState.status === 'already' || alreadySaved ? (
                <div className={styles.savedRow}>
                  <span className={styles.savedText}>
                    {t(saveState.status === 'saved' ? 'courseDetail.saved' : 'courseDetail.alreadySaved')}
                  </span>
                  <button type="button" className={styles.savedLink} onClick={() => navigate('/my')}>
                    {t('courseDetail.savedGo')} ›
                  </button>
                </div>
              ) : (
                <>
                  {saveState.status === 'error' && (
                    <p className={styles.saveError}>
                      {t('courseDetail.saveFailed', { error: saveState.error })}
                    </p>
                  )}
                  <Button onClick={save} disabled={saveState.status === 'saving'}>
                    {t(saveState.status === 'saving' ? 'courseDetail.saving' : 'courseDetail.save')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 돌아올 주소에 `?save=1`을 실어 둡니다 — 로그인을 마치고 오면 저장이 이어집니다(2026-09-17 점검).
          사진 올리기가 `?upload=1`로 이미 쓰던 방식인데 저장만 빠져 있어, 로그인하고 와서 다시 눌러야 했습니다. */}
      <LoginSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onLogin={() => beginKakaoLoginTo(`/courses/${courseId}?save=1`)}
      />
    </Screen>
  )
}
