/* eslint-disable react-hooks/preserve-manual-memoization -- stable React state setters are intentionally wrapped for memoized workbench children */
import {
  type CSSProperties,
  type Key,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ScissorOutlined,
  StopOutlined,
  WarningOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Flex, Input, Modal, Radio, Segmented, Slider, Space, Tag, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission, hasScopedPermission } from '@/shared/auth/permissions'
import { AuthenticatedMediaImage } from '@/shared/media'
import {
  CopyableOrderId,
  FeedbackAlert,
  MetricCard,
  StatusTag,
  type UiButtonTabItem,
  UiButtonTabs,
  UiTabLabel,
  useFeedbackToast,
} from '@/shared/ui'

import {
  assignProductionTask,
  bulkAssignProductionTasks,
  exportProductionQcTasks,
  exportProductionTasksCsv,
  type FileCheck,
  type FileDecision,
  listProductionTasks,
  listScaleAssignees,
  type ProductionStatus,
  type ProductionTask,
  recheckPsdBlockedTasks,
  submitProductionQc,
  submitScaleForQc,
  summarizeProductionTasks,
  updateDesignNote,
  uploadScaledOutput,
} from '../api/productionApi'
import { productionKeys } from '../api/productionKeys'
import { ProductionWorkbenchExpandedRow } from './ProductionWorkbenchExpandedRow'
import { ProductionWorkbenchFilterBar } from './ProductionWorkbenchFilterBar'
import styles from './ProductionWorkbenchPage.module.scss'

const PAGE_SIZE = 20
type ProductionTab = 'scale' | 'blocked' | 'qc'
const SCALE_STATUSES: ProductionStatus[] = ['NEED_SCALE', 'QC_REJECTED', 'BLOCKED']
const BLOCKED_STATUSES: ProductionStatus[] = ['BLOCKED']
const QC_STATUSES: ProductionStatus[] = [
  'QC_PENDING',
  'READY_TO_SEND_VENDOR',
  'SENT_TO_VENDOR',
  'BLOCKED',
  'CANCELLED',
]

const REJECTION_PRESETS = [
  'Low Resolution / Pixelated (<150 DPI)',
  'White Edge / Fringe Effect',
  'Distorted / Aspect Ratio Mismatch',
  'Missing Transparency / Solid BG',
  'Artwork Cropped / Edge Cut',
]

function ArtworkInspector({
  check,
  listingReferenceUrl,
  readonly = false,
  onClose,
  onPass,
  onReject,
}: {
  readonly check: FileCheck
  readonly listingReferenceUrl?: string | null
  readonly readonly?: boolean
  readonly onClose: () => void
  readonly onPass: (note?: string) => void
  readonly onReject: (note: string) => void
}) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'sideBySide' | 'split' | 'overlay'>('sideBySide')
  const [bgType, setBgType] = useState<'checkerboard' | 'white' | 'black' | 'navy'>('checkerboard')
  const [splitPos, setSplitPos] = useState(50)
  const [opacity, setOpacity] = useState(60)
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [rejectNote, setRejectNote] = useState('')

  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, originX: 0, originY: 0 })

  const originalUrl = check.inputAssetDownloadUrl
  const originalLabel = originalUrl ? 'Customer input' : 'Main listing reference'
  const scaledUrl = check.outputAssetDownloadUrl

  const resetView = useCallback(() => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
    setSplitPos(50)
    setOpacity(60)
  }, [])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault()
    setZoom((prev) => Math.min(500, Math.max(25, prev + (e.deltaY < 0 ? 15 : -15))))
  }, [])

  // Pointer drag pan
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      isDraggingRef.current = true
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        originX: pan.x,
        originY: pan.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [pan.x, pan.y],
  )

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: dragStartRef.current.originX + dx,
      y: dragStartRef.current.originY + dy,
    })
  }, [])

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Keyboard Shortcuts (P = Pass, R = Reject, 1/2/3 = View Mode, Space = Reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (!readonly && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        onPass()
      } else if (!readonly && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        setRejectModalOpen(true)
      } else if (e.key === '1') {
        setViewMode('sideBySide')
      } else if (e.key === '2') {
        setViewMode('split')
      } else if (e.key === '3') {
        setViewMode('overlay')
      } else if (e.code === 'Space') {
        e.preventDefault()
        resetView()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onPass, readonly, resetView])

  const handlePresetToggle = (preset: string) => {
    setSelectedPresets((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset],
    )
  }

  const handleConfirmReject = () => {
    const combinedReason = [...selectedPresets, rejectNote.trim()].filter(Boolean).join(' · ')

    if (!combinedReason) return
    onReject(combinedReason)
    setRejectModalOpen(false)
  }

  const bgClass =
    bgType === 'checkerboard'
      ? styles.checkerboardBg
      : bgType === 'white'
        ? styles.bgWhite
        : bgType === 'black'
          ? styles.bgBlack
          : styles.bgNavy

  const transformStyle: CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
    transformOrigin: 'center',
    willChange: 'transform',
    transition: 'transform 0.05s ease-out',
  }

  return (
    <Modal
      open
      width="94vw"
      footer={null}
      title={
        <Flex justify="space-between" align="center" style={{ paddingRight: 32 }}>
          <span>
            {t('portal.production.inspectArtwork', { slot: check.slotLabel || check.slotKey })}
          </span>
          <Tag color="blue">{check.slotKey}</Tag>
        </Flex>
      }
      onCancel={onClose}
      destroyOnHidden
    >
      {/* Inspector Toolbar */}
      <div className={styles.inspectToolbar}>
        {/* Comparison View Mode Segmented */}
        <Space size={12}>
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as typeof viewMode)}
            options={[
              { label: '↔️ Side-by-Side (1)', value: 'sideBySide' },
              { label: '🔀 Split Slider (2)', value: 'split' },
              { label: '👁️ Overlay (3)', value: 'overlay' },
            ]}
          />

          {/* Mode specific controls */}
          {viewMode === 'split' ? (
            <Flex align="center" gap={8} style={{ width: 180 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Split:
              </Typography.Text>
              <Slider
                value={splitPos}
                onChange={setSplitPos}
                min={0}
                max={100}
                style={{ flex: 1, margin: 0 }}
              />
            </Flex>
          ) : null}

          {viewMode === 'overlay' ? (
            <Flex align="center" gap={8} style={{ width: 180 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Opacity:
              </Typography.Text>
              <Slider
                value={opacity}
                onChange={setOpacity}
                min={0}
                max={100}
                style={{ flex: 1, margin: 0 }}
              />
            </Flex>
          ) : null}
        </Space>

        {/* Background & Zoom controls */}
        <Space size={12}>
          <Radio.Group
            size="small"
            value={bgType}
            onChange={(e) => setBgType(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="checkerboard">🏁 Transparent</Radio.Button>
            <Radio.Button value="white">⚪ White</Radio.Button>
            <Radio.Button value="black">⚫ Black</Radio.Button>
            <Radio.Button value="navy">🔵 Navy</Radio.Button>
          </Radio.Group>

          <Space size={4}>
            <Button
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={() => setZoom((z) => Math.max(25, z - 25))}
            />
            <Typography.Text strong style={{ fontSize: 12, minWidth: 42, textAlign: 'center' }}>
              {zoom}%
            </Typography.Text>
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={() => setZoom((z) => Math.min(500, z + 25))}
            />
          </Space>

          <Button size="small" onClick={resetView}>
            Reset View
          </Button>
        </Space>
      </div>

      {/* Main Inspection Canvas */}
      <div onWheel={handleWheel}>
        {viewMode === 'sideBySide' ? (
          <div className={styles.inspector}>
            {/* Original */}
            <div
              className={`${styles.inspectPanel} ${bgClass}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <Typography.Text strong>
                {t('portal.production.original')} ({originalLabel})
              </Typography.Text>
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt={t('portal.production.original')}
                  style={transformStyle}
                  draggable={false}
                />
              ) : listingReferenceUrl ? (
                <img
                  src={listingReferenceUrl}
                  alt={originalLabel}
                  style={transformStyle}
                  draggable={false}
                />
              ) : (
                <Typography.Text type="secondary">
                  {t('portal.production.fileMissing')}
                </Typography.Text>
              )}
            </div>

            {/* Scaled Output */}
            <div
              className={`${styles.inspectPanel} ${bgClass}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <Typography.Text strong>
                {t('portal.production.scaled')} (Scaled Output)
              </Typography.Text>
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt={t('portal.production.scaled')}
                  style={transformStyle}
                  draggable={false}
                />
              ) : (
                <Typography.Text type="secondary">
                  {t('portal.production.fileMissing')}
                </Typography.Text>
              )}
            </div>
          </div>
        ) : viewMode === 'split' ? (
          /* Split Screen Slider Canvas */
          <div
            className={`${styles.singleInspectCanvas} ${bgClass}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Original Layer (full width, clipped) */}
            <div
              className={styles.splitLayerOriginal}
              style={{ clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }}
            >
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt="Original"
                  style={transformStyle}
                />
              ) : listingReferenceUrl ? (
                <img src={listingReferenceUrl} alt={originalLabel} style={transformStyle} />
              ) : null}
            </div>

            {/* Scaled Layer (full width, right clipped) */}
            <div
              className={styles.splitLayerScaled}
              style={{ clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)` }}
            >
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt="Scaled"
                  style={transformStyle}
                />
              ) : null}
            </div>

            {/* Divider Track Handle */}
            <div className={styles.splitSliderTrack} style={{ left: `${splitPos}%` }} />
          </div>
        ) : (
          /* Overlay Opacity Canvas */
          <div
            className={`${styles.singleInspectCanvas} ${bgClass}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Original (Base Layer) */}
            <div className={styles.splitLayerOriginal}>
              {originalUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={originalUrl}
                  alt="Original"
                  style={transformStyle}
                />
              ) : listingReferenceUrl ? (
                <img src={listingReferenceUrl} alt={originalLabel} style={transformStyle} />
              ) : null}
            </div>

            {/* Scaled (Overlay Layer with Opacity) */}
            <div className={styles.splitLayerScaled} style={{ opacity: opacity / 100 }}>
              {scaledUrl ? (
                <AuthenticatedMediaImage
                  downloadUrl={scaledUrl}
                  alt="Scaled"
                  style={transformStyle}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {!readonly ? (
        <>
          {/* QC Keyboard Shortcuts Footer Guide */}
          <div className={styles.shortcutBar}>
            <span>
              ⚡ <strong>QC Shortcuts</strong>:
            </span>
            <span>
              <kbd>P</kbd> Pass Slot
            </span>
            <span>
              <kbd>R</kbd> Reject Slot
            </span>
            <span>
              <kbd>1</kbd> Side-by-Side
            </span>
            <span>
              <kbd>2</kbd> Split Slider
            </span>
            <span>
              <kbd>3</kbd> Overlay
            </span>
            <span>
              <kbd>Space</kbd> Center View
            </span>
          </div>

          {/* Main Action Bar */}
          <Flex justify="end" gap={12} style={{ marginTop: 16 }}>
            <Button danger icon={<StopOutlined />} onClick={() => setRejectModalOpen(true)}>
              {t('portal.production.rejectSlot')} (R)
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => onPass()}>
              {t('portal.production.passSlot')} (P)
            </Button>
          </Flex>
        </>
      ) : null}

      {/* Quick Rejection Modal with Preset Reason Chips */}
      <Modal
        open={rejectModalOpen}
        title={t('portal.production.rejectSlot')}
        okText={t('portal.production.confirmReject', { defaultValue: 'Confirm Rejection' })}
        okButtonProps={{ danger: true, disabled: !selectedPresets.length && !rejectNote.trim() }}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleConfirmReject}
      >
        <Typography.Text
          type="secondary"
          style={{ display: 'block', marginBottom: 10, fontSize: 12 }}
        >
          {t('portal.production.selectPresetReasons', {
            defaultValue: 'Select one or more rejection reasons:',
          })}
        </Typography.Text>

        <div className={styles.presetChips}>
          {REJECTION_PRESETS.map((preset) => {
            const isSelected = selectedPresets.includes(preset)
            return (
              <button
                key={preset}
                type="button"
                className={`${styles.presetChip} ${isSelected ? styles.selected : ''}`}
                onClick={() => handlePresetToggle(preset)}
              >
                {isSelected ? '✓ ' : '+ '} {preset}
              </button>
            )
          })}
        </div>

        <Input.TextArea
          rows={3}
          value={rejectNote}
          placeholder={t('portal.production.customRejectNote', {
            defaultValue: 'Add additional QC notes or specific rework instructions...',
          })}
          onChange={(e) => setRejectNote(e.target.value)}
        />
      </Modal>
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
  const currentAccountId = account?.account.id
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [tab, setTab] = useState<ProductionTab>('scale')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [salesChannelCode, setSalesChannelCode] = useState<'AMAZON' | 'ETSY'>()
  const [status, setStatus] = useState<ProductionStatus>()
  const [scaleDifficultyLevel, setScaleDifficultyLevel] = useState<'NORMAL' | 'HARD' | 'SPECIAL'>()
  const [inspect, setInspect] = useState<{
    check: FileCheck
    listingReferenceUrl?: string | null
    readonly?: boolean
  }>()
  const [decisions, setDecisions] = useState<Record<string, FileDecision>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [scaleAssigneeId, setScaleAssigneeId] = useState<string>()
  const [uploadingFileCheckIds, setUploadingFileCheckIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const canWriteProductionTask = useCallback(
    (task: ProductionTask) =>
      canUseScopedPermission(account, 'PRODUCTION:WRITE', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account],
  )
  const canScaleTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      (Boolean(currentAccountId) && task.assignedDesignUserId === currentAccountId),
    [canWriteProductionTask, currentAccountId],
  )
  const canQcTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      canUseScopedPermission(account, 'DESIGN:REVIEW', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account, canWriteProductionTask],
  )
  const hasTeamDesignReview = hasScopedPermission(account, 'DESIGN:REVIEW', 'team')
  const hasScopedScaleAssign =
    hasTeamDesignReview ||
    hasScopedPermission(account, 'DESIGN:REVIEW', 'shop') ||
    hasScopedPermission(account, 'PRODUCTION:WRITE', 'team') ||
    hasScopedPermission(account, 'PRODUCTION:WRITE', 'shop')
  const canAssignScale =
    tab === 'scale' && (allowed.has('PRODUCTION:WRITE') || hasScopedScaleAssign)
  const canAssignProductionTask = useCallback(
    (task: ProductionTask) =>
      canWriteProductionTask(task) ||
      hasTeamDesignReview ||
      canUseScopedPermission(account, 'DESIGN:REVIEW', {
        scopeType: 'shop',
        scopeId: task.shopId ?? task.shop?.id,
      }),
    [account, canWriteProductionTask, hasTeamDesignReview],
  )
  const filters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      salesChannelCode,
      psdReadyOnly: true,
      scaleDifficultyLevel,
      status: tab === 'blocked' ? ('BLOCKED' as const) : status,
      view: tab === 'blocked' ? undefined : tab === 'qc' ? ('QC' as const) : ('SCALE' as const),
    }),
    [deferredSearch, salesChannelCode, scaleDifficultyLevel, status, tab],
  )
  const params = useMemo(() => ({ ...filters, page, limit: PAGE_SIZE }), [filters, page])
  const summaryFilters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      salesChannelCode,
      psdReadyOnly: true,
      status: tab === 'blocked' ? ('BLOCKED' as const) : status,
      view: tab === 'blocked' ? undefined : ((tab === 'qc' ? 'QC' : 'SCALE') as 'QC' | 'SCALE'),
    }),
    [deferredSearch, salesChannelCode, status, tab],
  )
  const queueFilters = useMemo(
    () => ({ search: deferredSearch || undefined, salesChannelCode, psdReadyOnly: true }),
    [deferredSearch, salesChannelCode],
  )
  const statusOptions = useMemo(
    () =>
      (tab === 'blocked' ? BLOCKED_STATUSES : tab === 'scale' ? SCALE_STATUSES : QC_STATUSES).map(
        (value) => ({
          value,
          label: t(`portal.production.statuses.${value}`),
        }),
      ),
    [tab, t],
  )
  const tasks = useQuery({
    queryKey: productionKeys.list(params),
    queryFn: () => listProductionTasks(params),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const scaleQueueCount = useQuery({
    queryKey: productionKeys.list({ ...queueFilters, view: 'SCALE', page: 1, limit: 1 }),
    queryFn: () => listProductionTasks({ ...queueFilters, view: 'SCALE', page: 1, limit: 1 }),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const qcQueueCount = useQuery({
    queryKey: productionKeys.list({ ...queueFilters, view: 'QC', page: 1, limit: 1 }),
    queryFn: () => listProductionTasks({ ...queueFilters, view: 'QC', page: 1, limit: 1 }),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const blockedCount = useQuery({
    queryKey: productionKeys.list({ ...queueFilters, status: 'BLOCKED', page: 1, limit: 1 }),
    queryFn: () => listProductionTasks({ ...queueFilters, status: 'BLOCKED', page: 1, limit: 1 }),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const summary = useQuery({
    queryKey: productionKeys.summary(summaryFilters),
    queryFn: () => summarizeProductionTasks(summaryFilters),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const summaryRows = useMemo(() => tasks.data?.items ?? [], [tasks.data?.items])
  const displaySummary = useMemo(() => {
    if ((summary.data?.total ?? 0) > 0 || summaryRows.length === 0) return summary.data
    return {
      total: tasks.data?.total ?? summaryRows.length,
      blocked: summaryRows.filter((task) => task.status === 'BLOCKED').length,
      needScale: summaryRows.filter((task) => task.status === 'NEED_SCALE').length,
      qcPending: summaryRows.filter((task) => task.status === 'QC_PENDING').length,
      ready: summaryRows.filter((task) => task.status === 'READY_TO_SEND_VENDOR').length,
      scaleQueue: summaryRows.filter((task) => SCALE_STATUSES.includes(task.status)).length,
      qcQueue: summaryRows.filter((task) => task.qcStatus === 'PENDING').length,
    }
  }, [summary.data, summaryRows, tasks.data?.total])
  const queueSummary = useMemo(
    () => ({
      ...displaySummary,
      blocked: Math.max(displaySummary?.blocked ?? 0, blockedCount.data?.total ?? 0),
      scaleQueue: Math.max(displaySummary?.scaleQueue ?? 0, scaleQueueCount.data?.total ?? 0),
      qcQueue: Math.max(displaySummary?.qcQueue ?? 0, qcQueueCount.data?.total ?? 0),
      qcPending: Math.max(displaySummary?.qcPending ?? 0, qcQueueCount.data?.total ?? 0),
    }),
    [
      blockedCount.data?.total,
      displaySummary,
      qcQueueCount.data?.total,
      scaleQueueCount.data?.total,
    ],
  )
  const queueTabItems = useMemo<UiButtonTabItem<ProductionTab>[]>(
    () => [
      {
        value: 'scale',
        label: (
          <UiTabLabel count={queueSummary.scaleQueue ?? 0} active={tab === 'scale'}>
            {t('portal.production.scaleQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'blocked',
        label: (
          <UiTabLabel count={queueSummary.blocked ?? 0} active={tab === 'blocked'}>
            {t('portal.production.blockedQueue')}
          </UiTabLabel>
        ),
      },
      {
        value: 'qc',
        label: (
          <UiTabLabel count={queueSummary.qcQueue ?? 0} active={tab === 'qc'}>
            {t('portal.production.qcQueue')}
          </UiTabLabel>
        ),
      },
    ],
    [queueSummary.blocked, queueSummary.qcQueue, queueSummary.scaleQueue, tab, t],
  )
  const scaleAssignees = useQuery({
    queryKey: [...productionKeys.all, 'scale-assignees'],
    queryFn: () => listScaleAssignees({ limit: 100 }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: canAssignScale,
    retry: false,
  })
  const scaleAssigneeOptions = useMemo(
    () =>
      (scaleAssignees.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.fullName || item.employeeCode || item.id}${item.employeeCode ? ` · ${item.employeeCode}` : ''}`,
      })),
    [scaleAssignees.data?.items],
  )
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: productionKeys.all }),
    [queryClient],
  )
  const handleTabChange = useCallback((value: ProductionTab) => {
    setTab(value)
    setPage(1)
    setStatus(undefined)
    setScaleDifficultyLevel(undefined)
    setSelectedRowKeys([])
    setDecisions({})
  }, [])
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const handleStatusChange = useCallback((value?: ProductionStatus) => {
    setStatus(value)
    setPage(1)
  }, [])
  const handleSalesChannelChange = useCallback((value: string | number) => {
    setSalesChannelCode(value === 'ALL' ? undefined : (value as 'AMAZON' | 'ETSY'))
    setPage(1)
    setSelectedRowKeys([])
  }, [])
  const handleBlockedMetricClick = useCallback(() => {
    setTab('blocked')
    setStatus(undefined)
    setScaleDifficultyLevel(undefined)
    setSelectedRowKeys([])
    setPage(1)
  }, [])
  const handleScaleDifficultyChange = useCallback((value?: 'NORMAL' | 'HARD' | 'SPECIAL') => {
    setScaleDifficultyLevel(value)
    setPage(1)
  }, [])
  const handleScaleAssigneeChange = useCallback((value?: string) => {
    setScaleAssigneeId(value)
  }, [])
  const handleSetInspectionDecision = useCallback(
    (fileCheckId: string, decision: FileDecision['decision'], note?: string) => {
      setDecisions((current) => ({
        ...current,
        [fileCheckId]: {
          fileCheckId,
          decision,
          note,
        },
      }))
    },
    [],
  )
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
  const submitScale = useMutation({
    mutationFn: (taskId: string) => submitScaleForQc(taskId),
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
      const taskIds = selectedTasks.filter(canAssignProductionTask).map((task) => task.id)
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
    mutationFn: () =>
      exportProductionQcTasks({ search: search || undefined, scaleDifficultyLevel, status }),
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
  const exportCsv = useMutation({
    mutationFn: () => exportProductionTasksCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'production-tasks.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed')),
  })
  const handleRecheck = useCallback(() => operations.mutate({ kind: 'recheck' }), [operations])
  const handleExportQc = useCallback(() => exportQc.mutate(), [exportQc])
  const handleExportCsv = useCallback(() => exportCsv.mutate(), [exportCsv])
  const handleBulkAssign = useCallback(
    () => operations.mutate({ kind: 'bulk-assign' }),
    [operations],
  )
  const handleInspectSlot = useCallback(
    (task: ProductionTask, check: FileCheck, readonly = false) => {
      setInspect({ check, listingReferenceUrl: task.productImageUrl, readonly })
    },
    [],
  )
  const handleSaveNote = useCallback(
    (taskId: string, note: string) => saveNote.mutate({ taskId, note }),
    [saveNote],
  )
  const handleSubmitQc = useCallback(
    (task: ProductionTask, fileDecisions: FileDecision[]) => action.mutate({ task, fileDecisions }),
    [action],
  )
  const handleSubmitScaleForQc = useCallback(
    (taskId: string) => submitScale.mutate(taskId),
    [submitScale],
  )
  const handleUploadScaledOutput = useCallback(
    async (taskId: string, fileCheckId: string, file: File) => {
      setUploadingFileCheckIds((current) => new Set(current).add(fileCheckId))
      try {
        await uploadScaledOutput(taskId, fileCheckId, file)
        await refresh()
        toast('success', t('portal.production.updated'))
      } catch (error) {
        toast('error', error instanceof Error ? error.message : t('portal.production.actionFailed'))
      } finally {
        setUploadingFileCheckIds((current) => {
          const next = new Set(current)
          next.delete(fileCheckId)
          return next
        })
      }
    },
    [refresh, t, toast],
  )
  const handleInspectClose = useCallback(() => setInspect(undefined), [])
  const handleInspectionPass = useCallback(
    (note?: string) => {
      if (!inspect) return
      handleSetInspectionDecision(inspect.check.id, 'PASSED', note)
      setInspect(undefined)
    },
    [handleSetInspectionDecision, inspect],
  )
  const handleInspectionReject = useCallback(
    (note: string) => {
      if (!inspect) return
      handleSetInspectionDecision(inspect.check.id, 'REJECTED', note)
      setInspect(undefined)
    },
    [handleSetInspectionDecision, inspect],
  )
  const handleSearchSubmit = useCallback(
    (value: string) => {
      handleSearchChange(value)
    },
    [handleSearchChange],
  )
  const handleInspectionSlotAction = useCallback(
    (task: ProductionTask, check: FileCheck, readonly?: boolean) => {
      handleInspectSlot(task, check, readonly)
    },
    [handleInspectSlot],
  )
  const handleQcSlotPass = useCallback(
    (fileCheckId: string) => handleSetInspectionDecision(fileCheckId, 'PASSED'),
    [handleSetInspectionDecision],
  )
  const displayedTasks = useDeferredValue(tasks.data)
  const rows = useMemo(() => displayedTasks?.items ?? [], [displayedTasks?.items])
  console.log('rows', rows)
  const expandedRowKeys = useMemo(() => rows.map((row) => row.id), [rows])
  const selectedTasks = useMemo(
    () => rows.filter((row) => selectedRowKeys.map(String).includes(row.id)),
    [rows, selectedRowKeys],
  )
  const columns: TableColumnsType<ProductionTask> = useMemo(
    () => [
      {
        title: t('portal.production.columns.order'),
        width: 136,
        render: (_, row) => <CopyableOrderId value={row.orderItem?.externalOrderId} />,
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
              .filter((check) => check.required && check.sourceType !== 'PSD_TEMPLATE')
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
        title: t('portal.production.columns.scaleDifficulty'),
        width: 96,
        render: (_, row) => {
          const level = row.scaleContext?.use?.listing?.scaleDifficulty?.level || 'NORMAL'
          return (
            <StatusTag status={level === 'NORMAL' ? 'pending' : 'critical'}>
              {t(`portal.production.scaleDifficulties.${level}`, { defaultValue: level })}
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
      {tasks.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.production.unavailable')} />
      ) : null}
      <div className={styles.metrics}>
        <MetricCard
          icon={<AppstoreOutlined />}
          variant="neutral"
          label={t('portal.production.metrics.total')}
          value={displaySummary?.total ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<WarningOutlined />}
          variant="danger"
          label={t('portal.production.metrics.blocked')}
          value={queueSummary.blocked ?? 0}
          loading={summary.isLoading}
          onClick={handleBlockedMetricClick}
        />
        <MetricCard
          icon={<ScissorOutlined />}
          variant="warning"
          label={t('portal.production.metrics.needScale')}
          value={displaySummary?.needScale ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          variant="info"
          label={t('portal.production.metrics.qcPending')}
          value={queueSummary.qcPending ?? 0}
          loading={summary.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('portal.production.metrics.ready')}
          value={displaySummary?.ready ?? 0}
          loading={summary.isLoading}
        />
      </div>
      <div className={styles.workspace}>
        <section className={styles.queuePane} aria-label={t('portal.production.title')}>
          <div className={styles.queueHeader}>
            <UiButtonTabs
              className={styles.queueTabs}
              value={tab}
              onChange={handleTabChange}
              items={queueTabItems}
            />
            <UiButtonTabs
              className={styles.channelFilter}
              value={salesChannelCode ?? 'ALL'}
              items={[
                { label: t('portal.production.channelAll'), value: 'ALL' },
                { label: 'Amazon', value: 'AMAZON' },
                { label: 'Etsy', value: 'ETSY' },
              ]}
              onChange={handleSalesChannelChange}
            />
          </div>
          <ProductionWorkbenchFilterBar
            search={search}
            status={status}
            scaleDifficultyLevel={scaleDifficultyLevel}
            tab={tab}
            statusOptions={statusOptions}
            scaleAssigneeId={scaleAssigneeId}
            canAssignScale={canAssignScale}
            scaleAssigneeOptions={scaleAssigneeOptions}
            selectedRowCount={selectedRowKeys.length}
            exportCsvLoading={exportCsv.isPending}
            exportQcLoading={exportQc.isPending}
            recheckLoading={operations.isPending}
            reassignLoading={operations.isPending}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onStatusChange={handleStatusChange}
            onScaleDifficultyChange={handleScaleDifficultyChange}
            onExportCsv={handleExportCsv}
            onExportQc={handleExportQc}
            onRecheck={handleRecheck}
            onScaleAssigneeChange={handleScaleAssigneeChange}
            onBulkAssign={handleBulkAssign}
          />
          <CoreDataTable
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={tasks.isFetching}
            rowClassName={() => styles.stickyOrderRow}
            rowSelection={
              canAssignScale
                ? {
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                    preserveSelectedRowKeys: true,
                    getCheckboxProps: (row) => ({ disabled: !canAssignProductionTask(row) }),
                  }
                : undefined
            }
            scroll={{ x: 1240, y: 'calc(100vh - 410px)' }}
            expandable={{
              expandedRowKeys,
              showExpandColumn: false,
              expandedRowRender: (row) => {
                const task = row
                return (
                  <ProductionWorkbenchExpandedRow
                    task={task}
                    tab={tab}
                    canScale={canScaleTask(task)}
                    canQc={canQcTask(task)}
                    decisions={decisions}
                    savingNoteTaskId={saveNote.variables?.taskId}
                    submittingQc={action.isPending}
                    submittingScale={submitScale.isPending && submitScale.variables === task.id}
                    uploadingFileCheckIds={uploadingFileCheckIds}
                    onSaveNote={handleSaveNote}
                    onSubmitQc={handleSubmitQc}
                    onSubmitScaleForQc={handleSubmitScaleForQc}
                    onUploadScaledOutput={handleUploadScaledOutput}
                    onInspectSlot={handleInspectionSlotAction}
                    onPassSlot={handleQcSlotPass}
                    onManualSlotUploaded={refresh}
                  />
                )
              },
            }}
          />
        </section>
      </div>
      {inspect ? (
        <ArtworkInspector
          check={inspect.check}
          listingReferenceUrl={inspect.listingReferenceUrl}
          readonly={inspect.readonly}
          onClose={handleInspectClose}
          onPass={handleInspectionPass}
          onReject={handleInspectionReject}
        />
      ) : null}
    </section>
  )
}

export default ProductionWorkbenchPage
