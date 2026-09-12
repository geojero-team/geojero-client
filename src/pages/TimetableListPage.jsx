import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import CategoryBar from '../components/CategoryBar'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { courseImage, onImageError } from '../lib/courseImage'
import styles from './SpotsPage.module.css'

/**
 * 시간표 탭 — Figma 02-2 `451:518` "시간표 — 푸터 시간표 (스팟 누르면 그 스팟 시간표로)".
 *
 * 02-2에서 지도 탭 자리를 이 탭이 대신합니다. 지도는 코스 추천에서 들어가는 화면이 됐고
 * 탭에서 바로 갈 자리가 아닙니다.
 *
 * 목록 모양은 스팟 탭과 같아 CSS를 함께 씁니다. 다른 것은 **도착지**뿐입니다 —
 * 스팟 탭은 스팟 상세로, 여기는 그 스팟의 버스 시간표로 갑니다.
 *
 * 스팟을 서버에서 직접 받습니다(`/api/pois`). 스팟 탭은 아직 목(mockPlan)을 쓰지만,
 * 시간표는 **서버 poi_id**로 조회해야 하므로 목 id를 쓸 수 없습니다.
 */
function SpotCard({ spot, onOpen }) {
  return (
    <button type="button" className={styles.card} onClick={() => onOpen(spot)}>
      <div className={styles.photo}>
        <img className={styles.photoImg} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{spot.shortName ?? spot.name}</span>
        <span className={styles.meta}>
          {spot.region} · {spot.category}
        </span>
      </div>
    </button>
  )
}

export default function TimetableListPage() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(null)
  const [result, setResult] = useState({ status: 'loading', spots: [], error: '' })

  useEffect(() => {
    let cancelled = false
    api
      .pois(true)
      .then(({ pois }) => {
        if (cancelled) return
        // 화면에 뜨는 스팟은 theme이 채워진 것들입니다(명사해수욕장 등은 사진이 없어 빠집니다).
        const spots = (pois ?? [])
          .filter((poi) => poi.theme)
          .map((poi) => ({ ...poi, thumbnailUrl: poi.imageUrl }))
        setResult({ status: 'ready', spots, error: '' })
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
    <Screen data-api="GET /api/pois">
      <header className={styles.header}>
        <h1 className={styles.title}>{t('timetableList.title')}</h1>
      </header>

      <div className={styles.body}>
        <p className={styles.notice}>{t('timetableList.hint')}</p>

        <CategoryBar value={theme} onChange={setTheme} />

        {result.status === 'error' ? (
          <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
        ) : result.status === 'loading' ? (
          <p className={styles.notice}>{t('spots.loading')}</p>
        ) : (
          <div className={styles.grid}>
            {spots.map((spot) => (
              <SpotCard
                key={spot.poiId}
                spot={spot}
                onOpen={({ poiId }) => navigate(`/timetable/${poiId}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </Screen>
  )
}
