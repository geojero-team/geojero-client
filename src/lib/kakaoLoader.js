/**
 * 카카오맵 JavaScript SDK 로더.
 *
 * SDK는 <script> 태그 한 번으로만 붙이면 되므로 모듈 스코프에 Promise를 캐시합니다.
 * autoload=false 로 받아서 kakao.maps.load() 콜백이 끝난 뒤에야 resolve 합니다.
 * (autoload=true면 script.onload 시점에 kakao.maps.Map이 아직 없을 수 있습니다)
 */
import { t } from '../i18n'

const SDK_SRC = 'https://dapi.kakao.com/v2/maps/sdk.js'

let sdkPromise = null

export function loadKakaoMaps() {
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps?.Map) {
      resolve(window.kakao)
      return
    }

    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY
    if (!appKey) {
      reject(new Error(t('map.errorNoKey')))
      return
    }

    const script = document.createElement('script')
    script.src = `${SDK_SRC}?appkey=${encodeURIComponent(appKey)}&autoload=false`
    script.async = true

    script.onload = () => {
      // kakao.maps.load()가 실제 지도 모듈 로딩을 끝내주는 지점입니다.
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    // script 태그 실패는 이유를 알려주지 않습니다. 실제로 겪은 순서대로 적어둡니다.
    script.onerror = () => {
      script.remove()
      reject(
        new Error(
          t('map.errorSdk'),
        ),
      )
    }

    document.head.appendChild(script)
  })

  // 실패한 Promise가 캐시된 채로 남으면 "다시 시도"가 영원히 같은 에러를 냅니다.
  sdkPromise.catch(() => {
    sdkPromise = null
  })

  return sdkPromise
}
