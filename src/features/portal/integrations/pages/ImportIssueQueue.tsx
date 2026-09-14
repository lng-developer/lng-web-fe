import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Popover, Select, Space, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableListingId,
  CopyableOrderId,
  FeedbackAlert,
  FilterBar,
  SearchInput,
  SectionCard,
  StatusTag,
  TableTextCell,
  useFeedbackToast,
} from '@/shared/ui'

import {
  type ImportIssue,
  type ImportIssueSeverity,
  type ImportIssueStatus,
  type ImportSource,
  type IssueListParams,
  type IssueUpdateInput,
  listIssues,
  updateIssueStatus,
} from '../api/integrationApi'
import { integrationKeys } from '../api/integrationKeys'
import { canWriteOrdersForShop, canWriteOrdersSomewhere } from '../auth/integrationAccess'
import styles from './IntegrationWorkbenchPage.module.scss'
import { IssueResolutionModal } from './IssueResolutionModal'

const PAGE_SIZE = DEFAULT_PAGE_SIZE
const SOURCES: ImportSource[] = ['AMAZON_EXTENSION_REPORT', 'MANUAL_EXCEL']
const SEVERITIES: ImportIssueSeverity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
const STATUSES: ImportIssueStatus[] = ['OPEN', 'RESOLVED', 'IGNORED']
const ISSUE_TYPES = [
  'NORMALIZE_FAILED',
  'SHOP_RESOLVE_FAILED',
  'ADDRESS_VALIDATION_FAILED',
  'ORDER_IMPORT_FAILED',
  'MAPPING_RECHECK_FAILED',
  'CUSTOMIZATION_CREATE_FAILED',
  'CUSTOMIZATION_MISMATCH',
  'DUPLICATE_RECORD',
  'MISSING_REQUIRED_FIELD',
  'INVALID_FILE_FORMAT',
  'UNSUPPORTED_FILE_TYPE',
]

function issueTone(issue: ImportIssue) {
  if (issue.status === 'RESOLVED') return 'approved'
  if (issue.status === 'IGNORED') return 'cancelled'
  if (issue.severity === 'ERROR' || issue.severity === 'CRITICAL') return 'critical'
  return 'warning'
}

export interface ImportIssueQueueProps {
  readonly account: CurrentAccount
  readonly shops: Shop[]
  readonly selectedJobId?: string
}

export function ImportIssueQueue({ account, shops, selectedJobId }: ImportIssueQueueProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [params, setParams] = useState<IssueListParams>({ page: 1, limit: PAGE_SIZE })
  const issueParams = selectedJobId ? { ...params, importJobId: selectedJobId } : params
  const [resolvingIssue, setResolvingIssue] = useState<ImportIssue>()
  const issues = useQuery({
    queryKey: integrationKeys.issues(issueParams),
    queryFn: () => listIssues(issueParams),
    retry: false,
  })
  const resolution = useMutation({
    mutationFn: (input: IssueUpdateInput) => updateIssueStatus(resolvingIssue!.id, input),
    onSuccess: async () => {
      const ownerJobId = resolvingIssue!.importJobId
      setResolvingIssue(undefined)
      showFeedbackToast(
        'success',
        t('portal.integrations.resolution.saved', { defaultValue: 'Issue resolution saved' }),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...integrationKeys.all, 'issues'] }),
        queryClient.invalidateQueries({ queryKey: integrationKeys.job(ownerJobId) }),
      ])
    },
  })
  const canWrite = canWriteOrdersSomewhere(account)

  const updateParams = <Key extends keyof IssueListParams>(key: Key, value: IssueListParams[Key]) =>
    setParams((current) => ({ ...current, page: 1, [key]: value || undefined }))

  const columns: TableColumnsType<ImportIssue> = [
    {
      title: t('portal.integrations.issues.severity', { defaultValue: 'Severity' }),
      dataIndex: 'severity',
      width: 96,
      render: (severity: ImportIssueSeverity, issue) => (
        <StatusTag status={issueTone(issue)}>
          {t(`portal.integrations.severities.${severity}`, { defaultValue: severity })}
        </StatusTag>
      ),
    },
    {
      title: t('portal.integrations.issues.type', { defaultValue: 'Type' }),
      dataIndex: 'issueType',
      width: 200,
      render: (issueType: string) =>
        t(`portal.integrations.issueTypes.${issueType}`, { defaultValue: issueType }),
    },
    {
      title: t('portal.integrations.issues.reference', { defaultValue: 'Reference' }),
      width: 220,
      render: (_, issue) => (
        <Space direction="vertical" size={2}>
          <CopyableOrderId value={issue.externalOrderId} fallback="-" />
          {issue.externalItemId ? <CopyableListingId value={issue.externalItemId} /> : null}
        </Space>
      ),
    },
    {
      title: t('portal.integrations.issues.message', { defaultValue: 'Message' }),
      width: 300,
      render: (_, issue) => {
        const hasDetails = Object.keys(issue.details).length > 0
        const messageText = issue.errorMessage ?? issue.errorCode ?? '-'
        return (
          <Space size={6} align="center">
            <TableTextCell value={messageText} maxWidth={220} />
            {hasDetails ? (
              <Popover
                content={
                  <pre className={styles.diagnosticText}>
                    {JSON.stringify(issue.details, null, 2)}
                  </pre>
                }
                trigger="click"
                placement="topLeft"
                overlayStyle={{ zIndex: 1060 }}
              >
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0, height: 'auto', fontSize: 12 }}
                >
                  JSON
                </Button>
              </Popover>
            ) : null}
          </Space>
        )
      },
    },
    {
      title: t('portal.integrations.issues.status', { defaultValue: 'Status' }),
      dataIndex: 'status',
      width: 120,
      render: (status: ImportIssueStatus, issue) => (
        <StatusTag status={issueTone(issue)}>
          {t(`portal.integrations.issueStatuses.${status}`, { defaultValue: status })}
        </StatusTag>
      ),
    },
    ...(canWrite
      ? [
          {
            title: t('portal.integrations.issues.actions', { defaultValue: 'Actions' }),
            align: 'center' as const,
            width: 90,
            render: (_: unknown, issue: ImportIssue) =>
              issue.status === 'OPEN' && canWriteOrdersForShop(account, issue.shopId) ? (
                <Tooltip
                  title={t('portal.integrations.issues.resolve', { defaultValue: 'Resolve issue' })}
                >
                  <Button
                    aria-label={t('portal.integrations.issues.resolveLabel', {
                      defaultValue: `Resolve issue ${issue.id}`,
                      id: issue.id,
                    })}
                    icon={<CheckOutlined aria-hidden />}
                    type="text"
                    onClick={() => {
                      resolution.reset()
                      setResolvingIssue(issue)
                    }}
                  />
                </Tooltip>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <section className={styles.issueQueue}>
      <SectionCard>
        <Typography.Title level={2}>
          {t('portal.integrations.issues.title', { defaultValue: 'Import issue queue' })}
        </Typography.Title>
        {issues.error ? (
          <FeedbackAlert
            type="error"
            title={t('portal.integrations.issues.unavailable', {
              defaultValue: 'Import issues are unavailable',
            })}
            action={
              <Button
                type="link"
                icon={<ReloadOutlined aria-hidden />}
                onClick={() => void issues.refetch()}
              >
                {t('portal.integrations.retry', { defaultValue: 'Retry' })}
              </Button>
            }
          />
        ) : null}
        <CoreDataTable
          columns={columns}
          dataSource={issues.data?.items ?? []}
          loading={issues.isLoading}
          rowKey="id"
          scroll={{ x: 1250 }}
          pagination={{
            current: params.page,
            pageSize: PAGE_SIZE,
            total: issues.data?.pagination.total,
            onChange: (page) => setParams((current) => ({ ...current, page })),
          }}
          toolbar={
            <FilterBar
              label={t('portal.integrations.issues.filters', { defaultValue: 'Issue filters' })}
              contentClassName={styles.issueFilters}
            >
              <Select
                aria-label={t('portal.integrations.issues.shopFilter', {
                  defaultValue: 'Issue shop',
                })}
                allowClear
                options={shops.map((shop) => ({ label: shop.name, value: shop.id }))}
                placeholder={t('portal.integrations.issues.allShops', {
                  defaultValue: 'All shops',
                })}
                value={params.shopId}
                onChange={(shopId) => updateParams('shopId', shopId)}
              />
              <Select
                aria-label={t('portal.integrations.issues.sourceFilter', {
                  defaultValue: 'Issue source',
                })}
                allowClear
                options={SOURCES.map((source) => ({
                  label: t(`portal.integrations.sources.${source}`, { defaultValue: source }),
                  value: source,
                }))}
                placeholder={t('portal.integrations.issues.allSources', {
                  defaultValue: 'All sources',
                })}
                value={params.source}
                onChange={(source) => updateParams('source', source)}
              />
              <Select
                aria-label={t('portal.integrations.issues.severityFilter', {
                  defaultValue: 'Issue severity',
                })}
                allowClear
                options={SEVERITIES.map((severity) => ({
                  label: t(`portal.integrations.severities.${severity}`, {
                    defaultValue: severity,
                  }),
                  value: severity,
                }))}
                placeholder={t('portal.integrations.issues.allSeverities', {
                  defaultValue: 'All severities',
                })}
                value={params.severity}
                onChange={(severity) => updateParams('severity', severity)}
              />
              <Select
                aria-label={t('portal.integrations.issues.statusFilter', {
                  defaultValue: 'Issue status',
                })}
                allowClear
                options={STATUSES.map((status) => ({
                  label: t(`portal.integrations.issueStatuses.${status}`, { defaultValue: status }),
                  value: status,
                }))}
                placeholder={t('portal.integrations.issues.allStatuses', {
                  defaultValue: 'All statuses',
                })}
                value={params.status}
                onChange={(status) => updateParams('status', status)}
              />
              <Select
                aria-label={t('portal.integrations.issues.typeFilter', {
                  defaultValue: 'Issue type',
                })}
                allowClear
                showSearch
                options={ISSUE_TYPES.map((issueType) => ({
                  label: t(`portal.integrations.issueTypes.${issueType}`, {
                    defaultValue: issueType,
                  }),
                  value: issueType,
                }))}
                placeholder={t('portal.integrations.issues.allTypes', {
                  defaultValue: 'All issue types',
                })}
                value={params.issueType}
                onChange={(issueType) => updateParams('issueType', issueType)}
              />
              <SearchInput
                aria-label={t('portal.integrations.issues.externalOrderId', {
                  defaultValue: 'External order ID',
                })}
                allowClear
                placeholder={t('portal.integrations.issues.externalOrderId', {
                  defaultValue: 'External order ID',
                })}
                value={params.externalOrderId}
                onSearchChange={(value) => updateParams('externalOrderId', value)}
              />
              <SearchInput
                aria-label={t('portal.integrations.issues.externalItemId', {
                  defaultValue: 'External item ID',
                })}
                allowClear
                placeholder={t('portal.integrations.issues.externalItemId', {
                  defaultValue: 'External item ID',
                })}
                value={params.externalItemId}
                onSearchChange={(value) => updateParams('externalItemId', value)}
              />
            </FilterBar>
          }
        />
        <IssueResolutionModal
          issue={resolvingIssue}
          open={Boolean(resolvingIssue)}
          saving={resolution.isPending}
          error={resolution.error}
          onClose={() => {
            resolution.reset()
            setResolvingIssue(undefined)
          }}
          onSubmit={(input) => resolution.mutate(input)}
        />
      </SectionCard>
    </section>
  )
}
