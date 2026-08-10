import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Modal, Progress, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { modalQueryOptions } from '@/shared/query/modalQuery'
import {
  CopyableOrderId,
  DataTable,
  DetailDrawer,
  FeedbackAlert,
  LoadingState,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  type ImportIssue,
  type ImportJobStatus,
  type ImportRawRecord,
  listJobIssues,
  listJobRawRecords,
  retryImportJob,
  retryPostImportRawRecords,
} from '../api/integrationApi'
import { integrationKeys } from '../api/integrationKeys'
import { canWriteOrdersForShop } from '../auth/integrationAccess'
import { useImportJobPolling } from '../hooks/useImportJobPolling'
import styles from './IntegrationWorkbenchPage.module.scss'

const PAGE_SIZE = 10

function issueTone(status: ImportIssue['status']) {
  if (status === 'RESOLVED') return 'approved'
  if (status === 'IGNORED') return 'cancelled'
  return 'warning'
}

function recordTone(status: string) {
  if (status === 'COMPLETED' || status === 'IMPORTED' || status === 'NORMALIZED') {
    return 'operational'
  }
  if (status === 'FAILED') return 'critical'
  if (status === 'SKIPPED') return 'cancelled'
  return 'pending'
}

export interface ImportJobPanelProps {
  readonly account?: CurrentAccount
  readonly jobId?: string
  readonly status?: ImportJobStatus
  readonly open: boolean
  readonly onClose: () => void
}

export function ImportJobPanel(props: ImportJobPanelProps) {
  return <ImportJobPanelForJob key={props.jobId ?? 'none'} {...props} />
}

function ImportJobPanelForJob({ account, jobId, status, open, onClose }: ImportJobPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [issuePage, setIssuePage] = useState(1)
  const [rawPage, setRawPage] = useState(1)
  const [confirmRetry, setConfirmRetry] = useState(false)
  const job = useImportJobPolling(open ? jobId : undefined, status)
  const issueParams = { page: issuePage, limit: PAGE_SIZE }
  const rawParams = { page: rawPage, limit: PAGE_SIZE }
  const issues = useQuery({
    queryKey: integrationKeys.jobIssues(jobId ?? '', issueParams),
    queryFn: () => listJobIssues(jobId!, issueParams),
    ...modalQueryOptions,
    enabled: open && Boolean(jobId),
    retry: false,
  })
  const rawRecords = useQuery({
    queryKey: integrationKeys.rawRecords(jobId ?? '', rawParams),
    queryFn: () => listJobRawRecords(jobId!, rawParams),
    ...modalQueryOptions,
    enabled: open && Boolean(jobId),
    retry: false,
  })
  const retry = useMutation({
    mutationFn: () => retryImportJob(jobId!),
    onSuccess: async () => {
      setConfirmRetry(false)
      showFeedbackToast(
        'success',
        t('portal.integrations.panel.retryQueued', { defaultValue: 'Import retry completed' }),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: integrationKeys.jobProgress(jobId!) }),
        queryClient.invalidateQueries({ queryKey: [...integrationKeys.all, 'jobs'] }),
      ])
    },
    onError: (error) =>
      showFeedbackToast(
        'error',
        t('portal.integrations.panel.retryFailed', { defaultValue: 'Import retry failed' }),
        error.message,
      ),
  })
  const retryPostImport = useMutation({
    mutationFn: (rawRecordId: string) => retryPostImportRawRecords(jobId!, [rawRecordId]),
    onSuccess: async (result) => {
      showFeedbackToast(
        result.queuedCount > 0 ? 'success' : 'warning',
        t('portal.integrations.panel.postImportRetryQueued', {
          defaultValue: `${result.queuedCount} mapping retry queued`,
        }),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: integrationKeys.jobProgress(jobId!) }),
        queryClient.invalidateQueries({ queryKey: integrationKeys.rawRecords(jobId!, rawParams) }),
      ])
    },
    onError: (error) =>
      showFeedbackToast(
        'error',
        t('portal.integrations.panel.postImportRetryFailed', {
          defaultValue: 'Mapping retry failed',
        }),
        error.message,
      ),
  })
  const canRetry =
    Boolean(account && canWriteOrdersForShop(account, job.data?.job.shopId ?? null)) &&
    ['FAILED', 'PARTIAL_FAILED'].includes(job.data?.job.status ?? status ?? '')
  const canRetryPostImport = Boolean(
    account && canWriteOrdersForShop(account, job.data?.job.shopId ?? null),
  )
  const progressItems = job.data
    ? [
        {
          key: 'parse',
          label: t('portal.integrations.panel.parseProgress', { defaultValue: 'Parse file' }),
          phase: job.data.phases.parse,
        },
        {
          key: 'import',
          label: t('portal.integrations.panel.importProgress', { defaultValue: 'Import orders' }),
          phase: job.data.phases.import,
        },
        {
          key: 'postImport',
          label: t('portal.integrations.panel.postImportProgress', {
            defaultValue: 'Assets and mapping',
          }),
          phase: job.data.phases.postImport,
        },
      ]
    : []

  const issueColumns: TableColumnsType<ImportIssue> = [
    {
      title: t('portal.integrations.issues.severity', { defaultValue: 'Severity' }),
      dataIndex: 'severity',
      render: (severity: ImportIssue['severity']) => (
        <StatusTag
          status={severity === 'CRITICAL' || severity === 'ERROR' ? 'critical' : 'warning'}
        >
          {t(`portal.integrations.severities.${severity}`, { defaultValue: severity })}
        </StatusTag>
      ),
    },
    {
      title: t('portal.integrations.issues.type', { defaultValue: 'Type' }),
      dataIndex: 'issueType',
      render: (issueType: string) =>
        t(`portal.integrations.issueTypes.${issueType}`, { defaultValue: issueType }),
    },
    {
      title: t('portal.integrations.issues.reference', { defaultValue: 'Reference' }),
      render: (_, issue) => (
        <>
          <CopyableOrderId value={issue.externalOrderId} fallback="-" /> /{' '}
          {issue.externalItemId ?? '-'}
        </>
      ),
    },
    {
      title: t('portal.integrations.issues.message', { defaultValue: 'Message' }),
      render: (_, issue) => (
        <div>
          <div>{issue.errorMessage ?? issue.errorCode ?? '-'}</div>
          {Object.keys(issue.details).length > 0 ? (
            <pre className={styles.diagnosticText}>{JSON.stringify(issue.details, null, 2)}</pre>
          ) : null}
        </div>
      ),
    },
    {
      title: t('portal.integrations.issues.status', { defaultValue: 'Status' }),
      dataIndex: 'status',
      render: (issueStatus: ImportIssue['status']) => (
        <StatusTag status={issueTone(issueStatus)}>
          {t(`portal.integrations.issueStatuses.${issueStatus}`, {
            defaultValue: issueStatus,
          })}
        </StatusTag>
      ),
    },
  ]
  const rawColumns: TableColumnsType<ImportRawRecord> = [
    {
      title: t('portal.integrations.raw.row', { defaultValue: 'Row' }),
      dataIndex: 'rowNumber',
    },
    {
      title: t('portal.integrations.raw.reference', { defaultValue: 'Reference' }),
      render: (_, raw) => (
        <>
          <CopyableOrderId value={raw.externalOrderId} fallback="-" /> / {raw.externalItemId ?? '-'}
        </>
      ),
    },
    ...(['normalizeStatus', 'importStatus', 'postImportStatus'] as const).map((field) => ({
      title: t(`portal.integrations.raw.${field}`, { defaultValue: field }),
      dataIndex: field,
      render: (value: string) => (
        <StatusTag status={recordTone(value)}>
          {t(`portal.integrations.recordStatuses.${value}`, { defaultValue: value })}
        </StatusTag>
      ),
    })),
    {
      title: t('portal.integrations.raw.actions', { defaultValue: 'Actions' }),
      render: (_, raw) =>
        canRetryPostImport && raw.postImportStatus !== 'COMPLETED' ? (
          <Button
            size="small"
            loading={retryPostImport.isPending}
            onClick={() => retryPostImport.mutate(raw.id)}
          >
            {t('portal.integrations.raw.retryMapping', { defaultValue: 'Retry mapping' })}
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <DetailDrawer
        open={open}
        width={900}
        title={`${t('portal.integrations.panel.title', { defaultValue: 'Import job' })} ${jobId ?? ''}`}
        onClose={onClose}
        footer={
          canRetry ? (
            <Button onClick={() => setConfirmRetry(true)}>
              {t('portal.integrations.panel.retry', { defaultValue: 'Retry import' })}
            </Button>
          ) : undefined
        }
      >
        {job.isLoading ? <LoadingState variant="card" /> : null}
        {job.error ? (
          <FeedbackAlert
            type="error"
            title={t('portal.integrations.panel.unavailable', {
              defaultValue: 'Import job is unavailable',
            })}
            action={
              <Button
                icon={<ReloadOutlined aria-hidden />}
                type="link"
                onClick={() => void job.refetch()}
              >
                {t('portal.integrations.retry', { defaultValue: 'Retry' })}
              </Button>
            }
          />
        ) : null}
        {job.data ? (
          <div className={styles.panelContent}>
            <section>
              <Typography.Title level={3}>
                {t('portal.integrations.panel.summary', { defaultValue: 'Summary' })}
              </Typography.Title>
              <Descriptions column={2} size="small">
                <Descriptions.Item
                  label={t('portal.integrations.jobs.status', { defaultValue: 'Status' })}
                >
                  {t(`portal.integrations.statuses.${job.data.job.status}`, {
                    defaultValue: job.data.job.status,
                  })}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('portal.integrations.jobs.source', { defaultValue: 'Source' })}
                >
                  {t(`portal.integrations.sources.${job.data.job.source}`, {
                    defaultValue: job.data.job.source,
                  })}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('portal.integrations.panel.imported', { defaultValue: 'Imported' })}
                >
                  {`${job.data.job.importedCount} ${t('portal.integrations.jobs.imported', { defaultValue: 'imported' })}`}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('portal.integrations.panel.failed', { defaultValue: 'Failed' })}
                >
                  {job.data.job.failedCount}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('portal.integrations.panel.started', { defaultValue: 'Started' })}
                >
                  {job.data.job.startedAt ? new Date(job.data.job.startedAt).toLocaleString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('portal.integrations.panel.finished', { defaultValue: 'Finished' })}
                >
                  {job.data.job.finishedAt
                    ? new Date(job.data.job.finishedAt).toLocaleString()
                    : '-'}
                </Descriptions.Item>
              </Descriptions>
              <div className={styles.progressList}>
                {progressItems.map(({ key, label, phase }) => (
                  <div className={styles.progressRow} key={key}>
                    <div className={styles.progressMeta}>
                      <Typography.Text strong>{label}</Typography.Text>
                      <Typography.Text type="secondary">
                        {`${phase.completed}/${phase.total}`}
                        {phase.failed ? ` · ${phase.failed} failed` : ''}
                        {phase.processing ? ` · ${phase.processing} processing` : ''}
                        {phase.queued ? ` · ${phase.queued} queued` : ''}
                      </Typography.Text>
                    </div>
                    <Progress
                      percent={phase.percentage}
                      status={
                        phase.failed ? 'exception' : phase.percentage >= 100 ? 'success' : 'active'
                      }
                    />
                  </div>
                ))}
              </div>
              {job.data.issues.open ? (
                <FeedbackAlert
                  type="warning"
                  title={t('portal.integrations.panel.openIssues', {
                    defaultValue: `${job.data.issues.open} open import issues`,
                    count: job.data.issues.open,
                  })}
                />
              ) : null}
              {job.data.job.errorMessage ? (
                <FeedbackAlert
                  type="error"
                  title={job.data.job.errorMessage}
                  description={job.data.job.errorCode ?? undefined}
                />
              ) : null}
            </section>
            <section>
              <Typography.Title level={3}>
                {t('portal.integrations.panel.issues', { defaultValue: 'Issues' })}
              </Typography.Title>
              <DataTable
                columns={issueColumns}
                dataSource={issues.data?.items ?? []}
                loading={issues.isLoading}
                rowKey="id"
                pagination={{
                  current: issuePage,
                  pageSize: PAGE_SIZE,
                  total: issues.data?.pagination.total,
                  onChange: setIssuePage,
                }}
              />
              {issues.error ? (
                <FeedbackAlert
                  type="error"
                  title={t('portal.integrations.panel.issuesUnavailable', {
                    defaultValue: 'Import issues are unavailable',
                  })}
                  action={
                    <Button
                      aria-label={t('portal.integrations.panel.retryIssues', {
                        defaultValue: 'Retry issues',
                      })}
                      icon={<ReloadOutlined aria-hidden />}
                      type="link"
                      onClick={() => void issues.refetch()}
                    >
                      {t('portal.integrations.retry', { defaultValue: 'Retry' })}
                    </Button>
                  }
                />
              ) : null}
            </section>
            <section>
              <Typography.Title level={3}>
                {t('portal.integrations.panel.rawRecords', { defaultValue: 'Raw records' })}
              </Typography.Title>
              <DataTable
                columns={rawColumns}
                dataSource={rawRecords.data?.items ?? []}
                loading={rawRecords.isLoading}
                rowKey="id"
                pagination={{
                  current: rawPage,
                  pageSize: PAGE_SIZE,
                  total: rawRecords.data?.pagination.total,
                  onChange: setRawPage,
                }}
              />
              {rawRecords.error ? (
                <FeedbackAlert
                  type="error"
                  title={t('portal.integrations.panel.rawRecordsUnavailable', {
                    defaultValue: 'Raw records are unavailable',
                  })}
                  action={
                    <Button
                      aria-label={t('portal.integrations.panel.retryRawRecords', {
                        defaultValue: 'Retry raw records',
                      })}
                      icon={<ReloadOutlined aria-hidden />}
                      type="link"
                      onClick={() => void rawRecords.refetch()}
                    >
                      {t('portal.integrations.retry', { defaultValue: 'Retry' })}
                    </Button>
                  }
                />
              ) : null}
            </section>
          </div>
        ) : null}
      </DetailDrawer>
      <Modal
        open={confirmRetry}
        title={t('portal.integrations.panel.confirmTitle', { defaultValue: 'Retry this import?' })}
        okText={t('portal.integrations.panel.confirmRetry', { defaultValue: 'Confirm retry' })}
        cancelText={t('portal.integrations.cancel', { defaultValue: 'Cancel' })}
        confirmLoading={retry.isPending}
        onCancel={() => setConfirmRetry(false)}
        onOk={() => retry.mutate()}
      >
        {t('portal.integrations.panel.confirmDescription', {
          defaultValue: 'Failed rows and eligible post-import work will be retried.',
        })}
      </Modal>
    </>
  )
}
