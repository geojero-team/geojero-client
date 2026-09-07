import { useParams } from 'react-router-dom'
import PlaceholderScreen from '../components/PlaceholderScreen'
import { findMockCourse } from '../data/mockCourses'

/** ③ 코스 상세 — 역산 타임라인. 라우팅만 먼저 연결해둔 자리표시자입니다. */
export default function CourseDetailPage() {
  const { courseId } = useParams()
  const course = findMockCourse(Number(courseId))

  return (
    <PlaceholderScreen
      title={course?.name ?? '코스 상세'}
      lead="역산 타임라인은 다음 작업입니다. 하단 막차 앵커를 고정하고 그 위로 일정 블록을 쌓는 화면이 들어옵니다."
      items={[
        '상단 — 이동 시간 / 체류 시간 / 예상 요금',
        '타임라인 — MOVE · VISIT · MEAL 블록',
        '점선 여백 — 버퍼(늦어도 되는 시간)',
        '하단 고정 앵커 — 부산행 막차 / 유람선 막배',
      ]}
    />
  )
}
