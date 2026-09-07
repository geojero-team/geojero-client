import PlaceholderScreen from '../components/PlaceholderScreen'

/** 홈 — 첫 진입 화면. footer.png 기준으로 다음 작업입니다. */
export default function HomePage() {
  return (
    <PlaceholderScreen
      tab
      title="홈"
      lead="첫 진입 화면입니다. 아직 안 만들었고, 지금은 탭바 연결만 잡아뒀습니다."
      items={[
        '헤드라인 — 오늘 거제, 버스로 어디까지 갈 수 있을까요?',
        '조건 카드 — 출발지 / 날짜 / 출발 시각',
        'CTA — 가고 싶은 곳 고르기',
        '최근에 본 코스',
        '오늘 버스로 되는 코스 — 가로 캐러셀',
      ]}
    />
  )
}
