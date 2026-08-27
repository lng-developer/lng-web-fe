import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'

import { MetricCard, UiTabs } from '@/shared/ui'

import { getMappingSummary } from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'
import { MAPPING_RULE_PAGES } from '../model/mappingPageConfig'
import { MappingRulePage } from './MappingRulePage'
import { MappingWorkbenchPage } from './MappingWorkbenchPage'
import styles from './MappingWorkspacePage.module.scss'

const WORKBENCH = 'workbench'

export const MappingWorkspacePage = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab =
    requestedTab &&
    (requestedTab === WORKBENCH || MAPPING_RULE_PAGES.some(({ key }) => key === requestedTab))
      ? requestedTab
      : WORKBENCH

  const summary = useQuery({
    queryKey: mappingKeys.summaryRoot(),
    queryFn: () => getMappingSummary({}),
    retry: false,
    staleTime: 30_000,
  })

  const tabItems = useMemo(
    () => [
      {
        key: WORKBENCH,
        label: t('mapping.pages.workbench'),
        children: <MappingWorkbenchPage />,
      },
      ...MAPPING_RULE_PAGES.map((page) => ({
        key: page.key,
        label: t(page.titleKey),
        children: <MappingRulePage pageKey={page.key} />,
      })),
    ],
    [t],
  )

  return (
    <div className={styles.page}>
      {/* ── Summary Metric Cards ── */}
      <div className={styles.summaryGrid}>
        <MetricCard
          icon={<WarningOutlined />}
          variant="blocked"
          value={summary.data?.blockedSampleCount}
          label={t('mapping.summary.blocked')}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<ThunderboltOutlined />}
          variant="ready"
          value={summary.data?.readyPlanCount}
          label={t('mapping.summary.ready')}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="confirmed"
          value={summary.data?.confirmedPlanCount}
          label={t('mapping.summary.confirmed')}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<ExclamationCircleOutlined />}
          variant="ambiguous"
          value={summary.data?.ambiguousSkuConfigCount}
          label={t('mapping.summary.ambiguous')}
          loading={summary.isLoading}
        />
      </div>

      {/* ── Tabs ── */}
      <UiTabs
        activeKey={activeTab}
        destroyOnHidden={false}
        items={tabItems}
        onChange={(tab) => {
          const next = new URLSearchParams(searchParams)
          next.set('tab', tab)
          setSearchParams(next)
        }}
      />
    </div>
  )
}

export default MappingWorkspacePage
