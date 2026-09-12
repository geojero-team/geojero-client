import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import styles from './HomePage.module.css'

/**
 * 홈 — Figma 02-2 `446:453` "홈 — 지도 + 코스 추천 받기 (버튼은 지도 위에 떠 있음)".
 *
 * 2026-09-12에 통째로 다시 썼습니다. 전에는 홈이 **조건을 정하고 판정된 코스를
 * 미리 보여주는** 화면이었습니다(출발지·날짜·시각 알약 + "오늘 버스로 되는 코스" 카드).
 * 판정을 제품에서 빼면서 그 둘이 다 사라졌습니다 —
 *   · 조건: 코스를 우리가 짜서 내려주므로 사용자가 정할 자리가 없습니다
 *   · 판정 카드: 성립/불성립을 말하지 않습니다
 * 남은 것은 **거제 전체를 보여주는 지도**와 **코스 추천으로 들어가는 문** 하나입니다.
 *
 * 지도에 핀을 다 찍는 이유: 기준문서 §1이 "관광지는 섬 전역에 분산돼 있다"이고
 * §8이 "관광지가 남부에 몰려 있다"를 금지합니다. 첫 화면이 그 사실을 보여줍니다.
 */
export default function HomePage() {
  const navigate = useNavigate()
  const [result, setResult] = useState({ status: 'loading', spots: [], error: '' })

  useEffect(() => {
    let cancelled = false
    api
      .pois(true)
      .then(({ pois }) => {
        if (cancelled) return
        // theme이 있는 스팟만 화면에 뜹니다(명사해수욕장 등은 쓸 사진이 없어 빠져 있습니다).
        // MapView는 `spotId`로 핀을 식별하므로 poiId를 그 자리에 넣습니다.
        const spots = (pois ?? [])
          .filter((poi) => poi.theme && poi.lat != null && poi.lng != null)
          .map((poi) => ({ ...poi, spotId: poi.poiId, thumbnailUrl: poi.imageUrl }))
        setResult({ status: 'ready', spots, error: '' })
      })
      .catch((error) => {
        // 지도가 비어도 '코스 추천 받기'는 눌릴 수 있어야 합니다 — 코스 조회는
        // TourAPI·사진과 무관하게 돌아야 합니다(기준문서 §6).
        if (!cancelled) setResult({ status: 'error', spots: [], error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const spots = useMemo(() => result.spots, [result.spots])

  return (
    <Screen data-api="GET /api/pois">
      <div className={styles.mapArea}>
        {/* 핀을 누르면 스팟 상세로 갑니다.
            02-1의 핀 요약 시트(PinSheet)는 판정 배지·불성립 이유를 담고 있어 판정과 함께
            지웠습니다. 그 시트의 스팟 쪽 목적지가 곧 스팟 상세였고("어디서 열든 같은 판"),
            중간 시트 없이 바로 보냅니다. 핀이 겹쳐 있으면 MapView가 먼저 확대해
            갈라 보여줍니다 — 가려진 핀은 탭할 방법이 없기 때문입니다. */}
        <MapView
          spots={spots}
          onSelectSpot={(spot) => navigate(`/spots/${spot.poiId}`)}
          topReserved={16}
        />

        {/* 버튼은 지도 위에 떠 있습니다(프레임 이름의 "버튼은 지도 위에 떠 있음"). */}
        <div className={styles.cta}>
          <Button onClick={() => navigate('/courses?spots=3')} data-api="GET /api/courses">
            {t('home.getCourses')}
          </Button>
        </div>
      </div>

      <BottomNav />
    </Screen>
  )
}
