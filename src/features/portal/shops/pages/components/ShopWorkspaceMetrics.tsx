import { useTranslation } from 'react-i18next'
import { CheckCircleOutlined, GlobalOutlined, ShopOutlined, StopOutlined } from '@ant-design/icons'

import { MetricCard } from '@/shared/ui'

import styles from '../ShopWorkspacePage.module.scss'

export function ShopWorkspaceMetrics({
  totalShops,
  activeCount,
  inactiveCount,
  loading,
}: {
  totalShops: number
  activeCount: number
  inactiveCount: number
  loading: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className={styles.metrics}>
      <MetricCard
        icon={<ShopOutlined />}
        variant="neutral"
        label={t('portal.shops.metrics.total')}
        value={totalShops}
        loading={loading}
      />
      <MetricCard
        icon={<CheckCircleOutlined />}
        variant="success"
        label={t('portal.shops.metrics.active')}
        value={activeCount}
        loading={loading}
      />
      <MetricCard
        icon={<StopOutlined />}
        variant="danger"
        label={t('portal.shops.metrics.inactive')}
        value={inactiveCount}
        loading={loading}
      />
      <MetricCard
        icon={<GlobalOutlined />}
        variant="info"
        label={t('portal.shops.metrics.channel')}
        value="Amazon & Etsy"
        loading={loading}
      />
    </div>
  )
}
