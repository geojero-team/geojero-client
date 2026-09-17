import { Fragment, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import KakaoLoginButton from '../components/KakaoLoginButton'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api, beginKakaoLogin } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import { formatDuration, formatMonthDay } from '../lib/format'
import { clearSession, getToken } from '../lib/session'
import { loadSpotPhotos, withPhotos } from '../lib/spots'
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
 * **판정 요소가 없습니다.** 2026-09-12에 판정이 제품에서 빠졌고(기준문서 §9) 응답에서
 * verdictAtSave·verdictNow도 사라졌습니다. 그 둘을 읽던 코드와 '오늘 기준 재판정' 버튼을
 * 함께 걷어냈습니다 — 컷 순서 3번이 "저장 일정 열람 시 재판정 표시 → 단순 열람으로 확정"입니다.
 *
 * 2026-09-13: 스팟을 `학동 · 해금강 · 바람의언덕` 글자 대신 **코스 추천 카드와 같은 사진 줄**로
 * 보여주고, 카드를 누르면(또는 '코스 상세 확인') 그 코스 상세로 갑니다. 사진 줄은 저장 응답에
 * 없어서 코스 상세(`/api/courses/{id}`)를 함께 부릅니다 — 그 호출이 실패하면 저장된
 * 제목 글자로 그립니다(카드가 비지 않게).
 */
function SavedTripCard({ trip, course, busy, confirming, onAsk, onCancel, onDelete, onOpen }) {
  // 제목·경로는 **저장 시점에 서버가 함께 저장한 값**입니다(V10). 사진 줄을 못 그릴 때만 씁니다.
  const title = trip.title ?? t('myPlans.unknownCourse')
  const date = formatMonthDay(trip.travelDate)
  // 출발·복귀 시각은 코스에 박힌 값을 서버가 채워준 것입니다(사용자가 고르지 않습니다).
  const meta = trip.returnTime
    ? t('myPlans.meta', { date, depart: trip.arrivalTime, back: trip.returnTime })
    : t('myPlans.metaNoBack', { date, depart: trip.arrivalTime })
  const stops = course?.stops ?? []
  // 30분 단위로 반올림한 값은 서버가 한 번만 정합니다(approxTotalMin) — 여기서 따로 계산하면 어긋납니다.
  const approx = course?.approxTotalMin

  return (
    <article className={styles.card}>
      {/* 카드 본문 전체가 코스 상세로 가는 버튼입니다. 삭제·상세 버튼은 이 밖에 둡니다 —
          버튼 안에 버튼을 넣으면 스크린리더와 키보드가 둘을 구별하지 못합니다. */}
      <button
        type="button"
        className={styles.cardMain}
        onClick={() => onOpen(trip)}
        aria-label={t('myPlans.openAria', { title })}
      >
        {stops.length > 0 ? (
          <span className={styles.order} data-count={stops.length}>
            {stops.map((spot, i) => (
              <Fragment key={spot.poiId}>
                {i > 0 && stops.length <= 3 && (
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                )}
                <span className={styles.stop}>
                  <span className={styles.thumb}>
                    <img
                      className={styles.thumbImg}
                      src={courseImage(spot)}
                      alt=""
                      onError={onImageError(spot)}
                    />
                    <span className={styles.num}>{i + 1}</span>
                  </span>
                  <span className={styles.stopName}>{spot.shortName ?? spot.name}</span>
                </span>
              </Fragment>
            ))}
          </span>
        ) : (
          <span className={styles.cardTitle}>{title}</span>
        )}
        <span className={styles.meta}>{meta}</span>
        {approx != null && (
          <span className={styles.meta}>
            {t('myPlans.duration', { time: formatDuration(approx) })}
          </span>
        )}
      </button>

      {/* 삭제는 되돌릴 수 없어 그 자리에서 한 번 더 묻습니다(2026-09-17 점검) —
          사진 삭제 · 신고 · 회원 탈퇴가 이미 그렇게 하는데 여기만 바로 지우고 있었습니다. */}
      {confirming ? (
        <div className={styles.actions}>
          <span className={styles.confirmQuestion}>{t('myPlans.deleteConfirm')}</span>
          <Button
            variant="ghost"
            className={styles.action}
            onClick={onCancel}
            disabled={busy}
          >
            {t('myPlans.deleteCancel')}
          </Button>
          <Button
            variant="secondary"
            className={styles.action}
            onClick={() => onDelete(trip.savedTripId)}
            disabled={busy}
            data-api="DELETE /api/saved-trips/{id}"
          >
            {t('myPlans.delete')}
          </Button>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            className={styles.action}
            onClick={() => onAsk(trip.savedTripId)}
            disabled={busy}
            aria-label={t('myPlans.deleteAria', { title })}
          >
            {t('myPlans.delete')}
          </Button>
          <span className={styles.spacer} />
          <Button
            variant="secondary"
            className={styles.action}
            onClick={() => onOpen(trip)}
            data-api="GET /api/courses/{id}"
          >
            {t('myPlans.openDetail')}
          </Button>
        </div>
      )}
    </article>
  )
}

/**
 * 저장 카드마다 코스 상세를 부릅니다 — 사진 줄(스팟 poiId·이름)과 소요 시간이 저장 응답에 없어서입니다.
 * 같은 코스를 여러 번 저장했으면 한 번만 부릅니다. 실패한 코스는 맵에서 빠지고 카드는 제목 글자로 그립니다.
 */
async function loadTripCourses(trips) {
  const ids = [...new Set(trips.map((trip) => trip.courseId).filter(Boolean))]
  if (ids.length === 0) return new Map()
  const [photos, details] = await Promise.all([
    loadSpotPhotos(),
    Promise.allSettled(ids.map((id) => api.course(id))),
  ])
  const byId = new Map()
  details.forEach((res, i) => {
    if (res.status !== 'fulfilled') return
    byId.set(ids[i], {
      stops: withPhotos(res.value.stops ?? [], photos),
      approxTotalMin: res.value.approxTotalMin,
    })
  })
  return byId
}

export default function MyPlansPage() {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()))
  const [result, setResult] = useState({ status: 'loading', trips: [], error: '' })
  const [busy, setBusy] = useState(false)
  // courseId → { stops, approxTotalMin }. 저장 카드의 사진 줄·소요 시간입니다.
  const [tripCourses, setTripCourses] = useState(() => new Map())

  /* 상태를 콜백에서만 건드립니다 — 이펙트 본문에서 곧바로 setState를 부르면
     연쇄 렌더가 됩니다(react-hooks/set-state-in-effect). 첫 진입은 이미 'loading'이고,
     다시 부르는 동안의 표시는 busy가 맡습니다. */
  const load = useCallback(() => {
    return api
      .savedTrips()
      .then((trips) => {
        const list = trips ?? []
        setResult({ status: 'ready', trips: list, error: '' })
        // 카드 글자는 먼저 그리고, 사진 줄은 코스 상세가 오는 대로 채웁니다.
        return loadTripCourses(list).then(setTripCourses)
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

  /* 회원 탈퇴(2026-09-16) — 되돌릴 수 없어 무엇이 사라지는지 말하고 한 번 더 묻습니다.
     성공하면 이 화면에 그대로 남아 비로그인 상태가 됩니다 — 다른 데로 튕기지 않습니다. */
  const [asking, setAsking] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')

  const withdraw = () => {
    setBusy(true)
    setWithdrawError('')
    api
      .deleteAccount()
      .then(() => {
        clearSession()
        setAsking(false)
        setLoggedIn(false)
        setResult({ status: 'loading', trips: [], error: '' })
      })
      .catch((error) => setWithdrawError(t('myPlans.withdrawFailed', { error: error.message })))
      .finally(() => setBusy(false))
  }

  const logout = () => {
    // 서버 세션 정리는 실패해도 상관없습니다 — 토큰을 버리면 이 브라우저에서는 끝입니다.
    api.logout().catch(() => {})
    clearSession()
    setLoggedIn(false)
    setResult({ status: 'loading', trips: [], error: '' })
  }

  /* 삭제 확인(2026-09-17 점검) — 한 번에 하나만 묻습니다. 다른 카드의 「삭제」를 누르면 그쪽으로 옮겨갑니다. */
  const [confirmingId, setConfirmingId] = useState(null)

  const remove = (savedTripId) => {
    setBusy(true)
    api
      .deleteTrip(savedTripId)
      .then(load)
      .catch(() => load())
      .finally(() => {
        setBusy(false)
        setConfirmingId(null)
      })
  }

  const trips = result.trips

  // 저장한 코스의 상세로 — 코스 추천에서 들어간 것과 같은 화면입니다.
  const openCourse = (trip) => {
    if (trip.courseId) navigate(`/courses/${trip.courseId}`)
  }

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
                course={tripCourses.get(trip.courseId)}
                busy={busy}
                confirming={confirmingId === trip.savedTripId}
                onAsk={setConfirmingId}
                onCancel={() => setConfirmingId(null)}
                onDelete={remove}
                onOpen={openCourse}
              />
            ))}
          </div>
        )}
      </div>

      {/* 탭바 바로 위 한 줄 — 왼쪽 개인정보처리방침, 오른쪽 회원 탈퇴(사용자 지정 위치).
          목록(위 body)과 함께 스크롤되지 않고 늘 같은 자리에 있습니다.
          방침은 로그인과 무관하게 늘 보입니다 — 스토어 심사와 이용자 확인에 필요한 공개 문서입니다.
          탈퇴 확인은 이 줄 바로 위에 펴집니다 — 묻는 자리와 누른 자리가 붙어 있게. */}
      <div className={styles.bottom}>
        {loggedIn && asking && (
          <section className={styles.confirm}>
            <p className={styles.confirmTitle}>{t('myPlans.withdrawTitle')}</p>
            {/* 문장마다 한 줄 — 무엇이 사라지는지, 되돌릴 수 없다는 것 */}
            <p className={styles.confirmText}>{t('myPlans.withdrawText')}</p>
            <p className={styles.confirmNote}>{t('myPlans.withdrawKakao')}</p>
            {withdrawError && <p className={styles.confirmError}>{withdrawError}</p>}
            <div className={styles.confirmActions}>
              <Button
                variant="secondary"
                className={styles.action}
                onClick={() => setAsking(false)}
                disabled={busy}
              >
                {t('myPlans.withdrawCancel')}
              </Button>
              <Button
                className={styles.action}
                onClick={withdraw}
                disabled={busy}
                data-api="DELETE /api/me"
              >
                {busy ? t('myPlans.withdrawing') : t('myPlans.withdrawConfirm')}
              </Button>
            </div>
          </section>
        )}

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.footerLink}
            onClick={() => navigate('/privacy')}
          >
            {t('myPlans.privacy')}
          </button>
          <span className={styles.spacer} />
          {loggedIn && !asking && (
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => {
                setAsking(true)
                setWithdrawError('')
              }}
            >
              {t('myPlans.withdraw')}
            </button>
          )}
        </footer>
      </div>

      <BottomNav />
    </Screen>
  )
}
