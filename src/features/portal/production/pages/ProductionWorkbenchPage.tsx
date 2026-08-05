import {
  type Key,
  type PointerEvent as ReactPointerEvent,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Modal, Select, Slider, Space, Tabs, Typography, Upload } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'
import {
  CopyableOrderId,
  DataTable,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  assignCsTask,
  assignProductionTask,
  bulkAssignProductionTasks,
  claimProductionTask,
  type CsStatus,
  exportProductionQcTasks,
  type FileCheck,
  type FileDecision,
  getProductionTask,
  listCsAssignees,
  listProductionTasks,
  listScaleAssignees,
  type ManualScaledOutput,
  type ProductionStatus,
  type ProductionTask,
  recheckPsdBlockedTasks,
  submitProductionQc,
  summarizeProductionTasks,
  updateDesignNote,
  updateProductionCsNote,
  updateProductionCsStatus,
  uploadManualScaledOutput,
  uploadScaledOutput,
} from '../api/productionApi'
import { productionKeys } from '../api/productionKeys'
import { ManualSlotUploadModal } from './ManualSlotUploadModal'
import styles from './ProductionWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const SCALE_STATUSES: ProductionStatus[] = ['BLOCKED', 'NEED_SCALE', 'QC_REJECTED', 'QC_PENDING']
const CS_STATUSES: CsStatus[] = ['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'DONE']

function formatInputValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    const entries = value.filter(
      (item): item is string | number => typeof item === 'string' || typeof item === 'number',
    )
    return entries.length ? entries.join(', ') : null
  }
  return null
}

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
  const inspectorRef = useRef<HTMLDivElement>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const scale = zoom / 100

  const applyPan = (x: number, y: number) => {
    panRef.current = { x, y }
    inspectorRef.current?.style.setProperty('--inspect-pan-x', `${x}px`)
    inspectorRef.current?.style.setProperty('--inspect-pan-y', `${y}px`)
  }
  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: panRef.current.x,
      originY: panRef.current.y,
    }
  }
  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    applyPan(drag.originX + event.clientX - drag.startX, drag.originY + event.clientY - drag.startY)
  }
  const stopPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }
  const resetView = () => {
    setZoom(100)
    applyPan(0, 0)
  }
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
        <Button onClick={resetView}>{t('portal.production.resetView')}</Button>
      </div>
      <div className={styles.inspector} ref={inspectorRef}>
        {(
          [
            [t('portal.production.original'), check?.inputAssetDownloadUrl],
            [t('portal.production.scaled'), check?.outputAssetDownloadUrl],
          ] as Array<[string, string | null | undefined]>
        ).map(([label, url]) => (
          <div
            className={styles.canvas}
            key={label}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={stopPan}
            onPointerCancel={stopPan}
          >
            <Typography.Text strong>{label}</Typography.Text>
            {url ? (
              <AuthenticatedMediaImage
                downloadUrl={url}
                alt={label}
                className={styles.pannableImage}
                draggable={false}
                style={{
                  transform: `translate(var(--inspect-pan-x, 0px), var(--inspect-pan-y, 0px)) scale(${scale})`,
                }}
              />
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
  const legacyDetailEnabled = selectedId === '__legacy__'
  const [inspect, setInspect] = useState<FileCheck>()
  const [note, setNote] = useState('')
  const [decisions, setDecisions] = useState<Record<string, FileDecision>>({})
  const [manualSlotOpen, setManualSlotOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [scaleAssigneeId, setScaleAssigneeId] = useState<string>()
  const [csAssigneeId, setCsAssigneeId] = useState<string>()
  const [csNote, setCsNote] = useState('')
  const [csStatus, setCsStatus] = useState<CsStatus>('UNASSIGNED')
  const canScale = allowed.has('PRODUCTION:WRITE')
  const canAssignScale = tab === 'scale' && canScale
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
    placeholderData: keepPreviousData,
    retry: false,
  })
  const summary = useQuery({
    queryKey: productionKeys.summary(filters),
    queryFn: () => summarizeProductionTasks(filters),
    retry: false,
  })
  const scaleAssignees = useQuery({
    queryKey: [...productionKeys.all, 'scale-assignees'],
    queryFn: () => listScaleAssignees({ limit: 100 }),
    enabled: canAssignScale,
    retry: false,
  })
  const csAssignees = useQuery({
    queryKey: [...productionKeys.all, 'cs-assignees'],
    queryFn: () => listCsAssignees({ limit: 100 }),
    enabled: canAssignScale,
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
  const manualUpload = useMutation({
    mutationFn: (input: ManualScaledOutput) => uploadManualScaledOutput(selectedId!, input),
    onSuccess: async () => {
      setManualSlotOpen(false)
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const operations = useMutation({
    mutationFn: async (input: {
      kind: 'bulk-assign' | 'recheck' | 'assign' | 'assign-cs' | 'cs-note' | 'cs-status'
    }) => {
      const taskIds = selectedRowKeys.map(String)
      if (input.kind === 'bulk-assign') return bulkAssignProductionTasks(taskIds, scaleAssigneeId!)
      if (input.kind === 'recheck') return recheckPsdBlockedTasks({ limit: 100 })
      if (input.kind === 'assign-cs') return assignCsTask(selectedId!, csAssigneeId || null)
      if (input.kind === 'cs-note') return updateProductionCsNote(selectedId!, csNote)
      if (input.kind === 'cs-status') return updateProductionCsStatus(selectedId!, csStatus)
      return assignProductionTask(selectedId!, scaleAssigneeId!)
    },
    onSuccess: async () => {
      setSelectedRowKeys([])
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const exportQc = useMutation({
    mutationFn: () => exportProductionQcTasks({ search: search || undefined, status }),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'production-qc-tasks.xls'
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const displayedTasks = useDeferredValue(tasks.data)
  const rows = displayedTasks?.items ?? []
  const columns: TableColumnsType<ProductionTask> = useMemo(
    () => [
      {
        title: t('portal.production.columns.order'),
        width: 136,
        render: (_, row) => <CopyableOrderId value={row.orderItem?.externalOrderId} />,
      },
      {
        title: t('portal.production.columns.product'),
        width: 230,
        render: (_, row) => <Typography.Text strong>{row.orderItem?.sku || '-'}</Typography.Text>,
      },
      {
        title: t('portal.production.columns.shop'),
        width: 150,
        render: (_, row) => row.shop?.name || '-',
      },
      {
        title: t('portal.production.requiredSlots'),
        width: 118,
        render: (_, row) => {
          const checks = row.qcPreviewFileChecks || row.fileChecks || []
          return (
            checks
              .filter((check) => check.required)
              .map((check) => check.slotLabel || check.slotKey)
              .join(', ') || '-'
          )
        },
      },
      {
        title: t('portal.production.psdStatus'),
        width: 132,
        render: (_, row) => {
          const hasInput = (row.qcPreviewFileChecks || row.fileChecks || []).some(
            (check) => check.inputAssetDownloadUrl,
          )
          return (
            <StatusTag status={hasInput ? 'operational' : 'pending'}>
              {hasInput ? t('portal.production.psdReady') : t('portal.production.psdMissing')}
            </StatusTag>
          )
        },
      },
      {
        title: t('portal.production.assignedTo'),
        width: 138,
        render: (_, row) =>
          row.assignedDesigner?.fullName ||
          row.assignedDesigner?.employeeCode ||
          t('portal.production.unassigned'),
      },
      {
        title: t('portal.production.columns.status'),
        width: 126,
        render: (_, row) => {
          const value = tab === 'qc' ? row.qcStatus : row.status
          return (
            <StatusTag status={tone(value)}>{t(`portal.production.statuses.${value}`)}</StatusTag>
          )
        },
      },
      {
        title: t('portal.production.columns.updated'),
        width: 138,
        render: (_, row) => new Date(row.updatedAt).toLocaleString(),
      },
    ],
    [t, tab],
  )
  const task = detail.data
  const checks = task?.fileChecks ?? task?.qcPreviewFileChecks ?? []
  const sourceArtwork =
    task?.scaleContext?.use?.psdTemplate?.assetDownloadUrl ??
    checks.find((check) => check.inputAssetDownloadUrl)?.inputAssetDownloadUrl
  const requiredChecks = checks.filter((check) => check.required && check.outputAssetDownloadUrl)
  const customizationEntries = Object.entries(task?.customization?.customerInputs ?? {})
    .map(([label, value]) => [label, formatInputValue(value)] as const)
    .filter((entry): entry is [string, string] => entry[1] !== null)
  const canSubmitQc =
    requiredChecks.length > 0 && requiredChecks.every((check) => decisions[check.id])

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.production.title')}
        description={t('portal.production.description')}
        actions={
          <Space>
            {canAssignScale ? (
              <Button
                loading={operations.isPending}
                onClick={() => operations.mutate({ kind: 'recheck' })}
              >
                {t('portal.production.recheckBlocked')}
              </Button>
            ) : null}
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
              {t('portal.production.refresh')}
            </Button>
          </Space>
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
      <div className={styles.workspace}>
        <section className={styles.queuePane} aria-label={t('portal.production.title')}>
          <Tabs
            className={styles.queueTabs}
            activeKey={tab}
            onChange={(value) => {
              setTab(value as 'scale' | 'qc')
              setPage(1)
              setStatus(undefined)
              setSelectedRowKeys([])
              setSelectedId(undefined)
            }}
            items={[
              {
                key: 'scale',
                label: `${t('portal.production.scaleQueue')} (${summary.data?.needScale ?? 0})`,
              },
              {
                key: 'qc',
                label: `${t('portal.production.qcQueue')} (${summary.data?.qcPending ?? 0})`,
              },
            ]}
          />
          <div className={styles.queueControls}>
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
              {tab === 'qc' ? (
                <Button
                  icon={<DownloadOutlined />}
                  loading={exportQc.isPending}
                  onClick={() => exportQc.mutate()}
                >
                  {t('portal.production.exportQc')}
                </Button>
              ) : null}
              {canAssignScale ? (
                <>
                  <Select
                    showSearch
                    allowClear
                    className={styles.filter}
                    value={scaleAssigneeId}
                    placeholder={t('portal.production.selectAssignee')}
                    options={(scaleAssignees.data?.items ?? []).map((item) => ({
                      value: item.id,
                      label: `${item.fullName || item.employeeCode || item.id}${item.employeeCode ? ` · ${item.employeeCode}` : ''}`,
                    }))}
                    onChange={setScaleAssigneeId}
                  />
                  <Button
                    disabled={!selectedRowKeys.length || !scaleAssigneeId}
                    loading={operations.isPending}
                    onClick={() => operations.mutate({ kind: 'bulk-assign' })}
                  >
                    {t('portal.production.bulkAssign', { count: selectedRowKeys.length })}
                  </Button>
                </>
              ) : null}
            </FilterBar>
          </div>
          <DataTable
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={tasks.isFetching}
            rowSelection={
              canAssignScale
                ? { selectedRowKeys, onChange: setSelectedRowKeys, preserveSelectedRowKeys: true }
                : undefined
            }
            onRow={(row) => ({
              className: row.id === selectedId ? styles.activeTableRow : undefined,
              onClick: () => {
                setSelectedId(row.id)
                setDecisions({})
              },
            })}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: displayedTasks?.total,
              showSizeChanger: false,
              onChange: setPage,
            }}
            expandable={{
              expandedRowKeys: selectedId ? [selectedId] : [],
              onExpand: (expanded, row) => {
                setSelectedId(expanded ? row.id : undefined)
                setDecisions({})
              },
              expandedRowRender: (row) => {
                if (!task || task.id !== row.id) return null
                return (
                  <div className={styles.inlineWorkspace}>
                    <div className={styles.inlineSection}>
                      <Typography.Text strong>
                        {t('portal.production.columns.product')}
                      </Typography.Text>
                      {task.productImageUrl ? (
                        <img
                          className={styles.productPreview}
                          src={task.productImageUrl}
                          alt={task.orderItem?.title || task.orderItem?.sku || ''}
                        />
                      ) : null}
                      <Typography.Text strong>{task.orderItem?.sku || '-'}</Typography.Text>
                      <Typography.Text type="secondary">
                        {task.orderItem?.title || '-'}
                      </Typography.Text>
                    </div>
                    <div className={styles.inlineSection}>
                      <Typography.Text strong>
                        {t('portal.production.customization')}
                      </Typography.Text>
                      {customizationEntries.length ? (
                        customizationEntries.map(([label, value]) => (
                          <div className={styles.inputValue} key={label}>
                            <Typography.Text type="secondary">{label}</Typography.Text>
                            <Typography.Text>{value}</Typography.Text>
                          </div>
                        ))
                      ) : (
                        <Typography.Text type="secondary">-</Typography.Text>
                      )}
                    </div>
                    <div className={styles.inlineSection}>
                      <Typography.Text strong>
                        {t('portal.production.originalArtwork')}
                      </Typography.Text>
                      <div className={styles.artworkPreview}>
                        {sourceArtwork ? (
                          <AuthenticatedMediaImage
                            alt={t('portal.production.originalArtwork')}
                            downloadUrl={sourceArtwork}
                          />
                        ) : (
                          t('portal.production.fileMissing')
                        )}
                      </div>
                      {sourceArtwork ? (
                        <Button
                          size="small"
                          onClick={() =>
                            setInspect(checks.find((check) => check.inputAssetDownloadUrl))
                          }
                        >
                          {t('portal.production.inspect')}
                        </Button>
                      ) : null}
                    </div>
                    <div className={styles.inlineSection}>
                      <Typography.Text strong>
                        {t('portal.production.requiredSlots')}
                      </Typography.Text>
                      <div className={styles.inlineSlots}>
                        {checks
                          .filter((check) => check.required && check.sourceType !== 'PSD_TEMPLATE')
                          .map((check) => (
                            <div className={styles.inlineSlot} key={check.id}>
                              <Typography.Text strong>
                                {check.slotLabel || check.slotKey}
                              </Typography.Text>
                              <StatusTag
                                status={check.outputAssetDownloadUrl ? 'operational' : 'pending'}
                              >
                                {check.outputAssetDownloadUrl
                                  ? t('portal.production.outputReady')
                                  : t('portal.production.outputMissing')}
                              </StatusTag>
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
                                <Button
                                  type={
                                    decisions[check.id]?.decision === 'PASSED'
                                      ? 'primary'
                                      : 'default'
                                  }
                                  onClick={() =>
                                    setDecisions((current) => ({
                                      ...current,
                                      [check.id]: { fileCheckId: check.id, decision: 'PASSED' },
                                    }))
                                  }
                                >
                                  {t('portal.production.passSlot')}
                                </Button>
                              ) : null}
                            </div>
                          ))}
                      </div>
                      {task.blockers.length ? (
                        <FeedbackAlert type="warning" title={task.blockers.join(', ')} />
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
                  </div>
                )
              },
            }}
          />
        </section>
        {legacyDetailEnabled ? (
          <aside className={styles.taskPane} aria-live="polite">
            {detail.isLoading ? (
              <div className={styles.emptyTask}>
                <Typography.Text type="secondary">
                  {t('portal.production.loadingTask')}
                </Typography.Text>
              </div>
            ) : task ? (
              <div className={styles.drawer}>
                <div className={styles.taskHeader}>
                  <div>
                    <Typography.Text type="secondary">
                      {t('portal.production.columns.order')}
                    </Typography.Text>
                    <CopyableOrderId value={task.orderItem?.externalOrderId} />
                    <Typography.Title level={4}>{task.orderItem?.sku || '-'}</Typography.Title>
                  </div>
                  <Space wrap>
                    <StatusTag status={tone(tab === 'qc' ? task.qcStatus : task.status)}>
                      {t(
                        `portal.production.statuses.${tab === 'qc' ? task.qcStatus : task.status}`,
                      )}
                    </StatusTag>
                    {tab === 'scale' && canScale ? (
                      <>
                        <Button icon={<PlusOutlined />} onClick={() => setManualSlotOpen(true)}>
                          {t('portal.production.addManualSlot')}
                        </Button>
                        <Button
                          type="primary"
                          onClick={() => action.mutate({ kind: 'claim', task })}
                        >
                          {t('portal.production.claim')}
                        </Button>
                      </>
                    ) : null}
                    <Button onClick={() => setSelectedId(undefined)}>
                      {t('portal.production.backToQueue')}
                    </Button>
                  </Space>
                </div>
                <div className={styles.taskOverview}>
                  <div>
                    <Typography.Text type="secondary">
                      {t('portal.production.originalArtwork')}
                    </Typography.Text>
                    <div className={styles.artworkPreview}>
                      {sourceArtwork ? (
                        <AuthenticatedMediaImage
                          alt={t('portal.production.originalArtwork')}
                          downloadUrl={sourceArtwork}
                        />
                      ) : (
                        <Typography.Text type="secondary">
                          {t('portal.production.fileMissing')}
                        </Typography.Text>
                      )}
                    </div>
                  </div>
                  <div>
                    <Typography.Text type="secondary">
                      {t('portal.production.requiredSlots')}
                    </Typography.Text>
                    <div className={styles.slotSummary}>
                      {checks
                        .filter((check) => check.required)
                        .map((check) => (
                          <div key={check.id}>
                            <Typography.Text strong>
                              {check.slotLabel || check.slotKey}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              {check.outputAssetDownloadUrl
                                ? t('portal.production.outputReady')
                                : t('portal.production.outputMissing')}
                            </Typography.Text>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                {task.blockers.length ? (
                  <FeedbackAlert type="warning" title={task.blockers.join(', ')} />
                ) : null}
                {canAssignScale ? (
                  <div className={styles.assignmentBar}>
                    <div className={styles.assignmentGroup}>
                      <Select
                        showSearch
                        value={scaleAssigneeId}
                        placeholder={t('portal.production.selectAssignee')}
                        options={(scaleAssignees.data?.items ?? []).map((item) => ({
                          value: item.id,
                          label: `${item.fullName || item.employeeCode || item.id}${item.employeeCode ? ` · ${item.employeeCode}` : ''}`,
                        }))}
                        onChange={setScaleAssigneeId}
                      />
                      <Button
                        disabled={!scaleAssigneeId}
                        onClick={() => operations.mutate({ kind: 'assign' })}
                      >
                        {t('portal.production.assignScale')}
                      </Button>
                    </div>
                    <div className={styles.assignmentGroup}>
                      <Select
                        allowClear
                        showSearch
                        value={csAssigneeId}
                        placeholder={t('portal.production.selectCsAssignee')}
                        options={(csAssignees.data?.items ?? []).map((item) => ({
                          value: item.id,
                          label: `${item.fullName || item.employeeCode || item.id}${item.employeeCode ? ` · ${item.employeeCode}` : ''}`,
                        }))}
                        onChange={setCsAssigneeId}
                      />
                      <Button onClick={() => operations.mutate({ kind: 'assign-cs' })}>
                        {t('portal.production.assignCs')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {canAssignScale ? (
                  <div className={styles.assignmentBar}>
                    <div className={styles.assignmentGroup}>
                      <Select
                        value={csStatus}
                        options={CS_STATUSES.map((value) => ({
                          value,
                          label: t(`portal.production.csStatuses.${value}`),
                        }))}
                        onChange={setCsStatus}
                      />
                      <Button
                        loading={operations.isPending}
                        onClick={() => operations.mutate({ kind: 'cs-status' })}
                      >
                        {t('portal.production.updateCsStatus')}
                      </Button>
                    </div>
                    <div className={styles.assignmentGroup}>
                      <Input.TextArea
                        value={csNote}
                        placeholder={t('portal.production.csNote')}
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        onChange={(event) => setCsNote(event.target.value)}
                      />
                      <Button
                        loading={operations.isPending}
                        onClick={() => operations.mutate({ kind: 'cs-note' })}
                      >
                        {t('portal.production.saveCsNote')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {checks.map((check) => (
                  <div className={styles.slot} key={check.id}>
                    <Space className="justify-between">
                      <Typography.Title level={5}>
                        {check.slotLabel || check.slotKey}
                      </Typography.Title>
                      <StatusTag status={tone(check.qcStatus)}>
                        {t(`portal.production.statuses.${check.qcStatus}`)}
                      </StatusTag>
                    </Space>
                    <div className={styles.slotFiles}>
                      <div className={styles.preview}>
                        {check.inputAssetDownloadUrl ? (
                          <AuthenticatedMediaImage
                            downloadUrl={check.inputAssetDownloadUrl}
                            alt={t('portal.production.original')}
                          />
                        ) : (
                          t('portal.production.fileMissing')
                        )}
                      </div>
                      <div className={styles.preview}>
                        {check.outputAssetDownloadUrl ? (
                          <AuthenticatedMediaImage
                            downloadUrl={check.outputAssetDownloadUrl}
                            alt={t('portal.production.scaled')}
                          />
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
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => void downloadMediaAsset(check.inputAssetDownloadUrl!)}
                        >
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
                            type={
                              decisions[check.id]?.decision === 'PASSED' ? 'primary' : 'default'
                            }
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
            ) : (
              <div className={styles.emptyTask}>
                <Typography.Title level={4}>
                  {tab === 'qc'
                    ? t('portal.production.qcReview')
                    : t('portal.production.scaleTask')}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {t('portal.production.selectTask')}
                </Typography.Text>
              </div>
            )}
          </aside>
        ) : null}
      </div>
      <ArtworkInspector
        check={inspect}
        open={Boolean(inspect)}
        onClose={() => setInspect(undefined)}
      />
      <ManualSlotUploadModal
        open={manualSlotOpen}
        saving={manualUpload.isPending}
        existingSlotKeys={checks.map((check) => check.slotKey)}
        onClose={() => setManualSlotOpen(false)}
        onSubmit={(input) => manualUpload.mutate(input)}
      />
    </section>
  )
}

export default ProductionWorkbenchPage
