import PlaceholderScreen from '../components/PlaceholderScreen'
import { t } from '../i18n'

/** ② 판정 조건 입력 — 라우팅만 먼저 연결해둔 자리표시자입니다. */
export default function ConditionsPage() {
  return (
    <PlaceholderScreen
      title={t('placeholder.conditionsTitle')}
      lead={t('placeholder.conditionsLead')}
      items={[
        t('placeholder.conditionsItem1'),
        t('placeholder.conditionsItem2'),
        t('placeholder.conditionsItem3'),
        t('placeholder.conditionsItem4'),
        t('placeholder.conditionsItem5'),
        t('placeholder.conditionsItem6'),
      ]}
    />
  )
}
