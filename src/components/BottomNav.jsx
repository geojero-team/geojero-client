import { Bookmark, House, Map as MapIcon, MapPin } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

/**
 * 지도 화면의 경로.
 * 홈이 첫 화면('/')이 되면서 지도가 여기로 내려왔습니다. 지도로 보내는 코드는
 * 경로를 직접 쓰지 말고 이 상수를 쓰세요.
 */
export const MAP_PATH = '/map'

const TABS = [
  { path: '/', label: '홈', Icon: House },
  { path: '/spots', label: '스팟', Icon: MapPin },
  { path: MAP_PATH, label: '지도', Icon: MapIcon },
  { path: '/my', label: '내 일정', Icon: Bookmark },
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
          <Icon size={22} aria-hidden="true" />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
