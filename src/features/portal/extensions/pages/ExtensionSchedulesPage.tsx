import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { Button, Input, Segmented, Space, Tag } from 'antd'

import { MetricCard, PageHeader } from '@/shared/ui'
import { ExtensionAutomationTab } from '@/features/portal/integrations/components/ExtensionAutomationTab'
import { useExtensionHub } from '../hooks/useExtensionHub'
import styles from './ExtensionSchedulesPage.module.scss'

export function ExtensionSchedulesPage() {
  const { t } = useTranslation()
  const {
    account,
    canWrite,
    canWriteFinance,
    managementAgents,
    extensionManagementAgents,
    extensionOrderSchedules,
    extensionTrackingSchedules,
    extensionFinanceSchedules,
    schedules,
    trackingSchedules,
    financeSchedules,
    shopNames,
    shopPlatforms,
    saveOrderSchedule,
    saveTrackingSchedule,
    saveFinanceSchedule,
    requestTrackingScheduleNow,
    createCommand,
    activeSchedulesCount,
  } = useExtensionHub()

  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'AMAZON' | 'ETSY'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = useMemo(() => {
    return managementAgents.filter((agent) => {
      const shopPlatform = (
        agent.provider ||
        shopPlatforms.get(agent.shopId) ||
        'AMAZON'
      ).toUpperCase()
      if (platformFilter !== 'ALL' && shopPlatform !== platformFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const shopName = shopNames.get(agent.shopId)?.toLowerCase() ?? ''
        const clientLabel = (agent.label ?? '').toLowerCase()
        return clientLabel.includes(query) || shopName.includes(query)
      }
      return true
    })
  }, [managementAgents, platformFilter, searchQuery, shopPlatforms, shopNames])

  const orderSchedulesCount = useMemo(() => schedules.filter((s) => s.enabled).length, [schedules])
  const financeSchedulesCount = useMemo(
    () => financeSchedules.filter((s) => s.enabled).length,
    [financeSchedules],
  )

  const isLoading =
    extensionManagementAgents.isLoading ||
    extensionOrderSchedules.isLoading ||
    extensionFinanceSchedules.isLoading

  const handleRefresh = () => {
    extensionOrderSchedules.refetch()
    extensionTrackingSchedules.refetch()
    extensionFinanceSchedules.refetch()
    extensionManagementAgents.refetch()
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('legacyMenu.configAuto', { defaultValue: 'Automation Schedules' })}
        description={t('portal.extensions.schedules.subtitle', {
          defaultValue:
            'Configure recurring automated background tasks for order ingestion and finance reporting by shop.',
        })}
      />

      <div className={styles.metricsGrid}>
        <MetricCard
          icon={<ClockCircleOutlined />}
          label={t('portal.extensions.metrics.activeSchedules', {
            defaultValue: 'Active Schedules',
          })}
          value={activeSchedulesCount}
          variant={activeSchedulesCount > 0 ? 'info' : 'neutral'}
        />
        <MetricCard
          icon={<SyncOutlined />}
          label={t('portal.extensions.metrics.orderSchedules', {
            defaultValue: 'Order Sync Schedules',
          })}
          value={orderSchedulesCount}
          variant="neutral"
        />
        <MetricCard
          icon={
            <Tag color="green" style={{ margin: 0 }}>
              FIN
            </Tag>
          }
          label={t('portal.extensions.metrics.financeSchedules', {
            defaultValue: 'Finance Schedules',
          })}
          value={financeSchedulesCount}
          variant="neutral"
        />
      </div>

      <div className={styles.filtersBar}>
        <Segmented
          value={platformFilter}
          onChange={(val) => setPlatformFilter(val as 'ALL' | 'AMAZON' | 'ETSY')}
          options={[
            { value: 'ALL', label: t('common.all', { defaultValue: 'All Platforms' }) },
            { value: 'AMAZON', label: 'Amazon' },
            { value: 'ETSY', label: 'Etsy' },
          ]}
        />

        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('portal.extensions.filters.searchPlaceholder', {
              defaultValue: 'Search client, shop...',
            })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading} />
        </Space>
      </div>

      <ExtensionAutomationTab
        account={account}
        agents={filteredAgents}
        schedules={schedules}
        trackingSchedules={trackingSchedules}
        financeSchedules={financeSchedules}
        isLoading={isLoading}
        shopNames={shopNames}
        canWriteOrders={canWrite}
        canWriteFinance={canWriteFinance}
        isSavingSchedule={saveOrderSchedule.isPending}
        isSavingTrackingSchedule={saveTrackingSchedule.isPending}
        isSavingFinanceSchedule={saveFinanceSchedule.isPending}
        isCreatingCommand={createCommand.isPending}
        onSaveSchedule={(input) => saveOrderSchedule.mutate(input)}
        onSaveTrackingSchedule={(input) => saveTrackingSchedule.mutate(input)}
        onRequestTrackingScheduleNow={(agentId) => requestTrackingScheduleNow.mutate(agentId)}
        onSaveFinanceSchedule={(input) => saveFinanceSchedule.mutate(input)}
        onCreateCommand={(input) => createCommand.mutate(input)}
      />
    </div>
  )
}
export default ExtensionSchedulesPage
