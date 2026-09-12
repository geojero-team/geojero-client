import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import CategoryBar from '../components/CategoryBar'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { loadVisibleSpots } from '../lib/spots'
import { courseImage, onImageError } from '../lib/courseImage'
import styles from './SpotsPage.module.css'

/**
 * 스팟 — Figma 02-2 446:1126 (02-1 233:378과 기능 같음).
 *
 * 2026-09-12: 목(data/mockPlan)에서 **서버**로 옮겼습니다. 목은 9경 8곳만 알아서
 * 시간표 탭(서버 17곳)과 목록이 어긋나 있었습니다 — 같은 제품에서 스팟 수가 둘이었습니다.
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
        {/* 화면에 쓰는 이름은 short_name 입니다(기준문서 §7) — 목은 name 에 짧은 이름을
            담고 있었는데 서버는 name=정식명 / shortName=화면명으로 갈라져 있습니다.
            그대로 두면 '학동흑진주몽돌해변'·'거제도포로수용소유적공원'이 카드에 들어갑니다. */}
        <span className={styles.name}>{spot.shortName ?? spot.name}</span>
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
    loadVisibleSpots()
      .then((spots) => {
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
                key={spot.poiId}
                spot={spot}
                onOpen={({ poiId }) => navigate(`/spots/${poiId}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </Screen>
  )
}
