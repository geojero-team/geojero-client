import { t } from '../i18n'
import { ICON_PATHS } from '../lib/spotIcons'
import styles from './MapView.module.css'

/*
 * 지도 핀 DOM 과 이름표 배치 — MapView.jsx 에서 그대로 옮겼습니다(2026-09-13).
 * 테스트가 부르려면 내보내야 하는데, 컴포넌트 파일이 함수를 내보내면 fast refresh 규칙
 * (react-refresh/only-export-components)에 걸려서 따로 뒀습니다. 카카오 SDK 를 모르는 순수 DOM 코드입니다.
 */

/** 라벨 사이 최소 간격(px). 이보다 가까우면 뒤 순위 라벨을 숨깁니다. */
const LABEL_GAP = 4

/**
 * 마커 기하 — Figma 285:208 실측.
 * SpotMarker·StopMarker 모두 28×28이고 **원의 중심이 지리 좌표**입니다
 * (CustomOverlay xAnchor 0.5 / yAnchor 0.5). 꼬리·사진 핀은 쓰지 않습니다.
 *
 * 라벨은 마커 박스 기준 오른쪽 +30 / 위 +5에 붙습니다. 오른쪽이 막히면 왼쪽으로
 * 뒤집는데, 그때 간격은 Figma 실측대로 4px입니다(오른쪽 2px와 비대칭 — 원본 그대로).
 *
 * [주의] 아래 값을 바꾸면 MapView.module.css의 .pin / .pinLabel 치수도 같이 고쳐야
 * 이름표 충돌 계산이 어긋나지 않습니다.
 */
const MARKER_SIZE = 28
const LABEL_HEIGHT = 18
const LABEL_RIGHT_GAP = 30
const LABEL_LEFT_GAP = 4

/**
 * 숙소 · 맛집 사진 액자(2026-09-19) — **높이는 스팟 원과 같은 28**(사용자 — 통일성), **폭은 사진 비율대로**.
 * 테두리(1.5)만 두르고 여백 없이 사진을 통째로 담는다 — 사진이 오면 테두리 안 높이 25 에 맞춰 폭을 정하므로
 * 자르지도 않고(공공누리 3유형 변경금지, 기준문서 §7) 빈칸도 남지 않는다(사용자 — 「흰 공백 없애줘」).
 * 사진이 오기 전에는 3:2(대표 사진 대부분)로 둔다. 이름표 · 겹침 계산은 핀마다 `size` 로 한다(원 28 × 28).
 */
const PHOTO_FRAME_H = 28
const PHOTO_FRAME_BORDER = 1.5
const PHOTO_INNER_H = PHOTO_FRAME_H - PHOTO_FRAME_BORDER * 2
const PHOTO_FRAME_W_DEFAULT = frameWidthFor(1.5) // 3:2 → 41

/**
 * 마커 중심끼리 이보다 가까우면 한 덩어리로 봅니다.
 *
 * 바람의언덕과 도장포는 실제로 250m 거리라, 섬 전체가 보이는 배율에서는 10px 남짓
 * 떨어져 있습니다 — 원 두 개가 그대로 포개집니다. 뒤 핀은 앞 핀에 가려 탭도 안 됩니다.
 * 그래서 한 곳만 남기고 "+N"으로 몇 곳이 더 있는지 말한 뒤, 탭하면 확대해 풀어줍니다.
 *
 * ⚠️ 2026-09-12: 28px(마커 지름)에서 **16px로 낮췄습니다.** 28px는 "원이 1px도 겹치지
 * 않는다"는 기준이었는데, 그러면 가까운 스팟을 보려고 너무 많이 당겨야 했습니다 —
 * 거제씨월드와 조선해양문화관은 실제로 **112m 떨어진 같은 시설**이라(같은 주소,
 * 기준문서 §7) 500m 배율에서 계속 하나로 묶였습니다.
 * 16px이면 원이 12px 겹치지만 **중심이 16px 떨어져 있어 둘 다 탭됩니다** —
 * 가려져서 닿을 수 없는 것과 살짝 물려 보이는 것은 다른 문제입니다.
 * 더 낮추면(예: 12px) 탭 영역이 실제로 먹히기 시작합니다.
 */
const CLUSTER_GAP = 16

/**
 * 마커 하나. CustomOverlay는 DOM 엘리먼트를 그대로 받으므로 직접 만들어 넣습니다.
 *
 *   코스 정류소  StopMarker — brand 면 + 흰 번호
 *   코스 밖 스팟 SpotMarker — 흰 면 + brand 테두리 + 카테고리 아이콘
 *
 * 2026-09-12: 판정 톤(불성립 빨강·미확인 노랑)과 이름표의 '성립/불성립' 꼬리말을
 * 걷어냈습니다. 판정이 제품에서 빠지면서 spots 에 verdict 가 오지 않습니다.
 */
/** 사진이 없거나 링크가 죽었을 때 쓰는 테마 아이콘. Figma SpotMarker(55:45)와 같은 패스입니다. */
function themeIconSvg(theme) {
  return (
    `<svg width="${MARKER_SIZE}" height="${MARKER_SIZE}" viewBox="0 0 28 28" aria-hidden="true">` +
    `<path d="${ICON_PATHS[theme] ?? ICON_PATHS.VIEW}" fill="none" stroke="currentColor"` +
    ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  )
}

/**
 * 고현터미널 — Figma 02-2 `501:213` 내보낸 자산 그대로(2026-09-13).
 * 모든 코스의 출발 지점이라 스팟(흰 면 + 사진)과 반대로 **브랜드 면 + 흰 버스**입니다.
 * 원 r=13 + 흰 테두리 2 = 28px 박스라 스팟 마커와 크기·중심이 같습니다.
 */
export const TERMINAL_MARKER_SVG =
  '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
  '<circle cx="14" cy="14" r="13" fill="#0069B3" stroke="white" stroke-width="2"/>' +
  '<path d="M17.3333 8H10.6667C9.5621 8 8.66667 8.89543 8.66667 10V15.3333C8.66667 16.4379 9.5621 17.3333 10.6667 17.3333H17.3333C18.4379 17.3333 19.3333 16.4379 19.3333 15.3333V10C19.3333 8.89543 18.4379 8 17.3333 8Z" stroke="white" stroke-width="1.33333"/>' +
  '<path d="M8.66667 12.6667H19.3333" stroke="white" stroke-width="1.33333"/>' +
  '<path d="M11.3333 17.3333V19.3333" stroke="white" stroke-width="1.33333" stroke-linecap="round"/>' +
  '<path d="M16.6667 17.3333V19.3333" stroke="white" stroke-width="1.33333" stroke-linecap="round"/>' +
  '</svg>'

/** 이름표를 마커 아래 가운데에 둘 때 마커와의 간격(px) — Figma 501:220이 501:213 아래 30(28 + 2). */
const LABEL_BELOW_GAP = 2

/** 숙소 · 맛집(홈 칩, 2026-09-19) — 대표 사진이 있으면 사각 액자(자르지 않음), 없으면 스팟 마커와 같은 원에 아이콘. */
function isPlaceKind(kind) {
  return kind === 'STAY' || kind === 'FOOD'
}

/** 사진 비율에 맞춘 액자 폭 — 테두리 안 높이 25 × 비율(반올림) + 테두리. 너무 가늘거나 넓은 사진은 16 ~ 64 로 묶는다. */
function frameWidthFor(ratio) {
  return Math.min(64, Math.max(16, Math.round(PHOTO_INNER_H * ratio) + PHOTO_FRAME_BORDER * 2))
}

export function createPinElement(spot, { order, onResize } = {}) {
  const isStop = order != null
  const isTerminal = spot.kind === 'TERMINAL'
  const isPlace = isPlaceKind(spot.kind)
  // 거제9경 — 홈만 spot.nineScenic 을 붙입니다(2026-09-14). 코스 정류소는 번호 마커가 우선입니다.
  const isNineScenic = spot.nineScenic != null && !isStop && !isTerminal

  const element = document.createElement('button')
  element.type = 'button'
  element.className = [
    styles.pin,
    isTerminal ? styles.pinTerminal : isStop ? styles.pinStop : styles.pinSpot,
    isNineScenic && styles.pinNineScenic,
    isPlace && styles.pinPlace,
    isPlace && spot.thumbnailUrl && styles.pinPlacePhoto,
  ]
    .filter(Boolean)
    .join(' ')
  // 첫 방문 튜토리얼 1단계가 짚는 곳(Tutorial — 핀 + 이름표를 감쌉니다).
  if (isTerminal) element.dataset.tour = 'terminal'

  // 겹쳤을 때 "외 2곳"을 덧붙여야 해서 원본을 따로 들고 있습니다.
  // 9경은 테두리 색으로만 말하므로, 화면 읽기 프로그램에는 이름 뒤에 글로 붙입니다.
  const name = spot.shortName ?? spot.name
  element.dataset.label = isNineScenic ? `${name}, ${t('map.nineScenicSuffix')}` : `${name}`
  element.setAttribute('aria-label', element.dataset.label)

  const framed = isPlace && Boolean(spot.thumbnailUrl)
  // 핀 크기 — 이름표 · 겹침 계산이 읽는다. 액자는 사진이 오면 폭이 바뀐다(위 load).
  const size = framed ? { width: PHOTO_FRAME_W_DEFAULT, height: PHOTO_FRAME_H } : { width: MARKER_SIZE, height: MARKER_SIZE }

  const dot = document.createElement('span')
  dot.className = styles.pinDot
  /* 9경 설명(NineScenicTour)이 블러에 **동그란 구멍**을 뚫을 자리입니다(2026-09-19 사용자).
     핀 버튼이 아니라 이 동그라미에 다는 이유: 버튼 상자에는 옆에 붙는 이름표까지 들어가
     구멍이 길쭉한 네모가 됩니다. 클래스로 찾지 않는 것은 CSS Modules 가 이름을 해시로 바꾸기 때문입니다. */
  if (isNineScenic) dot.dataset.nine = ''
  if (isTerminal) {
    dot.innerHTML = TERMINAL_MARKER_SVG
  } else if (isStop) {
    dot.textContent = String(order)
  } else if (isPlace && spot.thumbnailUrl) {
    /* 숙소 · 맛집 대표 사진 — 사각 액자에 **통째로**(원으로 자르지 않는다 — 공공누리 3유형 변경금지, 기준문서 §7).
       사진이 오면 폭을 그 비율에 맞춘다(빈칸 없음). 폭이 바뀌면 onResize 로 알려 이름표 자리를 다시 잰다.
       링크가 죽으면 액자는 그대로 두고 아이콘을 담는다. */
    const photo = document.createElement('img')
    photo.className = styles.pinPhotoWhole
    photo.alt = ''
    photo.addEventListener('load', () => {
      if (!photo.naturalWidth || !photo.naturalHeight) return
      const width = frameWidthFor(photo.naturalWidth / photo.naturalHeight)
      if (width === size.width) return
      size.width = width
      element.style.width = `${width}px`
      onResize?.()
    })
    photo.addEventListener('error', () => {
      dot.innerHTML = themeIconSvg(spot.kind)
    })
    photo.src = spot.thumbnailUrl
    dot.append(photo)
  } else if (isPlace) {
    // 사진이 없으면(관광정보 실패 등) 스팟 마커와 같은 원에 침대 · 수저 아이콘.
    dot.innerHTML = themeIconSvg(spot.kind)
  } else if (spot.thumbnailUrl) {
    const photo = document.createElement('img')
    photo.className = styles.pinPhoto
    photo.src = spot.thumbnailUrl
    photo.alt = ''
    // 링크가 죽으면 빈 원이 남습니다. 아이콘으로 되돌립니다.
    photo.addEventListener('error', () => {
      dot.innerHTML = themeIconSvg(spot.theme)
    })
    dot.append(photo)
  } else {
    dot.innerHTML = themeIconSvg(spot.theme)
  }

  const label = document.createElement('span')
  label.className = styles.pinLabel
  label.textContent = spot.shortName ?? spot.name

  // 겹친 곳 수. 배율마다 달라지므로 여기서는 빈 채로 두고 updateLabelVisibility가 채웁니다.
  const badge = document.createElement('span')
  badge.className = styles.pinCluster
  badge.hidden = true

  element.append(dot, label, badge)
  return { element, label, badge, isTerminal, isNineScenic, size }
}

/**
 * 라벨 겹침 정리.
 * 거제 남부에 스팟이 몰려 있어서 라벨을 전부 그리면 서로 잘립니다.
 * Figma 기본 배치는 마커 오른쪽이고, 막히면 왼쪽으로 뒤집습니다(바람의언덕이 그 예).
 * 양쪽 다 막히면 그 이름표만 숨깁니다 — 점 자체는 항상 보입니다.
 * 고현터미널만 Figma(`501:220`)대로 **마커 아래 가운데**를 먼저 시도하고, 막히면 오른쪽 → 왼쪽입니다.
 */
/** 핀 크기 — 액자는 사진 비율에 따라 폭이 바뀐다(createPinElement 의 size). 없으면 28px 원. */
function sizeOf(pin) {
  return pin.size ?? { width: MARKER_SIZE, height: MARKER_SIZE }
}

export function updateLabelVisibility(map, pins, selectedId, topReserved = 0) {
  let projection
  try {
    projection = map.getProjection()
  } catch {
    return
  }
  if (!projection) return

  // 지도 가장자리에 걸친 이름표는 잘려서 못 읽습니다. 화면 안에 들어오는지도 봅니다.
  const node = map.getNode?.()
  const viewWidth = node?.offsetWidth ?? Infinity
  const viewHeight = node?.offsetHeight ?? Infinity

  const points = new Map()

  // 1) 픽셀 좌표를 먼저 구합니다.
  //    z축도 여기서 정합니다 — 화면 아래(남쪽) 마커가 위로 올라와 층이 읽힙니다.
  pins.forEach((pin) => {
    const point = projection.containerPointFromCoords(pin.overlay.getPosition())
    points.set(pin.spotId, point)

    const isSelected = pin.spotId === selectedId
    pin.overlay.setZIndex(isSelected ? 9999 : 100 + Math.round(point.y))
  })

  // 2) 우선순위 — 선택한 스팟, 코스 정류소, 고현터미널, 거제9경, 나머지 순.
  //    겹친 무리의 대표와 이름표 자리를 둘 다 이 순서로 정합니다.
  //    터미널은 모든 코스의 출발 지점이라 스팟에 묻히면 안 됩니다 — 섬 전체 배율에서 포로수용소와
  //    포개져 「포로수용소 외 1곳」 뒤로 숨던 것을 운영에서 잡았습니다(2026-09-13).
  //    9경은 홈에서 주황으로 짚어 주는 곳이라, 겹치면 9경이 대표로 남아야 주황이 보입니다
  //    (바람의언덕이 도장포유람선 뒤로 숨지 않게 — 2026-09-14).
  const rank = (pin) =>
    pin.spotId === selectedId ? 0 : pin.isStop ? 1 : pin.isTerminal ? 2 : pin.isNineScenic ? 3 : 4
  const ordered = [...pins].sort((a, b) => rank(a) - rank(b))

  /* 3) 포개진 마커 정리.
   *
   * 배율을 당기면 저절로 풀리는 문제라 좌표는 건드리지 않습니다 — 핀을 밀어내면
   * "이 서비스는 위치가 정확하다"는 전제가 깨집니다. 대신 대표 하나만 남기고
   * 몇 곳이 더 있는지 배지로 말한 뒤, 탭하면 확대해서 실제로 갈라 보여줍니다. */
  const heads = []
  const hidden = new Set()
  /* 원끼리는 중심 거리 16px 안이면 묶는다(위 CLUSTER_GAP — 원은 12px 겹쳐도 둘 다 읽히고 눌린다).
     숙소 · 맛집 사진 액자(42 × 28)가 끼면 두 핀의 폭 · 높이로 재고, 겹침은 4px 까지만 둔다 — 사진은 조금만 겹쳐도
     지저분하고 가려진 사진이 무엇인지 알 수 없다(운영 미리보기 · 지세포 맛집 둘이 7px 겹침). */
  const OVERLAP_ALLOWED = 4
  const tooClose = (a, p, b, q) => {
    const aw = sizeOf(a).width
    const bw = sizeOf(b).width
    if (aw === MARKER_SIZE && bw === MARKER_SIZE) return Math.hypot(p.x - q.x, p.y - q.y) < CLUSTER_GAP
    const ah = sizeOf(a).height
    const bh = sizeOf(b).height
    return (
      Math.abs(p.x - q.x) < (aw + bw) / 2 - OVERLAP_ALLOWED && Math.abs(p.y - q.y) < (ah + bh) / 2 - OVERLAP_ALLOWED
    )
  }

  ordered.forEach((pin) => {
    const point = points.get(pin.spotId)
    if (!point) return
    const head = heads.find((other) => tooClose(pin, point, other.pin, points.get(other.pin.spotId)))
    if (head) {
      hidden.add(pin.spotId)
      head.covered += 1
    } else {
      heads.push({ pin, covered: 0 })
    }
  })

  pins.forEach((pin) => {
    const isHidden = hidden.has(pin.spotId)
    pin.element.style.display = isHidden ? 'none' : ''
    if (isHidden) pin.badge.hidden = true
  })

  heads.forEach(({ pin, covered }) => {
    pin.badge.hidden = covered === 0
    pin.badge.textContent = covered > 0 ? `+${covered}` : ''
    // 겹친 상태에서는 탭이 '고르기'가 아니라 '펼치기'입니다. 클릭 쪽에서 읽습니다.
    pin.element.dataset.covered = String(covered)
    const base = pin.element.dataset.label ?? ''

    pin.element.setAttribute(
      'aria-label',
      covered > 0 ? t('map.clusterLabel', { name: base, count: covered }) : base,
    )
  })

  // 4) 마커가 이름표보다 먼저 자리를 차지합니다. 이름표가 남의 마커에 걸치면 둘 다
  //    못 읽습니다. 숨긴 마커는 자리를 차지하지 않습니다 — 그리지 않으니까요.
  const halfW = (pin) => sizeOf(pin).width / 2
  const halfH = (pin) => sizeOf(pin).height / 2
  const occupied = []
  heads.forEach(({ pin }) => {
    const point = points.get(pin.spotId)
    occupied.push({
      owner: pin.spotId,
      left: point.x - halfW(pin),
      right: point.x + halfW(pin),
      top: point.y - halfH(pin),
      bottom: point.y + halfH(pin),
    })
  })

  // 5) 이름표를 우선순위대로 놓습니다. heads는 이미 그 순서이고, 가려진 핀은
  //    빠져 있습니다 — 안 보이는 마커의 이름표를 위해 자리를 비워둘 이유가 없습니다.
  heads.forEach(({ pin }) => {
    // opacity는 레이아웃에 영향이 없어서 숨긴 상태에서도 폭을 잴 수 있습니다.
    const width = pin.label.offsetWidth
    const point = points.get(pin.spotId)
    if (!point || width === 0) return

    const markerLeft = point.x - halfW(pin)
    // 이름표는 마커 높이 가운데(원 28 이면 위 +5 — Figma).
    const top = point.y - LABEL_HEIGHT / 2
    const boxAt = (left, boxTop = top) => ({
      left,
      right: left + width,
      top: boxTop,
      bottom: boxTop + LABEL_HEIGHT,
    })

    const right = boxAt(markerLeft + halfW(pin) * 2 + (LABEL_RIGHT_GAP - MARKER_SIZE))
    const left = boxAt(markerLeft - LABEL_LEFT_GAP - width)
    const below = pin.isTerminal
      ? boxAt(point.x - width / 2, point.y + halfH(pin) + LABEL_BELOW_GAP)
      : null
    const candidates = below ? [below, right, left] : [right, left]

    const fits = (box) =>
      !occupied.some(
        (other) =>
          other.owner !== pin.spotId &&
          box.left < other.right + LABEL_GAP &&
          box.right + LABEL_GAP > other.left &&
          box.top < other.bottom + LABEL_GAP &&
          box.bottom + LABEL_GAP > other.top,
      )

    const within = (box) =>
      box.left >= 0 &&
      box.right <= viewWidth &&
      box.top >= topReserved &&
      box.bottom <= viewHeight

    // (터미널은 아래 →) 오른쪽 → 왼쪽 순으로 시도합니다.
    // 방금 탭한 스팟의 이름표는 자리가 없어도 보여줍니다. 숨겨버리면
    // "내가 뭘 눌렀는지"가 사라집니다. 나머지가 이걸 피해 가면 됩니다.
    const placement =
      candidates.find((box) => within(box) && fits(box)) ??
      (pin.spotId === selectedId ? (candidates.find(within) ?? candidates[candidates.length - 1]) : null)

    pin.label.classList.toggle(styles.pinLabelLeft, placement === left)
    pin.label.classList.toggle(styles.pinLabelBelow, placement != null && placement === below)
    pin.label.style.opacity = placement ? '1' : '0'
    pin.label.style.pointerEvents = placement ? '' : 'none'
    if (placement) occupied.push({ ...placement, owner: pin.spotId })
  })
}
