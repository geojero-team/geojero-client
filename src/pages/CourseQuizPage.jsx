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
 * 성향으로 코스 찾기 — 질문 셋에 답하면 33개 코스 중 맞는 것을 골라 줍니다(2026-09-20 사용자). Figma 프레임 없음.
 *
 * 코스 추천 목록(CoursesPage)과 나란히 있는 **다른 길**입니다. 목록은 이미 뭘 볼지 아는 사람이 고르는 곳이고,
 * 여기는 「거제 처음인데 뭘 봐야 하지」에 답하는 곳입니다. 그래서 목록을 대신하지 않고 목록 위에 입구만 둡니다.
 * 화면 제목도 「코스 추천」으로 같습니다 — 같은 일을 다른 길로 하는 것이라 이름이 갈리면 다른 기능처럼 보입니다.
 *
 * 서버를 새로 만들지 않았습니다 — 점수에 필요한 값(분류 · 시간 · 9경 수 · 배)이 `/api/courses` 에 이미 다 옵니다.
 * 대표 10개가 아니라 **전량**을 받아 문구가 있는 코스(quizPool)에서 고릅니다.
 *
 * 결과에서 고른 코스는 **코스 추천 목록과 같은 길**로 넘깁니다(2026-09-20 사용자) —
 * 「코스 N개 선택하기」 → `/course-map?courses=…` → 지도에서 비교 → 코스 상세. 여기서만 곧장 상세로 보내면
 * 같은 앱에 코스로 들어가는 길이 둘이 됩니다. 1등은 미리 골라 둡니다(가장 잘 맞는 코스라 그대로 넘기면 한 번 덜 누릅니다).
 *
 * 질문 화면 모양은 사용자가 준 참고 그림(personalizedreference.jpeg)을 따릅니다 —
 * 회색 바탕 · 흰 카드 선지 · 오른쪽 체크 동그라미 · 큰 질문 제목. 색만 우리 파랑입니다.
 * 고른 뒤 **「다음」을 눌러** 넘어갑니다(2026-09-20 사용자 — 참고 그림과 같게). 고르자마자 넘어가면
 * 잘못 눌렀을 때 되돌릴 틈이 없고, 무엇을 골랐는지 확인할 새도 없습니다.
 */

/** 질문에 답하는 중이면 그 번호(1~3), 다 답했으면 'result'. */
const RESULT = 'result'

/** 고름 표시 — 코스 추천 목록과 같은 32px 원(CoursesPage 의 Check 와 같은 모양). */
function Check({ on }) {
  return (
    <span className={on ? `${styles.check} ${styles.checkOn}` : styles.check} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/**
 * 결과 카드 — 사진 · 제목 · 스팟 순서 · 고른 이유 · 고름 표시.
 * 후보(compact)는 사진을 낮게 깔아 1등과 크기로 구분합니다 — 사진 자체는 셋 다 있습니다(2026-09-20 사용자).
 */
function ResultCard({ entry, photoUrl, selected, onToggle, compact = false }) {
  const { course, reasons } = entry
  const names = course.spots.map((spot) => spot.shortName)
  const title = courseTitle(course.title, names) ?? names[0]

  return (
    <button
      type="button"
      className={[styles.card, compact ? styles.cardCompact : '', selected ? styles.cardOn : ''].filter(Boolean).join(' ')}
      onClick={() => onToggle(course.courseId)}
      aria-pressed={selected}
      data-course={course.courseId}
    >
      <span className={styles.hero}>
        {photoUrl ? (
          /* alt="" — 장식입니다. 버튼 이름은 제목과 스팟 줄이 말합니다. */
          <img className={styles.heroImg} src={photoUrl} alt="" />
        ) : (
          <span className={styles.noPhoto}>{t('courses.noPhoto')}</span>
        )}
      </span>
      <span className={styles.cardBody}>
        <span className={styles.titleRow}>
          <span className={styles.cardTitle}>{title}</span>
          <Check on={selected} />
        </span>
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
  /* 결과에서 고른 코스들. **null 이면 아직 손대지 않았다**는 뜻이고, 그때는 1등이 골라진 것으로 칩니다 —
     가장 잘 맞는 코스라 그대로 넘기려는 사람이 한 번 덜 누릅니다. 효과로 넣지 않습니다(고름을 뗀 순간
     효과가 다시 넣어 버립니다). 답을 바꾸면(다시 찾아보기) 다시 null 입니다. */
  const [picked, setPicked] = useState(null)

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

  const ranked = step === RESULT ? rankCourses(result.courses, answers) : []
  const [best, ...rest] = ranked
  const others = rest.slice(0, 2)
  // 사진은 보이는 카드 순서대로 정합니다 — 1등과 후보가 같은 사진을 쓰지 않게(목록 카드와 같은 규칙).
  const photos = heroPhotos(ranked.slice(0, 3).map((entry) => entry.course))

  // 고르기만 합니다 — 넘어가는 건 아래 「다음」 버튼입니다(2026-09-20 사용자).
  const pick = (questionId, optionId) => setAnswers((prev) => ({ ...prev, [questionId]: optionId }))

  const goNext = () => setStep((prev) => (prev >= QUESTIONS.length ? RESULT : prev + 1))

  const restart = () => {
    setAnswers({})
    setPicked(null)
    setStep(1)
  }

  const selected = picked ?? new Set(best ? [best.course.courseId] : [])

  const toggle = (courseId) => {
    const next = new Set(selected)
    if (next.has(courseId)) next.delete(courseId)
    else next.add(courseId)
    setPicked(next)
  }

  // 코스 추천 목록과 같은 길 — 고른 코스들을 지도로 넘깁니다. 순서는 누른 순서가 아니라 카드 순서입니다.
  const openMap = () => {
    const ids = ranked.filter((entry) => selected.has(entry.course.courseId)).map((entry) => entry.course.courseId)
    navigate(`/course-map?courses=${ids.join(',')}`)
  }

  const question = step === RESULT ? null : QUESTIONS[step - 1]

  return (
    <Screen data-api="GET /api/courses">
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack} aria-label={t('common.back')}>
          <ChevronLeft size={24} strokeWidth={2} aria-hidden="true" />
        </button>
        <h1 className={styles.title}>{t('courseQuiz.title')}</h1>
      </header>

      <div className={styles.scroll}>
        <div className={question ? `${styles.body} ${styles.bodyAsk}` : styles.body}>
          {result.status === 'error' ? (
            <p className={styles.notice}>{t('common.loadFailed', { error: result.error })}</p>
          ) : question ? (
            <>
              {/* 몇 번째 질문인지 — 헤더가 아니라 질문 바로 위입니다(2026-09-20 사용자). 결과에는 없습니다. */}
              <p className={styles.step}>{t('courseQuiz.step', { n: step, total: QUESTIONS.length })}</p>
              <h2 className={styles.question}>{t(`courseQuiz.q.${question.id}`)}</h2>
              <div className={styles.options}>
                {question.options.map((optionId) => {
                  const on = answers[question.id] === optionId
                  return (
                    <button
                      key={optionId}
                      type="button"
                      className={on ? `${styles.option} ${styles.optionOn}` : styles.option}
                      onClick={() => pick(question.id, optionId)}
                      aria-pressed={on}
                    >
                      <span className={styles.optionText}>
                        <span className={styles.optionLabel}>{t(`courseQuiz.opt.${question.id}.${optionId}`)}</span>
                        {/* 설명 줄이 없는 질문도 있습니다(2번 — QUESTIONS 의 hint). */}
                        {question.hint && (
                          <span className={styles.optionHint}>{t(`courseQuiz.hint.${question.id}.${optionId}`)}</span>
                        )}
                      </span>
                      <Check on={on} />
                    </button>
                  )
                })}
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
                selected={selected.has(best.course.courseId)}
                onToggle={toggle}
              />
              {others.length > 0 && (
                <>
                  <p className={styles.othersTitle}>{t('courseQuiz.others')}</p>
                  <div className={styles.others}>
                    {others.map((entry, i) => (
                      <ResultCard
                        key={entry.course.courseId}
                        entry={entry}
                        photoUrl={photos[i + 1]}
                        selected={selected.has(entry.course.courseId)}
                        onToggle={toggle}
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

      {/* 하단 고정 바 — 질문 중에는 「다음」, 결과에서는 코스 추천 목록과 같은 「코스 N개 선택하기」(2026-09-20 사용자).
          고른 게 없으면 「다음」은 눌리지 않습니다 — 버튼을 숨기지 않습니다(자리가 사라지면 화면이 들썩입니다). */}
      {question && result.status !== 'error' && (
        <div className={styles.bar}>
          <Button
            variant={answers[question.id] ? 'primary' : 'disabled'}
            disabled={!answers[question.id]}
            onClick={goNext}
          >
            {t('courseQuiz.next')}
          </Button>
        </div>
      )}
      {step === RESULT && selected.size > 0 && (
        <div className={styles.bar}>
          <Button onClick={openMap}>{t('courses.selectN', { count: selected.size })}</Button>
        </div>
      )}
    </Screen>
  )
}
