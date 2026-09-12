import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import SpotSheet, { PEEK_HEIGHT } from '../components/SpotSheet'
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
  // 핀을 누른 스팟. 화면을 옮기지 않고 시트만 올립니다(2026-09-13).
  const [picked, setPicked] = useState(null)

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
        {/* 핀을 누르면 **스팟 시트**가 아래에서 올라옵니다(2026-09-13).
            전에는 스팟 상세로 화면이 통째로 바뀌었습니다 — 지도를 보다가 "이게 뭐지"를
            확인하려면 지도를 떠나야 했고, 돌아오면 배율과 위치가 다시 맞춰졌습니다.
            시트를 끌어올리면 그 스팟 상세가 그대로 나옵니다.
            핀이 겹쳐 있으면 MapView가 먼저 확대해 갈라 보여줍니다 — 가려진 핀은
            탭할 방법이 없기 때문입니다.

            시트가 올라오면 지도를 그만큼 줄입니다(`bottom`). 그대로 두면 MapView가 누른
            핀을 지도 가운데로 옮기는데(`panTo`) 그 가운데가 시트 뒤입니다. 줄어들면
            ResizeObserver가 `relayout()`을 부르고 남은 영역의 가운데로 갑니다. */}
        <div className={styles.mapWrap} style={{ bottom: picked ? PEEK_HEIGHT : 0 }}>
          <MapView
            spots={spots}
            selectedSpotId={picked?.poiId ?? null}
            onSelectSpot={setPicked}
            onDeselect={() => setPicked(null)}
            topReserved={16}
          />
        </div>

        {/* 버튼은 지도 위에 떠 있습니다(프레임 이름의 "버튼은 지도 위에 떠 있음").
            시트가 올라오면 감춥니다 — 시트가 덮을 자리이고, 지금 할 일은 이 스팟을 보는 것입니다. */}
        {!picked && (
          <div className={styles.cta}>
            <Button onClick={() => navigate('/courses?spots=3')} data-api="GET /api/courses">
              {t('home.getCourses')}
            </Button>
          </div>
        )}

        <SpotSheet
          key={picked?.poiId ?? 'none'}
          spot={picked}
          onClose={() => setPicked(null)}
        />
      </div>

      <BottomNav />
    </Screen>
  )
}
