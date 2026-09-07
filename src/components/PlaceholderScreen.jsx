import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import Screen from './Screen'
import styles from './PlaceholderScreen.module.css'

/**
 * 아직 만들지 않은 화면의 자리표시자.
 * 라우팅만 먼저 잡아두고 화면은 다음 작업으로 넘긴 상태입니다.
 *
 * tab=true 는 하단 탭바로 오가는 화면입니다. 뒤로가기 대신 탭바를 답니다.
 */
export default function PlaceholderScreen({
  title,
  lead,
  items = [],
  tab = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  // 링크로 이 화면에 바로 들어온 경우(location.key === 'default') 뒤로 가면
  // 사이트 밖으로 나가버리므로 메인으로 보냅니다.
  const goBack = () =>
    location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1)

  return (
    <Screen>
      <header className={styles.header}>
        {!tab && (
          <button
            type="button"
            className={styles.back}
            onClick={goBack}
            aria-label="뒤로"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        )}
        <h1 className={tab ? `${styles.title} ${styles.titleTab}` : styles.title}>
          {title}
        </h1>
      </header>

      <div className={styles.body}>
        <p className={styles.lead}>{lead}</p>
        {items.length > 0 && (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item} className={styles.item}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {tab && <BottomNav />}
    </Screen>
  )
}
