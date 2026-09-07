import PlaceholderScreen from '../components/PlaceholderScreen'

/** ② 판정 조건 입력 — 라우팅만 먼저 연결해둔 자리표시자입니다. */
export default function ConditionsPage() {
  return (
    <PlaceholderScreen
      title="판정 조건"
      lead="이 화면은 다음 작업입니다. 지금은 메인 지도에서 넘어오는 경로만 연결해뒀습니다."
      items={[
        '출발지 — 검색창 + 부산서부 / 서울남부 / 통영 칩',
        '날짜 · 출발 시각',
        '귀가 시각 — 기본값 막차까지(제한 없음)',
        '코스 테마 필터 — 전체 / 언덕·전망 / 유람선 / 해수욕장 / 식물원 / 성',
        '코스 카드 가로 캐러셀',
        '하단 CTA — 판정하기',
      ]}
    />
  )
}
