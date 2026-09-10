import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { fetchSpotDetail } from '../data/mockPlan'
import { courseImage, onImageError } from '../lib/courseImage'
import {
  carrySearch,
  spotIdsFromSearch,
  tripFromSearch,
  withSearch,
} from '../lib/tripParams'
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
  const [searchParams] = useSearchParams()
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

  /*
   * '일정에 담기'는 **덮어쓰기가 아니라 더하기**입니다.
   *
   * 스팟 고르기에서 넘어왔으면 조건과 이미 고른 스팟이 쿼리에 실려 옵니다. 그걸 그대로
   * 되돌려주고 이 스팟만 뒤에 붙입니다. 전에는 `?selected=이스팟`만 보내서, 바람의언덕을
   * 골라둔 사람이 외도를 담으면 바람의언덕이 사라지고 조건까지 날아갔습니다.
   *
   * 스팟 탭에서 바로 들어온 경우엔 쿼리가 비어 있고, 그때는 조건을 정하라는 화면
   * (Figma 285:419)으로 가는 게 맞습니다.
   */
  const hasConditions = searchParams.has('origin')
  const carriedIds = spotIdsFromSearch(searchParams, 'selected')

  const addToPlan = () => {
    const ids = carriedIds.includes(spot.spotId) ? carriedIds : [...carriedIds, spot.spotId]
    navigate(
      withSearch(
        '/spots/pick',
        carrySearch({
          trip: hasConditions ? tripFromSearch(searchParams) : null,
          hasConditions,
          selectedIds: ids,
        }),
      ),
    )
  }

  if (!spot) {
    return (
      <Screen data-api="GET /api/pois/{poiId}">
        <p className={styles.pending}>{t('spotDetail.loading')}</p>
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
            onError={onImageError(spot)}
          />

          <button
            type="button"
            className={styles.back}
            onClick={goBack}
            aria-label={t('common.back')}
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
            <span className={styles.creditChip}>{t('spotDetail.credit')}</span>
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
            onClick={addToPlan}
            data-api="GET /api/spots"
          >
            {t('spotDetail.addToPlan')}
          </Button>

          {/* 소개는 TourAPI overview 원문입니다. 수정·요약하지 않습니다(저작권).
              서버가 안 떠 있으면 이 덩어리 자체를 그리지 않습니다. */}
          {spot.overview && (
            <section className={styles.intro}>
              <h2 className={styles.introHead}>{t('spotDetail.introHead')}</h2>
              <p className={expanded ? styles.overviewFull : styles.overview}>
                {spot.overview}
              </p>
              {!expanded && (
                <button
                  type="button"
                  className={styles.more}
                  onClick={() => setExpanded(true)}
                >
                  {t('common.more')}
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </Screen>
  )
}
