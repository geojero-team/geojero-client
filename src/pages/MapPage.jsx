import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import ConditionEditor from '../components/ConditionEditor'
import ConditionHeader from '../components/ConditionHeader'
import CourseSheet from '../components/CourseSheet'
import MapView from '../components/MapView'
import Screen from '../components/Screen'
import { fetchCourses } from '../data/mockCourses'
import { defaultTripParams, saveOrigin } from '../lib/tripParams'
import styles from './MapPage.module.css'

/**
 * 조건을 연달아 만질 때(시각 스테퍼 등) 매 탭마다 판정을 부르지 않도록 잠깐 묶습니다.
 * 목 데이터일 땐 티가 안 나지만 실제 API가 붙으면 이게 없으면 요청이 튑니다.
 */
const REJUDGE_DEBOUNCE_MS = 200

/**
 * 지도 화면.
 * 조건을 묻지 않고 기본값으로 이미 판정된 상태에서 시작하고,
 * 상단 칩에서 조건을 고치면 이 화면에서 곧바로 다시 판정합니다.
 */
export default function MapPage() {
  const navigate = useNavigate()

  const [trip, setTrip] = useState(defaultTripParams)
  const [editing, setEditing] = useState(null) // 'origin' | 'date' | 'time' | null
  const [result, setResult] = useState({
    status: 'loading', // 'loading' | 'ready' | 'error'
    data: null,
    error: '',
  })
  const [selectedId, setSelectedId] = useState(null)
  const [sheetHeight, setSheetHeight] = useState(0)

  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(() => {
      fetchCourses(trip)
        .then((data) => {
          if (!cancelled) setResult({ status: 'ready', data, error: '' })
        })
        .catch((error) => {
          if (!cancelled)
            setResult({ status: 'error', data: null, error: error.message })
        })
    }, REJUDGE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trip])

  // 조건이 바뀌면 이전 판정 결과는 더 이상 맞지 않습니다. 열려 있던 코스 카드는 닫고,
  // 지도의 핀은 새 결과가 올 때까지 그대로 두어 화면이 깜빡이지 않게 합니다.
  const updateTrip = useCallback((patch) => {
    if (patch.origin) saveOrigin(patch.origin)
    setSelectedId(null)
    setResult((prev) => ({ ...prev, status: 'loading' }))
    setTrip((prev) => ({ ...prev, ...patch }))
  }, [])

  const courses = useMemo(() => result.data?.courses ?? [], [result.data])
  const selected =
    courses.find((course) => course.courseId === selectedId) ?? null

  const handleSelect = useCallback(
    (course) => setSelectedId(course.courseId),
    [],
  )
  const handleDeselect = useCallback(() => setSelectedId(null), [])

  return (
    <Screen>
      <MapView
        courses={courses}
        selectedId={selectedId}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        bottomInset={selected ? sheetHeight : 0}
      />

      <ConditionHeader trip={trip} onEdit={setEditing} />

      {result.status === 'loading' && result.data && (
        <p className={styles.pending}>다시 판정하는 중</p>
      )}

      {result.status === 'error' && (
        <p className={styles.error}>판정 실패 — {result.error}</p>
      )}

      {selected && (
        <CourseSheet
          course={selected}
          onClose={handleDeselect}
          onOpenDetail={() => navigate(`/courses/${selected.courseId}`)}
          onEditConditions={() => setEditing('time')}
          onHeightChange={setSheetHeight}
        />
      )}

      <ConditionEditor
        field={editing}
        trip={trip}
        onChange={updateTrip}
        onClose={() => setEditing(null)}
      />

      <BottomNav />
    </Screen>
  )
}
