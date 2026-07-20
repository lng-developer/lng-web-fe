import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Alert, Button, Tooltip, Typography } from '@mui/material'

import InlineDetailValue from '@/components/common/InlineDetailValue'
import { StatusBadge } from '@/components/operations'
import {
  buildQcImageReviewItems,
  canSubmitQcPass,
  canSubmitQcReject,
} from '@/features/qc/utils/qcApi'

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '-'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') {
    return formatValue(value.value ?? value.name ?? value.filename ?? value.secureUrl)
  }
  return String(value)
}

function humanizeKey(value) {
  return formatValue(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getStatusTone(value) {
  if (['AVAILABLE', 'UPLOADED', 'SCALED'].includes(value)) return 'success'
  if (['MISSING', 'NOT_AVAILABLE', 'NEED_SCALE'].includes(value)) return 'danger'
  return 'neutral'
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
  return check.outputRequired ? 'MISSING' : 'NOT_REQUIRED'
}

function getCheckLabel(check, index) {
  return check.slotLabel || check.position || check.slotKey || `Slot ${index + 1}`
}

function QcDetailPanel({ canReview, decisionLoading, onDecision, onPreview, task }) {
  const { t } = useTranslation()
  const resolvedTask = task
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
    <div
      className="border-b border-border bg-surface-subtle px-4 pb-5 pt-4"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 280px' }}
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.25fr_1.55fr_1.1fr_1.3fr]">
        <DetailSection title={t('qc.detail.productAndOrder')}>
          <div className="space-y-1.5">
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
          <div className="mt-2 space-y-1">
            <InlineDetailValue label={t('qc.detail.fulfillName')} value={detail.fulfillName} />
          </div>
        </DetailSection>

        <DetailSection title={t('qc.detail.customization')}>
          <div className="space-y-1">
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
                    className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <Typography className="truncate text-sm font-semibold text-ink-strong">
                      {label}
                    </Typography>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge tone={check.inputAssetId ? 'success' : 'danger'}>
                        {t('qc.detail.input')}:{' '}
                        {check.inputAssetId ? t('qc.detail.available') : t('qc.detail.noFile')}
                      </StatusBadge>
                      <StatusBadge tone={getStatusTone(status)}>
                        {t('qc.detail.output')}:{' '}
                        {t(`qc.values.pngStatus.${status}`, { defaultValue: humanizeKey(status) })}
                      </StatusBadge>
                    </div>
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
            <InlineDetailValue label={t('qc.detail.vendorProduct')} value={detail.vendorProduct} />
            <InlineDetailValue label={t('qc.detail.costCenter')} value={detail.vendorCostCenter} />
            <InlineDetailValue label={t('qc.detail.pngStatus')}>
              <StatusBadge tone={getStatusTone(detail.pngStatus)}>
                {t(`qc.values.pngStatus.${detail.pngStatus}`, {
                  defaultValue: detail.pngStatus,
                })}
              </StatusBadge>
            </InlineDetailValue>
            <InlineDetailValue label={t('qc.detail.scaleStatus')}>
              <StatusBadge tone={getStatusTone(detail.scaleStatus)}>
                {t(`qc.values.scaleStatus.${detail.scaleStatus}`, {
                  defaultValue: detail.scaleStatus,
                })}
              </StatusBadge>
            </InlineDetailValue>
          </div>
          {detail.blockers?.length ? (
            <Alert severity="warning" className="mt-3 !px-2 !py-1">
              {detail.blockers.join(', ')}
            </Alert>
          ) : null}
          {detail.workflow?.nextActions?.length ? (
            <InlineDetailValue
              className="mt-2"
              label={t('qc.detail.nextAction', { defaultValue: 'Next action' })}
              value={detail.workflow.nextActions.map(humanizeKey).join(', ')}
            />
          ) : null}
        </DetailSection>

        <DetailSection title={t('qc.detail.notesAndDecision')}>
          <div className="space-y-1.5">
            <InlineDetailValue label={t('qc.detail.csNote')} value={detail.csNote || '-'} />
            <InlineDetailValue label={t('qc.detail.designNote')} value={detail.designNote || '-'} />
            <InlineDetailValue label={t('qc.detail.qcNote')} value={qcNote || '-'} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="small"
              variant="outlined"
              startIcon={<VisibilityIcon fontSize="small" />}
              onClick={() => onPreview(resolvedTask)}
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
    </div>
  )
}

export default memo(QcDetailPanel)
