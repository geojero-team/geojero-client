/**
 * 코스 썸네일.
 *
 * 백엔드가 명세대로 thumbnailUrl을 채워주면 그걸 그대로 씁니다.
 * 아직 없으므로 테마별 자리 그림을 SVG data URI로 만들어 둡니다.
 * (외부 이미지를 끌어다 쓰면 링크가 죽는 순간 지도가 지저분해집니다)
 */

const PALETTES = {
  VIEW: { sky: '#CFEAF6', far: '#8FCBDF', near: '#4E9DBB' },
  CRUISE: { sky: '#D8EEF8', far: '#7CC2DB', near: '#3B8FB2' },
  BEACH: { sky: '#DDEFF6', far: '#EFE3CB', near: '#D6C39C' },
  GARDEN: { sky: '#E0F0E5', far: '#A6D2B2', near: '#6BAA80' },
  CASTLE: { sky: '#E5EAEF', far: '#BAC5CE', near: '#8795A3' },
}

/** 하늘 · 먼 능선 · 가까운 능선 세 겹짜리 미니 풍경. 40px 원 안에서 읽히는 정도면 됩니다. */
function placeholderFor(theme) {
  const { sky, far, near } = PALETTES[theme] ?? PALETTES.VIEW
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" fill="${sky}"/>
<circle cx="45" cy="17" r="7" fill="#FFFFFF" opacity="0.72"/>
<path d="M0 43 Q16 29 32 41 T64 36 V64 H0 Z" fill="${far}"/>
<path d="M0 53 Q18 43 34 51 T64 49 V64 H0 Z" fill="${near}"/>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function courseImage(course) {
  return course.thumbnailUrl || placeholderFor(course.theme)
}

export function courseImageFallback(course) {
  return placeholderFor(course.theme)
}
