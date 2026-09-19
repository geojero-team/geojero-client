import Screen from './Screen'
import { t } from '../i18n'
import styles from './Splash.module.css'

/**
 * 시작화면 — 앱을 열면 1초 동안 보이고 홈으로 넘어갑니다(2026-09-19 사용자).
 *
 * 움직임은 넣지 않습니다. 사용자가 모션 시안을 보고 정지로 결정했습니다.
 *
 * 앱 **위를 덮는 층**입니다(App.jsx). 홈을 대신 그리는 게 아니라 위에 얹는 이유는,
 * 그 1초 동안 아래에서 홈이 이미 뜨고 있어야 넘어간 순간 지도가 준비돼 있기 때문입니다.
 *
 * 프레임은 다른 화면과 같은 Screen 을 씁니다 — 390 폭에 기기 배율(frameZoom)까지
 * 그대로 따라가서, 폰에서는 꽉 차고 데스크톱에서는 가운데 폰 프레임이 됩니다.
 *
 * 사진: 한국관광공사 사진갤러리 「거제 바람의 언덕」(galContentId 2568443, 촬영 송재근).
 * 공공누리 제1유형이라 출처를 밝히면 쓸 수 있습니다 — 화면에 적지 않는 대신 여기 남깁니다.
 * 원본이 Adobe RGB 라 sRGB 로 변환한 뒤 WebP 로 넣었습니다(그냥 쓰면 바다 파랑이 죽습니다).
 */
export default function Splash() {
  return (
    <div className={styles.overlay}>
      {/* data-api 를 달지 않습니다 — 이 화면은 서버를 부르지 않습니다. */}
      <Screen>
        <div className={styles.root}>
          <div className={styles.box}>
            {/* 글씨가 뜻을 다 말하므로 사진은 장식입니다 — 읽어 줄 필요가 없습니다. */}
            <img src="/splash.webp" alt="" />
          </div>
          <div className={styles.hero}>
            <div className={styles.line}>{t('splash.line1')}</div>
            <div className={styles.line}>{t('splash.line2')}</div>
            <div className={styles.line}>{t('splash.line3')}</div>
            <div className={styles.sub}>{t('splash.sub')}</div>
          </div>
        </div>
      </Screen>
    </div>
  )
}
