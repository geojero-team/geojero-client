import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import CategoryBar from '../components/CategoryBar'
import ListTools from '../components/ListTools'
import Screen from '../components/Screen'
import SpotCardLarge from '../components/SpotCardLarge'
import { t } from '../i18n'
import { api } from '../lib/api'
import { filterAndSort } from '../lib/listTools'
import { courseImage, onImageError } from '../lib/courseImage'
import shared from './SpotsPage.module.css'
import styles from './TimetableListPage.module.css'

/**
 * 시간표 탭 — Figma 02-2 `451:518` "시간표 — 푸터 시간표 (스팟 누르면 그 스팟 시간표로)".
 *
 * 02-2에서 지도 탭 자리를 이 탭이 대신합니다. 지도는 코스 추천에서 들어가는 화면이 됐고
 * 탭에서 바로 갈 자리가 아닙니다.
 *
 * 머리·안내·분류 칩은 스팟 탭과 같아 CSS를 함께 씁니다. 목록은 다릅니다 — 스팟 탭은 사진 카드 2열이고
 * 여기는 **한 줄 목록**(사진 48 · 이름 · 정류장 · ›, 그림 `451:614`)입니다. 도착지도 다릅니다:
 * 스팟 탭은 스팟 상세로, 여기는 그 스팟의 시간표(버스 · 외도보타니아는 배)로 갑니다.
 *
 * 둘째 줄은 **어느 정류장 시간표를 보게 되는지**입니다(2026-09-14 밤 사용자 결정 — 전에는 스팟 탭처럼
 * 「남부권 · 언덕·전망」이었는데 위 분류 칩과 겹치고 이 화면의 물음에 답하지 않았습니다).
 */

/**
 * 둘째 줄 — 그림(451:619)은 하차 정류장 이름(V18 alight_label)입니다. 그대로 적으면 틀리는 곳이 둘 있어 규칙을 둡니다:
 *  · 내리는 곳과 시간표를 읽는 정류장이 다르면(씨월드·조선해양문화관 — 신촌에서 내리고 시각은 지세포) 그 사실을 같이 적습니다.
 *    「신촌 정류장」만 적으면 신촌 시간표로 읽힙니다(스팟 시간표 · 스팟 상세와 같은 규칙 boardStopDiffers).
 *  · 정류장이 없는 외도보타니아는 배를 타는 선착장 넷(서버 ferryDocks, 기준문서 §6 순).
 *  · 둘 다 없으면 스팟 탭과 같은 「권역 · 분류」 — 빈 줄을 남기지 않습니다.
 */
function stopLine(spot) {
  if (spot.alightLabel && spot.boardStopDiffers && spot.timetableStop) {
    return t('timetableList.stopDiffers', { alight: spot.alightLabel, stop: spot.timetableStop })
  }
  if (spot.alightLabel) return spot.alightLabel
  if (spot.ferryDocks?.length > 0) return t('timetableList.docks', { docks: spot.ferryDocks.join(' · ') })
  return [spot.region, spot.category].filter(Boolean).join(' · ') || null
}

function SpotRow({ spot, onOpen, tour }) {
  const sub = stopLine(spot)
  return (
    <button type="button" className={styles.row} onClick={() => onOpen(spot)} data-tour={tour}>
      <span className={styles.thumb}>
        <img className={styles.thumbImg} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
      </span>
      <span className={styles.col}>
        <span className={styles.name}>{spot.shortName ?? spot.name}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      <span className={styles.chev} aria-hidden="true">
        ›
      </span>
    </button>
  )
}

export default function TimetableListPage() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(null)
  const [result, setResult] = useState({ status: 'loading', spots: [], error: '' })
  /* 스팟 탭과 같은 도구입니다(2026-09-17 사용자 결정). 다른 점은 왼쪽 보기가 격자가 아니라
     **한 줄 목록**이라는 것뿐입니다 — 이 탭은 사진보다 「어느 정류장인지」가 먼저입니다. */
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('default')
  const [view, setView] = useState('compact')

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

  const inTheme = theme ? result.spots.filter((spot) => spot.theme === theme) : result.spots
  const spots = filterAndSort(inTheme, { query, sort })

  return (
    <Screen data-api="GET /api/pois">
      <header className={shared.header}>
        <h1 className={shared.title}>{t('timetableList.title')}</h1>
      </header>

      <div className={shared.body}>
        <p className={shared.notice}>{t('timetableList.hint')}</p>

        <CategoryBar value={theme} onChange={setTheme} />

        <ListTools
          query={query}
          onQuery={setQuery}
          sort={sort}
          onSort={setSort}
          view={view}
          onView={setView}
          compact="rows"
        />

        {result.status === 'error' ? (
          <p className={shared.notice}>{t('common.loadFailed', { error: result.error })}</p>
        ) : result.status === 'loading' ? (
          <p className={shared.notice}>{t('spots.loading')}</p>
        ) : spots.length === 0 ? (
          <p className={shared.empty}>{t('listTools.searchEmpty', { query: query.trim() })}</p>
        ) : view === 'large' ? (
          /* 크게 보기 — 카드는 스팟 탭과 같지만 누르면 그 스팟의 시간표로 갑니다. */
          <div className={shared.cards}>
            {spots.map((spot, index) => (
              <SpotCardLarge
                key={spot.poiId}
                spot={spot}
                onOpen={({ poiId }) => navigate(`/timetable/${poiId}`)}
                tour={index === 0 ? 'first-timetable' : undefined}
              />
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {spots.map((spot, index) => (
              <SpotRow
                key={spot.poiId}
                spot={spot}
                onOpen={({ poiId }) => navigate(`/timetable/${poiId}`)}
                // 첫 방문 튜토리얼 4단계가 짚는 첫 줄
                tour={index === 0 ? 'first-timetable' : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </Screen>
  )
}
