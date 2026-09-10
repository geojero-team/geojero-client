import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import KakaoLoginButton from '../components/KakaoLoginButton'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, beginKakaoLogin } from '../lib/api'
import { formatMonthDay } from '../lib/format'
import { clearSession, getToken } from '../lib/session'
import styles from './MyPlansPage.module.css'

/**
 * 내 일정 — 세 상태입니다.
 *
 *   비로그인      Figma 233:562 "내 일정 — 비로그인 (부가 설명 제거)"
 *   로그인·0건    Figma 379:246 "내 일정 — 로그인 · 저장 0건"
 *   로그인·목록   Figma 380:259 "내 일정 — 로그인 · 저장 목록 2건"
 *
 * 로그인 여부는 토큰 유무로 봅니다. 서버에 물어보지 않는 이유는, 서버가 안 떠 있어도
 * 이 탭이 비로그인 화면으로라도 떠야 하기 때문입니다(기준문서 §6: 인증 장애가 판정을
 * 막지 않는다). 토큰이 만료됐으면 목록 호출이 401로 떨어지고 그때 비로그인으로 돌립니다.
 *
 * '로그아웃'은 로그인 상태에서만 보입니다 — 비로그인 프레임(233:562) 헤더엔 없습니다.
 */

/**
 * 저장 카드 — Figma CourseCard(49:51) kind=saved.
 *
 * **판정 배지를 달지 않습니다.** Figma 컴포넌트 설명이 이유를 적어뒀습니다:
 * "'저장 땐 성립/지금은 불성립' 비교 표시는 컷 1순위라 UI 미포함(컬럼 verdict_at_save만 유지)".
 * 서버는 verdictAtSave·verdictNow를 둘 다 내려주지만 화면에 그리지 않습니다.
 */
function SavedTripCard({ trip, busy, onDelete, onRejudge }) {
  // 제목·경로는 **저장 시점에 서버가 함께 저장한 값**입니다(V10). 저장된 판정의 legs에는
  // 정류소 이름이 없어서(LegRes = ok·depart·arrive·reason) 여기서 만들 수 없고,
  // 코스 이름이 나중에 바뀌어도 "내가 저장한 그것"이 남아야 합니다.
  const title = trip.title ?? t('myPlans.unknownCourse')
  const chain = trip.chain ?? null
  const legs = (trip.verdictNow ?? trip.verdictAtSave)?.legs?.length ?? null
  const date = formatMonthDay(trip.travelDate)
  const meta = legs
    ? t('myPlans.meta', { date, time: trip.arrivalTime, legs })
    : t('myPlans.metaNoLegs', { date, time: trip.arrivalTime })

  return (
    <article className={styles.card}>
      <p className={styles.cardTitle}>{title}</p>
      {chain && <p className={styles.chain}>{chain}</p>}
      <p className={styles.meta}>{meta}</p>

      <div className={styles.actions}>
        <Button
          variant="ghost"
          className={styles.action}
          onClick={() => onDelete(trip.savedTripId)}
          disabled={busy}
          aria-label={t('myPlans.deleteAria', { title })}
          data-api="DELETE /api/saved-trips/{id}"
        >
          {t('myPlans.delete')}
        </Button>
        <span className={styles.spacer} aria-hidden="true" />
        <Button
          variant="secondary"
          className={styles.action}
          onClick={onRejudge}
          disabled={busy}
          data-api="GET /api/saved-trips"
        >
          {busy ? t('myPlans.rejudging') : t('myPlans.rejudge')}
        </Button>
      </div>
    </article>
  )
}

export default function MyPlansPage() {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()))
  const [result, setResult] = useState({ status: 'loading', trips: [], error: '' })
  const [busy, setBusy] = useState(false)

  /* 상태를 콜백에서만 건드립니다 — 이펙트 본문에서 곧바로 setState를 부르면
     연쇄 렌더가 됩니다(react-hooks/set-state-in-effect). 첫 진입은 이미 'loading'이고,
     다시 부르는 동안의 표시는 busy가 맡습니다. */
  const load = useCallback(() => {
    return api
      .savedTrips()
      .then((trips) => {
        setResult({ status: 'ready', trips: trips ?? [], error: '' })
      })
      .catch((error) => {
        // 토큰이 만료·폐기됐으면 로그인부터 다시 해야 합니다.
        if (error.status === 401 || error.status === 403) {
          clearSession()
          setLoggedIn(false)
          return
        }
        setResult({ status: 'error', trips: [], error: error.message })
      })
  }, [])

  useEffect(() => {
    if (!loggedIn) return

    load()
  }, [loggedIn, load])

  const logout = () => {
    // 서버 세션 정리는 실패해도 상관없습니다 — 토큰을 버리면 이 브라우저에서는 끝입니다.
    api.logout().catch(() => {})
    clearSession()
    setLoggedIn(false)
    setResult({ status: 'loading', trips: [], error: '' })
  }

  const remove = (savedTripId) => {
    setBusy(true)
    api
      .deleteTrip(savedTripId)
      .then(load)
      .catch(() => load())
      .finally(() => setBusy(false))
  }

  /* '오늘 기준 재판정' — 다시 계산하는 곳은 서버입니다. 목록을 다시 부르면
     서버가 verdictNow를 그 자리에서 새로 판정해 내려줍니다(SavedTripController.toRes). */
  const rejudge = () => {
    setBusy(true)
    load().finally(() => setBusy(false))
  }

  const trips = result.trips

  return (
    <Screen data-api="GET /api/saved-trips">
      <header className={styles.header}>
        <h1 className={styles.title}>{t('myPlans.title')}</h1>
        {loggedIn && (
          <button
            type="button"
            className={styles.logout}
            onClick={logout}
            data-api="POST /api/auth/logout"
          >
            {t('myPlans.logout')}
          </button>
        )}
      </header>

      <div className={styles.body}>
        {!loggedIn ? (
          /* 비로그인(233:562) — 문구가 이 서비스의 약속을 그대로 말합니다:
             저장에는 로그인이 필요하지만 코스 추천과 판정은 비로그인으로 전부 됩니다. */
          <section className={styles.empty}>
            <p className={styles.emptyTitle}>{t('myPlans.emptyTitle')}</p>
            <p className={styles.emptyText}>
              {t('myPlans.emptyText1')}
              <br />
              {t('myPlans.emptyText2')}
            </p>
            <KakaoLoginButton onClick={beginKakaoLogin} data-api="GET /api/auth/kakao/start" />
          </section>
        ) : result.status === 'error' ? (
          <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
        ) : result.status === 'loading' && trips.length === 0 ? (
          <p className={styles.notice}>{t('myPlans.loading')}</p>
        ) : trips.length === 0 ? (
          /* 로그인·저장 0건(379:246) */
          <section className={styles.empty}>
            <p className={styles.emptyTitle}>{t('myPlans.savedEmptyTitle')}</p>
            <p className={styles.emptyText}>{t('myPlans.savedEmptyText')}</p>
            <Button
              className={styles.getCourses}
              onClick={() => navigate('/')}
              data-api="GET /api/courses"
            >
              {t('myPlans.getCourses')}
            </Button>
          </section>
        ) : (
          /* 로그인·저장 목록(380:259) */
          <div className={styles.list}>
            {trips.map((trip) => (
              <SavedTripCard
                key={trip.savedTripId}
                trip={trip}
                busy={busy}
                onDelete={remove}
                onRejudge={rejudge}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </Screen>
  )
}
