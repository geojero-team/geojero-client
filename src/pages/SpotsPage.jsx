import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import CategoryBar from '../components/CategoryBar'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { fetchSpots } from '../data/mockPlan'
import { courseImage } from '../lib/courseImage'
import styles from './SpotsPage.module.css'

/**
 * 스팟 — Figma `스팟 — 배지 없음 · 검색 없음 (Q1 A안)` (233:378).
 * 열람 전용 목록. 판정 배지·체크·검색 없음. 카드 탭 → 스팟 상세.
 * 둘째 줄 안내(당일 확인 / 오늘 버스로 안 돼요)는 조건과 무관한 사실(기준문서)이라 여기서도 보입니다.
 */
function SpotCard({ spot, onOpen }) {
  const blocked = spot.notice?.kind === 'NO'

  return (
    <button type="button" className={styles.card} onClick={() => onOpen(spot)}>
      <div className={styles.photo}>
        <img
          className={blocked ? `${styles.photoImg} ${styles.photoDim}` : styles.photoImg}
          src={courseImage(spot)}
          alt=""
        />
      </div>
      <div className={styles.info}>
        <span className={blocked ? `${styles.name} ${styles.nameDim}` : styles.name}>
          {spot.name}
        </span>
        <span className={styles.meta}>
          {spot.region} · {spot.category}
        </span>
        {spot.notice && <span className={styles.meta}>{spot.notice.text}</span>}
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
