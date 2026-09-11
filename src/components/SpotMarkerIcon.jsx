import { ALL_PATHS, ICON_PATHS } from '../lib/spotIcons'

/**
 * Figma SpotMarker(55:45) — 흰 면 + 브랜드 테두리 + 16px 단색 스트로크 아이콘, 28px.
 * 패스는 lib/spotIcons.js에 있고 Figma 내보내기 원본과 문자 단위로 일치합니다
 * (HISTORY만 예외 — 세트에 없어 같은 규칙으로 그렸습니다. 그 파일 주석 참고).
 *
 * tone은 면·테두리·아이콘 색을 한 번에 정합니다. 기본은 Figma 값(브랜드).
 * 지도에서 판정에 따라 색을 바꿀 때만 넘깁니다.
 */
export default function SpotMarkerIcon({ category, tone = 'var(--brand-strong)', className = '' }) {
  const stroke = { stroke: tone, strokeWidth: 1.5, fill: 'none' }

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
            stroke={tone}
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
