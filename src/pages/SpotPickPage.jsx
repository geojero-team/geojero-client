import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MAP_PATH } from '../components/BottomNav'
import Button from '../components/Button'
import CategoryBar from '../components/CategoryBar'
import ConditionSheet from '../components/ConditionSheet'
import Screen from '../components/Screen'
import { fetchSpots } from '../data/mockPlan'
import { courseImage } from '../lib/courseImage'
import { defaultTripParams, tripFromSearch, tripToSearch } from '../lib/tripParams'
import styles from './SpotPickPage.module.css'

/**
 * 스팟 고르기 — Figma 233:417(조건 있음 · 다중 선택) / 285:419(조건 없음 · 상세에서 진입).
 *
 * 조건은 URL(?origin=&date=&departTime=&returnBy=)로 받습니다. 홈 CTA는 조건을 붙여 오고,
 * 스팟 상세 '일정에 담기'는 조건 없이 오므로 그때만 점선 pill이 뜹니다.
 * 체크 원 = 선택 토글, 사진·이름·'›' = 스팟 상세 (Figma '체크/사진 분리').
 * 'N곳으로 코스짜기'는 일정 고르기 화면이 생기기 전까지 지도(판정)로 갑니다.
 */

/* Figma 285:419 카드 순서 — 목록 화면(233:378)과 다르며 각 프레임 순서를 그대로 따릅니다. */
const PICK_ORDER = [2, 6, 1, 7, 8, 9, 4, 5]

/** Figma check(선택) — 42×42 내보내기에서 32px 원 기준으로 옮긴 패스 */
function CheckMark({ selected, onToggle, name }) {
  return (
    <button
      type="button"
      className={selected ? `${styles.check} ${styles.checkOn}` : styles.check}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${name} ${selected ? '선택 해제' : '선택'}`}
    >
      {selected && (
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M9.5 16L14.088 21L22.5 11"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

function PickCard({ spot, selected, onToggle, onOpen }) {
  return (
    <div className={selected ? `${styles.card} ${styles.cardOn}` : styles.card}>
      <button type="button" className={styles.cardMain} onClick={() => onOpen(spot)}>
        <div className={styles.photo}>
          <img className={styles.photoImg} src={courseImage(spot)} alt="" />
        </div>
        <div className={styles.info}>
          <span className={styles.col}>
            <span className={styles.name}>{spot.name}</span>
            <span className={styles.meta}>
              {spot.region} · {spot.category}
            </span>
          </span>
          <span className={styles.chevron} aria-hidden="true">
            ›
          </span>
        </div>
      </button>
      <CheckMark selected={selected} onToggle={onToggle} name={spot.name} />
    </div>
  )
}

function parseIds(value) {
  if (!value) return []
  return value.split(',').map(Number).filter(Number.isInteger)
}

export default function SpotPickPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [hasConditions, setHasConditions] = useState(() => searchParams.has('origin'))
  const [trip, setTrip] = useState(() =>
    searchParams.has('origin')
      ? tripFromSearch(searchParams)
      : { ...defaultTripParams(), origin: null },
  )
  const [sheetOpen, setSheetOpen] = useState(false)
  const [theme, setTheme] = useState(null)
  const [selected, setSelected] = useState(() => parseIds(searchParams.get('selected')))
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

  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  const toggle = (spotId) =>
    setSelected((prev) =>
      prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId],
    )

  const ordered = PICK_ORDER.map((id) => result.spots.find((spot) => spot.spotId === id))
    .filter(Boolean)
    .filter((spot) => !theme || spot.theme === theme)
  const chips = selected
    .map((id) => result.spots.find((spot) => spot.spotId === id))
    .filter(Boolean)

  const submit = () => {
    if (!hasConditions) {
      setSheetOpen(true)
      return
    }
    navigate(`${MAP_PATH}?${tripToSearch(trip, { spots: selected.join(',') })}`)
  }

  return (
    <Screen data-api="GET /api/spots">
      <div className={styles.body}>
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={goBack} aria-label="뒤로">
            ‹
          </button>
          <h1 className={styles.title}>스팟 고르기</h1>
        </header>

        <h2 className={styles.headline}>
          방문하시고 싶은 곳을
          <br />
          선택해주세요.
        </h2>
        <p className={styles.sub}>여러 곳도 가능해요</p>

        {!hasConditions && (
          <button type="button" className={styles.pill} onClick={() => setSheetOpen(true)}>
            <span className={styles.pillText}>출발지 · 출발 시간을 정해주세요</span>
            <span aria-hidden="true">›</span>
          </button>
        )}

        <CategoryBar value={theme} onChange={setTheme} />

        {result.status === 'error' ? (
          <p className={styles.notice}>불러오지 못했습니다 — {result.error}</p>
        ) : result.status === 'loading' ? (
          <p className={styles.notice}>스팟을 불러오는 중</p>
        ) : (
          <div className={styles.grid}>
            {ordered.map((spot) => (
              <PickCard
                key={spot.spotId}
                spot={spot}
                selected={selected.includes(spot.spotId)}
                onToggle={() => toggle(spot.spotId)}
                onOpen={({ spotId }) => navigate(`/spots/${spotId}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* selection-bar (고정) — Figma 285:515 */}
      <div className={styles.bar}>
        <div className={styles.chips}>
          {chips.map((spot) => (
            <button
              key={spot.spotId}
              type="button"
              className={styles.chip}
              onClick={() => toggle(spot.spotId)}
              aria-label={`${spot.name} 빼기`}
            >
              <span className={styles.chipName}>{spot.name}</span>
              <span className={styles.chipX} aria-hidden="true">
                ×
              </span>
            </button>
          ))}
        </div>
        {/* 0곳 상태 문구는 Figma에 없음([미확인]) */}
        <Button onClick={submit} disabled={selected.length === 0}>
          {selected.length > 0 ? `${selected.length}곳으로 코스짜기` : '스팟을 골라주세요'}
        </Button>
      </div>

      <ConditionSheet
        open={sheetOpen}
        trip={trip}
        onClose={() => setSheetOpen(false)}
        onSubmit={(next) => {
          setTrip(next)
          setHasConditions(true)
          setSheetOpen(false)
        }}
      />
    </Screen>
  )
}
