import { Bookmark, House, Map as MapIcon, MapPin } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

/**
 * 지도 화면의 경로.
 * 첫 화면(홈)이 만들어지면 지도를 '/map'으로 옮기고 여기만 바꾸면 됩니다.
 */
export const MAP_PATH = '/'

const TABS = [
  { path: '/home', label: '홈', Icon: House },
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
