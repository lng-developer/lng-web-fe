import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { Alert, Button, Chip, Divider, Typography } from '@mui/material'

import InlineDetailValue from '@/components/common/InlineDetailValue'

export default function ArtworkQcPanel({
  task,
  onApprove,
  onReject,
  onReplaceArtwork,
  decisionLoading,
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (file && onReplaceArtwork) {
      onReplaceArtwork(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-surface p-6">
        <Typography className="text-ink-muted">
          {t('qc.artwork.noTaskSelected', { defaultValue: 'No task selected' })}
        </Typography>
      </div>
    )
  }

  // Mocking DPI and Color checks since it depends on the actual QC data
  // In a real scenario, this would come from the task's artwork validation results
  const dpiStatus = task.dpiStatus || 'FAILED' // FAILED or PASSED
  const colorStatus = task.colorStatus || 'PASSED' // FAILED or PASSED
  const hasErrors = dpiStatus === 'FAILED' || colorStatus === 'FAILED'

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <Typography variant="h6" className="font-bold text-ink-strong">
          {t('qc.artwork.panelTitle', { defaultValue: 'Digital QC Checklist' })}
        </Typography>
        <Chip
          label={task.orderId || 'Unknown'}
          size="small"
          className="border border-primary bg-transparent text-primary"
        />
      </div>

      <Divider />

      <section className="flex flex-col gap-3">
        <Typography variant="subtitle2" className="font-semibold text-ink-strong">
          {t('qc.artwork.taskInfo', { defaultValue: 'Order Information' })}
        </Typography>
        <div className="flex flex-col gap-2 rounded-lg bg-neutral-bg p-3">
          <InlineDetailValue
            label={t('qc.preview.productName', { defaultValue: 'Product' })}
            value={task.product?.title || '-'}
            valueClassName="text-sm font-medium text-ink"
          />
          <InlineDetailValue
            label={t('qc.preview.sku', { defaultValue: 'SKU' })}
            value={task.product?.sku || '-'}
            valueClassName="text-sm font-medium text-ink"
          />
          <InlineDetailValue
            label={t('qc.preview.vendor', { defaultValue: 'Vendor' })}
            value={task.vendorProduct || '-'}
            valueClassName="text-sm font-medium text-ink"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Typography variant="subtitle2" className="font-semibold text-ink-strong">
          {t('qc.artwork.validation', { defaultValue: 'Automated Validation' })}
        </Typography>

        <div className="flex flex-col gap-3">
          {/* DPI Check */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex flex-col">
              <Typography variant="body2" className="font-medium text-ink">
                {t('qc.artwork.dpiCheck', { defaultValue: 'File Resolution (DPI)' })}
              </Typography>
              <Typography variant="caption" className="text-ink-muted">
                {t('qc.artwork.dpiRequirement', { defaultValue: 'Required: 300 DPI' })}
              </Typography>
            </div>
            {dpiStatus === 'PASSED' ? (
              <Chip label="PASS" color="success" size="small" />
            ) : (
              <Chip label="LOW DPI" color="error" size="small" />
            )}
          </div>

          {/* CMYK Check */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex flex-col">
              <Typography variant="body2" className="font-medium text-ink">
                {t('qc.artwork.colorCheck', { defaultValue: 'Color Profile (CMYK)' })}
              </Typography>
              <Typography variant="caption" className="text-ink-muted">
                {t('qc.artwork.colorRequirement', { defaultValue: 'Required: CMYK' })}
              </Typography>
            </div>
            {colorStatus === 'PASSED' ? (
              <Chip label="PASS" color="success" size="small" />
            ) : (
              <Chip label="RGB" color="error" size="small" />
            )}
          </div>
        </div>
      </section>

      {hasErrors && (
        <Alert severity="warning" className="mt-2">
          {t('qc.artwork.errorsFound', {
            defaultValue: 'Artwork has validation errors. Please review and replace if necessary.',
          })}
        </Alert>
      )}

      {/* Action: 1-Click Replace */}
      <section className="mt-2 flex flex-col gap-3 rounded-lg border border-warning bg-warning-bg p-4">
        <Typography variant="subtitle2" className="font-semibold text-warning-strong">
          {t('qc.artwork.replaceArtwork', { defaultValue: 'Fix Artwork' })}
        </Typography>
        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg, application/pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button
          variant="contained"
          color="warning"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={decisionLoading}
          fullWidth
          className="shadow-none"
        >
          {t('qc.artwork.uploadNew', { defaultValue: 'Upload New File (1-Click Replace)' })}
        </Button>
      </section>

      <div className="mt-auto pt-6 flex flex-col gap-3">
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<CheckCircleIcon />}
          onClick={onApprove}
          disabled={decisionLoading}
          fullWidth
        >
          {t('qc.artwork.approve', { defaultValue: 'Approve & Send to Print' })}
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="large"
          startIcon={<CancelIcon />}
          onClick={onReject}
          disabled={decisionLoading}
          fullWidth
        >
          {t('qc.artwork.reject', { defaultValue: 'Reject Task' })}
        </Button>
      </div>
    </div>
  )
}
