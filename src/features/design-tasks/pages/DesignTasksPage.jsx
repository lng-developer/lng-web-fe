import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AddIcon from '@mui/icons-material/Add'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import GridViewIcon from '@mui/icons-material/GridView'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReplyIcon from '@mui/icons-material/Reply'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'

import { TASK_TYPES } from '@/constants/app'
import { designTasksKeys } from '@/features/design-tasks/api/designTasks.keys'
import { useDesignTasksQuery } from '@/features/design-tasks/api/designTasks.queries'
import TaskTypeTabs from '@/features/design-tasks/components/TaskTypeTabs'
import {
  DESIGN_TASK_ASIN_TYPE_FILTERS,
  DESIGN_TASK_PAGE_SIZE,
  DESIGN_TASK_SELLER_FILTERS,
  DESIGN_TASK_SHOP_FILTERS,
  DESIGN_TASK_STATUS_TABS,
  DESIGN_TASK_TABLE_COLUMNS,
  PNG_TASK_TABLE_COLUMNS,
  PSD_TASK_TABLE_COLUMNS,
} from '@/features/design-tasks/constants/designTasksConstants'
import { useDebounce } from '@/hooks/useDebounce'

const ideaStatusTabs = [
  { value: DESIGN_TASK_STATUS_TABS.ALL, labelKey: 'designTasks.statusTabs.all' },
  { value: DESIGN_TASK_STATUS_TABS.NEW, labelKey: 'designTasks.statusTabs.new' },
  { value: DESIGN_TASK_STATUS_TABS.ASSIGNED, labelKey: 'designTasks.statusTabs.assigned' },
  { value: DESIGN_TASK_STATUS_TABS.IN_PROGRESS, labelKey: 'designTasks.statusTabs.inProgress' },
  { value: DESIGN_TASK_STATUS_TABS.UPLOADED, labelKey: 'designTasks.statusTabs.uploaded' },
  { value: DESIGN_TASK_STATUS_TABS.QC_PASSED, labelKey: 'designTasks.statusTabs.qcPassed' },
  { value: DESIGN_TASK_STATUS_TABS.QC_REJECTED, labelKey: 'designTasks.statusTabs.qcRejected' },
]

const psdStatusTabs = [
  { value: DESIGN_TASK_STATUS_TABS.ALL, labelKey: 'designTasks.statusTabs.all' },
  { value: DESIGN_TASK_STATUS_TABS.NEW, labelKey: 'designTasks.statusTabs.new' },
  { value: DESIGN_TASK_STATUS_TABS.REQUESTED, labelKey: 'designTasks.statusTabs.requested' },
  { value: DESIGN_TASK_STATUS_TABS.ASSIGNED, labelKey: 'designTasks.statusTabs.assigned' },
  { value: DESIGN_TASK_STATUS_TABS.IN_PROGRESS, labelKey: 'designTasks.statusTabs.inProgress' },
  { value: DESIGN_TASK_STATUS_TABS.UPLOADED, labelKey: 'designTasks.statusTabs.uploaded' },
  { value: DESIGN_TASK_STATUS_TABS.QC_REJECTED, labelKey: 'designTasks.statusTabs.qcRejected' },
  { value: DESIGN_TASK_STATUS_TABS.QC_PASSED, labelKey: 'designTasks.statusTabs.qcPassed' },
]

const pngStatusTabs = [
  { value: DESIGN_TASK_STATUS_TABS.ALL, labelKey: 'designTasks.statusTabs.all' },
  {
    value: DESIGN_TASK_STATUS_TABS.PENDING_ASSIGNMENT,
    labelKey: 'designTasks.statusTabs.pendingAssignment',
  },
  { value: DESIGN_TASK_STATUS_TABS.NEED_SCALE, labelKey: 'designTasks.statusTabs.needScale' },
  { value: DESIGN_TASK_STATUS_TABS.PENDING, labelKey: 'designTasks.statusTabs.pending' },
  { value: DESIGN_TASK_STATUS_TABS.COMPLETED, labelKey: 'designTasks.statusTabs.completed' },
  { value: DESIGN_TASK_STATUS_TABS.QC_REJECTED, labelKey: 'designTasks.statusTabs.qcRejected' },
]

const pageSizeOptions = [10, 20, 50]

const sellerFilterOptions = [
  { value: DESIGN_TASK_SELLER_FILTERS.ALL, labelKey: 'designTasks.psd.filters.all' },
]

const shopFilterOptions = [
  { value: DESIGN_TASK_SHOP_FILTERS.ALL, labelKey: 'designTasks.png.filters.all' },
]

const asinTypeFilterOptions = [
  { value: DESIGN_TASK_ASIN_TYPE_FILTERS.ALL, labelKey: 'designTasks.png.filters.all' },
]

const statusClasses = {
  New: 'border border-success bg-surface text-success',
  Assigned: 'border border-warning bg-surface text-warning',
  Uploaded: 'border border-success bg-surface text-success',
  'In Progress': 'border border-warning bg-surface text-warning',
  Complete: 'border border-success bg-surface text-success',
  Completed: 'border border-success bg-surface text-success',
}

const chipClasses = {
  'Pending assign': 'border border-border bg-surface text-ink-muted',
  Nam: 'bg-warning-bg text-warning-deep',
  Hoa: 'bg-warning-bg text-warning-deep',
  Acct: 'bg-warning-bg text-warning-deep',
  Acct2: 'bg-warning-bg text-warning-deep',
  Main: 'bg-info-bg text-info-strong',
  'T-Shirt': 'border border-teal bg-surface text-teal',
  Ornament: 'border border-teal bg-surface text-teal',
  'Jane Cooper': 'border border-secondary bg-surface text-secondary',
  'Nam Tran': 'border border-secondary bg-surface text-secondary',
  'Alex Rivera': 'border border-secondary bg-surface text-secondary',
  'Mia Chen': 'border border-secondary bg-surface text-secondary',
  'Sam Lee': 'border border-secondary bg-surface text-secondary',
  'Nguyễn Phương Nam': 'bg-warning-bg text-warning-deep',
  Medium: 'border border-border bg-surface text-ink-secondary',
  High: 'border border-border bg-surface text-ink-secondary',
  Urgent: 'border border-border bg-surface text-ink-secondary',
  Easy: 'border border-border bg-surface text-ink-secondary',
  Available: 'border border-success bg-surface text-success',
  Draft: 'border border-success bg-surface text-success',
  'Global Shop': 'border border-warning bg-surface text-warning-deep',
  'North Store': 'border border-warning bg-surface text-warning-deep',
  'East Market': 'border border-warning bg-surface text-warning-deep',
  'West Hub': 'border border-warning bg-surface text-warning-deep',
  'No data': 'bg-neutral-bg text-ink-muted',
  Normal: 'border border-teal bg-surface text-teal',
  Variation: 'border border-teal bg-surface text-teal',
}

const productToneClasses = {
  white: 'bg-surface-subtle text-info',
  gray: 'bg-neutral-bg text-ink-muted',
  navy: 'bg-info-bg text-info-strong',
  blue: 'bg-sky-soft text-link-blue',
  green: 'bg-success-bg text-success',
}

function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-6 max-w-full items-center justify-center rounded-full px-3 text-xs font-semibold ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

function Chip({ value }) {
  return <Badge className={chipClasses[value] || 'bg-neutral-bg text-ink-secondary'}>{value}</Badge>
}

function StatusChip({ value }) {
  return (
    <Badge className={statusClasses[value] || 'border border-border bg-surface text-ink-muted'}>
      <span className="inline-flex items-center gap-1">
        <AccessTimeIcon fontSize="inherit" />
        {value}
      </span>
    </Badge>
  )
}

function DateValue({ value }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-sm font-semibold text-ink-secondary">{value.date}</span>
      <span className="truncate text-xs text-ink-muted">{value.relative}</span>
    </div>
  )
}

function ProductImagePlaceholder() {
  return (
    <div className="flex size-20 items-center justify-center rounded-lg bg-neutral-bg">
      <ImageOutlinedIcon className="text-ink-muted" fontSize="small" />
    </div>
  )
}

function PsdProductImage({ tone }) {
  return (
    <div
      className={`flex size-16 items-center justify-center rounded-lg ${
        productToneClasses[tone] || 'bg-neutral-bg text-ink-muted'
      }`}
    >
      <ImageOutlinedIcon fontSize="small" />
    </div>
  )
}

function LoadingRows({ columns }) {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index} className="border-b border-border">
      {columns.map((column) => (
        <td key={column.id} className="px-6 py-4">
          <Skeleton variant="text" height={20} />
        </td>
      ))}
    </tr>
  ))
}

function PsdActionButton({ label, tone = 'neutral', children }) {
  const toneClass =
    tone === 'success'
      ? 'bg-success-bg text-success'
      : tone === 'danger'
        ? 'bg-danger-bg text-danger'
        : 'bg-neutral-bg text-ink-muted'

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} size="small" className={`h-9 w-9 rounded-lg ${toneClass}`}>
        {children}
      </IconButton>
    </Tooltip>
  )
}

function DetailField({ label, value, valueClassName = 'text-link-blue' }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      <span className="font-semibold text-ink-detail">{label}</span>
      <span className={`min-w-0 truncate text-right ${valueClassName}`}>{value}</span>
    </div>
  )
}

function PngActionButton({ label, tone = 'neutral', children }) {
  const toneClass = tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-neutral-bg text-ink-muted'

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} size="small" className={`h-9 w-9 rounded-lg ${toneClass}`}>
        {children}
      </IconButton>
    </Tooltip>
  )
}

function PngExpandedDetail({ task, t }) {
  const detail = task.detail

  if (!detail) return null

  return (
    <tr className="border-b border-border bg-page">
      <td colSpan={PNG_TASK_TABLE_COLUMNS.length} className="px-6 py-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
          <section className="flex flex-col gap-3">
            <Typography
              variant="caption"
              className="text-xs font-semibold uppercase text-ink-muted"
            >
              {t('designTasks.png.detail.productInfo')}
            </Typography>
            <div className="flex size-24 items-center justify-center rounded-lg border border-sky-border bg-sky-soft">
              <ImageOutlinedIcon className="text-info" />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Chip value={detail.productInfo.sku} />
              <Chip value={detail.productInfo.type} />
              <Chip value={detail.productInfo.asin} />
              <Button
                variant="outlined"
                size="small"
                startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                className="h-8 rounded-full border-success px-3 text-xs font-semibold text-success"
              >
                {t('designTasks.png.actions.downloadPsd')}
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-2 lg:col-span-2">
            <Typography
              variant="caption"
              className="text-xs font-semibold uppercase text-ink-muted"
            >
              {t('designTasks.png.detail.customization')}
            </Typography>
            <DetailField
              label={t('designTasks.png.detail.size')}
              value={detail.customization.size}
            />
            <DetailField
              label={t('designTasks.png.detail.customName')}
              value={detail.customization.customName}
            />
            <DetailField
              label={t('designTasks.png.detail.customText')}
              value={detail.customization.customText}
            />
            <DetailField
              label={t('designTasks.png.detail.dateLocation')}
              value={detail.customization.dateLocation}
            />
            <DetailField
              label={t('designTasks.png.detail.textColor')}
              value={detail.customization.textColor}
            />
            <DetailField
              label={t('designTasks.png.detail.bgColor')}
              value={detail.customization.bgColor}
            />
            <DetailField
              label={t('designTasks.png.detail.priority')}
              value={detail.customization.priority}
            />
            <DetailField label={t('designTasks.png.detail.url')} value={detail.customization.url} />
            <DetailField
              label={t('designTasks.png.detail.linkSp')}
              value={detail.customization.linkSp}
              valueClassName="text-danger"
            />
            <DetailField
              label={t('designTasks.png.detail.customerPhoto')}
              value={detail.customization.customerPhoto}
              valueClassName="text-ink-muted"
            />
            <div className="mt-2 flex size-20 items-center justify-center rounded bg-neutral-bg">
              <ImageOutlinedIcon className="text-ink-muted" />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Typography
                variant="caption"
                className="text-xs font-semibold uppercase text-ink-muted"
              >
                {t('designTasks.png.detail.taskStatus')}
              </Typography>
              <Chip value={detail.taskStatus} />
            </div>
            <div className="flex flex-col gap-2">
              <Typography
                variant="caption"
                className="text-xs font-semibold uppercase text-ink-muted"
              >
                {t('designTasks.png.detail.costCenter')}
              </Typography>
              <span className="text-xs text-ink-muted">
                {t('designTasks.png.detail.vendorProduct')}
              </span>
              <div className="rounded border border-teal bg-surface px-3 py-1 text-sm font-semibold text-teal">
                {detail.costCenter.vendorProduct}
              </div>
              <span className="text-xs text-ink-muted">{t('designTasks.png.detail.size')}</span>
              <div className="self-start rounded border border-teal bg-surface px-3 py-1 text-sm font-semibold text-teal">
                {detail.costCenter.size}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <Typography
              variant="caption"
              className="text-xs font-semibold uppercase text-ink-muted"
            >
              {t('designTasks.png.detail.csNote')}
            </Typography>
            <span className="text-xs text-ink-muted">
              {t('designTasks.png.detail.csNoteLabel')}
            </span>
            <div className="min-h-20 rounded border border-border bg-surface p-3 text-sm text-danger">
              {detail.notes.cs}
            </div>
            <span className="text-xs text-ink-muted">
              {t('designTasks.png.detail.qcNoteLabel')}
            </span>
            <div className="min-h-14 rounded border border-border bg-surface p-3 text-sm text-ink-muted">
              {detail.notes.qc || t('designTasks.png.detail.qcNotePlaceholder')}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <Typography
              variant="caption"
              className="text-xs font-semibold uppercase text-ink-muted"
            >
              {t('designTasks.png.detail.action')}
            </Typography>
            <div className="flex gap-2">
              <Button
                variant="outlined"
                size="small"
                startIcon={<FileUploadOutlinedIcon fontSize="small" />}
                className="h-9 rounded border-border px-4 text-sm font-semibold text-ink-secondary"
              >
                {t('designTasks.actions.upload')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                className="h-9 rounded border-border px-4 text-sm font-semibold text-ink-secondary"
              >
                {t('designTasks.png.actions.add')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {detail.mockups.map((mockup) => (
                <div key={mockup} className="flex flex-col gap-1">
                  <span className="text-xs text-ink-muted">{mockup}</span>
                  <div className="relative flex size-24 items-center justify-center rounded border border-sky-border bg-sky-soft">
                    <ImageOutlinedIcon className="text-info" />
                    <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-xs text-white">
                      x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 lg:col-span-1">
            <Typography
              variant="caption"
              className="text-xs font-semibold uppercase text-ink-muted"
            >
              {t('designTasks.png.detail.orderInfo')}
            </Typography>
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span>{t('designTasks.png.detail.seller')}</span>
              <Chip value={detail.orderInfo.seller} />
            </div>
            <div className="text-sm text-ink-secondary">
              {t('designTasks.png.detail.quantity', { quantity: detail.orderInfo.quantity })}
            </div>
            <span className="text-xs text-ink-muted">
              {t('designTasks.png.detail.fulfillName')}
            </span>
            <div className="flex items-center gap-2 rounded border border-teal bg-surface px-3 py-1 text-xs text-ink-secondary">
              <span className="min-w-0 flex-1 truncate">{detail.orderInfo.fulfillName}</span>
              <ContentCopyOutlinedIcon fontSize="small" className="text-ink-muted" />
            </div>
            <span className="text-xs text-ink-muted">{t('designTasks.png.detail.buyerNote')}</span>
            <div className="min-h-20 rounded border border-border bg-surface p-3 text-sm text-ink-muted">
              {detail.orderInfo.buyerNote || t('designTasks.png.detail.notePlaceholder')}
            </div>
          </section>
        </div>
      </td>
    </tr>
  )
}

function DesignTasksPagination({ page, pageSize, total, onPageChange, onPageSizeChange, t }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = [1, 2, 3].filter((pageNumber) => pageNumber <= totalPages)

  return (
    <div className="flex items-center gap-2">
      <Typography variant="body2" className="mr-2 text-sm text-ink-muted">
        {t('designTasks.pagination.range', { from, to, total })}
      </Typography>
      <IconButton
        aria-label={t('designTasks.pagination.previous')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-9 w-9 rounded-lg border border-border bg-surface"
      >
        <KeyboardArrowLeftIcon fontSize="small" />
      </IconButton>
      {pages.map((pageNumber) => {
        const active = page === pageNumber

        return (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`h-9 w-9 rounded-lg border text-sm font-semibold ${
              active
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border bg-surface text-ink-secondary'
            }`}
          >
            {pageNumber}
          </button>
        )
      })}
      <FormControl size="small" className="w-28">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-9 rounded-lg bg-surface text-sm text-ink-secondary"
          inputProps={{ 'aria-label': t('designTasks.pagination.pageSize') }}
        >
          {pageSizeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {t('designTasks.pagination.pageSizeValue', { size: option })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}

function PsdTasksPagination({ page, sellerFilter, summaryTotal, onPageChange, onSellerChange, t }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Typography variant="body2" className="mr-2 text-sm text-ink-muted">
        {t('designTasks.psd.pagination.total', { total: summaryTotal })}
      </Typography>
      <FormControl size="small" className="w-32">
        <Select
          value={sellerFilter}
          onChange={(event) => onSellerChange(event.target.value)}
          className="h-9 rounded-lg bg-surface text-sm text-ink-secondary"
          inputProps={{ 'aria-label': t('designTasks.psd.filters.seller') }}
        >
          {sellerFilterOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t('designTasks.psd.filters.sellerValue', { value: t(option.labelKey) })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <IconButton
        aria-label={t('designTasks.pagination.previous')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-9 w-9 rounded-lg border border-border bg-surface"
      >
        <KeyboardArrowLeftIcon fontSize="small" />
      </IconButton>
      <button
        type="button"
        onClick={() => onPageChange(1)}
        className="h-9 w-9 rounded-lg border border-primary bg-primary-light text-sm font-semibold text-primary"
      >
        1
      </button>
    </div>
  )
}

function IdeaTaskRow({ task, t }) {
  return (
    <tr className="border-b border-border bg-surface last:border-b-0">
      <td className="whitespace-nowrap px-6 py-4">
        <DateValue value={task.createdAt} />
      </td>
      <td className="whitespace-nowrap px-6 py-3">
        <ProductImagePlaceholder />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <StatusChip value={task.statusTask} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Badge className="bg-info-bg text-info-strong">{task.linkProduct}</Badge>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.assigned} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.seller} />
      </td>
      <td className="px-6 py-4">
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-secondary">
          {task.description}
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.productType} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-1">
          <Tooltip title={t('designTasks.actions.upload')}>
            <IconButton
              aria-label={t('designTasks.actions.upload')}
              size="small"
              className="text-ink-muted"
            >
              <FileUploadOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('designTasks.actions.download')}>
            <IconButton
              aria-label={t('designTasks.actions.download')}
              size="small"
              className="text-ink-muted"
            >
              <FileDownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('designTasks.actions.viewGrid')}>
            <IconButton
              aria-label={t('designTasks.actions.viewGrid')}
              size="small"
              className="text-ink-muted"
            >
              <GridViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-2">
          <Tooltip title={t('designTasks.actions.edit')}>
            <IconButton
              aria-label={t('designTasks.actions.edit')}
              size="small"
              className="text-ink-muted"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('designTasks.actions.delete')}>
            <IconButton
              aria-label={t('designTasks.actions.delete')}
              size="small"
              className="text-danger"
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </td>
    </tr>
  )
}

function PsdTaskRow({ task, t }) {
  return (
    <tr className="border-b border-border bg-surface last:border-b-0">
      <td className="whitespace-nowrap px-6 py-5">
        <DateValue value={task.createdAt} />
      </td>
      <td className="whitespace-nowrap px-6 py-3">
        <PsdProductImage tone={task.productTone} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Badge className="border border-info bg-surface text-info">{task.asin}</Badge>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <StatusChip value={task.statusTask} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.assigned} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.priority} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.psdStatus} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.seller} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Chip value={task.asinType} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-2">
          <PsdActionButton label={t('designTasks.actions.download')}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </PsdActionButton>
          <PsdActionButton label={t('designTasks.actions.upload')}>
            <FileUploadOutlinedIcon fontSize="small" />
          </PsdActionButton>
          <PsdActionButton label={t('designTasks.psd.actions.approve')} tone="success">
            <CheckIcon fontSize="small" />
          </PsdActionButton>
          <PsdActionButton label={t('designTasks.psd.actions.revert')} tone="danger">
            <ReplyIcon fontSize="small" />
          </PsdActionButton>
          <PsdActionButton label={t('designTasks.actions.delete')} tone="danger">
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </PsdActionButton>
        </div>
      </td>
    </tr>
  )
}

function PngTaskRow({ task, expanded, onToggle, t }) {
  return (
    <>
      <tr className="border-b border-border bg-surface last:border-b-0">
        <td className="whitespace-nowrap px-6 py-4">
          <IconButton
            aria-label={
              expanded ? t('designTasks.png.actions.collapse') : t('designTasks.png.actions.expand')
            }
            size="small"
            onClick={() => onToggle(task.id)}
            className="text-ink-muted"
          >
            {expanded ? (
              <KeyboardArrowDownIcon fontSize="small" />
            ) : (
              <KeyboardArrowRightIcon fontSize="small" />
            )}
          </IconButton>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <span className="text-sm font-semibold text-primary">{task.orderId}</span>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <DateValue value={task.orderDate} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <StatusChip value={task.scaleStatus} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <Chip value={task.scaleBy} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <Chip value={task.shop} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <StatusChip value={task.orderStatus} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <Chip value={task.orderOwner} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <Chip value={task.qcBy} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <Chip value={task.express} />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="flex items-center gap-2">
            <PngActionButton label={t('designTasks.actions.upload')}>
              <FileUploadOutlinedIcon fontSize="small" />
            </PngActionButton>
            <PngActionButton label={t('designTasks.png.actions.copy')}>
              <ContentCopyOutlinedIcon fontSize="small" />
            </PngActionButton>
            <PngActionButton label={t('designTasks.actions.download')}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </PngActionButton>
            <PngActionButton label={t('designTasks.png.actions.cut')} tone="danger">
              <ContentCutOutlinedIcon fontSize="small" />
            </PngActionButton>
          </div>
        </td>
      </tr>
      {expanded ? <PngExpandedDetail task={task} t={t} /> : null}
    </>
  )
}

export default function DesignTasksPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState(TASK_TYPES.IDEA)
  const [statusTab, setStatusTab] = useState(DESIGN_TASK_STATUS_TABS.ALL)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DESIGN_TASK_PAGE_SIZE)
  const [sellerFilter, setSellerFilter] = useState(DESIGN_TASK_SELLER_FILTERS.ALL)
  const [shopFilter, setShopFilter] = useState(DESIGN_TASK_SHOP_FILTERS.ALL)
  const [asinTypeFilter, setAsinTypeFilter] = useState(DESIGN_TASK_ASIN_TYPE_FILTERS.ALL)
  const [expandedPngTaskIds, setExpandedPngTaskIds] = useState(() => new Set(['png-task-001']))
  const isPsdTasks = subTab === TASK_TYPES.PSD
  const isPngTasks = subTab === TASK_TYPES.PNG
  const activeStatusTabs = isPngTasks ? pngStatusTabs : isPsdTasks ? psdStatusTabs : ideaStatusTabs
  const tableColumns = isPngTasks
    ? PNG_TASK_TABLE_COLUMNS
    : isPsdTasks
      ? PSD_TASK_TABLE_COLUMNS
      : DESIGN_TASK_TABLE_COLUMNS

  const query = useMemo(
    () => ({
      subTab,
      statusTab,
      search: debouncedSearch,
      seller: isPsdTasks ? sellerFilter : DESIGN_TASK_SELLER_FILTERS.ALL,
      shop: isPngTasks ? shopFilter : DESIGN_TASK_SHOP_FILTERS.ALL,
      asinType: isPngTasks ? asinTypeFilter : DESIGN_TASK_ASIN_TYPE_FILTERS.ALL,
      page,
      pageSize,
    }),
    [
      asinTypeFilter,
      debouncedSearch,
      isPngTasks,
      isPsdTasks,
      page,
      pageSize,
      sellerFilter,
      shopFilter,
      statusTab,
      subTab,
    ],
  )
  const { data, isPending } = useDesignTasksQuery(query)
  const tasks = data?.items || []
  const counts = data?.counts || {}
  const total = data?.total || 0
  const summaryTotal = data?.summaryTotal ?? total

  function resetPage(nextPage = 1) {
    setPage(nextPage)
  }

  function handleSubTabChange(nextSubTab) {
    setSubTab(nextSubTab)
    setStatusTab(DESIGN_TASK_STATUS_TABS.ALL)
    setSearchInput('')
    setSellerFilter(DESIGN_TASK_SELLER_FILTERS.ALL)
    setShopFilter(DESIGN_TASK_SHOP_FILTERS.ALL)
    setAsinTypeFilter(DESIGN_TASK_ASIN_TYPE_FILTERS.ALL)
    resetPage()
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    resetPage()
  }

  function handleTogglePngTask(taskId) {
    setExpandedPngTaskIds((current) => {
      const next = new Set(current)

      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }

      return next
    })
  }

  const titleKey =
    subTab === TASK_TYPES.IDEA
      ? 'designTasks.titles.idea'
      : subTab === TASK_TYPES.PSD
        ? 'designTasks.titles.psd'
        : 'designTasks.titles.png'

  return (
    <div className="flex min-h-full flex-col bg-surface p-2">
      <TaskTypeTabs value={subTab} onChange={handleSubTabChange} />

      <header className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Typography variant="h5" className="text-xl font-bold text-ink-strong">
          {t(titleKey)}
        </Typography>
        <div className="flex items-center gap-3">
          <Button
            variant="outlined"
            startIcon={<CalendarMonthOutlinedIcon fontSize="small" />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" />}
            className="h-10 rounded-lg border-border bg-surface px-4 text-sm font-normal text-ink-secondary"
          >
            {t('designTasks.dateRange')}
          </Button>
          {isPngTasks ? null : (
            <Button
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              className="h-10 rounded-lg px-4 text-sm font-semibold"
            >
              {t('designTasks.actions.createTask')}
            </Button>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {activeStatusTabs.map((tab) => {
          const active = statusTab === tab.value

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusTab(tab.value)
                resetPage()
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
                active
                  ? isPngTasks
                    ? 'border-info bg-info text-white'
                    : 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-ink-secondary'
              }`}
            >
              <span>{t(tab.labelKey)}</span>
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${
                  active
                    ? isPngTasks
                      ? 'bg-white text-info'
                      : 'bg-white text-primary'
                    : 'bg-neutral-bg text-ink-muted'
                }`}
              >
                {counts[tab.value] || 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TextField
            size="small"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              resetPage()
            }}
            placeholder={t('designTasks.searchPlaceholder')}
            className="w-56 bg-surface"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="text-ink-muted" fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {isPngTasks ? (
            <>
              <FormControl size="small" className="w-28">
                <Select
                  value={shopFilter}
                  onChange={(event) => {
                    setShopFilter(event.target.value)
                    resetPage()
                  }}
                  className="h-9 rounded-lg bg-surface text-sm text-ink-secondary"
                  inputProps={{ 'aria-label': t('designTasks.png.filters.shop') }}
                >
                  {shopFilterOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t('designTasks.png.filters.shopValue', { value: t(option.labelKey) })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="w-36">
                <Select
                  value={asinTypeFilter}
                  onChange={(event) => {
                    setAsinTypeFilter(event.target.value)
                    resetPage()
                  }}
                  className="h-9 rounded-lg bg-surface text-sm text-ink-secondary"
                  inputProps={{ 'aria-label': t('designTasks.png.filters.asinType') }}
                >
                  {asinTypeFilterOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t('designTasks.png.filters.asinTypeValue', { value: t(option.labelKey) })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          ) : null}
          <Tooltip title={t('designTasks.actions.refresh')}>
            <IconButton
              aria-label={t('designTasks.actions.refresh')}
              onClick={() => queryClient.invalidateQueries({ queryKey: designTasksKeys.all })}
              className="h-9 w-9 rounded-lg border border-border bg-surface text-ink-secondary"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        {isPsdTasks ? (
          <PsdTasksPagination
            page={page}
            sellerFilter={sellerFilter}
            summaryTotal={summaryTotal}
            onPageChange={setPage}
            onSellerChange={(nextSeller) => {
              setSellerFilter(nextSeller)
              resetPage()
            }}
            t={t}
          />
        ) : (
          <DesignTasksPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            t={t}
          />
        )}
      </div>

      <section className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-subtle">
            <tr>
              {tableColumns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="h-12 whitespace-nowrap px-6 text-left text-xs font-semibold uppercase text-ink-muted"
                >
                  {t(column.labelKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <LoadingRows columns={tableColumns} />
            ) : (
              tasks
                .slice(0, 5)
                .map((task) =>
                  isPngTasks ? (
                    <PngTaskRow
                      key={task.id}
                      task={task}
                      expanded={expandedPngTaskIds.has(task.id)}
                      onToggle={handleTogglePngTask}
                      t={t}
                    />
                  ) : isPsdTasks ? (
                    <PsdTaskRow key={task.id} task={task} t={t} />
                  ) : (
                    <IdeaTaskRow key={task.id} task={task} t={t} />
                  ),
                )
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
