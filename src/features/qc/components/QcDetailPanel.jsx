import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Alert, Button, Skeleton, Tooltip, Typography } from '@mui/material'

import InlineDetailValue from '@/components/common/InlineDetailValue'
import { StatusBadge } from '@/components/operations'
import { useProductionTaskByOrderItemQuery } from '@/features/production/api/production.queries'
import {
  buildQcImageReviewItems,
  canSubmitQcPass,
  canSubmitQcReject,
  mergeQcTaskDetail,
} from '@/features/qc/utils/qcApi'

import QcImageReviewDialog from './QcImageReviewDialog'

const slotTone = {
  UPLOADED: 'success',
  MISSING: 'danger',
  NOT_REQUIRED: 'neutral',
}

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '-'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') {
    return formatValue(value.value ?? value.name ?? value.filename ?? value.secureUrl)
  }
  return String(value)
}

function DetailSection({ children, className = '', title }) {
  return (
    <section className={`min-w-0 ${className}`}>
      <Typography
        variant="caption"
        className="mb-3 block text-xs font-bold uppercase tracking-wide text-ink-muted"
      >
        {title}
      </Typography>
      {children}
    </section>
  )
}

function getChecks(detail) {
  if (detail.scaleSlots?.length) return detail.scaleSlots
  return (detail.fileChecks || []).filter(
    (check) => check.sourceType !== 'PSD_TEMPLATE' && check.slotKey !== 'PSD_TEMPLATE',
  )
}

function getCheckStatus(check) {
  if (check.outputStatus) return check.outputStatus
  if (check.outputAssetId || check.outputAssetDownloadUrl) return 'UPLOADED'
  return check.required ? 'MISSING' : 'NOT_REQUIRED'
}

function getCheckLabel(check, index) {
  return check.slotLabel || check.position || check.slotKey || `Slot ${index + 1}`
}

function DetailLoading() {
  return (
    <div className="grid gap-5 px-4 py-6 xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={150} />
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
  const checks = getChecks(detail)
  const reviewItem = useMemo(() => buildQcImageReviewItems(resolvedTask)[0] || {}, [resolvedTask])
  const customizationFields = (reviewItem.customization || []).filter(
    (item) => String(item.type).toLowerCase() !== 'image',
  )
  const customerImages = (reviewItem.referenceImages || []).filter(
    (image) => image.type !== 'product',
  )
  const canPass = canSubmitQcPass(resolvedTask)
  const canReject = canSubmitQcReject(resolvedTask)
  const qcNote = detail.qcNote || detail.fileChecks?.find((check) => check.note)?.note || ''

  return (
    <div className="border-b border-border bg-surface-subtle px-4 pb-5 pt-4">
      {detailQuery.isPending ? <DetailLoading /> : null}
      {detailQuery.isError ? (
        <Alert severity="error" className="mb-2">
          {detailQuery.error?.message || t('qc.states.detailError')}
        </Alert>
      ) : null}

      {!detailQuery.isPending ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_1.25fr_1.55fr_1.1fr_1.3fr]">
          <DetailSection title={t('qc.detail.productAndOrder')}>
            <div className="space-y-1.5">
              <InlineDetailValue label={t('qc.detail.orderId')} value={resolvedTask.orderId} />
              <InlineDetailValue label={t('qc.detail.sku')} value={detail.product.sku} />
              <InlineDetailValue label={t('qc.detail.asin')} value={detail.product.asin} />
              <InlineDetailValue
                label={t('qc.detail.quantityLabel')}
                value={detail.product.quantity}
              />
            </div>
            <Typography className="mt-3 line-clamp-2 text-sm font-semibold text-ink-strong">
              {detail.product.title}
            </Typography>
            <StatusBadge tone="warning" className="mt-2">
              {t(`qc.values.status.${resolvedTask.statusQc}`, {
                defaultValue: resolvedTask.statusQc,
              })}
            </StatusBadge>
            <div className="mt-2 space-y-1">
              <InlineDetailValue label={t('qc.detail.seller')} value={detail.seller} />
              <InlineDetailValue label={t('qc.detail.shop')} value={resolvedTask.shop} />
              <InlineDetailValue label={t('qc.detail.fulfillName')} value={detail.fulfillName} />
            </div>
          </DetailSection>

          <DetailSection title={t('qc.detail.customization')}>
            <div className="max-h-44 space-y-1 overflow-auto pr-1">
              {customizationFields.length ? (
                customizationFields.map((item, index) => (
                  <InlineDetailValue
                    key={`${item.label}-${index}`}
                    label={item.label}
                    value={formatValue(item.value)}
                  />
                ))
              ) : (
                <Typography className="text-sm text-ink-muted">
                  {t('qc.preview.noCustomization')}
                </Typography>
              )}
            </div>
            <InlineDetailValue
              className="mt-3 border-t border-border pt-3"
              label={t('qc.detail.customerUploads')}
              value={customerImages.length}
            />
          </DetailSection>

          <DetailSection title={t('qc.detail.scaledFiles')}>
            {checks.length ? (
              <div className="max-h-56 space-y-3 overflow-auto pr-1">
                {checks.map((check, index) => {
                  const status = getCheckStatus(check)
                  const label = getCheckLabel(check, index)
                  return (
                    <div
                      key={check.fileCheckId || check.id || `${label}-${index}`}
                      className="flex min-w-0 items-end justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Typography className="truncate text-sm font-semibold text-ink-strong">
                          {label}
                        </Typography>
                        <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-ink-secondary">
                          <span>
                            <strong>{t('qc.detail.input')}:</strong>{' '}
                            {check.inputAssetId ? t('qc.detail.available') : t('qc.detail.noFile')}
                          </span>
                          <span>
                            <strong>{t('qc.detail.output')}:</strong>{' '}
                            {status === 'UPLOADED'
                              ? t('qc.detail.available')
                              : t('qc.detail.noFile')}
                          </span>
                        </div>
                      </div>
                      <StatusBadge tone={slotTone[status] || 'neutral'} tooltip={status}>
                        {t(`qc.values.pngStatus.${status}`, { defaultValue: status })}
                      </StatusBadge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Typography className="text-sm text-ink-muted">
                {t('qc.detail.noScaledFiles')}
              </Typography>
            )}
          </DetailSection>

          <DetailSection title={t('qc.detail.vendorWorkflow')}>
            <div className="space-y-1.5">
              <InlineDetailValue label={t('qc.detail.vendor')} value={detail.vendorName} />
              <InlineDetailValue
                label={t('qc.detail.vendorProduct')}
                value={detail.vendorProduct}
              />
              <InlineDetailValue
                label={t('qc.detail.costCenter')}
                value={detail.vendorCostCenter}
              />
              <InlineDetailValue label={t('qc.detail.scaleBy')} value={resolvedTask.scaleBy} />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={slotTone[detail.pngStatus] || 'neutral'}>
                  {t(`qc.values.pngStatus.${detail.pngStatus}`, {
                    defaultValue: detail.pngStatus,
                  })}
                </StatusBadge>
                <StatusBadge tone={detail.scaleStatus === 'SCALED' ? 'success' : 'warning'}>
                  {t(`qc.values.scaleStatus.${detail.scaleStatus}`, {
                    defaultValue: detail.scaleStatus,
                  })}
                </StatusBadge>
              </div>
            </div>
            {detail.blockers?.length ? (
              <Alert severity="warning" className="mt-3 !px-2 !py-1">
                {detail.blockers.join(', ')}
              </Alert>
            ) : null}
            {detail.workflow?.nextActions?.length ? (
              <Typography className="mt-2 text-xs text-ink-muted">
                {detail.workflow.nextActions.join(', ')}
              </Typography>
            ) : null}
          </DetailSection>

          <DetailSection title={t('qc.detail.notesAndDecision')}>
            <div className="space-y-1.5">
              <InlineDetailValue label={t('qc.detail.csNote')} value={detail.csNote || '-'} />
              <InlineDetailValue
                label={t('qc.detail.designNote')}
                value={detail.designNote || '-'}
              />
              <InlineDetailValue label={t('qc.detail.qcNote')} value={qcNote || '-'} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityIcon fontSize="small" />}
                disabled={detailQuery.isPending}
                onClick={() => setPreviewOpen(true)}
                className="h-8 px-3 text-xs font-semibold"
              >
                {t('qc.actions.inspectImages')}
              </Button>
              <Tooltip title={canReview ? t('qc.actions.pass') : t('qc.actions.noQcPermission')}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircleIcon fontSize="small" />}
                    disabled={!canReview || !canPass || decisionLoading}
                    onClick={() => onDecision(resolvedTask, 'PASSED')}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    {t('qc.actions.pass')}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={canReview ? t('qc.actions.reject') : t('qc.actions.noQcPermission')}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon fontSize="small" />}
                    disabled={!canReview || !canReject || decisionLoading}
                    onClick={() => onDecision(resolvedTask, 'REJECTED')}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    {t('qc.actions.reject')}
                  </Button>
                </span>
              </Tooltip>
            </div>
          </DetailSection>
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
