import { Bus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import mongkkuArmRest from '../assets/mongkku-arm-rest.png'
import mongkkuBody from '../assets/mongkku-body.png'
import { t } from '../i18n'
import { api } from '../lib/api'
import { formatMonthDay } from '../lib/format'
import { NINE_TASTES } from '../lib/nineTastes'
import { useSheetDismiss } from '../lib/useSheetDismiss'
import styles from './GuideSheet.module.css'

/** 시트 제목의 id — 목록이든 답이든 지금 보이는 제목 하나가 이 id 를 갖고, dialog 이름이 그것을 따라간다. */
const TITLE_ID = 'guide-title'
const TODAY_TITLE_ID = 'guide-today-title'

/**
 * 몽꾸 시트 — 몽꾸가 여행 가이드가 됩니다(2026-09-21 사용자 결정, Figma 프레임 없음 — 디자인브리프 부록 M 「몽꾸 가이드」).
 *
 * 전에는 몽꾸 말풍선이 「거제 9경이 뭘까?」 하나였고 누르면 곧장 9경 설명이었습니다. 이제 말풍선(「안녕, 난 몽꾸야! 거제는 나한테 물어봐」)을
 * 누르면 이 시트가 뜨고, 위에 **오늘의 거제** 카드, 아래에 **질문 셋**이 있습니다.
 *
 *   · 챗봇이 아니라 **가이드**입니다 — 입력창이 없고 질문을 고릅니다. 「물어봐」라고 써도 입력창을 약속하지 않는 건
 *     바로 아래 질문 카드가 있어서입니다(레퍼런스: Lovi 「Hi! I'm Lóvi, a skincare guru」 + 질문 칩, Shopee 초키 「주제를 골라 주세요」)
 *   · 「거제 9경이 뭐야?」는 여기서 답하지 않습니다 — 시트를 닫고 **지금 흐름 그대로**(지도 흐림 · 두 마디 설명 · 9경 목록 시트)로
 *     넘깁니다(onNineScenic). 사용자: 「새 페이지 들어가서 눌러도 똑같이 떠야 한다」. 9경 설명은 지도 위에서 하는 것이라 시트 안에 못 담습니다
 *   · 「거제 9미는 뭐야?」 「왜 고현터미널에서 시작해?」는 **같은 시트 안에서 답으로 바뀌고 ‹ 로 목록**에 돌아옵니다.
 *     폰 뒤로가기 · ✕ · 바깥 탭은 시트를 통째로 닫습니다(지도 시트와 같은 규칙 — 홈이 useSheetHistory 로 잇습니다)
 *   · 「오늘의 거제」는 **AI 가 아니라 규칙 문장**입니다 — 값은 전부 API 원문(lib/todayGeoje 의 summarizeToday)이고 여기서는 문장으로 옮기기만 합니다.
 *     LLM 을 런타임에 부르면 숫자를 지어낼 수 있어 절대규칙 1 에 걸립니다. 날씨 · 혼잡 · 운영시간은 원천이 없어 말하지 않습니다
 *
 * 모양은 9경 시트(NineScenicSheet)와 같은 틀입니다 — 스크림 · 손잡이(끌어내리면 닫힘) · 같은 z 순서 · 등장 동작 없음.
 *
 *   today  홈이 useTodayGeoje(open) 로 만든 값 { status: 'idle'|'loading'|'ready', date, summary }
 */
export default function GuideSheet({ open, onClose, onNineScenic, today }) {
  const { handleProps, sheetStyle } = useSheetDismiss(onClose)
  // 부모가 onClose 를 매번 새로 만들어도 아래 이펙트가 다시 돌지 않게 ref 로 읽습니다(NineScenicSheet 와 같은 이유).
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <>
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label={t('common.close')} />

      <section
        className={styles.sheet}
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
      >
        <div className={styles.handleRow} {...handleProps}>
          <span className={styles.handle} aria-hidden="true" />
        </div>
        {/* 열릴 때마다 목록부터 — 답을 보다 닫았다 다시 열면 목록이어야 합니다. 상태를 여기(열려 있을 때만 있는 자식)에 두면
            닫힐 때 같이 사라져 되돌릴 일이 없습니다. */}
        <GuideBody onNineScenic={onNineScenic} today={today} />
      </section>
    </>
  )
}

function GuideBody({ onNineScenic, today }) {
  const [page, setPage] = useState('home')
  const titleRef = useRef(null)

  // 목록이든 답이든 바뀔 때마다 제목에 포커스 — 화면 읽기 프로그램이 무엇이 열렸는지 먼저 읽습니다.
  useEffect(() => {
    titleRef.current?.focus()
  }, [page])

  if (page === 'taste') return <TastePage titleRef={titleRef} onBack={() => setPage('home')} />
  if (page === 'terminal') return <TerminalPage titleRef={titleRef} onBack={() => setPage('home')} />

  return (
    <>
      <header className={styles.head}>
        {/* 몽꾸 — 말풍선의 그 캐릭터가 시트 안에서도 말합니다. 몸 · 평소 팔 두 장을 겹칩니다(MascotButton · CoursesPage 와 같은 방식 —
            몸 그림은 든 팔을 떼어 낸 것이라 혼자 쓰면 한쪽 팔이 없습니다). 장식이라 읽기 도구에서 뺍니다. */}
        <span className={styles.mascot} aria-hidden="true">
          <img className={styles.mascotLayer} src={mongkkuArmRest} alt="" draggable="false" />
          <img className={styles.mascotLayer} src={mongkkuBody} alt="" draggable="false" />
        </span>
        <h2 id={TITLE_ID} ref={titleRef} tabIndex={-1} className={styles.title}>
          {t('guide.title')}
        </h2>
      </header>

      <TodayCard today={today} />

      <ul className={styles.questions}>
        <li>
          <button type="button" className={styles.question} onClick={onNineScenic}>
            <span>{t('guide.q.nineScenic')}</span>
            <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
          </button>
        </li>
        <li>
          <button type="button" className={styles.question} onClick={() => setPage('taste')}>
            <span>{t('guide.q.nineTaste')}</span>
            <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
          </button>
        </li>
        <li>
          <button type="button" className={styles.question} onClick={() => setPage('terminal')}>
            <span>{t('guide.q.terminal')}</span>
            <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
          </button>
        </li>
      </ul>
    </>
  )
}

/** 요일 줄 — 「휴일이니까 쉰다」가 아니라 그날 남부1 시간표에 편이 있는지(southBusRuns)로 갈립니다. */
function dayLine(day) {
  if (day.kind === 'WEEKDAY') return t('guide.today.day.WEEKDAY')
  if (day.kind === 'HOLIDAY') return t(day.southBusRuns ? 'guide.today.day.HOLIDAY_BUS' : 'guide.today.day.HOLIDAY_NO_BUS')
  return t('guide.today.day.UNKNOWN')
}

/** 운영상태 줄 — 알림마다 한 줄, 사유는 /api/alerts 원문 그대로. 없음(NONE)과 못 받음(UNKNOWN)은 다른 답입니다. */
function alertLines(alerts) {
  if (alerts.kind === 'NONE') return [t('guide.today.alerts.none')]
  if (alerts.kind === 'SOME') {
    return alerts.items.map((item) =>
      t(`guide.today.alerts.${item.kind}`, { targets: item.targets.join(' · '), reason: item.reason }),
    )
  }
  return [t('guide.today.alerts.unknown')]
}

function TodayCard({ today }) {
  const ready = today.status === 'ready'
  return (
    <section className={styles.today} aria-labelledby={TODAY_TITLE_ID}>
      <div className={styles.todayHead}>
        <h3 id={TODAY_TITLE_ID} className={styles.todayTitle}>
          {t('guide.today.title')}
        </h3>
        {today.date && <span className={styles.todayDate}>{formatMonthDay(today.date)}</span>}
      </div>
      {ready ? (
        <>
          <ul className={styles.todayLines}>
            <li>{dayLine(today.summary.day)}</li>
            {alertLines(today.summary.alerts).map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>{t(`guide.today.ferry.${today.summary.ferry.kind}`, today.summary.ferry)}</li>
          </ul>
          <p className={styles.todaySource}>
            {today.summary.source.dataVersion
              ? t('guide.today.source', { dataVersion: today.summary.source.dataVersion })
              : t('guide.today.sourceNoVersion')}
          </p>
        </>
      ) : (
        <p className={styles.todayLoading} role="status">
          {t('guide.today.loading')}
        </p>
      )}
    </section>
  )
}

function PageHead({ titleRef, onBack, title }) {
  return (
    <header className={styles.pageHead}>
      <button type="button" className={styles.back} onClick={onBack} aria-label={t('guide.back')}>
        <ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <h2 id={TITLE_ID} ref={titleRef} tabIndex={-1} className={styles.title}>
        {title}
      </h2>
    </header>
  )
}

/**
 * 9미 답 — 아홉 음식(이름 · 제철은 거제시 원문, lib/nineTastes)마다 우리 맛집 중 그 미를 내는 곳을 잇습니다.
 * 어느 가게가 어느 미인지는 서버가 줍니다(/api/places nineTasteNos, V47). 못 채운 미는 숨기지 않고 「원문에 등록된 곳이 없어요」 —
 * 숨기면 「9미인데 왜 다섯 줄이지」가 되고, 빈칸으로 두면 §4 의 '이유 없는 빈칸'입니다(기준문서 §6 「거제 9미」).
 */
function TastePage({ titleRef, onBack }) {
  const [places, setPlaces] = useState({ status: 'loading', items: [] })

  useEffect(() => {
    let cancelled = false
    api
      .places('FOOD')
      .then(({ places: items }) => {
        if (!cancelled) setPlaces({ status: 'ready', items: items ?? [] })
      })
      .catch(() => {
        // 0곳과 실패는 다른 답입니다(절대규칙 3) — 실패면 줄마다 「없어요」 대신 위에 한 줄로 실패를 말합니다.
        if (!cancelled) setPlaces({ status: 'error', items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHead titleRef={titleRef} onBack={onBack} title={t('guide.taste.title')} />
      <p className={styles.lead}>{t('guide.taste.lead')}</p>
      {places.status !== 'ready' && (
        <p className={styles.notice} role="status">
          {t(places.status === 'error' ? 'guide.taste.loadFailed' : 'guide.taste.loading')}
        </p>
      )}
      <ol className={styles.tastes}>
        {NINE_TASTES.map((taste) => {
          const shops = places.items.filter((place) => (place.nineTasteNos ?? []).includes(taste.no))
          return (
            <li key={taste.no} className={styles.taste}>
              <span className={styles.rank}>{t('guide.taste.rank', { no: taste.no })}</span>
              <span className={styles.tasteBody}>
                <span className={styles.tasteName}>{taste.name}</span>
                {/* 8 · 9미는 원문에 제철 칸이 없어 줄이 없습니다 — 지어 넣지 않습니다(절대규칙 1). */}
                {taste.season && (
                  <span className={styles.season}>{t('guide.taste.season', { season: taste.season })}</span>
                )}
                {places.status === 'ready' &&
                  (shops.length > 0 ? (
                    <span className={styles.shops}>
                      {shops.map((shop) => (
                        <Link
                          key={shop.placeId}
                          to={`/places/${shop.placeId}`}
                          className={styles.shop}
                          aria-label={t('guide.taste.placeAria', { name: shop.name })}
                        >
                          {shop.name}
                          <ChevronRight size={14} aria-hidden="true" />
                        </Link>
                      ))}
                    </span>
                  ) : (
                    <span className={styles.noPlace}>{t('guide.taste.noPlace')}</span>
                  ))}
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}

/** 고현터미널 답 — 수치는 전부 기준문서 §2 · §3 확정 데이터입니다(ko.js 의 guide.terminal.*). */
function TerminalPage({ titleRef, onBack }) {
  return (
    <>
      <PageHead titleRef={titleRef} onBack={onBack} title={t('guide.terminal.title')} />
      <div className={styles.paragraphs}>
        <p>{t('guide.terminal.p1')}</p>
        <p>{t('guide.terminal.p2')}</p>
        <p>{t('guide.terminal.p3')}</p>
      </div>
      {/* 범례 — 홈 지도의 고현터미널 핀(파란 원 + 흰 버스, Figma 501:213)과 같은 모양을 그려 "이게 그거"를 말합니다(9경 시트의 보라 고리와 같은 방식). */}
      <p className={styles.legend}>
        <span className={styles.legendPin} aria-hidden="true">
          <Bus size={12} strokeWidth={2.25} />
        </span>
        <span>{t('guide.terminal.legend')}</span>
      </p>
    </>
  )
}
