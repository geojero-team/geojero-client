import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startFrameZoom } from './lib/frameZoom.js'
import { startPinchZoomBlock } from './lib/pinchZoom.js'

startFrameZoom()
// 손가락 확대 막기 — index.html viewport · index.css touch-action 과 한 쌍입니다(lib/pinchZoom).
startPinchZoomBlock()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
