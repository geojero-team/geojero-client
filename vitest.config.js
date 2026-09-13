import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

// 테스트 전용 설정 — vite.config.js(개발 서버·빌드)는 그대로 두고 그 위에 얹습니다.
// 테스트 의존성은 devDependencies이고 src 진입점(main.jsx)이 가져가지 않으므로 배포 번들에 들어가지 않습니다.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
    },
  }),
)
