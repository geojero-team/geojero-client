import { NavLink } from 'react-router-dom'
import { t } from '../i18n'
import styles from './BottomNav.module.css'

/**
 * 지도 화면의 경로.
 * 홈이 첫 화면('/')이 되면서 지도가 여기로 내려왔습니다. 지도로 보내는 코드는
 * 경로를 직접 쓰지 말고 이 상수를 쓰세요.
 */
export const MAP_PATH = '/map'

/**
 * 시간표 탭의 경로 (02-2에서 지도 탭 자리를 대신합니다).
 * 스팟 목록을 보여주고, 누르면 그 스팟의 버스 시간표로 갑니다(451:518).
 */
export const TIMETABLE_PATH = '/timetable'

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

/* 시간표 — 달력/표 모양. Figma 02-2 TabBar4(09-12 · 4탭 홈·스팟·시간표·내 일정)에서
   지도 탭이 시간표 탭으로 바뀌었습니다. 지도는 코스 추천에서 들어가는 화면이 됐고,
   탭에서 바로 갈 자리가 아닙니다. 아이콘은 02-2 세트에 벡터가 없어 같은 규칙
   (16px 박스·1.6 획·currentColor)으로 그렸습니다. */
const TimetableIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M0.8 4.8H16.8M0.8 4.8V16.8H16.8V4.8M0.8 4.8L0.8 2.8H16.8V4.8M4.8 0.8V2.8M12.8 0.8V2.8M4.8 8.8H8.8M4.8 12.8H12.8" />
  </svg>
)

const PlansIcon = () => (
  <svg {...ICON_PROPS}>
    <path d="M16.8 0.8H0.8V16.8L8.8 12.8L16.8 16.8V0.8Z" />
  </svg>
)

const TABS = [
  { path: '/', label: t('nav.home'), Icon: HomeIcon },
  { path: '/spots', label: t('nav.spots'), Icon: SpotIcon },
  { path: TIMETABLE_PATH, label: t('nav.timetable'), Icon: TimetableIcon },
  { path: '/my', label: t('nav.myPlans'), Icon: PlansIcon },
]

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label={t('nav.aria')}>
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
