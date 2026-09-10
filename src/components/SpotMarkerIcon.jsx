/**
 * Figma SpotMarker(55:45) — 흰 면 + 브랜드 테두리 + 16px 단색 스트로크 아이콘, 28px.
 * 카테고리 코드는 데이터의 theme(VIEW/CRUISE/BEACH/GARDEN/CASTLE). 패스는 Figma 내보내기 원본.
 * 'ALL'은 스팟 목록 카테고리 바의 '전체'(2×2 격자, 면·테두리 없음).
 */
const ICON_PATHS = {
  VIEW: 'M7 16.5796H21M7.5 16.5796C10 10.0796 12.5 10.0796 15 14.5796M13 16.5796C15.5 11.0796 18 11.0796 20.5 16.5796',
  CRUISE:
    'M11.25 14.125V11.125H17.25V14.125M14.25 11.125V8.125M7.75 19.125C9.25 18.125 10.25 18.125 11.75 19.125C13.25 20.125 14.25 20.125 15.75 19.125C17.25 18.125 18.25 18.125 19.75 19.125M8.25 14.125H20.25L18.75 17.125H9.75L8.25 14.125Z',
  BEACH:
    'M14 8.25C11 8.25 8 10.25 8 13.75H20C20 10.25 17 8.25 14 8.25ZM14 8.25V13.75V19.75M14 8.25C12.5 8.75 11 10.75 11 13.75M14 8.25C15.5 8.75 17 10.75 17 13.75M11.5 19.75H16.5',
  GARDEN:
    'M14 20V13M14 13C14 10 16 8 19 8C19 11 17 13 14 13ZM14 15.5C11 15.5 9 13.5 9 10C12 10 14 12 14 15.5Z',
  CASTLE: 'M13 19V15.5H15V19M9 19V11H11V9H13V11H15V9H17V11H19V19H9Z',
}

const ALL_PATHS = [
  'M13 8.5H8.5V13H13V8.5Z',
  'M19.5 8.5H15V13H19.5V8.5Z',
  'M13 15H8.5V19.5H13V15Z',
  'M19.5 15H15V19.5H19.5V15Z',
]

export default function SpotMarkerIcon({ category, className = '' }) {
  const stroke = { stroke: 'var(--brand-strong)', strokeWidth: 1.5, fill: 'none' }

  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      {category === 'ALL' ? (
        ALL_PATHS.map((d) => <path key={d} d={d} {...stroke} />)
      ) : (
        <>
          <rect
            x="0.75"
            y="0.75"
            width="26.5"
            height="26.5"
            rx="13.25"
            fill="var(--bg-page)"
            stroke="var(--brand-strong)"
            strokeWidth="1.5"
          />
          <path
            d={ICON_PATHS[category] ?? ICON_PATHS.VIEW}
            {...stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  )
}
