import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Screen from '../components/Screen'
import { t } from '../i18n'
import { api } from '../lib/api'
import { heroPhotos } from '../lib/courseHero'
import { QUESTIONS, rankCourses } from '../lib/courseQuiz'
import { courseTitle } from '../lib/courseTitle'
import { formatDuration } from '../lib/format'
import { loadSpotPhotos, withPhotos } from '../lib/spots'
import styles from './CourseQuizPage.module.css'

/**
 * 성향으로 코스 찾기 — 질문 셋에 답하면 코스 하나를 골라 줍니다(2026-09-20 사용자). Figma 프레임 없음.
 *
 * 코스 추천 목록(CoursesPage)과 나란히 있는 **다른 길**입니다. 목록은 이미 뭘 볼지 아는 사람이 고르는 곳이고,
 * 여기는 「거제 처음인데 뭘 봐야 하지」에 답하는 곳입니다. 그래서 목록을 대신하지 않고 목록 위에 입구만 둡니다.
 *
 * 서버를 새로 만들지 않았습니다 — 점수에 필요한 값(분류 · 시간 · 9경 수 · 배)이 `/api/courses` 에 이미 다 옵니다.
 * 대표 10개가 아니라 **전량**을 받아 문구가 있는 코스(quizPool)에서 고릅니다. 10개만 보면 답 조합 48가지에
 * 코스가 10개뿐이라 무엇을 눌러도 같은 코스가 나옵니다.
 *
 * 결과는 **하나만** 던지지 않습니다 — 1등 + 왜 골랐는지 + 다른 후보 둘입니다. 이유가 없으면 왜 이게 나왔는지
 * 알 수 없어 믿기 어렵고, 후보가 없으면 취향이 살짝 다를 때 되돌아갈 곳이 없습니다.
 */

/** 질문에 답하는 중이면 그 번호(1~3), 다 답했으면 'result'. */
const RESULT = 'result'

/** 결과 카드 — 사진 · 제목 · 스팟 순서 · 이유. 목록 카드(CoursesPage)와 달리 고름 표시가 없습니다(고르는 화면이 아닙니다). */
function ResultCard({ entry, photoUrl, onOpen, compact = false }) {
  const { course, reasons } = entry
  const names = course.spots.map((spot) => spot.shortName)
  const title = courseTitle(course.title, names) ?? names[0]

  return (
    <button
      type="button"
      className={compact ? `${styles.card} ${styles.cardCompact}` : styles.card}
      onClick={() => onOpen(course.courseId)}
      data-course={course.courseId}
    >
      {!compact && (
        <span className={styles.hero}>
          {photoUrl ? (
            /* alt="" — 장식입니다. 버튼 이름은 제목과 스팟 줄이 말합니다. */
            <img className={styles.heroImg} src={photoUrl} alt="" />
          ) : (
            <span className={styles.noPhoto}>{t('courses.noPhoto')}</span>
          )}
        </span>
      )}
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.chain}>{names.join(' → ')}</span>
        {/* 왜 이 코스인지 — 서버 값 그대로입니다(lib/courseQuiz). 점수가 0이면 이유가 없어 줄 자체를 그리지 않습니다. */}
        {reasons.length > 0 && (
          <span className={styles.reasons}>
            {reasons.map((reason) => (
              <span key={reason} className={styles.reason}>
                {reason}
              </span>
            ))}
          </span>
        )}
        <span className={styles.tag}>{t('courses.tagBus', { time: formatDuration(course.busMinTotal) })}</span>
      </span>
    </button>
  )
}

export default function CourseQuizPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState({ status: 'loading', courses: [], error: '' })

  useEffect(() => {
    let cancelled = false
    // 대표 10개가 아니라 전량입니다. 사진은 목록 카드와 같은 곳에서 옵니다(/api/pois 캐시 — 호출은 한 번).
    Promise.all([api.courses(), loadSpotPhotos()])
      .then(([data, photos]) => {
        if (cancelled) return
        const courses = (data.courses ?? []).map((course) => ({
          ...course,
          spots: withPhotos(course.spots, photos),
        }))
        setResult({ status: 'ready', courses, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setResult({ status: 'error', courses: [], error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* 뒤로 — 질문 중이면 앞 질문으로, 첫 질문이거나 결과면 화면을 떠납니다.
     바로 연 화면이면(앞 기록이 없으면) 코스 목록으로(CoursesPage 와 같은 함정 — location.key 로는 가를 수 없습니다). */
  const goBack = () => {
    if (step !== RESULT && step > 1) {
      setStep(step - 1)
      return
    }
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/courses', { replace: true })
  }

  const pick = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    setStep((prev) => (prev >= QUESTIONS.length ? RESULT : prev + 1))
  }

  const restart = () => {
    setAnswers({})
    setStep(1)
  }

  const ranked = step === RESULT ? rankCourses(result.courses, answers) : []
  const [best, ...rest] = ranked
  const others = rest.slice(0, 2)
  // 사진은 보이는 카드 순서대로 정합니다 — 1등과 후보가 같은 사진을 쓰지 않게(목록 카드와 같은 규칙).
  const photos = heroPhotos(ranked.slice(0, 3).map((entry) => entry.course))

  const question = step === RESULT ? null : QUESTIONS[step - 1]

  return (
    <Screen data-api="GET /api/courses">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack} aria-label={t('common.back')}>
          <ChevronLeft size={24} strokeWidth={2} aria-hidden="true" />
        </button>
        <h1 className={styles.title}>{t('courseQuiz.title')}</h1>
        {/* 몇 번째 질문인지 — 세 개 중 어디쯤인지 모르면 그만두고 싶어집니다. 결과에는 없습니다. */}
        {question && (
          <span className={styles.step}>{t('courseQuiz.step', { n: step, total: QUESTIONS.length })}</span>
        )}
      </header>

      <div className={styles.scroll}>
        <div className={styles.body}>
          {result.status === 'error' ? (
            <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
          ) : question ? (
            <>
              <h2 className={styles.question}>{t(`courseQuiz.q.${question.id}`)}</h2>
              <div className={styles.options}>
                {question.options.map((optionId) => (
                  <button
                    key={optionId}
                    type="button"
                    className={answers[question.id] === optionId ? `${styles.option} ${styles.optionOn}` : styles.option}
                    onClick={() => pick(question.id, optionId)}
                    aria-pressed={answers[question.id] === optionId}
                  >
                    <span className={styles.optionLabel}>{t(`courseQuiz.opt.${question.id}.${optionId}`)}</span>
                    <span className={styles.optionHint}>{t(`courseQuiz.hint.${question.id}.${optionId}`)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : result.status === 'loading' ? (
            <p className={styles.notice}>{t('courses.loading')}</p>
          ) : !best ? (
            <p className={styles.notice}>{t('courses.empty')}</p>
          ) : (
            <>
              <h2 className={styles.question}>{t('courseQuiz.resultTitle')}</h2>
              {/* 점수가 0이면 답과 겹치는 데가 한 곳도 없다는 뜻입니다 — 그 사실을 감추지 않습니다. */}
              {best.score === 0 && <p className={styles.weak}>{t('courseQuiz.weakMatch')}</p>}
              <ResultCard
                entry={best}
                photoUrl={photos[0]}
                onOpen={(courseId) => navigate(`/courses/${courseId}`)}
              />
              {others.length > 0 && (
                <>
                  <p className={styles.othersTitle}>{t('courseQuiz.others')}</p>
                  <div className={styles.others}>
                    {others.map((entry) => (
                      <ResultCard
                        key={entry.course.courseId}
                        entry={entry}
                        onOpen={(courseId) => navigate(`/courses/${courseId}`)}
                        compact
                      />
                    ))}
                  </div>
                </>
              )}
              <button type="button" className={styles.again} onClick={restart}>
                {t('courseQuiz.again')}
              </button>
            </>
          )}
        </div>
      </div>

      {step === RESULT && best && (
        <div className={styles.bar}>
          <Button onClick={() => navigate(`/courses/${best.course.courseId}`)}>{t('courseQuiz.open')}</Button>
        </div>
      )}
    </Screen>
  )
}
