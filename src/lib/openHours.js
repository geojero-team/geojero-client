/**
 * 맛집 영업시간 원문(TourAPI opentimefood)을 「본 시간 한 줄 + 나머지」로 나눈다(2026-09-19 — 네이버 · 카카오 장소 화면처럼
 * 영업시간 한 줄을 크게, 준비시간 · 마지막 주문은 펼쳐 본다).
 *
 * 원문 모양은 셋이다: 「08:00~17:00」 한 줄 · 「11:00~20:30 (라스트오더 20:00)」 괄호 · 「- 10:30~20:30\n- 준비시간 …」 줄 목록.
 * 괄호와 줄 앞 「-」만 걷고 **글자는 바꾸지 않는다**(「라스트오더」를 「마지막 주문」으로 고치지 않는다).
 * 시각을 해석해 「영업 중」 같은 판단은 하지 않는다 — 쉬는 날이 「매월 둘째 수요일」처럼 불규칙해 틀린 답을 낼 수 있다.
 */
export function splitHours(raw) {
  if (!raw || !raw.trim()) return null
  const details = []
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/^\s*[-·•]\s*/, '').trim())
    .map((line) =>
      line
        .replace(/\(([^)]*)\)/g, (_, inner) => {
          if (inner.trim()) details.push(inner.trim())
          return ''
        })
        .trim(),
    )
    .filter(Boolean)
  const [main, ...rest] = lines
  return { main: main ?? details.shift() ?? null, details: [...rest, ...details] }
}
