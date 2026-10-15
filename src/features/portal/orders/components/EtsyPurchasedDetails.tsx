import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'

import type { OrderWorkbenchItem } from '../api/orderApi'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import { getEtsyPurchasedDetails } from './etsyPurchasedPresentation'

export default function EtsyPurchasedDetails({ item }: { readonly item: OrderWorkbenchItem }) {
  const { t } = useTranslation()
  const details = getEtsyPurchasedDetails(item.item.variations, item.customization?.inputs ?? [])
  return (
    <div className={styles.etsyPurchasedDetails}>
      {details.options.length ? (
        <dl className={styles.etsyOptions}>
          {details.options.map(({ label, value }) => (
            <div key={`${label}:${value}`}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {details.personalizations.map((value) => (
        <div className={styles.etsyPersonalization} key={value}>
          <Typography.Text type="secondary">
            {t('orders.fields.etsyPersonalization')}
          </Typography.Text>
          <Typography.Text copyable={{ text: value }}>{value}</Typography.Text>
        </div>
      ))}
      {!details.options.length && !details.personalizations.length ? (
        <Typography.Text type="secondary">
          {t('orders.fields.etsySelectionUnavailable')}
        </Typography.Text>
      ) : null}
    </div>
  )
}
