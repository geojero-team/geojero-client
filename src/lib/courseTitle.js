import { t } from '../i18n'

/**
 * 코스 제목 — 코스 추천 카드와 코스 상세가 **같은 이름**을 달아야 고른 카드를 상세에서 알아봅니다.
 *
 * 서버 `title`(대표 코스 10개에만 있는 사람 말 이름 — 사용자가 고칠 수 있음)이 있으면 그것.
 * 없으면 규칙 「{첫 스팟}에서 {끝 스팟}까지」(2026-09-14 사용자 결정). 코스 `name` 은
 * 「학동 · 기성관 · …」 줄임말 체인이라 쓰지 않습니다 — 「기성관」은 TourAPI 정본 이름이 아닙니다(절대규칙 5).
 * 한 곳뿐이면 「해금강에서 해금강까지」가 되므로 null — 호출부가 이름 그대로 씁니다.
 */
export function courseTitle(title, names) {
  if (title) return title
  if (names.length >= 2) return t('common.courseTitleRange', { first: names[0], last: names[names.length - 1] })
  return null
}
