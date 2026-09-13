import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// globals를 켜지 않았으므로 Testing Library가 스스로 정리하지 못합니다 — 테스트마다 DOM을 비웁니다.
afterEach(() => {
  cleanup()
})
