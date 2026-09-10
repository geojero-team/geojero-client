import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { fetchSpotDetail } from '../data/mockPlan'
import { courseImage } from '../lib/courseImage'
import styles from './SpotDetailPage.module.css'

/**
 * 스팟 상세 — Figma 264:227 "스팟 상세 (버튼 '일정에 담기' → 스팟 고르기 · 어디서 열든 같은 판)".
 *
 * 390×754, 탭바 없음(push 화면). hero 260 + body 두 덩어리입니다.
 *
 * 판정 요소가 **없습니다** — 배지도 막차도 소요시간도 근거도 이 프레임엔 그려져 있지
 * 않습니다. 프레임 이름이 이유를 말합니다: 판정은 '일정에 담기'로 스팟 고르기에 보내서
 * 코스 단위로 합니다. 스팟 하나만 두고 성립을 말할 수 없으니 맞는 설계입니다.
 *
 * Figma의 '방문자 사진' 섹션은 넣지 않았습니다 — 노트가 스스로 v2라고 적고 있고,
 * '12장'과 사진 타일 3개는 지금 없는 것을 있는 것처럼 그리게 됩니다.
 */
export default function SpotDetailPage() {
  const { spotId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [spot, setSpot] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSpotDetail(Number(spotId)).then((data) => {
      if (!cancelled) setSpot(data)
    })
    return () => {
      cancelled = true
    }
  }, [spotId])

  // 새 탭으로 바로 열었을 때 뒤로 갈 곳이 없으면 홈으로 보냅니다.
  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  if (!spot) {
    return (
      <Screen data-api="GET /api/pois/{poiId}">
        <p className={styles.pending}>불러오는 중</p>
      </Screen>
    )
  }

  // 사진은 TourAPI 런타임 호출값입니다. 서버는 대표 이미지 한 장(detail.imageUrl)만
  // 내려주므로 장수 칩·인디케이터는 두 장 이상일 때만 띄웁니다 — 없는 장수를 적지 않습니다.
  // 출처 칩도 실제 TourAPI 응답일 때만 답니다(자체 소개문 폴백이면 출처가 다릅니다).
  const photos = spot.photos ?? []
  const hasPhotos = photos.length > 0
  const fromTourApi = spot.overviewSource === 'TourAPI'

  return (
    <Screen data-api="GET /api/pois/{poiId}">
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <img
            className={styles.heroImg}
            src={hasPhotos ? photos[0] : courseImage(spot)}
            alt=""
          />

          <button
            type="button"
            className={styles.back}
            onClick={goBack}
            aria-label="뒤로"
          >
            ‹
          </button>

          {photos.length > 1 && (
            <>
              <span className={styles.countChip}>1 / {photos.length}</span>
              <span className={styles.dots} aria-hidden="true">
                {photos.map((url, index) => (
                  <span
                    key={url}
                    className={index === 0 ? styles.dotOn : styles.dot}
                  />
                ))}
              </span>
            </>
          )}

          {hasPhotos && fromTourApi && (
            <span className={styles.creditChip}>출처 TourAPI</span>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.titleCol}>
            <h1 className={styles.name}>{spot.name}</h1>
            <p className={styles.category}>
              {spot.region} · {spot.category}
            </p>
          </div>

          <Button
            onClick={() => navigate(`/spots/pick?selected=${spot.spotId}`)}
            data-api="GET /api/spots"
          >
            일정에 담기
          </Button>

          {/* 소개는 TourAPI overview 원문입니다. 수정·요약하지 않습니다(저작권).
              서버가 안 떠 있으면 이 덩어리 자체를 그리지 않습니다. */}
          {spot.overview && (
            <section className={styles.intro}>
              <h2 className={styles.introHead}>소개</h2>
              <p className={expanded ? styles.overviewFull : styles.overview}>
                {spot.overview}
              </p>
              {!expanded && (
                <button
                  type="button"
                  className={styles.more}
                  onClick={() => setExpanded(true)}
                >
                  더보기
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </Screen>
  )
}
