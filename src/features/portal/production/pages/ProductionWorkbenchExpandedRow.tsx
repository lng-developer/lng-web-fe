import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined, LinkOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { Button, Input, Typography, Upload } from 'antd'

import { AuthenticatedMediaImage, downloadMediaAsset, downloadMediaAssets } from '@/shared/media'
import { StatusTag, useFeedbackToast, ZoomableImage } from '@/shared/ui'

import {
  type FileCheck,
  type FileDecision,
  type ManualScaledOutput,
  type ProductionTask,
  uploadManualScaledOutput,
} from '../api/productionApi'
import { ManualSlotUploadModal } from './ManualSlotUploadModal'
import styles from './ProductionWorkbenchPage.module.scss'

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

function productUrl(task: ProductionTask) {
  const channel =
    task.orderItem?.salesChannelCode ||
    task.listing?.salesChannelCode ||
    task.scaleContext?.use?.listing?.salesChannelCode
  const asin = task.orderItem?.asin || task.listing?.asin
  const etsyListingId = task.orderItem?.etsyListingId || task.listing?.etsyListingId
  if (channel === 'ETSY' && etsyListingId) return `https://www.etsy.com/listing/${etsyListingId}`
  if (asin) return `https://www.amazon.com/dp/${asin}`
  return null
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
  readonly onUploaded: () => void | Promise<void>
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
      <Button size="small" onClick={() => setOpen(true)}>
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

export function ProductionWorkbenchExpandedRow({
  task,
  tab,
  canScale,
  canQc,
  decisions,
  savingNoteTaskId,
  submittingQc,
  submittingScale,
  uploadingFileCheckIds,
  onSaveNote,
  onSubmitQc,
  onSubmitScaleForQc,
  onUploadScaledOutput,
  onInspectSlot,
  onPassSlot,
  onManualSlotUploaded,
}: {
  readonly task: ProductionTask
  readonly tab: 'scale' | 'blocked' | 'qc'
  readonly canScale: boolean
  readonly canQc: boolean
  readonly decisions: Record<string, FileDecision>
  readonly savingNoteTaskId?: string
  readonly submittingQc: boolean
  readonly submittingScale: boolean
  readonly uploadingFileCheckIds: ReadonlySet<string>
  readonly onSaveNote: (taskId: string, note: string) => void
  readonly onSubmitQc: (task: ProductionTask, fileDecisions: FileDecision[]) => void
  readonly onSubmitScaleForQc: (taskId: string) => void
  readonly onUploadScaledOutput: (
    taskId: string,
    fileCheckId: string,
    file: File,
  ) => void | Promise<void>
  readonly onInspectSlot: (task: ProductionTask, check: FileCheck, readonly?: boolean) => void
  readonly onPassSlot: (checkId: string) => void
  readonly onManualSlotUploaded: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const checks = task.fileChecks ?? task.qcPreviewFileChecks ?? []
  const psdTemplate = task.scaleContext?.use?.psdTemplate
  const artworkCheck = checks.find(
    (check) => check.sourceType === 'CUSTOMER_IMAGE' && check.inputAssetDownloadUrl,
  )
  const sourceArtwork = artworkCheck?.inputAssetDownloadUrl
  const customerImages = [
    ...(sourceArtwork
      ? [{ downloadUrl: sourceArtwork, filename: artworkCheck?.inputImageName }]
      : []),
    ...(task.customization?.imageAssets ?? []).map((asset) => ({
      downloadUrl: asset.assetDownloadUrl ?? '',
      filename: asset.filename,
    })),
  ].filter(
    (asset, index, all) =>
      asset.downloadUrl &&
      all.findIndex((candidate) => candidate.downloadUrl === asset.downloadUrl) === index,
  )
  const customerImage = customerImages[0]?.downloadUrl
  const listingArtwork = task.productImageUrl
  const listingPreview = task.listing?.previewAssetDownloadUrl
  const spUrl = productUrl(task)
  const customizationEntries = formatCustomization(task.customization?.customerInputs)
  const outputChecks = checks.filter(
    (check) =>
      check.sourceType !== 'PSD_TEMPLATE' && (check.required || check.outputAssetDownloadUrl),
  )
  const canSubmitQc = outputChecks.length > 0 && outputChecks.every((check) => decisions[check.id])
  const canSubmitScale =
    outputChecks.length > 0 && outputChecks.every((check) => check.outputAssetDownloadUrl)
  const taskDecisions = outputChecks
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
            <Typography.Text strong>{t('portal.production.taskContext')}</Typography.Text>
          </div>
        </div>
        <div className={styles.metaItem}>
          <Typography.Text type="secondary">{t('portal.production.vendorProduct')}</Typography.Text>
          <Typography.Text strong>
            {task.vendorProduct?.name || task.vendorProduct?.code || '-'}
          </Typography.Text>
        </div>
        <div className={styles.metaItem}>
          <Typography.Text type="secondary">{t('portal.production.vendor')}</Typography.Text>
          <Typography.Text strong>{vendorName || '-'}</Typography.Text>
        </div>
        <div className={styles.metaItem}>
          <Typography.Text type="secondary">{t('portal.production.quantity')}</Typography.Text>
          <Typography.Text strong>{task.fulfillQty ?? '-'}</Typography.Text>
        </div>
        <div className={styles.optionGrid}>
          <div>
            <Typography.Text type="secondary">{t('portal.production.size')}</Typography.Text>
            <Typography.Text strong>{size || '-'}</Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">{t('portal.production.color')}</Typography.Text>
            <Typography.Text strong>{color || '-'}</Typography.Text>
          </div>
        </div>
        {tab === 'qc' ? (
          <div className={styles.notesSummary}>
            <div>
              <Typography.Text type="secondary">{t('portal.production.csNote')}</Typography.Text>
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
              <Typography.Text type="secondary">{t('portal.production.csNote')}</Typography.Text>
              <Typography.Text>{task.csNote || '-'}</Typography.Text>
            </div>
            <TaskNoteEditor
              initialValue={task.designNote ?? ''}
              saving={savingNoteTaskId === task.id}
              onSave={(note) => onSaveNote(task.id, note)}
            />
          </>
        )}
      </div>
      <div className={`${styles.inlineSection} ${styles.customizationSection}`}>
        <div className={styles.sectionHeader}>
          <div>
            <Typography.Text strong>{t('portal.production.customization')}</Typography.Text>
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
            <Typography.Text strong>{t('portal.production.productInput')}</Typography.Text>
          </div>
        </div>
        <div className={styles.productIdentifiers}>
          <div>
            <Typography.Text type="secondary">ASIN</Typography.Text>
            <Typography.Text>{task.orderItem?.asin || '-'}</Typography.Text>
          </div>
        </div>
        <div className={styles.artworkPreview}>
          <Typography.Text type="secondary">
            {customerImage
              ? t('portal.production.downloadCustomerImage', 'Customer image')
              : t('portal.production.originalArtwork')}
          </Typography.Text>
          {customerImage || listingPreview || listingArtwork ? (
            <ZoomableImage
              alt={
                customerImage
                  ? t('portal.production.downloadCustomerImage', 'Customer image')
                  : t('portal.production.originalArtwork')
              }
              downloadUrl={customerImage || listingPreview}
              src={listingArtwork}
              loading="lazy"
            />
          ) : (
            t('portal.production.fileMissing')
          )}
        </div>
        <div className={styles.productActions}>
          {spUrl ? (
            <Button
              icon={<LinkOutlined />}
              onClick={() => window.open(spUrl, '_blank', 'noopener,noreferrer')}
            >
              {t('portal.production.openProduct', 'Open SP')}
            </Button>
          ) : null}
          {customerImage ? (
            <Button
              className={styles.customerImageDownload}
              icon={<DownloadOutlined />}
              onClick={() =>
                void downloadMediaAssets(
                  customerImages,
                  `${task.orderItem?.externalOrderId || task.id}-customer-images.zip`,
                )
              }
            >
              {t('portal.production.downloadCustomerImages', {
                defaultValue: 'Download customer images ({{count}})',
                count: customerImages.length,
              })}
            </Button>
          ) : null}
          {psdTemplate?.assetDownloadUrl ? (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => void downloadMediaAsset(psdTemplate.assetDownloadUrl!, 'template.psd')}
            >
              {t('portal.production.downloadPsd')}
            </Button>
          ) : null}
        </div>
      </div>
      <div className={`${styles.inlineSection} ${styles.outputSection}`}>
        <div className={styles.sectionHeader}>
          <div>
            <Typography.Text strong>{t('portal.production.requiredSlots')}</Typography.Text>
            <Typography.Text type="secondary">
              {outputChecks.length} {t('portal.production.outputsRequired')}
            </Typography.Text>
          </div>
          {tab === 'scale' && canScale ? (
            <ManualSlotUploadAction
              taskId={task.id}
              existingSlotKeys={checks.map((check) => check.slotKey)}
              onUploaded={onManualSlotUploaded}
            />
          ) : null}
        </div>
        <div className={styles.inlineSlots}>
          {outputChecks.map((check) => {
            const uploading = uploadingFileCheckIds.has(check.id)
            return (
              <div className={styles.inlineSlot} key={check.id}>
                <div className={styles.slotHeader}>
                  <Typography.Text strong>{check.slotLabel || check.slotKey}</Typography.Text>
                  <StatusTag status={check.outputAssetDownloadUrl ? 'operational' : 'pending'}>
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
                {tab === 'scale' && check.qcStatus === 'REJECTED' && check.note?.trim() ? (
                  <div className={styles.rejectionNote}>
                    <Typography.Text strong>
                      {t('portal.production.qcReworkRequired')}
                    </Typography.Text>
                    <Typography.Text>{check.note}</Typography.Text>
                  </div>
                ) : null}
                <div className={styles.slotActions}>
                  {tab === 'scale' && canScale && check.outputAssetDownloadUrl ? (
                    <Button onClick={() => onInspectSlot(task, check, true)}>
                      {t('portal.production.inspect')}
                    </Button>
                  ) : null}
                  {tab === 'qc' && canQc ? (
                    <Button onClick={() => onInspectSlot(task, check)}>
                      {t('portal.production.inspect')}
                    </Button>
                  ) : null}
                  {tab === 'scale' && canScale ? (
                    <Upload
                      disabled={uploading}
                      showUploadList={false}
                      beforeUpload={(file) => {
                        void onUploadScaledOutput(task.id, check.id, file)
                        return false
                      }}
                    >
                      <Button loading={uploading} disabled={uploading} type="primary">
                        {t('portal.production.uploadOutput')}
                      </Button>
                    </Upload>
                  ) : null}
                  {tab === 'qc' && canQc && check.outputAssetDownloadUrl ? (
                    <Button
                      type={decisions[check.id]?.decision === 'PASSED' ? 'primary' : 'default'}
                      onClick={() => onPassSlot(check.id)}
                    >
                      {t('portal.production.passSlot')}
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
        {tab === 'qc' && canQc ? (
          <Button
            type="primary"
            disabled={!canSubmitQc}
            loading={submittingQc}
            onClick={() => onSubmitQc(task, taskDecisions)}
          >
            {t('portal.production.submitQc')}
          </Button>
        ) : null}
        {tab === 'scale' && canScale && canSubmitScale ? (
          <Button
            type="primary"
            loading={submittingScale}
            onClick={() => onSubmitScaleForQc(task.id)}
          >
            {t('portal.production.submitScaleQc')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default ProductionWorkbenchExpandedRow
