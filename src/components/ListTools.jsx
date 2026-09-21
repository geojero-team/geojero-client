import { GalleryVertical, LayoutGrid, Rows3, Search, X } from 'lucide-react'
import { useId } from 'react'
import { t } from '../i18n'
import styles from './ListTools.module.css'

/**
 * 목록 도구 — 스팟 탭과 시간표 탭이 함께 쓰는 위쪽 줄 (2026-09-17 사용자 결정, 참고: `그리드.png` · `검색창.png`).
 *
 *   찾기 줄   이름으로 거르기. **지우기(×)는 글자가 있을 때 늘 보입니다** — 필수 요소입니다(사용자 지정).
 *             참고 그림의 카메라 아이콘은 두지 않습니다 — 사진으로 찾는 기능이 없습니다.
 *   아래 줄   왼쪽 정렬 · 오른쪽 보기 방식(격자 ↔ 크게).
 *
 * 정렬은 **기본 select** 입니다. 직접 만든 드롭다운보다 폰에서 익숙하고, 키보드·보이스오버가 그냥 됩니다.
 * 「추천순」은 **하트 수 순**입니다(2026-09-21 사용자 결정 — 규칙은 lib/listTools 한 곳: 하트 → 9경 번호 → 대표 코스 횟수 → 가나다).
 * 옵션 · 이름은 그대로고 새 정렬을 만들지 않았습니다.
 * 「최신순」은 두지 않습니다 — 스팟은 고정된 19곳이라 새로 들어오는 것이 없어 뜻을 갖지 않습니다.
 *
 * 보기 방식은 한 번에 하나만 켜집니다(aria-pressed). 격자는 사진 2열, 크게는 한 장씩 큰 카드입니다 —
 * 큰 카드에는 우리가 쓴 요약(서버 summary)이 들어가 이름만으로 고르기 어려운 사람을 돕습니다.
 */
export default function ListTools({ query, onQuery, sort, onSort, view, onView, compact = 'grid' }) {
  const inputId = useId()
  /* 왼쪽 칸은 탭마다 다릅니다 — 스팟 탭은 사진 2열(격자), 시간표 탭은 한 줄 목록입니다.
     같은 뜻의 버튼이 탭마다 다른 이름으로 읽히게 두지 않으려고 아이콘과 이름을 함께 고릅니다. */
  const CompactIcon = compact === 'rows' ? Rows3 : LayoutGrid
  const compactLabel = compact === 'rows' ? t('listTools.viewRows') : t('listTools.viewGrid')

  return (
    <div className={styles.tools}>
      <div className={styles.search}>
        <Search className={styles.searchIcon} size={18} strokeWidth={2} aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          className={styles.input}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t('listTools.searchPlaceholder')}
          aria-label={t('listTools.searchAria')}
          /* 브라우저가 제 모양의 × 를 덧그리지 않게 합니다(CSS 로도 지웁니다) — 우리 버튼과 둘이 됩니다. */
          autoComplete="off"
        />
        {query !== '' && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onQuery('')}
            aria-label={t('listTools.clear')}
          >
            <X size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={styles.row}>
        <select
          className={styles.sort}
          value={sort}
          onChange={(event) => onSort(event.target.value)}
          aria-label={t('listTools.sortAria')}
        >
          <option value="default">{t('listTools.sortDefault')}</option>
          <option value="name">{t('listTools.sortName')}</option>
          <option value="region">{t('listTools.sortRegion')}</option>
        </select>

        <div className={styles.views} role="group" aria-label={t('listTools.viewAria')}>
          <button
            type="button"
            className={view === 'compact' ? `${styles.view} ${styles.viewOn}` : styles.view}
            aria-pressed={view === 'compact'}
            aria-label={compactLabel}
            onClick={() => onView('compact')}
          >
            <CompactIcon size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={view === 'large' ? `${styles.view} ${styles.viewOn}` : styles.view}
            aria-pressed={view === 'large'}
            aria-label={t('listTools.viewLarge')}
            onClick={() => onView('large')}
          >
            <GalleryVertical size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
