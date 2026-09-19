import Screen from './Screen'
import { t } from '../i18n'
import styles from './Splash.module.css'
import { SPLASH_BLUR } from './splashBlur'
import { SPLASH_FADE_MS, SPLASH_MS } from '../lib/useSplash'

/**
 * 시작화면 — 앱을 열면 3초 동안 보이고 홈으로 넘어갑니다(2026-09-19 사용자 · 09-20 2초 → 2.3초 → 2.8초 → 3초 — lib/useSplash).
 *
 * 움직임은 둘뿐입니다(2026-09-20 사용자) — 글씨가 한 줄씩 0.15초 간격으로 떠오르고(1.05초에 다 뜬다 — 안드로이드 가이드의 「1,000ms 안팎」), 마지막 0.4초 동안 흐려지며 홈이 드러납니다.
 * **사진은 움직이지 않습니다.** 사진을 천천히 확대해 봤더니 화면 전체가 움직여 보였고, 풍차 날개만 돌리는 시안은
 * 날개가 빨간 지붕을 뚫고 지나가 보여 접었습니다(사용자). 09-19 에는 갈매기 3D 비행 시안을 보고 움직임을 뺐었습니다.
 * 시간(글씨 간격 · 흐려지는 시작)은 CSS 가 아니라 여기서 넣습니다 — 흐려짐은 lib/useSplash 타이머와 어긋나지 않게.
 *
 * 앱 **위를 덮는 층**입니다(App.jsx). 홈을 대신 그리는 게 아니라 위에 얹는 이유는,
 * 그 3초 동안 아래에서 홈이 이미 뜨고 있어야 넘어간 순간 지도가 준비돼 있기 때문입니다.
 *
 * 프레임은 다른 화면과 같은 Screen 을 씁니다 — 390 폭에 기기 배율(frameZoom)까지
 * 그대로 따라가서, 폰에서는 꽉 차고 데스크톱에서는 가운데 폰 프레임이 됩니다.
 *
 * 사진: 한국관광공사 사진갤러리 「거제 바람의 언덕」(galContentId 2568443, 촬영 라이브스튜디오 · 2018년 6월).
 * 공공누리 제1유형이라 출처를 밝히면 쓸 수 있습니다 — 화면에 적지 않는 대신 여기 남깁니다.
 * 2026-09-20 원본(7000 × 3937, 한국관광콘텐츠랩 공개 원본 주소)으로 바꿨습니다. 관광사진 API 의 1280 × 720 은
 * 화면에 보이는 띠가 약 300 픽셀뿐이라 폰에서 3.6배로 늘어나 흐렸습니다(사용자). 보이는 띠만 잘라 1800 폭 WebP 로 넣었습니다 —
 * 자른 자리는 Splash.module.css 의 `.box img` 주석. 원본 색이 이미 sRGB 라 색 변환은 하지 않았습니다.
 */
/* 글씨가 떠오르는 순서 — Travel · Explore · Inspire · 거제로, ALL 거제. 첫 줄은 화면이 그려진 뒤 0.1초에 시작합니다. */
const TEXT_START_MS = 100
const TEXT_STAGGER_MS = 150
const rise = (i) => ({ animationDelay: `${TEXT_START_MS + i * TEXT_STAGGER_MS}ms` })

export default function Splash() {
  return (
    <div
      className={styles.overlay}
      style={{ animationDelay: `${SPLASH_MS - SPLASH_FADE_MS}ms`, animationDuration: `${SPLASH_FADE_MS}ms` }}
    >
      {/* data-api 를 달지 않습니다 — 이 화면은 서버를 부르지 않습니다. */}
      <Screen>
        <div className={styles.root}>
          {/* 바탕의 흐린 미리보기는 사진이 늦을 때를 위한 것입니다(splashBlur). */}
          <div
            className={styles.box}
            style={{ backgroundImage: `url(${SPLASH_BLUR})` }}
          >
            {/* 글씨가 뜻을 다 말하므로 사진은 장식입니다 — 읽어 줄 필요가 없습니다. */}
            <img src="/splash.webp" alt="" />
          </div>
          <div className={styles.hero}>
            <div className={styles.line} style={rise(0)}>{t('splash.line1')}</div>
            <div className={styles.line} style={rise(1)}>{t('splash.line2')}</div>
            <div className={styles.line} style={rise(2)}>{t('splash.line3')}</div>
            <div className={styles.sub} style={rise(3)}>{t('splash.sub')}</div>
          </div>
        </div>
      </Screen>
    </div>
  )
}
