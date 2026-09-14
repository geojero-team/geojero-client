import { ChevronRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Button from './Button'
import { t } from '../i18n'
import { NINE_SCENIC } from '../lib/nineScenic'
import { useSheetDismiss } from '../lib/useSheetDismiss'
import styles from './NineScenicSheet.module.css'

const TITLE_ID = 'nine-scenic-title'

/**
 * 「거제9경이란?」 시트 — 홈 왼쪽 위 주황 버튼을 누르면 올라옵니다(2026-09-14 사용자 결정, Figma 프레임 없음).
 *
 * 전에는 코스 추천 카드의 「거제9경 N곳」 태그에 붙이자고 했는데, 카드 전체가 버튼이라 태그를 누르면
 * 카드 선택까지 같이 눌립니다. 사용자가 홈으로 옮겼습니다 — 지도의 주황 테두리를 처음 보는 곳이 홈입니다.
 *
 * 설명만 하고 끝내지 않고 **아홉 곳을 목록으로** 보여줍니다. 앱에 있는 곳은 줄이 **스팟 상세로 가는
 * 링크**입니다(사용자 요청 — 하이퍼링크 '방식', 겉모습은 목록 그대로). 상세가 스스로 데이터를 불러오므로 지도 핀을 못 불러왔어도
 * 링크는 삽니다. 상세에서 뒤로 오면 시트가 다시 열려 있습니다 — 홈이 열림 상태를 주소(`?nine=1`)에 둡니다.
 * 앱에 없는 곳(공곶이·내도·지심도)은 링크가 아니고 「지도에 없음」이라고 말합니다.
 * 말없이 빼면 "9경인데 왜 일곱 곳뿐이지"가 됩니다.
 *
 * 모양은 로그인 시트(LoginSheet)와 같습니다 — 스크림 · 손잡이(끌어내리면 닫힘) · 같은 z 순서.
 */
export default function NineScenicSheet({ open, onClose }) {
  const { handleProps, sheetStyle } = useSheetDismiss(onClose)
  const titleRef = useRef(null)
  // 부모가 onClose 를 매번 새로 만들어도 아래 이펙트가 다시 돌지 않게 ref 로 읽습니다 —
  // 다시 돌면 렌더마다 포커스가 제목으로 튑니다.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // 열리면 제목에 포커스 — 화면 읽기 프로그램이 무엇이 열렸는지 먼저 읽습니다. Esc 로 닫힙니다.
  useEffect(() => {
    if (!open) return
    titleRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label={t('common.close')}
      />

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

        <h2 id={TITLE_ID} ref={titleRef} tabIndex={-1} className={styles.title}>
          {t('nineScenic.title')}
        </h2>

        {/* 문장마다 줄을 바꿉니다(사용자 요청 — 두 문장 이상이면 개행). */}
        <p className={styles.lead}>
          <span>{t('nineScenic.lead1')}</span>
          <span>{t('nineScenic.lead2')}</span>
          <span>{t('nineScenic.lead3')}</span>
        </p>

        {/* 범례 — 지도 마커와 같은 모양(흰 원 + 주황 테두리)을 그대로 그려 "이게 그거"를 말합니다. */}
        <p className={styles.legend}>
          <span className={styles.legendRing} aria-hidden="true" />
          <span className={styles.legendText}>
            <span>{t('nineScenic.legend1')}</span>
            <span>{t('nineScenic.legend2')}</span>
          </span>
        </p>

        <ol className={styles.list}>
          {NINE_SCENIC.map((item) => {
            const inApp = item.poiId != null
            const body = (
              <>
                <span className={styles.rank}>{t('nineScenic.rank', { rank: item.rank })}</span>
                <span className={styles.name}>
                  <span>{item.name}</span>
                  {inApp && item.mapName && (
                    <span className={styles.mapName}>
                      {t('nineScenic.mapName', { name: item.mapName })}
                    </span>
                  )}
                </span>
                {inApp ? (
                  <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
                ) : (
                  <span className={styles.offMap}>{t('nineScenic.offMap')}</span>
                )}
              </>
            )
            return (
              <li key={item.rank}>
                {/* 줄 전체가 링크입니다. 글씨는 목록 그대로 두고(파란 글씨·밑줄 없음 — 사용자 결정),
                    누를 수 있다는 건 줄 끝 화살표가 말합니다. */}
                {inApp ? (
                  <Link
                    to={`/spots/${item.poiId}`}
                    className={`${styles.item} ${styles.itemLink}`}
                    aria-label={t('nineScenic.linkAria', { rank: item.rank, name: item.name })}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={`${styles.item} ${styles.itemOff}`}>{body}</div>
                )}
              </li>
            )
          })}
        </ol>

        <Button variant="secondary" onClick={onClose}>
          {t('nineScenic.confirm')}
        </Button>
      </section>
    </>
  )
}
