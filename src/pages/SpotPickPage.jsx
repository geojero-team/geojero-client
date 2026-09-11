import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import CategoryBar from '../components/CategoryBar'
import ConditionSheet from '../components/ConditionSheet'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { fetchSpots } from '../data/mockPlan'
import { courseImage, onImageError } from '../lib/courseImage'
import {
  carrySearch,
  defaultTripParams,
  parseSpotIds,
  tripFromSearch,
  tripToSearch,
  withSearch,
} from '../lib/tripParams'
import styles from './SpotPickPage.module.css'

/**
 * 스팟 고르기 — Figma 233:417(조건 있음 · 다중 선택) / 285:419(조건 없음 · 상세에서 진입).
 *
 * 조건은 URL(?origin=&date=&departTime=&returnBy=)로 받습니다. 홈 CTA는 조건을 붙여 오고,
 * 스팟 상세 '일정에 담기'는 조건 없이 오므로 그때만 점선 pill이 뜹니다.
 * 체크 원 = 선택 토글, 사진·이름·'›' = 스팟 상세 (Figma '체크/사진 분리').
 * 'N곳으로 코스짜기' → 일정 고르기(/plan). 조건과 고른 스팟은 쿼리로 넘깁니다.
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
      aria-label={t(selected ? 'pick.deselectAria' : 'pick.selectAria', { name })}
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
          <img className={styles.photoImg} src={courseImage(spot)} alt="" onError={onImageError(spot)} />
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

export default function SpotPickPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [hasConditions, setHasConditions] = useState(() => searchParams.has('origin'))
  const [trip, setTrip] = useState(() =>
    searchParams.has('origin')
      ? tripFromSearch(searchParams)
      : { ...defaultTripParams(), origin: null },
  )
  const [sheetOpen, setSheetOpen] = useState(false)
  const [theme, setTheme] = useState(null)
  /* 고른 스팟은 state가 아니라 **URL에서 읽습니다**.
     state로 들고 있으면 URL을 되쓰기만 하고 되읽지는 않게 되어, 뒤로가기로 이전 URL에
     돌아와도 체크는 그대로 남고 오히려 URL이 현재 state로 덮어써집니다 — 뒤로가기를 눌러도
     아무 일도 안 일어난 것처럼 보입니다. 기억이 URL 하나라면 읽기도 URL이어야 합니다. */
  const selectedParam = searchParams.get('selected') ?? ''
  const selected = useMemo(() => parseSpotIds(selectedParam), [selectedParam])
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

  /*
   * 체크와 조건을 URL에 되씁니다.
   *
   * 이 화면의 기억은 URL 하나뿐입니다 — 고른 스팟을 담아둘 저장소도 Context도 없습니다.
   * state에만 두면 새로고침하면 체크가 날아가고, 일정 고르기에서 브라우저 뒤로가기로
   * 돌아와도 빈 화면이 됩니다. 조건 시트로 정한 조건도 마찬가지입니다.
   *
   * replace라서 체크할 때마다 뒤로가기 스택이 쌓이지는 않습니다.
   * 쿼리가 이미 같으면 쓰지 않습니다 — 안 그러면 되쓰기가 스스로를 다시 불러 무한 루프가 됩니다.
   */
  const canonicalSearch = carrySearch({ trip, hasConditions, selectedIds: selected })

  useEffect(() => {
    if (canonicalSearch !== searchParams.toString()) {
      setSearchParams(canonicalSearch, { replace: true })
    }
  }, [canonicalSearch, searchParams, setSearchParams])

  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  /* 체크도 URL에 씁니다. replace라서 체크할 때마다 뒤로가기 스택이 쌓이지는 않습니다. */
  const toggle = (spotId) => {
    const next = selected.includes(spotId)
      ? selected.filter((id) => id !== spotId)
      : [...selected, spotId]
    setSearchParams(carrySearch({ trip, hasConditions, selectedIds: next }), { replace: true })
  }

  // 상세를 다녀와도 조건과 고른 스팟이 남아야 합니다 — 상세의 '일정에 담기'가 이걸 그대로
  // 되돌려줍니다. 안 실어 보내면 돌아올 때 조건이 없는 화면이 되고 선택도 사라집니다.
  const openDetail = ({ spotId }) => navigate(withSearch(`/spots/${spotId}`, canonicalSearch))

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
    navigate(`/plan?${tripToSearch(trip, { spots: selected.join(',') })}`)
  }

  return (
    <Screen data-api="GET /api/spots">
      <div className={styles.body}>
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={goBack} aria-label={t('common.back')}>
            ‹
          </button>
          <h1 className={styles.title}>{t('pick.title')}</h1>
        </header>

        <h2 className={styles.headline}>
          {t('pick.headline1')}
          <br />
          {t('pick.headline2')}
        </h2>
        <p className={styles.sub}>{t('pick.sub')}</p>

        {!hasConditions && (
          <button type="button" className={styles.pill} onClick={() => setSheetOpen(true)}>
            <span className={styles.pillText}>{t('pick.needConditions')}</span>
            <span aria-hidden="true">›</span>
          </button>
        )}

        <CategoryBar value={theme} onChange={setTheme} />

        {result.status === 'error' ? (
          <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
        ) : result.status === 'loading' ? (
          <p className={styles.notice}>{t('spots.loading')}</p>
        ) : (
          <div className={styles.grid}>
            {ordered.map((spot) => (
              <PickCard
                key={spot.spotId}
                spot={spot}
                selected={selected.includes(spot.spotId)}
                onToggle={() => toggle(spot.spotId)}
                onOpen={openDetail}
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
              aria-label={t('pick.chipRemoveAria', { name: spot.name })}
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
          {selected.length > 0
            ? t('pick.submit', { count: selected.length })
            : t('pick.submitEmpty')}
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
