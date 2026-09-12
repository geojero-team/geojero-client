import ko from './ko'

/**
 * 화면 문자열 키-값 분리 — 기준문서 §6 필수 항목
 * "i18n 구조(키-값 분리 + poi_i18n, 번역 데이터 제외)".
 *
 * 번역을 채우는 게 아니라 **구조만** 만듭니다. 컷 순서 2번이
 * "영문 표시(매핑 32건 + 언어 토글) → 국문 단독 (매핑 테이블은 남김)"이라
 * 사전은 ko 하나뿐이고 언어 토글도 없습니다. 영문을 넣기로 하면 en.js를 만들어
 * LOCALES에 한 줄 더하면 됩니다.
 *
 * **데이터는 여기 두지 않습니다.** 스팟 이름·소개·운휴 사유·터미널 목록은 서버가
 * lang으로 갈라 내려주고(poi_i18n, 영문이 없으면 국문 폴백), 프론트는 받아서 그립니다.
 * 이 파일이 맡는 건 화면 껍데기 문구뿐입니다.
 */
const LOCALES = { ko }
const LOCALE = 'ko'

/** t('courses.total', { count: 3 }) — 값의 {count} 자리에 끼웁니다. */
export function t(key, vars) {
  const text = LOCALES[LOCALE][key]

  if (text === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] 사전에 없는 키: ${key}`)
    return key
  }

  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole,
  )
}
