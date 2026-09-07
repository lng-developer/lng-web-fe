import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DashboardVisual } from '@/features/foundation/DashboardVisual'

import { useSystemDashboardQuery } from '../hooks'

export function SystemDashboardPage() {
  const { t } = useTranslation()
  const dashboard = useSystemDashboardQuery()
  const data = dashboard.data

  const audit = useMemo(() => data?.recentAudit?.items ?? [], [data?.recentAudit?.items])
  const queueData = useMemo(
    () => [
      { label: 'Audit', value: audit.length },
      { label: 'Active', value: data?.accounts?.active ?? 0 },
    ],
    [audit.length, data?.accounts?.active],
  )

  const cards = useMemo<Array<[string, string]>>(
    () => [
      [String(data?.accounts?.total ?? 0), t('systemDashboard.accounts')],
      [String(data?.accounts?.active ?? 0), t('systemDashboard.activeAccounts')],
      [data?.health?.status ?? '—', t('systemDashboard.health')],
      [String(audit.length), t('systemDashboard.recentAudit')],
    ],
    [data?.accounts?.total, data?.accounts?.active, data?.health?.status, audit.length, t],
  )

  const summaryData = useMemo(
    () => [
      { label: 'MongoDB', value: data?.health?.infrastructure.mongo === 'CONNECTED' ? 1 : 0 },
      { label: 'Redis', value: data?.health?.infrastructure.redis === 'CONNECTED' ? 1 : 0 },
    ],
    [data?.health?.infrastructure.mongo, data?.health?.infrastructure.redis],
  )

  const recentRows = useMemo(() => audit.map((item) => item.action), [audit])

  const sideRows = useMemo(
    () => [
      `MongoDB: ${data?.health?.infrastructure.mongo ?? '—'}`,
      `Redis: ${data?.health?.infrastructure.redis ?? '—'}`,
    ],
    [data?.health?.infrastructure.mongo, data?.health?.infrastructure.redis],
  )

  return (
    <DashboardVisual
      title={t('systemDashboard.title')}
      dateLabel={t('systemDashboard.description')}
      cards={cards}
      queueTitle={t('systemDashboard.recentAudit')}
      queueData={queueData}
      summaryTitle={t('systemDashboard.infrastructure')}
      summaryData={summaryData}
      targetTitle={t('systemDashboard.health')}
      targetPercent={data?.health?.status === 'ok' ? 100 : 0}
      targetLabel={data?.health?.status ?? '—'}
      recentTitle={t('systemDashboard.recentAudit')}
      recentRows={recentRows}
      sideTitle={t('systemDashboard.infrastructure')}
      sideRows={sideRows}
    />
  )
}
