import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, KAKAO_CALLBACK_PATH } from '../lib/api'
import { saveSession, takeReturnTo } from '../lib/session'
import styles from './AuthCallbackPage.module.css'

/**
 * 카카오가 돌려보내는 자리. `?code=`를 세션으로 바꾸고 원래 보던 화면으로 되돌립니다.
 *
 * 이 화면은 사용자가 머무는 곳이 아닙니다 — 성공하면 곧바로 떠나고, 실패했을 때만 남습니다.
 * 실패해도 판정·조회는 로그인 없이 전부 되므로 홈으로 보내는 것으로 충분합니다
 * (기준문서 §6: 인증 장애가 판정을 막지 않는다).
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  // React 18 StrictMode는 effect를 두 번 돌립니다. code는 한 번만 쓸 수 있어 두 번째는 실패합니다.
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const code = searchParams.get('code')
    if (!code) {
      setFailed(true)
      return
    }

    // 토큰 교환의 redirect_uri는 인증 요청 때 보낸 값과 **글자까지 같아야** 합니다.
    const redirectUri = `${window.location.origin}${KAKAO_CALLBACK_PATH}`

    api
      .kakaoLogin(code, redirectUri)
      .then(({ nickname, token }) => {
        saveSession({ nickname, token })
        navigate(takeReturnTo(), { replace: true })
      })
      .catch(() => setFailed(true))
  }, [navigate, searchParams])

  return (
    <Screen data-api="POST /api/auth/kakao">
      <div className={styles.center}>
        <p className={styles.title}>
          {t(failed ? 'login.failed' : 'login.connecting')}
        </p>
        {failed && (
          <>
            <p className={styles.hint}>{t('login.failedHint')}</p>
            <button
              type="button"
              className={styles.home}
              onClick={() => navigate('/', { replace: true })}
            >
              {t('login.goHome')}
            </button>
          </>
        )}
      </div>
    </Screen>
  )
}
