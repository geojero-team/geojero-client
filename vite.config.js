import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 카카오 개발자 콘솔에 http://localhost:5173 만 등록돼 있습니다.
    // 포트가 밀려서 5174로 뜨면 지도가 "앱키 도메인 불일치"로 조용히 죽으므로,
    // 포트가 점유돼 있으면 다른 포트로 넘어가지 말고 바로 실패하게 둡니다.
    port: 5173,
    strictPort: true,
  },
})
