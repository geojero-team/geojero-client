import Button from './Button'
import { t } from '../i18n'
import KakaoLoginButton from './KakaoLoginButton'
import styles from './LoginSheet.module.css'

/**
 * 로그인 시트 — Figma 240:209 "로그인 시트 — 저장 누를 때 (한 줄 · 가운데 정렬)".
 *
 * 390×196(hug). 핸들 + 제목 한 줄 + 카카오 버튼 + '나중에'가 전부입니다.
 * ✕도 부제도 약관 고지도 없습니다 — 프레임 이름의 "한 줄"이 그 뜻입니다.
 *
 * 스크림은 이 프레임에 없어서([미확인]) 02-1 안의 유일한 선례인 조건 편집 시트의
 * scrim(274:570) 값 rgba(16,24,40,.4)을 씁니다.
 *
 * 로그인 자체는 백엔드 /api/auth/kakao가 맡습니다. 지금은 서버 배포 전이라
 * 버튼이 그 경로로 보내기만 하고, 실패해도 판정 화면은 그대로 돌아야 합니다.
 */
export default function LoginSheet({ open, onClose, onLogin }) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label={t('common.close')}
      />

      <section className={styles.sheet} aria-label={t('login.sheetAria')}>
        <div className={styles.handleRow}>
          <span className={styles.handle} aria-hidden="true" />
        </div>

        <h2 className={styles.title}>{t('login.title')}</h2>

        <KakaoLoginButton onClick={onLogin} data-api="GET /api/auth/kakao/start" />

        <Button variant="ghost" onClick={onClose}>
          {t('login.later')}
        </Button>
      </section>
    </>
  )
}
