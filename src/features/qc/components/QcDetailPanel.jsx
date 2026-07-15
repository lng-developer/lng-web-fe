import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Alert, IconButton, Skeleton, Tooltip, Typography } from '@mui/material'

import { useProductionTaskByOrderItemQuery } from '@/features/production/api/production.queries'
import { QC_DETAIL_COLUMNS } from '@/features/qc/constants/qcConstants'
import { canSubmitQcPass, canSubmitQcReject, mergeQcTaskDetail } from '@/features/qc/utils/qcApi'

import QcImageReviewDialog from './QcImageReviewDialog'

function DetailBadge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-7 max-w-full items-center rounded-full px-3 text-xs font-semibold ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

function DetailLoading() {
  return (
    <div className="grid grid-cols-8 gap-4 px-4 py-6">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={48} />
      ))}
    </div>
  )
}

export default function QcDetailPanel({
  canReview,
  decisionLoading,
  onDecision,
  onPreviewDecision,
  task,
}) {
  const { t } = useTranslation()
  const [previewOpen, setPreviewOpen] = useState(false)
  const detailQuery = useProductionTaskByOrderItemQuery(task.orderItemId)
  const resolvedTask = useMemo(
    () => mergeQcTaskDetail(task, detailQuery.data),
    [detailQuery.data, task],
  )
  const { detail } = resolvedTask
  const outputFile = detail.fileChecks.find((check) => check.outputAssetDownloadUrl)
  const canPass = canSubmitQcPass(resolvedTask)
  const canReject = canSubmitQcReject(resolvedTask)

  return (
    <div className="border-b border-border bg-surface px-4 pb-6 pt-3">
      <div className="grid min-w-full grid-cols-8 bg-neutral-bg px-2 py-2">
        {QC_DETAIL_COLUMNS.map((column) => (
          <Typography
            key={column.id}
            variant="caption"
            className={`px-2 text-xs font-semibold uppercase text-ink-muted ${
              column.id === 'productInfo' ? 'col-span-2' : ''
            }`}
          >
            {t(column.labelKey)}
          </Typography>
        ))}
      </div>

      {detailQuery.isPending ? <DetailLoading /> : null}
      {detailQuery.isError ? (
        <Alert severity="error" className="mt-4">
          {detailQuery.error?.message || t('qc.states.detailError')}
        </Alert>
      ) : null}
      {!detailQuery.isPending ? (
        <div className="grid min-w-full grid-cols-8 px-2 py-4">
          <div className="col-span-2 flex min-w-0 items-start gap-4 px-2">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-sky-border bg-sky-soft">
              {detail.product.imageUrl ? (
                <img
                  src={detail.product.imageUrl}
                  alt={detail.product.title}
                  className="size-full object-cover"
                />
              ) : (
                <ImageOutlinedIcon className="text-info-strong" fontSize="large" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Typography variant="caption" className="text-xs text-ink-muted">
                {t('qc.detail.sku')}
              </Typography>
              <DetailBadge className="bg-ink-strong text-white">{detail.product.sku}</DetailBadge>
              <Typography variant="caption" className="mt-1 text-xs text-ink-muted">
                {t('qc.detail.asin')}
              </Typography>
              <DetailBadge className="border border-info bg-surface text-info-strong">
                {detail.product.asin}
              </DetailBadge>
              <Typography variant="caption" className="mt-1 text-xs text-ink-secondary">
                {t('qc.detail.quantity', { quantity: detail.product.quantity })}
              </Typography>
            </div>
          </div>

          <div className="min-w-0 px-2">
            <DetailBadge className="border border-success bg-surface text-success">
              {t(`qc.values.scaleStatus.${detail.scaleStatus}`, {
                defaultValue: detail.scaleStatus,
              })}
            </DetailBadge>
          </div>
          <div className="min-w-0 px-2">
            <Tooltip title={detail.orderOwner} disableHoverListener={detail.orderOwner === '-'}>
              <span className="block truncate text-xs text-ink-secondary">{detail.orderOwner}</span>
            </Tooltip>
          </div>
          <Tooltip title={detail.fulfillName} disableHoverListener={detail.fulfillName === '-'}>
            <Typography className="min-w-0 truncate px-2 text-xs text-ink-secondary">
              {detail.fulfillName}
            </Typography>
          </Tooltip>
          <div className="min-w-0 px-2">
            <DetailBadge className="border border-success bg-surface text-success">
              {t(`qc.values.pngStatus.${detail.pngStatus}`)}
            </DetailBadge>
          </div>
          <Tooltip title={detail.vendorProduct} disableHoverListener={detail.vendorProduct === '-'}>
            <Typography className="min-w-0 truncate px-2 text-xs text-ink-secondary">
              {detail.vendorProduct}
            </Typography>
          </Tooltip>
          <div className="flex items-start gap-1 px-2">
            <Tooltip title={t('qc.actions.inspectImages')}>
              <span>
                <IconButton
                  size="small"
                  disabled={detailQuery.isPending}
                  onClick={() => setPreviewOpen(true)}
                  className="!text-info-strong"
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {outputFile ? (
              <Tooltip title={t('qc.actions.previewOutput')}>
                <IconButton
                  component="a"
                  href={outputFile.outputAssetDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  size="small"
                  className="!text-info-strong"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title={canReview ? t('qc.actions.pass') : t('qc.actions.noQcPermission')}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canReview || !canPass}
                  onClick={() => onDecision(resolvedTask, 'PASSED')}
                  className="!text-success"
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canReview ? t('qc.actions.reject') : t('qc.actions.noQcPermission')}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canReview || !canReject}
                  onClick={() => onDecision(resolvedTask, 'REJECTED')}
                  className="!text-danger"
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </div>
        </div>
      ) : null}

      <QcImageReviewDialog
        open={previewOpen}
        task={resolvedTask}
        canReview={canReview}
        canPass={canPass}
        canReject={canReject}
        decisionLoading={decisionLoading}
        onClose={() => setPreviewOpen(false)}
        onSubmitDecision={onPreviewDecision}
      />
    </div>
  )
}
