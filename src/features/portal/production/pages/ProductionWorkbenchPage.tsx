import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  DownloadOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Drawer, Input, Modal, Select, Slider, Space, Tabs, Typography, Upload } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  DataTable,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  claimProductionTask,
  type FileCheck,
  type FileDecision,
  getProductionTask,
  listProductionTasks,
  type ProductionStatus,
  type ProductionTask,
  submitProductionQc,
  summarizeProductionTasks,
  updateDesignNote,
  uploadScaledOutput,
} from '../api/productionApi'
import { productionKeys } from '../api/productionKeys'
import styles from './ProductionWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const SCALE_STATUSES: ProductionStatus[] = ['BLOCKED', 'NEED_SCALE', 'QC_REJECTED', 'QC_PENDING']

function permissions(account?: CurrentAccount) {
  return new Set(
    account
      ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
      : [],
  )
}

function tone(status: string) {
  if (['PASSED', 'SENT_TO_VENDOR'].includes(status)) return 'operational'
  if (['READY_TO_SEND_VENDOR'].includes(status)) return 'ready'
  if (['QC_PENDING', 'PENDING', 'NEED_SCALE'].includes(status)) return 'processing'
  if (['QC_REJECTED', 'REJECTED', 'BLOCKED'].includes(status)) return 'critical'
  return 'pending'
}

function ArtworkInspector({
  check,
  open,
  onClose,
}: {
  check?: FileCheck
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(100)
  const scale = zoom / 100
  return (
    <Modal
      open={open}
      width="96vw"
      footer={null}
      title={t('portal.production.inspectArtwork', { slot: check?.slotLabel || check?.slotKey })}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className={styles.toolbar}>
        <Space>
          <Button
            icon={<ZoomOutOutlined />}
            onClick={() => setZoom((value) => Math.max(25, value - 25))}
            aria-label={t('portal.production.zoomOut')}
          />
          <Slider
            min={25}
            max={400}
            step={25}
            value={zoom}
            onChange={setZoom}
            style={{ width: 220 }}
          />
          <Button
            icon={<ZoomInOutlined />}
            onClick={() => setZoom((value) => Math.min(400, value + 25))}
            aria-label={t('portal.production.zoomIn')}
          />
          <Typography.Text>
            {zoom}% · {t('portal.production.syncZoom')}
          </Typography.Text>
        </Space>
        <Button onClick={() => setZoom(100)}>{t('portal.production.resetView')}</Button>
      </div>
      <div className={styles.inspector}>
        {(
          [
            [t('portal.production.original'), check?.inputAssetDownloadUrl],
            [t('portal.production.scaled'), check?.outputAssetDownloadUrl],
          ] as Array<[string, string | null | undefined]>
        ).map(([label, url]) => (
          <div className={styles.canvas} key={label}>
            <Typography.Text strong>{label}</Typography.Text>
            {url ? (
              <img src={url} alt={label} style={{ transform: `scale(${scale})` }} />
            ) : (
              <Typography.Text type="secondary">
                {t('portal.production.fileMissing')}
              </Typography.Text>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

export function ProductionWorkbenchPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const { t } = useTranslation()
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const account = accountProp ?? loadedAccount
  const allowed = permissions(account)
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [tab, setTab] = useState<'scale' | 'qc'>('scale')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProductionStatus>()
  const [selectedId, setSelectedId] = useState<string>()
  const [inspect, setInspect] = useState<FileCheck>()
  const [note, setNote] = useState('')
  const [decisions, setDecisions] = useState<Record<string, FileDecision>>({})
  const canScale = allowed.has('PRODUCTION:WRITE') || allowed.has('DESIGN:WORK')
  const canQc = allowed.has('PRODUCTION:WRITE') || allowed.has('DESIGN:REVIEW')
  const filters = {
    search: search || undefined,
    status,
    ...(tab === 'qc' ? { view: 'QC' as const } : {}),
  }
  const params = { ...filters, page, limit: PAGE_SIZE }
  const tasks = useQuery({
    queryKey: productionKeys.list(params),
    queryFn: () => listProductionTasks(params),
    retry: false,
  })
  const summary = useQuery({
    queryKey: productionKeys.summary(filters),
    queryFn: () => summarizeProductionTasks(filters),
    retry: false,
  })
  const detail = useQuery({
    queryKey: productionKeys.detail(selectedId ?? ''),
    queryFn: () => getProductionTask(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })
  const refresh = async () => queryClient.invalidateQueries({ queryKey: productionKeys.all })
  const action = useMutation({
    mutationFn: async (input: { kind: 'claim' | 'note' | 'qc'; task: ProductionTask }) => {
      if (input.kind === 'claim') return claimProductionTask(input.task.id)
      if (input.kind === 'note') return updateDesignNote(input.task.id, note)
      return submitProductionQc(input.task.id, Object.values(decisions))
    },
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const rows = tasks.data?.items ?? []
  const columns: TableColumnsType<ProductionTask> = useMemo(
    () => [
      {
        title: t('portal.production.columns.order'),
        render: (_, row) => row.orderItem?.externalOrderId || row.id,
      },
      {
        title: t('portal.production.columns.product'),
        render: (_, row) => (
          <>
            <Typography.Text>{row.orderItem?.title || '-'}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{row.orderItem?.sku || '-'}</Typography.Text>
          </>
        ),
      },
      { title: t('portal.production.columns.shop'), render: (_, row) => row.shop?.name || '-' },
      {
        title: t('portal.production.columns.files'),
        render: (_, row) =>
          `${(row.qcPreviewFileChecks || row.fileChecks || []).filter((check) => check.outputAssetDownloadUrl).length}/${(row.qcPreviewFileChecks || row.fileChecks || []).filter((check) => check.required).length}`,
      },
      {
        title: t('portal.production.columns.status'),
        dataIndex: tab === 'qc' ? 'qcStatus' : 'status',
        render: (value: string) => (
          <StatusTag status={tone(value)}>{t(`portal.production.statuses.${value}`)}</StatusTag>
        ),
      },
      {
        title: t('portal.production.columns.updated'),
        dataIndex: 'updatedAt',
        render: (value: string) => new Date(value).toLocaleString(),
      },
    ],
    [t, tab],
  )
  const task = detail.data
  const checks = task?.fileChecks ?? task?.qcPreviewFileChecks ?? []
  const requiredChecks = checks.filter((check) => check.required && check.outputAssetDownloadUrl)
  const canSubmitQc =
    requiredChecks.length > 0 && requiredChecks.every((check) => decisions[check.id])

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.production.title')}
        description={t('portal.production.description')}
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
            {t('portal.production.refresh')}
          </Button>
        }
      />
      {tasks.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.production.unavailable')} />
      ) : null}
      <div className={styles.metrics}>
        {['total', 'blocked', 'needScale', 'qcPending', 'ready'].map((key) => (
          <div className={styles.metric} key={key}>
            <Typography.Text type="secondary">
              {t(`portal.production.metrics.${key}`)}
            </Typography.Text>
            <Typography.Title level={3}>{summary.data?.[key] ?? 0}</Typography.Title>
          </div>
        ))}
      </div>
      <SectionCard>
        <Tabs
          activeKey={tab}
          onChange={(value) => {
            setTab(value as 'scale' | 'qc')
            setPage(1)
            setStatus(undefined)
          }}
          items={[
            { key: 'scale', label: t('portal.production.scaleQueue') },
            { key: 'qc', label: t('portal.production.qcQueue') },
          ]}
        />
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={tasks.isLoading}
          onRow={(row) => ({
            onClick: () => {
              setSelectedId(row.id)
              setNote(row.designNote || '')
              setDecisions({})
            },
          })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: tasks.data?.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar label={t('portal.production.filters')} contentClassName={styles.filters}>
              <Input.Search
                className={styles.search}
                allowClear
                value={search}
                placeholder={t('portal.production.search')}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                className={styles.filter}
                allowClear
                value={status}
                placeholder={t('portal.production.allStatuses')}
                options={SCALE_STATUSES.map((value) => ({
                  value,
                  label: t(`portal.production.statuses.${value}`),
                }))}
                onChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
              />
            </FilterBar>
          }
        />
      </SectionCard>
      <Drawer
        width={720}
        open={Boolean(selectedId)}
        title={tab === 'qc' ? t('portal.production.qcReview') : t('portal.production.scaleTask')}
        onClose={() => setSelectedId(undefined)}
        loading={detail.isLoading}
        extra={
          task && tab === 'scale' && canScale ? (
            <Button onClick={() => action.mutate({ kind: 'claim', task })}>
              {t('portal.production.claim')}
            </Button>
          ) : null
        }
      >
        {task ? (
          <div className={styles.drawer}>
            {task.blockers.length ? (
              <FeedbackAlert type="warning" title={task.blockers.join(', ')} />
            ) : null}
            {checks.map((check) => (
              <div className={styles.slot} key={check.id}>
                <Space className="justify-between">
                  <Typography.Title level={5}>{check.slotLabel || check.slotKey}</Typography.Title>
                  <StatusTag status={tone(check.qcStatus)}>
                    {t(`portal.production.statuses.${check.qcStatus}`)}
                  </StatusTag>
                </Space>
                <div className={styles.slotFiles}>
                  <div className={styles.preview}>
                    {check.inputAssetDownloadUrl ? (
                      <img
                        src={check.inputAssetDownloadUrl}
                        alt={t('portal.production.original')}
                      />
                    ) : (
                      t('portal.production.fileMissing')
                    )}
                  </div>
                  <div className={styles.preview}>
                    {check.outputAssetDownloadUrl ? (
                      <img src={check.outputAssetDownloadUrl} alt={t('portal.production.scaled')} />
                    ) : (
                      t('portal.production.fileMissing')
                    )}
                  </div>
                </div>
                <Space wrap>
                  <Button onClick={() => setInspect(check)}>
                    {t('portal.production.inspect')}
                  </Button>
                  {check.inputAssetDownloadUrl ? (
                    <Button href={check.inputAssetDownloadUrl} icon={<DownloadOutlined />}>
                      {t('portal.production.downloadOriginal')}
                    </Button>
                  ) : null}
                  {tab === 'scale' && canScale ? (
                    <Upload
                      showUploadList={false}
                      beforeUpload={(file) => {
                        void uploadScaledOutput(task.id, check.id, file).then(refresh)
                        return false
                      }}
                    >
                      <Button>{t('portal.production.uploadOutput')}</Button>
                    </Upload>
                  ) : null}
                  {tab === 'qc' && canQc && check.outputAssetDownloadUrl ? (
                    <>
                      <Button
                        type={decisions[check.id]?.decision === 'PASSED' ? 'primary' : 'default'}
                        onClick={() =>
                          setDecisions((current) => ({
                            ...current,
                            [check.id]: { fileCheckId: check.id, decision: 'PASSED' },
                          }))
                        }
                      >
                        {t('portal.production.passSlot')}
                      </Button>
                      <Button
                        danger
                        onClick={() =>
                          Modal.confirm({
                            title: t('portal.production.rejectReason'),
                            content: <Input.TextArea id={`reason-${check.id}`} />,
                            onOk: () => {
                              const value = (
                                document.getElementById(
                                  `reason-${check.id}`,
                                ) as HTMLTextAreaElement | null
                              )?.value.trim()
                              if (!value)
                                return Promise.reject(
                                  new Error(t('portal.production.reasonRequired')),
                                )
                              setDecisions((current) => ({
                                ...current,
                                [check.id]: {
                                  fileCheckId: check.id,
                                  decision: 'REJECTED',
                                  note: value,
                                },
                              }))
                            },
                          })
                        }
                      >
                        {t('portal.production.rejectSlot')}
                      </Button>
                    </>
                  ) : null}
                </Space>
              </div>
            ))}
            {tab === 'scale' && canScale ? (
              <>
                <Input.TextArea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('portal.production.designNote')}
                />
                <Button onClick={() => action.mutate({ kind: 'note', task })}>
                  {t('portal.production.saveNote')}
                </Button>
              </>
            ) : null}
            {tab === 'qc' && canQc ? (
              <Button
                type="primary"
                disabled={!canSubmitQc}
                loading={action.isPending}
                onClick={() => action.mutate({ kind: 'qc', task })}
              >
                {t('portal.production.submitQc')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Drawer>
      <ArtworkInspector
        check={inspect}
        open={Boolean(inspect)}
        onClose={() => setInspect(undefined)}
      />
    </section>
  )
}

export default ProductionWorkbenchPage
