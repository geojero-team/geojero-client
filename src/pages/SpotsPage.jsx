import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import CategoryBar from '../components/CategoryBar'
import LikeCount from '../components/LikeCount'
import ListTools from '../components/ListTools'
import PlaceCard from '../components/PlaceCard'
import Screen from '../components/Screen'
import SpotCardLarge from '../components/SpotCardLarge'
import { t } from '../i18n'
import { api } from '../lib/api'
import { filterAndSort } from '../lib/listTools'
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
function SpotCard({ spot, onOpen, tour }) {
  return (
    <button type="button" className={styles.card} onClick={() => onOpen(spot)} data-tour={tour}>
      <div className={styles.photo}>
        <img className={styles.photoImg} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
      </div>
      <div className={styles.info}>
        {/* 화면에 쓰는 이름은 short_name 입니다(기준문서 §7) — 목은 name 에 짧은 이름을
            담고 있었는데 서버는 name=정식명 / shortName=화면명으로 갈라져 있습니다.
            그대로 두면 '학동흑진주몽돌해변'·'거제도포로수용소유적공원'이 카드에 들어갑니다. */}
        <span className={styles.name}>{spot.shortName ?? spot.name}</span>
        <span className={styles.meta}>
          <span>
            {spot.region} · {spot.category}
          </span>
          {/* 하트 수 — 카드에는 수만, 누르는 자리는 스팟 상세(2026-09-21 · 부록 Q). 0 도 「♥ 0」, 값이 없으면(옛 응답) 없음. */}
          <LikeCount count={spot.likeCount} />
        </span>
      </div>
    </button>
  )
}

/* 맛집 · 숙소(2026-09-19 사용자 결정) · 카페(2026-09-20) — 분류 칩 끝의 세 칸.
   스팟 분류가 아니라 시간표 탭 칩에는 넣지 않습니다. 카페는 끝에 더합니다 — 앞의 둘은 이미 익은 자리입니다. */
const PLACE_KINDS = ['FOOD', 'STAY', 'CAFE']
const PLACE_CHIPS = PLACE_KINDS.map((key) => ({ key, label: t(`places.chip.${key}`) }))

export default function SpotsPage() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(null)
  const [result, setResult] = useState({ status: 'loading', spots: [], error: '' })
  /* 찾기 · 정렬 · 보기 방식(2026-09-17 사용자 결정). 주소에 싣지 않습니다 — 탭을 떠났다 오면
     처음 상태로 돌아오는 편이 예측하기 쉽습니다. 분류 칩(theme)과 함께 걸러집니다. */
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('default')
  const [view, setView] = useState('compact')
  /* 칸을 누를 때 부릅니다 — 스팟만 보는 사람에게 TourAPI 호출을 쓰지 않습니다. 받은 목록은 남겨 두어 다시 누르면
     그것부터 보이고(서버는 24시간 캐시라 다시 불러도 싸다), 실패했으면 다른 칸을 갔다 오면 다시 부릅니다.
     목록 상태(places)를 의존성에 넣지 않습니다 — 넣으면 실패가 곧 다음 호출을 불러 끝없이 재시도합니다. */
  const [places, setPlaces] = useState({})
  const placeKind = PLACE_KINDS.includes(theme) ? theme : null

  useEffect(() => {
    if (!placeKind) return
    let cancelled = false
    api
      .places(placeKind)
      .then((res) => {
        if (!cancelled) setPlaces((prev) => ({ ...prev, [placeKind]: { status: 'ready', list: res.places ?? [] } }))
      })
      .catch((error) => {
        if (!cancelled) setPlaces((prev) => ({ ...prev, [placeKind]: { status: 'error', error: error.message } }))
      })
    return () => {
      cancelled = true
    }
  }, [placeKind])

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

  const inTheme = theme ? result.spots.filter((spot) => spot.theme === theme) : result.spots
  const placeState = placeKind ? places[placeKind] ?? { status: 'loading' } : null
  const spots = filterAndSort(inTheme, { query, sort })

  return (
    <Screen data-api="GET /api/spots">
      <header className={styles.header}>
        <h1 className={styles.title}>{t('spots.title')}</h1>
      </header>

      <div className={styles.body}>
        <CategoryBar value={theme} onChange={setTheme} extras={PLACE_CHIPS} />

        {/* 맛집 · 숙소는 19곳뿐이고 서버 순서가 곧 인기순이라 찾기 · 정렬을 두지 않습니다. */}
        {!placeKind && (
          <ListTools
            query={query}
            onQuery={setQuery}
            sort={sort}
            onSort={setSort}
            view={view}
            onView={setView}
          />
        )}

        {placeState ? (
          placeState.status === 'error' ? (
            <p className={styles.notice}>{t(`places.loadFailed.${placeKind}`, { error: placeState.error })}</p>
          ) : placeState.status === 'loading' ? (
            <p className={styles.notice}>{t('places.loading')}</p>
          ) : (
            <div className={styles.cards}>
              {placeState.list.map((place) => (
                <PlaceCard key={place.placeId} place={place} onOpen={({ placeId }) => navigate(`/places/${placeId}`)} />
              ))}
            </div>
          )
        ) : result.status === 'error' ? (
          <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
        ) : result.status === 'loading' ? (
          <p className={styles.notice}>{t('spots.loading')}</p>
        ) : spots.length === 0 ? (
          /* 찾은 것이 없을 때만 나옵니다 — 분류 칩은 어느 칸에나 스팟이 있어 0곳이 되지 않습니다. */
          <p className={styles.empty}>{t('listTools.searchEmpty', { query: query.trim() })}</p>
        ) : view === 'large' ? (
          <div className={styles.cards}>
            {spots.map((spot, index) => (
              <SpotCardLarge
                key={spot.poiId}
                spot={spot}
                onOpen={({ poiId }) => navigate(`/spots/${poiId}`)}
                tour={index === 0 ? 'first-spot' : undefined}
              />
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {spots.map((spot, index) => (
              <SpotCard
                key={spot.poiId}
                spot={spot}
                onOpen={({ poiId }) => navigate(`/spots/${poiId}`)}
                // 첫 방문 튜토리얼 3단계가 짚는 첫 카드
                tour={index === 0 ? 'first-spot' : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </Screen>
  )
}
