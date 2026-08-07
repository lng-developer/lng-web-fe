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
import { Button, Input, Modal, Select, Space, Tabs, Typography, Upload } from 'antd'

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
  assignProductionTask,
  bulkAssignProductionTasks,
  exportProductionQcTasks,
  type FileCheck,
  type FileDecision,
  listProductionTasks,
  listScaleAssignees,
  type ManualScaledOutput,
  type ProductionStatus,
  type ProductionTask,
  recheckPsdBlockedTasks,
  submitProductionQc,
  summarizeProductionTasks,
  updateDesignNote,
  uploadManualScaledOutput,
  uploadScaledOutput,
} from '../api/productionApi'
import { productionKeys } from '../api/productionKeys'
import { ManualSlotUploadModal } from './ManualSlotUploadModal'
import styles from './ProductionWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const SCALE_STATUSES: ProductionStatus[] = ['NEED_SCALE', 'QC_REJECTED']
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

function formatCustomization(inputs: Record<string, unknown> | null | undefined) {
  return Object.entries(inputs ?? {}).flatMap(([group, value]) => {
    if (!Array.isArray(value)) {
      const formatted = formatInputValue(value)
      return formatted ? [[group, formatted] as const] : []
    }
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const entry = item as { label?: unknown; name?: unknown; value?: unknown }
      const formatted = formatInputValue(entry.value)
      if (!formatted) return []
      const label = String(entry.label || entry.name || group)
      return [[label, formatted] as const]
    })
  })
}

function TaskNoteEditor({
  initialValue,
  saving,
  onSave,
}: {
  readonly initialValue: string
  readonly saving: boolean
  readonly onSave: (value: string) => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)

  return (
    <div className={styles.noteEditor}>
      <Typography.Text type="secondary">{t('portal.production.designNote')}</Typography.Text>
      <Input.TextArea
        value={value}
        placeholder={t('portal.production.designNote')}
        autoSize={{ minRows: 1, maxRows: 3 }}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button loading={saving} disabled={value === initialValue} onClick={() => onSave(value)}>
        {t('portal.production.saveNote')}
      </Button>
    </div>
  )
}

function ManualSlotUploadAction({
  taskId,
  existingSlotKeys,
  onUploaded,
}: {
  readonly taskId: string
  readonly existingSlotKeys: string[]
  readonly onUploaded: () => Promise<void>
}) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const [open, setOpen] = useState(false)
  const upload = useMutation({
    mutationFn: (input: ManualScaledOutput) => uploadManualScaledOutput(taskId, input),
    onSuccess: async () => {
      setOpen(false)
      await onUploaded()
      toast('success', t('portal.production.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })

  return (
    <>
      <Button size="small" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
        {t('portal.production.addManualSlot')}
      </Button>
      {open ? (
        <ManualSlotUploadModal
          open
          saving={upload.isPending}
          existingSlotKeys={existingSlotKeys}
          onClose={() => setOpen(false)}
          onSubmit={(input) => upload.mutate(input)}
        />
      ) : null}
    </>
  )
}

function QcDecisionControls({
  onPass,
  onReject,
}: {
  readonly onPass: (note?: string) => void
  readonly onReject: (note: string) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState('')
  const trimmedNote = note.trim()

  return (
    <div className={styles.inspectDecisionBar}>
      <Input.TextArea
        value={note}
        placeholder={t('portal.production.qcNote')}
        autoSize={{ minRows: 1, maxRows: 3 }}
        onChange={(event) => setNote(event.target.value)}
      />
      <Space>
        <Button danger disabled={!trimmedNote} onClick={() => onReject(trimmedNote)}>
          {t('portal.production.rejectSlot')}
        </Button>
        <Button type="primary" onClick={() => onPass(trimmedNote || undefined)}>
          {t('portal.production.passSlot')}
        </Button>
      </Space>
    </div>
  )
}

function ArtworkInspector({
  check,
  onClose,
  onPass,
  onReject,
}: {
  readonly check: FileCheck
  readonly onClose: () => void
  readonly onPass: (note?: string) => void
  readonly onReject: (note: string) => void
}) {
  const { t } = useTranslation()
  const inspectorRef = useRef<HTMLDivElement>(null)
  const zoomInputRef = useRef<HTMLInputElement>(null)
  const zoomLabelRef = useRef<HTMLSpanElement>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

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
  const applyZoom = (value: number) => {
    const next = Math.min(400, Math.max(25, value))
    inspectorRef.current?.style.setProperty('--inspect-scale', String(next / 100))
    if (zoomInputRef.current) zoomInputRef.current.value = String(next)
    if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${next}%`
  }
  const changeZoom = (delta: number) =>
    applyZoom(Number(zoomInputRef.current?.value || 100) + delta)
  const reset = () => {
    applyZoom(100)
    inspectorRef.current?.style.setProperty('--inspect-background', '#f2f3f5')
    applyPan(0, 0)
  }

  return (
    <Modal
      open
      width="92vw"
      footer={null}
      title={t('portal.production.inspectArtwork', { slot: check.slotLabel || check.slotKey })}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className={styles.inspectToolbar}>
        <Space>
          <Button
            icon={<ZoomOutOutlined />}
            aria-label={t('portal.production.zoomOut')}
            onClick={() => changeZoom(-25)}
          />
          <input
            ref={zoomInputRef}
            className={styles.zoomRange}
            type="range"
            min="25"
            max="400"
            step="25"
            defaultValue="100"
            aria-label={t('portal.production.zoom')}
            onInput={(event) => applyZoom(Number(event.currentTarget.value))}
          />
          <Button
            icon={<ZoomInOutlined />}
            aria-label={t('portal.production.zoomIn')}
            onClick={() => changeZoom(25)}
          />
          <Typography.Text ref={zoomLabelRef}>100%</Typography.Text>
        </Space>
        <Space>
          <label className={styles.colorControl}>
            <Typography.Text>{t('portal.production.backgroundColor')}</Typography.Text>
            <input
              type="color"
              defaultValue="#f2f3f5"
              aria-label={t('portal.production.backgroundColor')}
              onInput={(event) =>
                inspectorRef.current?.style.setProperty(
                  '--inspect-background',
                  event.currentTarget.value,
                )
              }
            />
          </label>
          <Button onClick={reset}>{t('portal.production.resetView')}</Button>
        </Space>
      </div>
      <div className={styles.inspector} ref={inspectorRef}>
        {(
          [
            [t('portal.production.original'), check.inputAssetDownloadUrl],
            [t('portal.production.scaled'), check.outputAssetDownloadUrl],
          ] as Array<[string, string | null]>
        ).map(([label, url]) => (
          <div
            className={styles.inspectPanel}
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
              />
            ) : (
              <Typography.Text type="secondary">
                {t('portal.production.fileMissing')}
              </Typography.Text>
            )}
          </div>
        ))}
      </div>
      <QcDecisionControls onPass={onPass} onReject={onReject} />
    </Modal>
  )
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
  const [inspect, setInspect] = useState<FileCheck>()
  const [decisions, setDecisions] = useState<Record<string, FileDecision>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [scaleAssigneeId, setScaleAssigneeId] = useState<string>()
  const canScale = allowed.has('PRODUCTION:WRITE')
  const canAssignScale = tab === 'scale' && canScale
  const canQc = allowed.has('PRODUCTION:WRITE') || allowed.has('DESIGN:REVIEW')
  const filters = {
    search: search || undefined,
    status,
    view: tab === 'qc' ? ('QC' as const) : ('SCALE' as const),
  }
  const params = { ...filters, page, limit: PAGE_SIZE }
  const summaryFilters = { search: search || undefined }
  const tasks = useQuery({
    queryKey: productionKeys.list(params),
    queryFn: () => listProductionTasks(params),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const summary = useQuery({
    queryKey: productionKeys.summary(summaryFilters),
    queryFn: () => summarizeProductionTasks(summaryFilters),
    retry: false,
  })
  const scaleAssignees = useQuery({
    queryKey: [...productionKeys.all, 'scale-assignees'],
    queryFn: () => listScaleAssignees({ limit: 100 }),
    enabled: canAssignScale,
    retry: false,
  })
  const refresh = async () => queryClient.invalidateQueries({ queryKey: productionKeys.all })
  const action = useMutation({
    mutationFn: async (input: { task: ProductionTask; fileDecisions: FileDecision[] }) => {
      return submitProductionQc(input.task.id, input.fileDecisions)
    },
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const saveNote = useMutation({
    mutationFn: (input: { taskId: string; note: string }) =>
      updateDesignNote(input.taskId, input.note),
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.production.updated'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const operations = useMutation({
    mutationFn: async (input: { kind: 'bulk-assign' | 'recheck' }) => {
      const taskIds = selectedRowKeys.map(String)
      if (input.kind === 'bulk-assign') {
        if (taskIds.length === 1) return assignProductionTask(taskIds[0], scaleAssigneeId!)
        return bulkAssignProductionTasks(taskIds, scaleAssigneeId!)
      }
      return recheckPsdBlockedTasks({ limit: 100 })
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
            (check) => check.sourceType === 'PSD_TEMPLATE' && check.inputAssetDownloadUrl,
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
              setDecisions({})
            }}
            items={[
              {
                key: 'scale',
                label: `${t('portal.production.scaleQueue')} (${summary.data?.scaleQueue ?? 0})`,
              },
              {
                key: 'qc',
                label: `${t('portal.production.qcQueue')} (${summary.data?.qcQueue ?? 0})`,
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
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: displayedTasks?.total,
              showSizeChanger: false,
              onChange: setPage,
            }}
            expandable={{
              expandedRowKeys: rows.map((row) => row.id),
              showExpandColumn: false,
              expandedRowRender: (row) => {
                const task = row
                const checks = task.fileChecks ?? task.qcPreviewFileChecks ?? []
                const psdTemplate = task.scaleContext?.use?.psdTemplate
                const artworkCheck = checks.find(
                  (check) => check.sourceType === 'CUSTOMER_IMAGE' && check.inputAssetDownloadUrl,
                )
                const sourceArtwork = artworkCheck?.inputAssetDownloadUrl
                const customizationEntries = formatCustomization(task.customization?.customerInputs)
                const requiredChecks = checks.filter(
                  (check) =>
                    check.required &&
                    check.sourceType !== 'PSD_TEMPLATE' &&
                    check.outputAssetDownloadUrl,
                )
                const canSubmitQc =
                  requiredChecks.length > 0 && requiredChecks.every((check) => decisions[check.id])
                const taskDecisions = requiredChecks
                  .map((check) => decisions[check.id])
                  .filter((decision): decision is FileDecision => Boolean(decision))
                const size = task.vendorCostCenter?.standardSize
                const color = task.vendorCostCenter?.standardColor
                const vendorName =
                  typeof task.vendorProduct?.vendor === 'string'
                    ? task.vendorProduct.vendor
                    : task.vendorProduct?.vendor?.name
                return (
                  <div className={styles.inlineWorkspace}>
                    <div className={styles.taskMeta}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <Typography.Text strong>
                            {t('portal.production.taskContext')}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {t(
                              `portal.production.statuses.${tab === 'qc' ? task.qcStatus : task.status}`,
                            )}
                          </Typography.Text>
                        </div>
                      </div>
                      <div className={styles.metaItem}>
                        <Typography.Text type="secondary">
                          {t('portal.production.vendorProduct')}
                        </Typography.Text>
                        <Typography.Text strong>
                          {task.vendorProduct?.name || task.vendorProduct?.code || '-'}
                        </Typography.Text>
                      </div>
                      <div className={styles.metaItem}>
                        <Typography.Text type="secondary">
                          {t('portal.production.vendor')}
                        </Typography.Text>
                        <Typography.Text strong>{vendorName || '-'}</Typography.Text>
                      </div>
                      <div className={styles.metaItem}>
                        <Typography.Text type="secondary">
                          {t('portal.production.quantity')}
                        </Typography.Text>
                        <Typography.Text strong>{task.fulfillQty ?? '-'}</Typography.Text>
                      </div>
                      <div className={styles.optionGrid}>
                        <div>
                          <Typography.Text type="secondary">
                            {t('portal.production.size')}
                          </Typography.Text>
                          <Typography.Text strong>{size || '-'}</Typography.Text>
                        </div>
                        <div>
                          <Typography.Text type="secondary">
                            {t('portal.production.color')}
                          </Typography.Text>
                          <Typography.Text strong>{color || '-'}</Typography.Text>
                        </div>
                      </div>
                      {tab === 'qc' ? (
                        <div className={styles.notesSummary}>
                          <div>
                            <Typography.Text type="secondary">
                              {t('portal.production.csNote')}
                            </Typography.Text>
                            <Typography.Text>{task.csNote || '-'}</Typography.Text>
                          </div>
                          <div>
                            <Typography.Text type="secondary">
                              {t('portal.production.designNote')}
                            </Typography.Text>
                            <Typography.Text>{task.designNote || '-'}</Typography.Text>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.csNote}>
                            <Typography.Text type="secondary">
                              {t('portal.production.csNote')}
                            </Typography.Text>
                            <Typography.Text>{task.csNote || '-'}</Typography.Text>
                          </div>
                          <TaskNoteEditor
                            initialValue={task.designNote ?? ''}
                            saving={saveNote.isPending && saveNote.variables?.taskId === task.id}
                            onSave={(note) => saveNote.mutate({ taskId: task.id, note })}
                          />
                        </>
                      )}
                    </div>
                    <div className={`${styles.inlineSection} ${styles.customizationSection}`}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <Typography.Text strong>
                            {t('portal.production.customization')}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {customizationEntries.length} {t('portal.production.customerInputs')}
                          </Typography.Text>
                        </div>
                      </div>
                      <div className={styles.customizationList}>
                        {customizationEntries.length ? (
                          customizationEntries.map(([label, value]) => (
                            <div className={styles.inputValue} key={`${label}-${value}`}>
                              <Typography.Text type="secondary">{label}</Typography.Text>
                              <Typography.Text>{value}</Typography.Text>
                            </div>
                          ))
                        ) : (
                          <Typography.Text type="secondary">-</Typography.Text>
                        )}
                      </div>
                    </div>
                    <div className={`${styles.inlineSection} ${styles.productContext}`}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <Typography.Text strong>
                            {t('portal.production.productInput')}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {task.orderItem?.sku || '-'}
                          </Typography.Text>
                        </div>
                      </div>
                      <div className={styles.productIdentifiers}>
                        <div>
                          <Typography.Text type="secondary">ASIN</Typography.Text>
                          <Typography.Text>{task.orderItem?.asin || '-'}</Typography.Text>
                        </div>
                        <div>
                          <Typography.Text type="secondary">SKU</Typography.Text>
                          <Typography.Text>{task.orderItem?.sku || '-'}</Typography.Text>
                        </div>
                      </div>
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
                      <div className={styles.productActions}>
                        {psdTemplate?.assetDownloadUrl ? (
                          <Button
                            icon={<DownloadOutlined />}
                            onClick={() =>
                              void downloadMediaAsset(psdTemplate.assetDownloadUrl!, 'template.psd')
                            }
                          >
                            {t('portal.production.downloadPsd')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className={`${styles.inlineSection} ${styles.outputSection}`}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <Typography.Text strong>
                            {t('portal.production.requiredSlots')}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {
                              checks.filter(
                                (check) => check.required && check.sourceType !== 'PSD_TEMPLATE',
                              ).length
                            }{' '}
                            {t('portal.production.outputsRequired')}
                          </Typography.Text>
                        </div>
                        {tab === 'scale' && canScale ? (
                          <ManualSlotUploadAction
                            taskId={task.id}
                            existingSlotKeys={checks.map((check) => check.slotKey)}
                            onUploaded={refresh}
                          />
                        ) : null}
                      </div>
                      <div className={styles.inlineSlots}>
                        {checks
                          .filter((check) => check.required && check.sourceType !== 'PSD_TEMPLATE')
                          .map((check) => (
                            <div className={styles.inlineSlot} key={check.id}>
                              <div className={styles.slotHeader}>
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
                              </div>
                              <div className={styles.slotOutput}>
                                <Typography.Text type="secondary">
                                  {t('portal.production.scaled')}
                                </Typography.Text>
                                {check.outputAssetDownloadUrl ? (
                                  <AuthenticatedMediaImage
                                    downloadUrl={check.outputAssetDownloadUrl}
                                    alt={t('portal.production.scaled')}
                                  />
                                ) : (
                                  <span className={styles.outputPlaceholder}>
                                    {t('portal.production.outputMissing')}
                                  </span>
                                )}
                              </div>
                              {tab === 'scale' &&
                              check.qcStatus === 'REJECTED' &&
                              check.note?.trim() ? (
                                <div className={styles.rejectionNote}>
                                  <Typography.Text strong>
                                    {t('portal.production.qcReworkRequired')}
                                  </Typography.Text>
                                  <Typography.Text>{check.note}</Typography.Text>
                                </div>
                              ) : null}
                              <div className={styles.slotActions}>
                                {tab === 'qc' && canQc ? (
                                  <Button onClick={() => setInspect(check)}>
                                    {t('portal.production.inspect')}
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
                                    <Button type="primary">
                                      {t('portal.production.uploadOutput')}
                                    </Button>
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
                                        [check.id]: {
                                          fileCheckId: check.id,
                                          decision: 'PASSED',
                                        },
                                      }))
                                    }
                                  >
                                    {t('portal.production.passSlot')}
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                      </div>
                      {task.blockers.some((blocker) => blocker !== 'SCALED_OUTPUT_MISSING') ? (
                        <FeedbackAlert
                          type="warning"
                          title={task.blockers
                            .filter((blocker) => blocker !== 'SCALED_OUTPUT_MISSING')
                            .join(', ')}
                        />
                      ) : null}
                      {tab === 'qc' && canQc ? (
                        <Button
                          type="primary"
                          disabled={!canSubmitQc}
                          loading={action.isPending}
                          onClick={() => action.mutate({ task, fileDecisions: taskDecisions })}
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
      </div>
      {inspect ? (
        <ArtworkInspector
          check={inspect}
          onClose={() => setInspect(undefined)}
          onPass={(note) => {
            setDecisions((current) => ({
              ...current,
              [inspect.id]: { fileCheckId: inspect.id, decision: 'PASSED', note },
            }))
            setInspect(undefined)
          }}
          onReject={(note) => {
            setDecisions((current) => ({
              ...current,
              [inspect.id]: { fileCheckId: inspect.id, decision: 'REJECTED', note },
            }))
            setInspect(undefined)
          }}
        />
      ) : null}
    </section>
  )
}

export default ProductionWorkbenchPage
