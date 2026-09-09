import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

/**
 * 지도 화면의 경로.
 * 홈이 첫 화면('/')이 되면서 지도가 여기로 내려왔습니다. 지도로 보내는 코드는
 * 경로를 직접 쓰지 말고 이 상수를 쓰세요.
 */
export const MAP_PATH = '/map'

/* Figma TabBar4(234:66) 벡터 원본(src/assets/tabbar/*.svg)을 그대로 인라인.
   16px 박스 기준으로 viewBox를 0.8 옮겨 획이 박스 밖으로 살짝 나가는 것까지 재현.
   색은 currentColor — 활성/비활성은 .tab 색이 정합니다. */
const ICON_PROPS = {
  className: styles.icon,
  viewBox: '0.8 0.8 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

const HomeIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M6.4 16.8V11.2H11.2V16.8M0.8 8.8L8.8 0.8L16.8 8.8V16.8H0.8V8.8Z" />
  </svg>
)

const SpotIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M0.8 6.56C0.8 10.784 8.8 16.8 8.8 16.8C8.8 16.8 16.8 10.784 16.8 6.56C16.8 3.36 13.2444 0.8 8.8 0.8C4.35556 0.8 0.8 3.36 0.8 6.56Z" />
  </svg>
)

const MapIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M11.4286 3.26154L6.17143 0.800002L0.8 3.26154V16.8L6.17143 14.3385M6.17143 0.800002V14.3385M6.17143 14.3385L11.4286 16.8L16.8 14.3385V0.800002L11.4286 3.26154M11.4286 3.26154V16.8" />
  </svg>
)

const PlansIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M16.8 0.8H0.8V16.8L8.8 12.8L16.8 16.8V0.8Z" />
  </svg>
)

const TABS = [
  { path: '/', label: '홈', Icon: HomeIcon },
  { path: '/spots', label: '스팟', Icon: SpotIcon },
  { path: MAP_PATH, label: '지도', Icon: MapIcon },
  { path: '/my', label: '내 일정', Icon: PlansIcon },
]

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="주요 화면">
      {TABS.map(({ path, label, Icon }) => (
        <NavLink
          key={path}
          to={path}
          end
          className={({ isActive }) =>
            isActive ? `${styles.tab} ${styles.active}` : styles.tab
          }
        >
          <Icon />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
