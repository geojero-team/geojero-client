import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Screen from '../components/Screen'
import styles from './PrivacyPage.module.css'

/**
 * 개인정보처리방침 — 앱 스토어(원스토어) 등재에 필요한 공개 문서입니다(2026-09-16).
 *
 * 문구를 i18n(ko.js)에 넣지 않았습니다. 여기 글은 화면 문구가 아니라 **우리가 지키겠다고
 * 공개한 약속문**이고, 통째로 읽고 고쳐야 하는 한 덩어리라 조각내면 오히려 관리가 어렵습니다.
 * 다른 화면 문구는 그대로 t() 를 씁니다.
 *
 * ⚠️ 여기 적힌 것은 전부 코드로 확인한 사실입니다(2026-09-16). 바꾸기 전에 근거를 확인하세요.
 *   · 카카오에서 받는 값: 회원번호(id)와 닉네임뿐 — 이메일은 요청 자체를 하지 않는다(KakaoGateway)
 *   · 저장하는 것: users(회원번호·닉네임) · saved_trips(저장한 코스) · visitor_photos(사진·한 줄)
 *   · 사진은 다시 인코딩해 EXIF 를 지운다 — 위치정보(GPS)·촬영기기 정보가 서버에 저장되지 않는다
 *   · 로그인 유지 7일(SessionCookies TTL_SEC)
 *   · 탈퇴하면 users 한 행이 지워지고 위 세 가지가 CASCADE 로 함께 사라진다(AuthController.withdraw)
 */
const UPDATED = '2026년 9월 16일'
const CONTACT = 'sks020k@naver.com'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <Screen>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/my'))}
          aria-label="뒤로"
        >
          <ChevronLeft size={24} strokeWidth={2} aria-hidden="true" />
        </button>
        <h1 className={styles.title}>개인정보처리방침</h1>
      </header>

      <div className={styles.body}>
        <p className={styles.lead}>
          거제로는 대중교통으로 거제를 여행하는 분들께 코스와 시간표를 알려드리는 서비스입니다.
          코스 추천과 시간표는 로그인 없이 이용할 수 있고, 아래 정보는 코스를 저장하거나 사진을
          올릴 때만 저장합니다.
        </p>

        <section className={styles.section}>
          <h2 className={styles.head}>1. 수집하는 항목</h2>
          <dl className={styles.list}>
            <dt>카카오 계정 식별자</dt>
            <dd>
              카카오가 거제로에만 발급하는 회원 번호입니다. 다시 로그인했을 때 저장한 일정을
              찾아 드리는 데 씁니다.
            </dd>
            <dt>닉네임</dt>
            <dd>카카오 프로필에 설정된 이름입니다.</dd>
            <dt>저장한 코스</dt>
            <dd>이용자가 「내 일정」에 저장한 코스와 날짜입니다.</dd>
            <dt>올린 사진과 한 줄 설명</dt>
            <dd>이용자가 스팟에 직접 올린 사진입니다.</dd>
          </dl>
          <p className={styles.note}>
            이메일과 전화번호는 수집하지 않습니다. 카카오에 요청조차 하지 않습니다.
          </p>
          <p className={styles.note}>
            올린 사진은 저장하기 전에 다시 저장하는 과정을 거쳐, 사진에 들어 있던 촬영 위치(GPS)와
            촬영 기기 정보를 지웁니다. 서버에는 지워진 사진만 남습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.head}>2. 이용 목적</h2>
          <p>
            로그인 상태 유지, 저장한 코스 보여주기, 스팟에 방문자 사진 보여주기에만 씁니다.
            광고나 마케팅에 이용하지 않고, 이용자를 분석해 프로필을 만들지도 않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.head}>3. 보관 기간</h2>
          <p>
            회원 탈퇴 시까지 보관합니다. 탈퇴하면 계정, 저장한 코스, 올린 사진이 즉시 지워지며
            복구할 수 없습니다.
          </p>
          <p>로그인 상태는 7일 동안 유지되고, 그 뒤에는 다시 로그인해야 합니다.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.head}>4. 제3자 제공과 처리 위탁</h2>
          <p>이용자의 정보를 판매하거나 제3자에게 제공하지 않습니다.</p>
          <p>서비스를 운영하기 위해 아래 사업자의 설비를 이용합니다.</p>
          <dl className={styles.list}>
            <dt>카카오</dt>
            <dd>로그인과 지도 표시</dd>
            <dt>Amazon Web Services</dt>
            <dd>서버와 데이터베이스 운영(서울 리전)</dd>
            <dt>Vercel</dt>
            <dd>웹 화면 전송</dd>
          </dl>
          <p className={styles.note}>
            관광 정보와 사진은 한국관광공사 공공데이터를 이용하며, 이 과정에서 이용자의 정보는
            전달되지 않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.head}>5. 이용자의 권리</h2>
          <p>
            저장한 코스와 올린 사진은 언제든 화면에서 직접 지울 수 있습니다. 계정 전체를 지우려면
            「내 일정」 화면 아래의 <strong>회원 탈퇴</strong>를 누르세요.
          </p>
          <p>
            카카오 계정 자체는 탈퇴해도 그대로 남습니다. 카카오와의 연결을 끊으려면 카카오 계정
            설정의 「연결된 서비스 관리」에서 해제하세요.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.head}>6. 브라우저에 저장하는 값</h2>
          <p>
            로그인 상태를 유지하기 위한 값과, 첫 방문 안내를 이미 봤는지 여부를 이용자의 기기에
            저장합니다. 이 값들은 서버로 전송되지 않으며, 브라우저 설정에서 지울 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.head}>7. 문의</h2>
          <p>
            개인정보와 관련한 문의는 아래로 보내 주세요.
            <br />
            <a className={styles.mail} href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          </p>
        </section>

        <p className={styles.updated}>시행일 {UPDATED}</p>
      </div>

      <BottomNav />
    </Screen>
  )
}
