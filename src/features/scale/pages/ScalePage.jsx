import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import ImagePreview from '@/components/common/ImagePreview'
import InlineDetailValue from '@/components/common/InlineDetailValue'
import DateRangePicker from '@/components/form/DateRangePicker'
import {
  OperationsPageShell,
  OperationsTabs,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import {
  operationsTableHeaderClass,
  operationsTextCaptionClass,
} from '@/components/operations/operationsLayout'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { getOrderStatusTone } from '@/features/orders/utils/orderStatus'
import {
  useAssignScaleTaskMutation,
  useDownloadScaleAssetMutation,
  useRecheckScaleTaskMutation,
  useUpdateScaleTaskCsNoteMutation,
  useUpdateScaleTaskNoteMutation,
  useUploadScaleOutputMutation,
} from '@/features/scale/api/scale.mutations'
import {
  useScaleAssigneesQuery,
  useScaleShopsQuery,
  useScaleSummaryQuery,
  useScaleTasksQuery,
} from '@/features/scale/api/scale.queries'
import {
  SCALE_ALL_FILTER,
  SCALE_CHANNELS,
  SCALE_PAGE_SIZE,
  SCALE_PAGE_SIZE_OPTIONS,
  SCALE_STATUS_TABS,
  SCALE_STATUSES,
  SCALE_SUB_TABS,
  SCALE_TABLE_COLUMNS,
} from '@/features/scale/constants/scaleConstants'
import { readScaleDashboardSearch } from '@/features/scale/utils/scaleApi'
import {
  copyDisplayText,
  formatCompactOrderDate,
  getScaleManualUploadPosition,
  getScaleSlotPreviewAssetId,
  isScaleSlotUploadDisabled,
  SCALE_MANUAL_UPLOAD_POSITIONS,
  truncateDisplayText,
} from '@/features/scale/utils/scaleDisplay'
import { getPaginationRange } from '@/features/scale/utils/scalePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

const tableGridClass = 'grid-cols-[repeat(8,minmax(0,1fr))]'

const SHOP_NAME_MAX_LENGTH = 16
const COST_CENTER_FIELD_CLASS = 'w-fit max-w-full'

const groupStatusTabs = [
  { value: SCALE_STATUS_TABS.ALL, labelKey: 'scale.statusTabs.all' },
  { value: SCALE_STATUS_TABS.CS_UNASSIGNED, labelKey: 'scale.statusTabs.csUnassigned' },
  { value: SCALE_STATUS_TABS.NEED_SCALE, labelKey: 'scale.statusTabs.needScale' },
  { value: SCALE_STATUS_TABS.PENDING, labelKey: 'scale.statusTabs.pending' },
  { value: SCALE_STATUS_TABS.COMPLETED, labelKey: 'scale.statusTabs.completed' },
  { value: SCALE_STATUS_TABS.QC_REJECTED, labelKey: 'scale.statusTabs.qcRejected' },
]

const groupFiltersInitialState = {
  shop: SCALE_ALL_FILTER,
  scaleBy: SCALE_ALL_FILTER,
  qcBy: SCALE_ALL_FILTER,
}

const etsyFiltersInitialState = {
  shop: SCALE_ALL_FILTER,
  scaleBy: SCALE_ALL_FILTER,
  qcBy: SCALE_ALL_FILTER,
}

const statusToneByValue = {
  [SCALE_STATUSES.NEED_SCALE]: 'warning',
  [SCALE_STATUSES.SENT]: 'info',
  [SCALE_STATUSES.PENDING]: 'warning',
  [SCALE_STATUSES.COMPLETED]: 'success',
  [SCALE_STATUSES.QC_REJECTED]: 'danger',
}

const pillToneByValue = {
  Standard: 'neutral',
  Express: 'neutral',
  Acct: 'warning',
  Acct2: 'warning',
  Main: 'info',
  Shipped: 'success',
  Delivered: 'success',
  Processing: 'warning',
  Nam: 'info',
  Duc: 'info',
  Hoa: 'success',
  Lan: 'info',
  Mai: 'info',
  Tuan: 'info',
}

function getPositiveUrlParam(search, key, fallback) {
  const value = Number(new URLSearchParams(search).get(key))
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function updateScalePaginationUrl(page, pageSize) {
  const params = new URLSearchParams(window.location.search)
  if (page > 1) params.set('page', String(page))
  else params.delete('page')
  if (pageSize !== SCALE_PAGE_SIZE) params.set('limit', String(pageSize))
  else params.delete('limit')

  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

function getScaleSlotUploadId(slot = {}) {
  return slot.fileCheckId || slot.slotKey || slot.id || 'unknown'
}

function getStatusLabelKey(status) {
  return `scale.values.scaleStatus.${status || 'unknown'}`
}

function formatEnumValue(value) {
  if (!value) return '-'
  return String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getSelectTextClass(value) {
  return value === SCALE_ALL_FILTER ? 'text-ink-muted' : 'text-ink'
}

function toOption(value) {
  if (value && typeof value === 'object') {
    return { value: value.id, label: value.name }
  }
  return { value, label: value }
}

function getGroupFilters(options, t) {
  return [
    {
      key: 'shop',
      placeholder: t('scale.filters.shop'),
      options: (options.shops || []).map(toOption),
    },
    {
      key: 'scaleBy',
      placeholder: t('scale.etsy.filters.scaleBy'),
      options: (options.scaleUsers || []).map(toOption),
    },
    {
      key: 'qcBy',
      placeholder: t('scale.etsy.filters.qcByCs'),
      options: (options.qcUsers || []).map(toOption),
    },
  ]
}

function getEtsyFilters(options, t) {
  return [
    {
      key: 'shop',
      placeholder: t('scale.etsy.filters.shop'),
      options: (options.shops || []).map(toOption),
    },
    {
      key: 'scaleBy',
      placeholder: t('scale.etsy.filters.scaleBy'),
      options: (options.scaleUsers || []).map(toOption),
    },
    {
      key: 'qcBy',
      placeholder: t('scale.etsy.filters.qcByCs'),
      options: (options.qcUsers || []).map(toOption),
    },
  ]
}

function Badge({ children, className = '', truncate = true, tooltip = '' }) {
  const badge = (
    <span
      className={`inline-flex h-6 min-w-0 max-w-full items-center justify-center overflow-hidden rounded-full px-2 text-xs font-semibold ${className}`}
    >
      <span className={truncate ? 'block min-w-0 truncate' : 'whitespace-nowrap'}>{children}</span>
    </span>
  )

  if (!tooltip) return badge

  return (
    <Tooltip title={tooltip}>
      <span className="inline-flex min-w-0 max-w-full p-2">{badge}</span>
    </Tooltip>
  )
}

function OverflowText({ value, className = '' }) {
  const text = value === null || value === undefined || value === '' ? '-' : String(value)

  return (
    <Tooltip title={text}>
      <span
        className={`block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
      >
        {text}
      </span>
    </Tooltip>
  )
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  placeholder,
  options,
  widthClass = 'min-w-[120px]',
}) {
  return (
    <FormControl size="small" className={widthClass}>
      <Select
        displayEmpty
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 rounded-lg bg-surface text-sm ${getSelectTextClass(value)}`}
        inputProps={{ 'aria-label': ariaLabel }}
        renderValue={(selected) => {
          if (selected === SCALE_ALL_FILTER) return placeholder
          return options.find((option) => option.value === selected)?.label || selected
        }}
      >
        <MenuItem value={SCALE_ALL_FILTER}>{placeholder}</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <div
      key={index}
      className="col-span-full grid h-14 grid-cols-subgrid items-center border-b border-border px-4"
    >
      {SCALE_TABLE_COLUMNS.map((column) => (
        <div key={column.id} className="min-w-0 overflow-hidden px-2">
          <Skeleton variant="text" height={20} />
        </div>
      ))}
    </div>
  ))
}

function DetailHeading({ children }) {
  return (
    <Typography variant="caption" className="text-[10px] font-semibold uppercase text-ink-muted">
      {children}
    </Typography>
  )
}

function EtsyReadonlyField({ label, value, widthClass = COST_CENTER_FIELD_CLASS, muted = false }) {
  return (
    <>
      <Typography variant="caption" className="text-[10px] text-ink-muted">
        {label}
      </Typography>
      <div
        className={`inline-flex min-w-0 items-center rounded-full border border-teal bg-surface px-[10px] py-1 ${widthClass}`}
      >
        <span
          className={`truncate text-xs ${muted ? 'text-ink-muted' : 'font-semibold text-ink-secondary'}`}
        >
          {value}
        </span>
      </div>
    </>
  )
}

function EtsyNoteBox({ label, value, onChange, onBlur, danger = false, heightClass = 'h-[52px]' }) {
  return (
    <>
      <Typography variant="caption" className="text-[10px] text-ink-muted">
        {label}
      </Typography>
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onBlur={onBlur}
        readOnly={!onChange}
        className={`${heightClass} w-full resize-none rounded border border-border bg-surface px-[10px] py-2 text-[11px] outline-none ${danger ? 'text-ink-secondary' : 'text-ink-muted'}`}
      />
    </>
  )
}

function EtsyCustomizationValue({ item }) {
  if (item.type === 'link') {
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className="break-words underline">
        {item.value}
      </a>
    )
  }

  if (item.type === 'danger') {
    return <span>{item.value}</span>
  }

  if (item.type === 'image') {
    if (item.url) {
      return (
        <ImagePreview
          src={item.url}
          alt={item.label}
          className="mt-2 flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded border border-border bg-surface-subtle"
        >
          <img
            src={item.url}
            alt={item.label}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </ImagePreview>
      )
    }

    return (
      <div className="mt-2 flex h-[82px] w-[82px] items-center justify-center rounded bg-surface-subtle">
        <ImageOutlinedIcon className="text-ink-muted" fontSize="medium" />
      </div>
    )
  }

  return <span>{item.value}</span>
}

function ScaleOutputPreview({ assetId, alt, downloadName, onDownload }) {
  const [preview, setPreview] = useState({ assetId: null, url: '' })

  useEffect(() => {
    let active = true
    let objectUrl = null

    if (!assetId) return undefined

    apiClient
      .get(ENDPOINTS.MEDIA.ASSET_DOWNLOAD(assetId), { responseType: 'blob' })
      .then((blob) => {
        if (!active || !blob?.type?.startsWith('image/')) return

        objectUrl = URL.createObjectURL(blob)
        setPreview({ assetId, url: objectUrl })
      })
      .catch(() => {})

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId])

  const previewUrl = preview.assetId === assetId ? preview.url : ''

  if (!previewUrl) {
    return <FileDownloadOutlinedIcon className="!text-[28px]" />
  }

  return (
    <ImagePreview
      src={previewUrl}
      alt={alt}
      downloadName={downloadName}
      onDownload={() => onDownload?.(assetId, downloadName)}
      className="h-full w-full"
    >
      <img src={previewUrl} alt={alt} className="h-full w-full object-cover" />
    </ImagePreview>
  )
}

function ScaleDetailPanel({
  task,
  onSaveNote,
  isSavingNote,
  onSaveCsNote,
  isSavingCsNote,
  onUploadOutput,
  onRequestManualUpload,
  onDownloadAsset,
  onRecheckTask,
  uploadingSlotId,
  uploadErrors,
  recheckingOrderItemId,
  t,
}) {
  const { detail } = task
  const [designNote, setDesignNote] = useState(() => detail.notes?.design || '')
  const [csNote, setCsNote] = useState(() => detail.notes?.cs || '')
  const isRechecking = recheckingOrderItemId === task.orderItemId

  return (
    <div className="col-span-full border-b border-border/60 bg-surface-subtle px-4 py-5 sm:px-5">
      <div className="grid gap-5 py-1 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
        <section className="flex min-w-0 flex-col items-start gap-2">
          <DetailHeading>{t('scale.detail.imagePrintSide')}</DetailHeading>
          {detail.product.imageUrl ? (
            <ImagePreview
              src={detail.product.imageUrl}
              alt={detail.product.primaryCode}
              className="flex h-[106px] w-[106px] items-center justify-center rounded-md border border-border bg-surface-subtle"
            >
              <img
                src={detail.product.imageUrl}
                alt={detail.product.primaryCode}
                className="h-full w-full object-cover"
              />
            </ImagePreview>
          ) : (
            <div className="flex h-[106px] w-[106px] items-center justify-center rounded-md border border-border bg-surface-subtle">
              <ImageOutlinedIcon className="text-ink-muted !text-[36px]" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="h-[28px] border border-border bg-surface px-3 text-[11px] text-ink-secondary">
              {detail.product.primaryCode}
            </Badge>
            <Badge
              className={`h-[28px] border bg-surface px-3 text-sm text-ink-secondary ${detail.product.psdStatus === 'MISSING' ? 'border-danger' : 'border-border'}`}
            >
              {formatEnumValue(detail.product.psdStatus)}
            </Badge>
          </div>
          <Badge className="h-[28px] border border-border bg-surface px-3 text-[11px] text-ink-secondary">
            {detail.product.secondaryCode}
          </Badge>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
            disabled={!detail.psdTemplate?.assetId}
            onClick={() => onDownloadAsset(detail.psdTemplate.assetId, `${task.orderId}-psd`)}
            className="h-[28px] rounded-full border-success px-3 text-sm font-semibold text-success"
          >
            {t('scale.etsy.actions.downloadPsd')}
          </Button>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <DetailHeading>{t('scale.detail.customization')}</DetailHeading>
          <div className="space-y-[4px]">
            {detail.customization.map((item, index) =>
              item.type === 'image' ? (
                <div key={`${item.label}-${index}`} className="flex min-w-0 flex-col gap-1">
                  <span className="shrink-0 whitespace-nowrap text-sm font-bold text-ink-detail">
                    {item.label}:
                  </span>
                  <EtsyCustomizationValue item={item} />
                </div>
              ) : (
                <InlineDetailValue key={`${item.label}-${index}`} label={item.label}>
                  <EtsyCustomizationValue item={item} />
                </InlineDetailValue>
              ),
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col items-start gap-3">
          <DetailHeading>{t('scale.detail.costCenter')}</DetailHeading>
          <div className="flex w-full flex-col gap-1">
            <EtsyReadonlyField
              label={t('scale.detail.vendor')}
              value={detail.costCenter.vendor}
              widthClass={COST_CENTER_FIELD_CLASS}
            />
            <EtsyReadonlyField
              label={t('scale.etsy.costCenter.vendorProduct')}
              value={detail.costCenter.vendorProduct}
              widthClass={COST_CENTER_FIELD_CLASS}
            />
            <EtsyReadonlyField
              label={t('scale.etsy.costCenter.productCost')}
              value={detail.costCenter.productCost}
              widthClass={COST_CENTER_FIELD_CLASS}
            />
            <div className="mt-2 pt-2">
              <EtsyReadonlyField
                label={t('scale.detail.quantity')}
                value={detail.product.quantity}
                widthClass={COST_CENTER_FIELD_CLASS}
              />
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col items-start gap-3">
          <DetailHeading>{t('scale.detail.csNote')}</DetailHeading>
          <div className="flex w-full flex-col gap-1">
            <EtsyNoteBox
              label={t('scale.etsy.notes.design')}
              value={designNote}
              onChange={setDesignNote}
              danger
            />
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={isSavingNote}
              startIcon={<SaveOutlinedIcon fontSize="small" />}
              onClick={() => onSaveNote(task, designNote)}
              className="h-7 self-start rounded border-border px-3 text-xs font-normal text-ink-action"
            >
              {t('scale.actions.saveNote')}
            </Button>
            <EtsyNoteBox
              label={t('scale.etsy.notes.cs')}
              value={csNote}
              onChange={setCsNote}
              danger
            />
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={isSavingCsNote}
              startIcon={<SaveOutlinedIcon fontSize="small" />}
              onClick={() => onSaveCsNote(task, csNote)}
              className="h-7 self-start rounded border-border px-3 text-xs font-normal text-ink-action"
            >
              {t('scale.actions.saveNote')}
            </Button>
            <EtsyNoteBox label={t('scale.etsy.notes.qc')} value={detail.notes?.qc || ''} />
          </div>
        </section>

        <section className="flex min-w-0 flex-col items-start gap-3">
          <DetailHeading>{t('scale.detail.action')}</DetailHeading>
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Tooltip title={!task.orderItemId ? t('scale.messages.recheckUnavailable') : ''}>
                <span>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    disabled={isRechecking || !task.orderItemId}
                    startIcon={<RefreshIcon className={isRechecking ? 'animate-spin' : ''} />}
                    onClick={() => onRecheckTask(task)}
                    className="h-7 rounded border-border px-2 text-xs font-normal text-ink-action"
                  >
                    {isRechecking ? t('scale.loading.rechecking') : t('scale.actions.recheck')}
                  </Button>
                </span>
              </Tooltip>
              <Button
                type="button"
                variant="outlined"
                size="small"
                disabled={Boolean(uploadingSlotId)}
                startIcon={<AddIcon className="text-xs" />}
                onClick={() =>
                  onRequestManualUpload(task, {
                    fileCheckId: null,
                    slotKey: 'FRONT',
                    slotLabel: 'Front',
                    sourceType: 'CUSTOMER_IMAGE',
                  })
                }
                className="h-7 rounded border-border px-2 text-xs font-normal text-ink-action"
              >
                {t('scale.manualUpload.addPosition')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {(detail.mockups || []).map((mockup) => {
                const previewAssetId = getScaleSlotPreviewAssetId(mockup)
                const slotUploadId = getScaleSlotUploadId(mockup)
                const slotIsUploading = uploadingSlotId === slotUploadId
                const slotUploadDisabled = isScaleSlotUploadDisabled(mockup, slotIsUploading)
                const slotUploadError = uploadErrors?.[task.id]?.[slotUploadId]
                const uploadTarget = {
                  ...mockup,
                  slotLabel: mockup.label,
                  sourceType: mockup.sourceType || 'CUSTOMER_IMAGE',
                }

                function renderSlotUploadButton(label) {
                  if (mockup.fileCheckId) {
                    return (
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        disabled={slotUploadDisabled}
                        startIcon={<CloudUploadOutlinedIcon className="text-xs" />}
                        className="h-7 w-full rounded border-border px-2 text-[11px] font-normal text-ink-action"
                      >
                        {slotIsUploading ? t('scale.loading.uploading') : label}
                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            onUploadOutput(task, uploadTarget, event.target.files?.[0])
                            event.target.value = ''
                          }}
                        />
                      </Button>
                    )
                  }

                  return (
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      disabled={slotUploadDisabled}
                      startIcon={<CloudUploadOutlinedIcon className="text-xs" />}
                      onClick={() => onRequestManualUpload(task, uploadTarget)}
                      className="h-7 w-full rounded border-border px-2 text-[11px] font-normal text-ink-action"
                    >
                      {slotIsUploading ? t('scale.loading.uploading') : label}
                    </Button>
                  )
                }

                return (
                  <div key={mockup.id} className="flex w-28 flex-col gap-1.5">
                    <Tooltip title={mockup.label}>
                      <span className="truncate text-[10px] text-ink-muted">{mockup.label}</span>
                    </Tooltip>
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-subtle text-ink-muted">
                      {previewAssetId ? (
                        <ScaleOutputPreview
                          assetId={previewAssetId}
                          alt={mockup.label}
                          downloadName={`${task.orderId}-${mockup.label}`}
                          onDownload={onDownloadAsset}
                        />
                      ) : (
                        <ImageOutlinedIcon className="!text-[28px]" />
                      )}
                    </div>
                    {renderSlotUploadButton(t('scale.manualUpload.replace'))}
                    {slotUploadError ? (
                      <div className="flex flex-col gap-1">
                        <Tooltip title={slotUploadError}>
                          <span className="truncate border-l-2 border-danger pl-1 text-[10px] font-medium text-ink-secondary">
                            {t('scale.manualUpload.uploadFailed')}
                          </span>
                        </Tooltip>
                        {renderSlotUploadButton(t('scale.manualUpload.tryAgain'))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {detail.mockups?.length ? null : (
                <span className="text-xs text-ink-muted">{t('scale.messages.noScaleSlots')}</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function renderOrderDate(task, activeSubTab) {
  return (
    <Tooltip title={task.orderDate}>
      <span
        className={`block truncate text-sm font-semibold ${activeSubTab === SCALE_SUB_TABS.ETSY_TASKS ? 'text-ink-strong' : 'text-ink-secondary'}`}
      >
        {formatCompactOrderDate(task.orderDate)}
      </span>
    </Tooltip>
  )
}

function renderPill(value) {
  return (
    <StatusBadge tone={pillToneByValue[value] || 'neutral'} tooltip={String(value || '-')}>
      {value}
    </StatusBadge>
  )
}

function renderOrderStatus(value) {
  const displayValue = value || '-'

  return (
    <StatusBadge
      tone={value ? getOrderStatusTone(value) : 'neutral'}
      tooltip={String(displayValue)}
    >
      {displayValue}
    </StatusBadge>
  )
}

function ShopName({ value, isEtsyTab }) {
  const fullName = value === null || value === undefined ? '' : String(value)
  const displayName = truncateDisplayText(fullName, SHOP_NAME_MAX_LENGTH)
  const isTruncated = displayName !== fullName

  return (
    <Tooltip title={isTruncated ? fullName : ''} disableHoverListener={!isTruncated}>
      <span className="block min-w-0">
        {isEtsyTab ? (
          <Badge className="bg-surface-subtle text-ink-secondary">{displayName}</Badge>
        ) : (
          <span className="block truncate font-semibold text-ink-secondary">{displayName}</span>
        )}
      </span>
    </Tooltip>
  )
}

function OrderIdBadge({ value, onCopy, t }) {
  const fullOrderId = value === null || value === undefined ? '' : String(value)

  return (
    <Tooltip title={fullOrderId}>
      <button
        type="button"
        aria-label={t('scale.actions.copyOrderId', { orderId: fullOrderId })}
        onClick={() => onCopy(fullOrderId)}
        className="inline-flex min-w-0 max-w-full border-0 bg-transparent p-0 text-left cursor-copy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="block max-w-full break-all font-mono text-xs font-semibold text-ink-secondary">
          {fullOrderId}
        </span>
      </button>
    </Tooltip>
  )
}

function ScalePagination({ page, pageSize, total, disabled, onPageChange, onPageSizeChange, t }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const safePage = Math.min(page, totalPages)
  const { from, to } = getPaginationRange({ page: safePage, pageSize, total })

  function getItemAriaLabel(type, pageNumber) {
    if (type === 'previous') return t('scale.pagination.previous')
    if (type === 'next') return t('scale.pagination.next')
    if (type === 'page') return t('scale.pagination.pageLabel', { page: pageNumber })
    return t('scale.pagination.morePages')
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className="text-sm whitespace-nowrap text-ink-muted">
        {t('scale.pagination.range', { from, to, total })}
      </span>
      <Pagination
        count={totalPages}
        page={safePage}
        onChange={(_event, nextPage) => onPageChange(nextPage)}
        getItemAriaLabel={getItemAriaLabel}
        size="small"
        disabled={disabled || total === 0}
      />
      <FormControl size="small" className="min-w-28">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          inputProps={{ 'aria-label': t('scale.pagination.pageSize') }}
          disabled={disabled}
        >
          {SCALE_PAGE_SIZE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {t('scale.pagination.pageSizeValue', { size: option })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}

function ManualScaleUploadDialog({
  open,
  slotKey,
  file,
  isDragging,
  isSubmitting,
  onClose,
  onSlotKeyChange,
  onFileChange,
  onDraggingChange,
  onSubmit,
  t,
}) {
  function handleDrop(event) {
    event.preventDefault()
    onDraggingChange(false)
    onFileChange(event.dataTransfer.files?.[0] || null)
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle className="pr-10 text-lg font-semibold text-ink-strong">
        {t('scale.manualUpload.title')}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-5 pt-2">
        <div className="flex flex-col gap-1.5">
          <Typography variant="body2" className="font-medium text-ink">
            {t('scale.manualUpload.position')}
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={slotKey}
              onChange={(event) => onSlotKeyChange(event.target.value)}
              disabled={isSubmitting}
            >
              {SCALE_MANUAL_UPLOAD_POSITIONS.map((position) => (
                <MenuItem key={position.value} value={position.value}>
                  {t(position.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-col gap-1.5">
          <Typography variant="body2" className="font-medium text-ink">
            {t('scale.manualUpload.file')}
          </Typography>
          <div
            onDragOver={(event) => {
              event.preventDefault()
              onDraggingChange(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              onDraggingChange(false)
            }}
            onDrop={handleDrop}
            className={`flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-5 py-6 text-center transition ${
              isDragging ? 'border-primary bg-surface' : 'border-border bg-surface-subtle'
            }`}
          >
            <CloudUploadOutlinedIcon className="text-ink-muted" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink">
                {file?.name || t('scale.manualUpload.dropTitle')}
              </span>
              <span className="text-xs text-ink-muted">{t('scale.manualUpload.dropHint')}</span>
            </div>
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={isSubmitting}
              className="h-9 rounded-lg border-border px-4 text-sm font-semibold text-ink-secondary"
            >
              {t('scale.manualUpload.selectFile')}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => {
                  onFileChange(event.target.files?.[0] || null)
                  event.target.value = ''
                }}
              />
            </Button>
          </div>
        </div>
      </DialogContent>
      <DialogActions className="px-6 pb-5 pt-2">
        <Button
          variant="outlined"
          size="medium"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-10 rounded-lg border-border px-5 text-sm font-semibold text-ink-secondary"
        >
          {t('scale.manualUpload.cancel')}
        </Button>
        <Button
          variant="contained"
          size="medium"
          onClick={onSubmit}
          disabled={!file || isSubmitting}
          className="h-10 rounded-lg px-5 text-sm font-semibold"
        >
          {isSubmitting ? t('scale.loading.uploading') : t('scale.manualUpload.upload')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ScalePage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const location = useLocation()
  const dashboardSearch = useMemo(
    () => readScaleDashboardSearch(location.search),
    [location.search],
  )
  const activeSubTab = dashboardSearch.activeSubTab || SCALE_SUB_TABS.GROUP_TASK
  const [statusTab, setStatusTab] = useState(
    () => dashboardSearch.statusTab || SCALE_STATUS_TABS.ALL,
  )
  const [groupFilters, setGroupFilters] = useState(groupFiltersInitialState)
  const [etsyFilters, setEtsyFilters] = useState(etsyFiltersInitialState)
  const [searchInput, setSearchInput] = useState('')
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const debouncedSearch = useDebounce(searchInput, 300)
  const [page, setPage] = useState(() => getPositiveUrlParam(location.search, 'page', 1))
  const [pageSize, setPageSize] = useState(() =>
    getPositiveUrlParam(location.search, 'limit', SCALE_PAGE_SIZE),
  )
  const [manualUploadDialog, setManualUploadDialog] = useState({
    open: false,
    task: null,
    target: null,
    slotKey: 'FRONT',
    file: null,
    isDragging: false,
  })
  const [uploadErrors, setUploadErrors] = useState({})

  const isEtsyTab = activeSubTab === SCALE_SUB_TABS.ETSY_TASKS
  const activeFilters = isEtsyTab ? etsyFilters : groupFilters
  const salesChannelCode = isEtsyTab ? SCALE_CHANNELS.ETSY : SCALE_CHANNELS.AMAZON

  const query = useMemo(
    () => ({
      salesChannelCode,
      statusTab,
      search: debouncedSearch,
      dateRange,
      ...activeFilters,
      page,
      pageSize,
    }),
    [activeFilters, dateRange, debouncedSearch, page, pageSize, salesChannelCode, statusTab],
  )

  const activeQuery = useScaleTasksQuery(query)
  const summaryQuery = useScaleSummaryQuery(query)
  const assigneesQuery = useScaleAssigneesQuery({ limit: 100 })
  const shopsQuery = useScaleShopsQuery({ page: 1, limit: 100 })

  const assignScaleMutation = useAssignScaleTaskMutation()
  const updateCsNoteMutation = useUpdateScaleTaskCsNoteMutation()
  const updateDesignNoteMutation = useUpdateScaleTaskNoteMutation()
  const recheckTaskMutation = useRecheckScaleTaskMutation()
  const uploadOutputMutation = useUploadScaleOutputMutation()
  const downloadAssetMutation = useDownloadScaleAssetMutation()

  const data = activeQuery.data
  const listItems = data?.items
  const shops = shopsQuery.data
  const tasks = useMemo(() => {
    const shopNames = new Map((shops || []).map((shop) => [shop.id, shop.name]))
    return (listItems || []).map((task) => ({
      ...task,
      shop: shopNames.get(task.shopId) || task.shop,
    }))
  }, [listItems, shops])
  const counts = summaryQuery.data || {}
  const options = useMemo(
    () => ({
      shops: shops || [],
      scaleUsers: assigneesQuery.data || [],
      qcUsers: data?.options?.qcUsers || [],
    }),
    [assigneesQuery.data, data?.options?.qcUsers, shops],
  )
  const total = data?.total || 0
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const filters = isEtsyTab ? getEtsyFilters(options, t) : getGroupFilters(options, t)
  const statusTabs = groupStatusTabs
  const titleKey = isEtsyTab ? 'scale.etsy.title' : 'scale.title'

  function resetPage(nextPage = 1) {
    setPage(nextPage)
    updateScalePaginationUrl(nextPage, pageSize)
  }

  useEffect(() => {
    if (!activeQuery.isSuccess || activeQuery.isFetching || page <= totalPages) return
    // The server total can shrink after a settled refresh, leaving the controlled page invalid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(totalPages)
    updateScalePaginationUrl(totalPages, pageSize)
  }, [activeQuery.isFetching, activeQuery.isSuccess, page, pageSize, totalPages])

  function updateFilter(key, value) {
    if (isEtsyTab) {
      setEtsyFilters((current) => ({ ...current, [key]: value }))
    } else {
      setGroupFilters((current) => ({ ...current, [key]: value }))
    }
    resetPage()
  }

  function handleStatusTabChange(nextStatusTab) {
    setStatusTab(nextStatusTab)
    resetPage()
  }

  function handleDateRangeChange(value) {
    setDateRange(value)
    resetPage()
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    setPage(1)
    updateScalePaginationUrl(1, nextPageSize)
  }

  function handleAssignScale(taskId, assignedDesignUserId) {
    if (!assignedDesignUserId) return

    assignScaleMutation.mutate(
      { taskId, assignedDesignUserId },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.assignSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
        onError: (error) => {
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  async function handleCopyOrderId(orderId) {
    try {
      await copyDisplayText(orderId)
      enqueueSnackbar(t('scale.messages.orderIdCopySuccess'), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
    } catch {
      enqueueSnackbar(t('scale.messages.orderIdCopyFailed'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  function handleSaveNote(task, designNote) {
    updateDesignNoteMutation.mutate(
      { taskId: task.id, designNote },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.designNoteSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
        onError: (error) => {
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  function handleSaveCsNote(task, csNote) {
    updateCsNoteMutation.mutate(
      { taskId: task.id, csNote },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.csNoteSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
        onError: (error) => {
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  function handleUploadOutput(task, slot, file, callbacks = {}) {
    if (!file) return
    if (!slot?.fileCheckId && !slot?.slotKey) {
      enqueueSnackbar(t('scale.messages.noUploadSlot'), { variant: SNACKBAR_VARIANTS.WARNING })
      return
    }

    const slotUploadId = getScaleSlotUploadId(slot)
    setUploadErrors((current) => ({
      ...current,
      [task.id]: { ...current[task.id], [slotUploadId]: null },
    }))

    uploadOutputMutation.mutate(
      {
        taskId: task.id,
        fileCheckId: slot.fileCheckId,
        file,
        slotKey: slot.slotKey,
        slotLabel: slot.slotLabel,
        sourceType: slot.sourceType,
      },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.uploadSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
          setUploadErrors((current) => ({
            ...current,
            [task.id]: { ...current[task.id], [slotUploadId]: null },
          }))
          callbacks.onSuccess?.()
        },
        onError: (error) => {
          setUploadErrors((current) => ({
            ...current,
            [task.id]: {
              ...current[task.id],
              [slotUploadId]: error.message || t('scale.manualUpload.uploadFailed'),
            },
          }))
          callbacks.onError?.()
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  function handleRecheckTask(task) {
    if (!task.orderItemId) {
      enqueueSnackbar(t('scale.messages.recheckUnavailable'), {
        variant: SNACKBAR_VARIANTS.WARNING,
      })
      return
    }

    recheckTaskMutation.mutate(
      { orderItemId: task.orderItemId },
      {
        onSuccess: (result) => {
          const blockers = result?.blockers || []
          const missingRequirements = result?.scaleContext?.missingRequirements || []
          const labels = [
            ...blockers,
            ...missingRequirements.map((requirement) => requirement.code),
          ].filter(Boolean)

          if (labels.length) {
            enqueueSnackbar(
              `${t('scale.messages.recheckStillBlocked')}: ${labels.map(formatEnumValue).join(', ')}`,
              { variant: SNACKBAR_VARIANTS.WARNING },
            )
            return
          }

          enqueueSnackbar(t('scale.messages.recheckSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
        onError: (error) => {
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  function handleRequestManualUpload(task, target) {
    setManualUploadDialog({
      open: true,
      task,
      target,
      slotKey: target?.slotKey || 'FRONT',
      file: null,
      isDragging: false,
    })
  }

  function resetManualUploadDialog() {
    setManualUploadDialog({
      open: false,
      task: null,
      target: null,
      slotKey: 'FRONT',
      file: null,
      isDragging: false,
    })
  }

  function handleCloseManualUpload() {
    if (uploadOutputMutation.isPending) return
    resetManualUploadDialog()
  }

  function updateManualUploadDialog(patch) {
    setManualUploadDialog((current) => ({ ...current, ...patch }))
  }

  function handleSubmitManualUpload() {
    const position = getScaleManualUploadPosition(manualUploadDialog.slotKey)

    handleUploadOutput(
      manualUploadDialog.task,
      {
        ...manualUploadDialog.target,
        fileCheckId: null,
        slotKey: position.value,
        slotLabel: position.slotLabel,
        sourceType: manualUploadDialog.target?.sourceType || 'CUSTOMER_IMAGE',
      },
      manualUploadDialog.file,
      { onSuccess: resetManualUploadDialog, onError: resetManualUploadDialog },
    )
  }

  async function handleDownloadAsset(assetId, filename) {
    if (!assetId) return
    try {
      const blob = await downloadAssetMutation.mutateAsync(assetId)
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(href)
    } catch (error) {
      enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }

  function renderDetailPanel(task) {
    return (
      <ScaleDetailPanel
        task={task}
        onSaveNote={handleSaveNote}
        isSavingNote={updateDesignNoteMutation.isPending}
        onSaveCsNote={handleSaveCsNote}
        isSavingCsNote={updateCsNoteMutation.isPending}
        onUploadOutput={handleUploadOutput}
        onRequestManualUpload={handleRequestManualUpload}
        onDownloadAsset={handleDownloadAsset}
        onRecheckTask={handleRecheckTask}
        uploadErrors={uploadErrors}
        uploadingSlotId={
          uploadOutputMutation.isPending && uploadOutputMutation.variables?.taskId === task.id
            ? uploadOutputMutation.variables.fileCheckId || uploadOutputMutation.variables.slotKey
            : null
        }
        recheckingOrderItemId={
          recheckTaskMutation.isPending ? recheckTaskMutation.variables?.orderItemId : null
        }
        t={t}
      />
    )
  }

  return (
    <>
      <ManualScaleUploadDialog
        open={manualUploadDialog.open}
        slotKey={manualUploadDialog.slotKey}
        file={manualUploadDialog.file}
        isDragging={manualUploadDialog.isDragging}
        isSubmitting={uploadOutputMutation.isPending}
        onClose={handleCloseManualUpload}
        onSlotKeyChange={(slotKey) => updateManualUploadDialog({ slotKey })}
        onFileChange={(file) => updateManualUploadDialog({ file })}
        onDraggingChange={(isDragging) => updateManualUploadDialog({ isDragging })}
        onSubmit={handleSubmitManualUpload}
        t={t}
      />
      <OperationsPageShell
        header={
          <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Typography variant="h5" className="text-xl font-bold text-ink-strong">
                {t(titleKey)}
              </Typography>
              <Typography variant="caption" className="text-xs text-ink-muted">
                {t('scale.lastUpdated', {
                  time: activeQuery.dataUpdatedAt
                    ? new Intl.DateTimeFormat('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      }).format(activeQuery.dataUpdatedAt)
                    : '--:--',
                })}
              </Typography>
            </div>

            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          </div>
        }
        tabs={
          <OperationsTabs
            items={statusTabs.map((tab) => ({
              value: tab.value,
              label: t(tab.labelKey),
              count: counts[tab.value] || 0,
              disabled: tab.disabled,
            }))}
            value={statusTab}
            onChange={handleStatusTabChange}
            variant="underline"
          />
        }
        toolbar={
          <OperationsToolbar>
            <div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-2 xl:w-fit xl:max-w-full xl:grid-cols-[minmax(240px,320px)_repeat(3,160px)_36px]">
              <TextField
                size="small"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value)
                  resetPage()
                }}
                placeholder={
                  isEtsyTab ? t('scale.etsy.searchPlaceholder') : t('scale.searchPlaceholder')
                }
                className="w-full bg-surface"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className="text-ink-muted" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              {filters.map((filter) => (
                <FilterSelect
                  key={filter.key}
                  value={activeFilters[filter.key]}
                  onChange={(value) => updateFilter(filter.key, value)}
                  ariaLabel={filter.placeholder}
                  placeholder={filter.placeholder}
                  options={filter.options}
                  widthClass="w-full"
                />
              ))}
              <Tooltip title={t('scale.actions.refresh')}>
                <IconButton
                  aria-label={t('scale.actions.refresh')}
                  onClick={() => {
                    activeQuery.refetch()
                    summaryQuery.refetch()
                  }}
                  className="h-9 w-9 rounded-md border border-border bg-surface text-ink-secondary"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          </OperationsToolbar>
        }
        pagination={
          <ScalePagination
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={activeQuery.isLoading}
            onPageChange={(nextPage) => resetPage(nextPage)}
            onPageSizeChange={handlePageSizeChange}
            t={t}
          />
        }
      >
        <section className="h-full overflow-hidden rounded-[10px] border border-border bg-surface">
          <div className="h-full overflow-auto scrollbar-none">
            <div className={`grid w-full min-w-full ${tableGridClass}`}>
              <div
                className={`col-span-full grid h-11 grid-cols-subgrid items-center border-b border-border px-4 uppercase text-ink-muted ${operationsTableHeaderClass} ${operationsTextCaptionClass}`}
              >
                {SCALE_TABLE_COLUMNS.map((column) => (
                  <div key={column.id} className="min-w-0 truncate overflow-hidden px-4">
                    {column.labelKey ? t(column.labelKey) : '^'}
                  </div>
                ))}
              </div>

              {activeQuery.isLoading ? (
                <LoadingRows />
              ) : activeQuery.isError ? (
                <div className="col-span-full flex h-48 items-center justify-center border-l-2 border-danger pl-2 text-sm text-ink-secondary">
                  {activeQuery.error?.message}
                </div>
              ) : tasks.length === 0 ? (
                <div className="col-span-full flex h-48 items-center justify-center text-sm text-ink-muted">
                  {t('scale.empty.noTasks')}
                </div>
              ) : (
                tasks.map((task) => {
                  const scaleOptions = assigneesQuery.data || []
                  const visibleScaleOptions =
                    task.scaleBy && !scaleOptions.some((option) => option.id === task.scaleBy)
                      ? [{ id: task.scaleBy, name: task.scaleByName }, ...scaleOptions]
                      : scaleOptions

                  return (
                    <Fragment key={task.id}>
                      <div className="col-span-full grid h-14 grid-cols-subgrid items-center border-b border-border bg-surface px-4 text-sm transition hover:bg-page">
                        <div className="px-4">
                          <OrderIdBadge value={task.orderId} onCopy={handleCopyOrderId} t={t} />
                        </div>
                        <div className="min-w-0 overflow-hidden px-4">
                          {renderOrderDate(task, activeSubTab)}
                        </div>
                        <div className="min-w-0 overflow-hidden px-4">
                          <StatusBadge
                            tone={statusToneByValue[task.scaleStatus] || 'neutral'}
                            tooltip={t(getStatusLabelKey(task.scaleStatus))}
                          >
                            {t(getStatusLabelKey(task.scaleStatus))}
                          </StatusBadge>
                        </div>
                        <div className="min-w-0 overflow-hidden px-4">
                          <ShopName value={task.shop} isEtsyTab={isEtsyTab} />
                        </div>
                        <div className="min-w-0 overflow-hidden px-4">
                          {renderOrderStatus(task.orderStatus)}
                        </div>
                        <div className="min-w-0 overflow-hidden px-4">
                          {isEtsyTab ? (
                            renderPill(task.seller)
                          ) : (
                            <OverflowText
                              value={task.seller}
                              className="font-semibold text-ink-secondary"
                            />
                          )}
                        </div>
                        <div className="min-w-0 overflow-hidden px-4">
                          <OverflowText value={task.qcBy} className="text-ink-secondary" />
                        </div>
                        <div className="min-w-0 overflow-hidden px-4">
                          <FormControl size="small" className="w-full">
                            <Select
                              value={task.scaleBy}
                              displayEmpty
                              disabled={
                                assigneesQuery.isLoading ||
                                (assignScaleMutation.isPending &&
                                  assignScaleMutation.variables?.taskId === task.id)
                              }
                              onChange={(event) => handleAssignScale(task.id, event.target.value)}
                              className={`${isEtsyTab ? 'h-[30px] rounded' : 'h-8 rounded-lg'} bg-surface text-sm`}
                              inputProps={{ 'aria-label': t('scale.table.columns.assignScale') }}
                            >
                              <MenuItem value="" disabled>
                                {t('scale.values.csStatus.UNASSIGNED')}
                              </MenuItem>
                              {visibleScaleOptions.map((option) => (
                                <MenuItem key={option.id} value={option.id}>
                                  {option.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>
                      </div>
                      {renderDetailPanel(task)}
                    </Fragment>
                  )
                })
              )}
            </div>
          </div>

          {activeQuery.isFetching && !activeQuery.isLoading ? (
            <div className="border-t border-border px-4 py-2 text-xs text-ink-muted">
              {t('scale.loading.refreshing')}
            </div>
          ) : null}
        </section>
      </OperationsPageShell>
    </>
  )
}
