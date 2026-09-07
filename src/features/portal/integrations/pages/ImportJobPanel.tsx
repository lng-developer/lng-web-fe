import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Drawer, Modal, Progress, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { modalQueryOptions } from '@/shared/query/modalQuery'
import {
  CopyableOrderId,
  DetailDrawer,
  FeedbackAlert,
  LoadingState,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  type ImportJobStatus,
  type ImportRawRecord,
  listJobRawRecords,
  retryImportJob,
  retryPostImportRawRecords,
} from '../api/integrationApi'
import { integrationKeys } from '../api/integrationKeys'
import { canWriteOrdersForShop } from '../auth/integrationAccess'
import { useImportJobPolling } from '../hooks/useImportJobPolling'
import styles from './IntegrationWorkbenchPage.module.scss'

const ACTIVE_POST_IMPORT_STATUSES = new Set(['QUEUED', 'PROCESSING'])

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
  readonly presentation?: 'drawer' | 'panel'
}

export function ImportJobPanel(props: ImportJobPanelProps) {
  return <ImportJobPanelForJob key={props.jobId ?? 'none'} {...props} />
}

function ImportJobPanelForJob({
  account,
  jobId,
  status,
  open,
  onClose,
  presentation = 'drawer',
}: ImportJobPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [rawPage, setRawPage] = useState(1)
  const [confirmRetry, setConfirmRetry] = useState(false)
  const [rawDrawerOpen, setRawDrawerOpen] = useState(false)
  const job = useImportJobPolling(open ? jobId : undefined, status)
  const rawParams = { page: rawPage, limit: DEFAULT_PAGE_SIZE }
  const rawRecords = useQuery({
    queryKey: integrationKeys.rawRecords(jobId ?? '', rawParams),
    queryFn: () => listJobRawRecords(jobId!, rawParams),
    ...modalQueryOptions,
    enabled: open && Boolean(jobId),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.items.some(({ postImportStatus }) =>
        ACTIVE_POST_IMPORT_STATUSES.has(postImportStatus),
      )
        ? 5_000
        : false,
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

  const rawColumns: TableColumnsType<ImportRawRecord> = [
    {
      title: t('portal.integrations.raw.row', { defaultValue: 'Row' }),
      dataIndex: 'rowNumber',
      width: 80,
    },
    {
      title: t('portal.integrations.raw.reference', { defaultValue: 'Reference' }),
      width: 240,
      render: (_, raw) => (
        <>
          <CopyableOrderId value={raw.externalOrderId} fallback="-" /> / {raw.externalItemId ?? '-'}
        </>
      ),
    },
    ...(['normalizeStatus', 'importStatus', 'postImportStatus'] as const).map((field) => ({
      title: t(`portal.integrations.raw.${field}`, { defaultValue: field }),
      dataIndex: field,
      width: 128,
      render: (value: string) => (
        <StatusTag status={recordTone(value)}>
          {t(`portal.integrations.recordStatuses.${value}`, { defaultValue: value })}
        </StatusTag>
      ),
    })),
    {
      title: t('portal.integrations.raw.actions', { defaultValue: 'Actions' }),
      width: 132,
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

  const detailContent = (
    <>
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
                {job.data.job.finishedAt ? new Date(job.data.job.finishedAt).toLocaleString() : '-'}
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
          {presentation !== 'panel' ? (
            <section>
              <Typography.Title level={3}>
                {t('portal.integrations.panel.rawRecords', { defaultValue: 'Raw records' })}
              </Typography.Title>
              <CoreDataTable
                tableLayout="fixed"
                scroll={{ x: 960 }}
                columns={rawColumns}
                dataSource={rawRecords.data?.items ?? []}
                loading={rawRecords.isLoading}
                rowKey="id"
                pagination={{
                  current: rawPage,
                  pageSize: DEFAULT_PAGE_SIZE,
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
          ) : null}
        </div>
      ) : null}
    </>
  )

  const retryAction = canRetry ? (
    <Button onClick={() => setConfirmRetry(true)}>
      {t('portal.integrations.panel.retry', { defaultValue: 'Retry import' })}
    </Button>
  ) : null

  return (
    <>
      {presentation === 'panel' ? (
        <aside
          aria-label={t('portal.integrations.panel.detailRegion', {
            defaultValue: 'Import job details',
          })}
          className={styles.contextPanel}
        >
          <div className={styles.contextPanelHeader}>
            <Typography.Text strong>
              {`${t('portal.integrations.panel.title', { defaultValue: 'Import job' })} ${jobId ?? ''}`}
            </Typography.Text>
            <Button size="small" type="text" onClick={onClose}>
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
          </div>
          {detailContent}
          <Button block onClick={() => setRawDrawerOpen(true)}>
            {t('portal.integrations.panel.viewRawRecords', { defaultValue: 'View raw records' })}
          </Button>
          {retryAction ? <div className={styles.contextPanelFooter}>{retryAction}</div> : null}
          <Drawer
            destroyOnHidden
            open={rawDrawerOpen}
            placement="right"
            title={t('portal.integrations.panel.rawRecords', { defaultValue: 'Raw records' })}
            width={960}
            onClose={() => setRawDrawerOpen(false)}
          >
            <CoreDataTable
              tableLayout="fixed"
              scroll={{ x: 960 }}
              columns={rawColumns}
              dataSource={rawRecords.data?.items ?? []}
              loading={rawRecords.isLoading}
              rowKey="id"
              pagination={{
                current: rawPage,
                pageSize: DEFAULT_PAGE_SIZE,
                total: rawRecords.data?.pagination.total,
                onChange: setRawPage,
              }}
            />
          </Drawer>
        </aside>
      ) : (
        <DetailDrawer
          open={open}
          width={900}
          title={`${t('portal.integrations.panel.title', { defaultValue: 'Import job' })} ${jobId ?? ''}`}
          onClose={onClose}
          footer={retryAction}
        >
          {detailContent}
        </DetailDrawer>
      )}
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
