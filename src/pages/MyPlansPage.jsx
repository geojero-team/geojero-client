import BottomNav from '../components/BottomNav'
import KakaoLoginButton from '../components/KakaoLoginButton'
import Screen from '../components/Screen'
import styles from './MyPlansPage.module.css'

/**
 * 내 일정 — Figma 233:562 "내 일정 — 비로그인 (부가 설명 제거)".
 *
 * 02-1에 있는 '내 일정'은 이 **비로그인 빈 상태 하나뿐**입니다. 로그인 후 목록,
 * 저장 0건, 저장 카드가 그려진 프레임은 02-1에 없습니다 — 그래서 목록은 만들지
 * 않았습니다. 서버 쪽은 GET /api/saved-trips가 이미 있으니 화면만 붙이면 됩니다.
 *
 * 카드 문구가 이 서비스의 약속을 그대로 말합니다: 저장에는 로그인이 필요하지만
 * 코스 추천과 판정은 비로그인으로 전부 됩니다.
 */
export default function MyPlansPage() {
  return (
    <Screen data-api="GET /api/saved-trips">
      <header className={styles.header}>
        <h1 className={styles.title}>내 일정</h1>
      </header>

      <div className={styles.body}>
        <section className={styles.empty}>
          <p className={styles.emptyTitle}>코스를 저장하려면 로그인이 필요해요</p>
          <p className={styles.emptyText}>
            성립한 코스를 저장할 수 있어요.
            <br />
            코스 추천은 로그인 없이 가능해요.
          </p>
          <KakaoLoginButton data-api="GET /api/auth/kakao" />
        </section>
      </div>

      <BottomNav />
    </Screen>
  )
}
