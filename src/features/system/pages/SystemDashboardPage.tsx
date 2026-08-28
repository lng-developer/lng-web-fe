import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import { DashboardVisual } from '@/features/foundation/DashboardVisual'

import { getSystemDashboard } from '../api/systemDashboardApi'

export function SystemDashboardPage() {
  const { t } = useTranslation()
  const dashboard = useQuery({
    queryKey: ['system', 'dashboard'],
    queryFn: getSystemDashboard,
    retry: false,
  })
  const data = dashboard.data

  const audit = data?.recentAudit?.items ?? []
  const queueData = [{ label: 'Audit', value: audit.length }, { label: 'Active', value: data?.accounts?.active ?? 0 }]
  return <DashboardVisual title={t('systemDashboard.title')} dateLabel={t('systemDashboard.description')} cards={[[String(data?.accounts?.total ?? 0), t('systemDashboard.accounts')], [String(data?.accounts?.active ?? 0), t('systemDashboard.activeAccounts')], [data?.health?.status ?? '—', t('systemDashboard.health')], [String(audit.length), t('systemDashboard.recentAudit')]]} queueTitle={t('systemDashboard.recentAudit')} queueData={queueData} summaryTitle={t('systemDashboard.infrastructure')} summaryData={[{ label: 'MongoDB', value: data?.health?.infrastructure.mongo === 'CONNECTED' ? 1 : 0 }, { label: 'Redis', value: data?.health?.infrastructure.redis === 'CONNECTED' ? 1 : 0 }]} targetTitle={t('systemDashboard.health')} targetPercent={data?.health?.status === 'ok' ? 100 : 0} targetLabel={data?.health?.status ?? '—'} recentTitle={t('systemDashboard.recentAudit')} recentRows={audit.map((item) => item.action)} sideTitle={t('systemDashboard.infrastructure')} sideRows={[`MongoDB: ${data?.health?.infrastructure.mongo ?? '—'}`, `Redis: ${data?.health?.infrastructure.redis ?? '—'}`]} />
}
