import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import CategoryBar from '../components/CategoryBar'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { fetchSpots } from '../data/mockPlan'
import { courseImage, onImageError } from '../lib/courseImage'
import styles from './SpotsPage.module.css'

/**
 * 스팟 — Figma `스팟 — 배지 없음 · 검색 없음 (Q1 A안)` (233:378).
 * 열람 전용 목록. 판정 배지·체크·검색 없음. 카드 탭 → 스팟 상세.
 *
 * **불성립 표현을 넣지 않습니다**(2026-09-10 결정: "고른 것만 이유를 준다").
 * 아직 아무것도 고르지 않은 화면이라 "여긴 못 감"을 깔면 목록이 쓸모없어 보입니다.
 * 못 가는 이유는 사용자가 그 스팟을 골라 코스가 안 나올 때 그 자리에서 답합니다
 * (일정 고르기·지도의 빈 상태).
 *
 * 그래서 Figma 02-1이 그려둔 불성립 표현 세 가지(사진 40% · disabled 제목 ·
 * 둘째 줄 '오늘 버스로 안 돼요')를 의도적으로 뺐습니다.
 */
function SpotCard({ spot, onOpen }) {
  return (
    <button type="button" className={styles.card} onClick={() => onOpen(spot)}>
      <div className={styles.photo}>
        <img className={styles.photoImg} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{spot.name}</span>
        <span className={styles.meta}>
          {spot.region} · {spot.category}
        </span>
      </div>
    </button>
  )
}

export default function SpotsPage() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(null)
  const [result, setResult] = useState({ status: 'loading', spots: [], error: '' })

  useEffect(() => {
    let cancelled = false
    fetchSpots()
      .then(({ spots }) => {
        if (!cancelled) setResult({ status: 'ready', spots, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', spots: [], error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const spots = theme ? result.spots.filter((spot) => spot.theme === theme) : result.spots

  return (
    <Screen data-api="GET /api/spots">
      <header className={styles.header}>
        <h1 className={styles.title}>{t('spots.title')}</h1>
      </header>

      <div className={styles.body}>
        <CategoryBar value={theme} onChange={setTheme} />

        {result.status === 'error' ? (
          <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
        ) : result.status === 'loading' ? (
          <p className={styles.notice}>{t('spots.loading')}</p>
        ) : (
          <div className={styles.grid}>
            {spots.map((spot) => (
              <SpotCard
                key={spot.spotId}
                spot={spot}
                onOpen={({ spotId }) => navigate(`/spots/${spotId}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </Screen>
  )
}
