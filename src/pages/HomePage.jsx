import { Route } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import MapLayerChips from '../components/MapLayerChips'
import MapView from '../components/MapView'
import MascotButton from '../components/MascotButton'
import NineScenicSheet from '../components/NineScenicSheet'
import NineScenicTour from '../components/NineScenicTour'
import Screen from '../components/Screen'
import SpotSheet from '../components/SpotSheet'
import { peekHeightOf } from '../components/spotSheetHeight'
import { t } from '../i18n'
import { api } from '../lib/api'
import { poiIdsByNineScenic } from '../lib/nineScenic'
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
 *
 * 2026-09-14: 거제9경을 지도에 색 테두리로 표시하고, 왼쪽 위 「거제9경이란?」 버튼이 그 뜻을
 * (2026-09-17 그 색을 주황에서 보라로 바꿨습니다 — 토큰 nine-scenic 하나만 바꾸면 모든 자리가 따라옵니다)
 * 설명하는 시트를 엽니다(사용자 결정, Figma 프레임 없음).
 *
 * 2026-09-19(사용자 결정, Figma 프레임 없음): 그 버튼을 빼고 —
 *   · 왼쪽 위에 「스팟 · 숙소 · 맛집」 칩(MapLayerChips) — 하나만 골라 그것만 찍습니다. 고현터미널은 늘 찍습니다(모든 코스의 출발 지점).
 *     고른 칩은 주소(`?layer=stay|food`)에 둡니다 — 핀을 눌러 상세로 갔다 뒤로 오면 그 칩 그대로입니다.
 *     숙소 · 맛집은 스팟처럼 핀 + 이름표 + 시트인데, 핀이 원이 아니라 **사진을 통째로 담는 사각 액자**입니다
 *     (공공누리 3유형이라 원으로 자르지 않는다 — mapPins). 사진이 없으면 원에 아이콘.
 *   · 「거제9경이란?」은 오른쪽 아래 **몽꾸**(거제시 캐릭터 — 사용 승인 받음)가 엽니다(MascotButton).
 */

/** 주소의 칩 값 ↔ 칩. 스팟이 기본이라 주소에 적지 않습니다. */
const LAYER_OF_PARAM = { stay: 'STAY', food: 'FOOD' }
const PARAM_OF_LAYER = { STAY: 'stay', FOOD: 'food' }

/** 숙소 · 맛집 → 지도 핀. spotId 는 스팟 poiId 와 섞이지 않게 따로 이름 붙입니다.
    대표 사진은 핀에서 자르지 않는 사각 액자로 그립니다(mapPins — 2026-09-19 사용자). */
function placePin(place) {
  return { ...place, spotId: `place-${place.placeId}`, shortName: place.name, thumbnailUrl: place.imageUrl ?? null }
}
export default function HomePage() {
  const navigate = useNavigate()
  const [result, setResult] = useState({ status: 'loading', spots: [], error: '' })
  // 핀을 누른 스팟. 화면을 옮기지 않고 시트만 올립니다(2026-09-13).
  const [picked, setPicked] = useState(null)
  /* 9경 시트가 열려 있는지는 **주소**(`?nine=1`)에 둡니다. 시트의 9경 이름은 스팟 상세로 가는 링크라,
     상세에서 뒤로 오면 홈이 새로 그려집니다 — 상태를 useState 에 두면 시트가 닫힌 채로 돌아와
     다음 9경을 보려면 버튼부터 다시 눌러야 합니다. 열고 닫을 때는 replace 라 기록이 쌓이지 않습니다. */
  const [searchParams, setSearchParams] = useSearchParams()
  const nineOpen = searchParams.get('nine') === '1'
  // 시트를 닫으면 연 버튼(몽꾸)으로 포커스를 돌려줍니다 — 키보드로 쓰는 사람이 제자리를 잃지 않게.
  const nineButtonRef = useRef(null)
  /* 9경 설명(2026-09-19 사용자) — 몽꾸 말풍선을 누르면 곧장 목록으로 가지 않고, 지도를 아홉 곳에
     맞춰 보여주며 두 번에 나눠 말합니다. 0 이면 꺼짐, 1·2 가 단계입니다.
     주소에 싣지 않습니다 — 설명은 한 번 보는 것이고, 스팟 상세에 갔다 오면 목록(?nine=1)부터가 맞습니다. */
  const [tour, setTour] = useState(0)
  /* 지도를 9경 아홉 곳에만 맞출지. 설명을 시작하면 켜고 **끄지 않습니다** — 끄면 지도가 섬 전체로
     다시 튕겨 나가, 방금 「이 아홉 곳」이라고 가리킨 화면이 사라집니다. */
  const [fitNine, setFitNine] = useState(false)
  const layer = LAYER_OF_PARAM[searchParams.get('layer')] ?? 'SPOT'
  // 숙소 · 맛집 목록 — 그 칩을 처음 누를 때 한 번 받습니다(스팟만 보는 사람에게 TourAPI 호출을 늘리지 않게).
  const [places, setPlaces] = useState({})

  useEffect(() => {
    let cancelled = false
    api
      .pois(true)
      .then(({ pois }) => {
        if (cancelled) return
        // theme이 있는 스팟만 화면에 뜹니다(명사해수욕장 등은 쓸 사진이 없어 빠져 있습니다).
        // 고현터미널(kind TERMINAL, theme 없음)은 모든 코스의 출발 지점이라 함께 찍습니다 —
        // Figma 02-2 `501:213`, 좌표는 서버 V22(TAGO 정류소 '터미널(일반)').
        // MapView는 `spotId`로 핀을 식별하므로 poiId를 그 자리에 넣습니다.
        // nineScenic(몇 경)은 서버 값(nineScenicNo, V28)이고 홈에서만 핀에 붙입니다 —
        // 코스 지도는 코스가 주제라 9경 테두리를 쓰지 않습니다.
        const spots = (pois ?? [])
          .filter((poi) => (poi.theme || poi.kind === 'TERMINAL') && poi.lat != null && poi.lng != null)
          .map((poi) => ({
            ...poi,
            spotId: poi.poiId,
            thumbnailUrl: poi.imageUrl,
            nineScenic: poi.nineScenicNo ?? null,
          }))
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

  /* 부른 적 있는 칩은 ref 로 셉니다 — `places` 를 의존성에 두면 받는 중 상태를 넣는 순간 이펙트가 다시 돌고,
     앞 호출의 정리 함수가 그 응답을 버립니다. 응답은 칩을 바꾼 뒤에 와도 그 칩 자리에 넣습니다(버릴 이유가 없습니다). */
  const requestedRef = useRef(new Set())
  const [retryToken, setRetryToken] = useState(0)
  useEffect(() => {
    if (layer === 'SPOT' || requestedRef.current.has(layer)) return
    requestedRef.current.add(layer)
    api
      .places(layer)
      .then(({ places: items }) => {
        setPlaces((prev) => ({ ...prev, [layer]: { status: 'ready', items: items ?? [] } }))
      })
      .catch((error) => {
        // 빈 지도로 두지 않고 이유를 말합니다(절대규칙 3). 칩을 다시 누르면 다시 받습니다(setLayer).
        requestedRef.current.delete(layer)
        setPlaces((prev) => ({ ...prev, [layer]: { status: 'error', items: [], error: error.message } }))
      })
  }, [layer, retryToken])

  const placeState = layer === 'SPOT' ? null : places[layer]
  const spots = useMemo(() => {
    if (layer === 'SPOT') return result.spots
    const terminal = result.spots.filter((spot) => spot.kind === 'TERMINAL')
    const pins = (placeState?.items ?? []).filter((place) => place.lat != null && place.lng != null).map(placePin)
    return [...terminal, ...pins]
  }, [layer, result.spots, placeState])

  const setLayer = (next) => {
    setPicked(null)
    // 실패한 칩을 다시 누르면 다시 받습니다.
    if (places[next]?.status === 'error') {
      setPlaces((prev) => ({ ...prev, [next]: undefined }))
      setRetryToken((token) => token + 1)
    }
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (PARAM_OF_LAYER[next]) params.set('layer', PARAM_OF_LAYER[next])
        else params.delete('layer')
        return params
      },
      { replace: true },
    )
  }
  // 설명 시트의 9경 줄 → 스팟 상세 링크(몇 경 → poiId). 목록을 받기 전·실패하면 null —
  // 시트가 링크도 「지도에 없음」도 그리지 않습니다(없는 걸 없다고 말하지 않게).
  const nineLinks = useMemo(
    () => (result.status === 'ready' ? poiIdsByNineScenic(result.spots) : null),
    [result.status, result.spots],
  )

  // 설명이 지도를 맞출 아홉 곳(서버 nineScenicNo — 4km 쯤에서 아홉 개가 한 화면에 들어옵니다).
  const nineSpots = useMemo(
    () => result.spots.filter((spot) => spot.nineScenic != null),
    [result.spots],
  )

  /* 설명 시작 — 숙소 · 맛집 칩을 고른 상태면 지도에 9경 핀이 없습니다. 스팟 칩으로 되돌려야
     흐린 화면에 뚫을 동그라미가 생깁니다. */
  const startTour = () => {
    if (layer !== 'SPOT') setLayer('SPOT')
    setFitNine(true)
    setTour(1)
  }

  const setNine = (on) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (on) next.set('nine', '1')
        else next.delete('nine')
        return next
      },
      { replace: true },
    )

  const closeNine = () => {
    setNine(false)
    nineButtonRef.current?.focus()
  }

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
        <div className={styles.mapWrap} style={{ bottom: picked ? peekHeightOf(picked) : 0 }}>
          <MapView
            spots={spots}
            selectedSpotId={picked?.spotId ?? null}
            onSelectSpot={setPicked}
            onDeselect={() => setPicked(null)}
            topReserved={16}
            /* 9경 설명을 시작하면 지도를 **아홉 곳에만** 맞춥니다(2026-09-19 사용자) — 기본 배율에서는
               가까운 핀들이 묶여(+1) 아홉 개가 다 보이지 않습니다. 맞추면 4km 쯤에서 전부 갈라집니다. */
            fitSpots={fitNine ? nineSpots : null}
            /* 말풍선과 몽꾸가 아래를 덮으므로 그만큼 비우고 맞춥니다 — 안 그러면 남쪽 9경(학동 · 바람의언덕 ·
               해금강)이 말풍선 뒤로 숨습니다. fitNine 과 함께 켜고 끄지 않습니다(끄면 지도가 다시 맞춰집니다). */
            /* 250 까지 올리면 아홉 개가 말풍선을 완전히 피하지만 축척이 8km 로 물러납니다 —
               사용자가 4km 를 지정했으므로 200 에서 멈춥니다(2026-09-19 실측). */
            bottomReserved={fitNine ? 200 : 0}
            /* 오른쪽 위 확대·축소 버튼을 빼 둡니다(2026-09-19 사용자) — 두 손가락으로 확대되고,
               지도 위에 뜬 것이 적을수록 지도가 넓어 보입니다. 코스 지도에는 그대로 있습니다. */
            zoomControls={false}
          />
        </div>

        {/* 왼쪽 위 칩 · 오른쪽 아래 몽꾸(2026-09-19). 칩은 옛 「거제9경이란?」 버튼 자리(top · 높이 그대로)입니다.
            시트가 올라오면 '코스 추천 받기'와 같은 이유로 감춥니다 — 지금 할 일은 이 곳을 보는 것이고,
            시트를 끝까지 올리면 시트(z 3)보다 위(z 4)라 상세 위에 떠 버립니다. */}
        {!picked && (
          <div className={styles.layers}>
            <MapLayerChips value={layer} onChange={setLayer} />
            {placeState?.status === 'error' && (
              <p className={styles.layerError} role="status">
                {t(`places.loadFailed.${layer}`, { error: placeState.error })}
              </p>
            )}
          </div>
        )}

        {/* data-nine-mascot — 9경 설명이 흐린 화면에 몽꾸 자리도 뚫습니다(말하는 사람이 흐리면 안 됩니다).
            ⚠️ 이 주석을 아래 `{!picked && (` 괄호 **안**에 두면 안 됩니다 — 거기에는 표현식이 하나만 올 수 있어
            문법이 깨집니다(MyPlansPage 에서 같은 실수를 한 적이 있습니다). */}
        {!picked && (
          <div className={styles.mascot} data-nine-mascot>
            <MascotButton ref={nineButtonRef} onOpen={startTour} />
          </div>
        )}

        {/* 버튼은 지도 위에 떠 있습니다(프레임 이름의 "버튼은 지도 위에 떠 있음").
            시트가 올라오면 감춥니다 — 시트가 덮을 자리이고, 지금 할 일은 이 스팟을 보는 것입니다. */}
        {!picked && (
          <div className={styles.cta}>
            <Button
              className={styles.ctaButton}
              onClick={() => navigate('/courses')}
              data-api="GET /api/courses"
              data-tour="get-courses"
            >
              <Route size={18} strokeWidth={2} aria-hidden="true" />
              {t('home.getCourses')}
            </Button>
          </div>
        )}

        <SpotSheet
          key={picked?.spotId ?? 'none'}
          spot={picked}
          onClose={() => setPicked(null)}
        />
      </div>

      <BottomNav />

      {/* 9경 설명 — 지도를 아홉 곳에 맞춘 채 흐리게 하고 몽꾸가 두 번에 나눠 말합니다.
          끝나면 목록 시트로 넘깁니다(설명은 투어가, 목록·범례는 시트가). */}
      <NineScenicTour
        step={tour}
        onNext={() => setTour(2)}
        onDone={() => {
          setTour(0)
          setNine(true)
        }}
      />

      {/* 탭바까지 덮도록 지도 영역 밖(화면 껍데기 바로 아래)에 둡니다 — 로그인 시트와 같은 자리입니다. */}
      <NineScenicSheet open={nineOpen} onClose={closeNine} links={nineLinks} />
    </Screen>
  )
}
