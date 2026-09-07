import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import type { UploadFile } from 'antd'
import { Button, Modal, Space, Typography } from 'antd'

import { FileUpload, useFeedbackToast } from '@/shared/ui'

import type { ProductTypeGroup } from '../../catalog/api/catalogApi'
import { vendorKeys } from '../api/vendorKeys'
import styles from '../pages/VendorWorkspacePage.module.scss'
import {
  type CsvRecord,
  downloadImportTemplate,
  IMPORT_PREVIEW_LIMIT,
  type ImportSummary,
  type ImportTarget,
  parseCsv,
  runCostCenterImport,
  runProductImport,
  validateImportFile,
} from './vendorCsvUtils'

export interface VendorCsvImportModalProps {
  readonly target: ImportTarget | undefined
  readonly onClose: () => void
  readonly productTypeGroups?: ProductTypeGroup[]
  readonly productTypeGroupsLoading?: boolean
  readonly productTypeGroupsError?: boolean
}

export const VendorCsvImportModal = memo(function VendorCsvImportModal({
  target,
  onClose,
  productTypeGroups = [],
  productTypeGroupsLoading = false,
  productTypeGroupsError = false,
}: VendorCsvImportModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()

  const [importFiles, setImportFiles] = useState<UploadFile[]>([])
  const [importPreviewRows, setImportPreviewRows] = useState<CsvRecord[]>([])
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary>()
  const [importError, setImportError] = useState('')

  const handleClose = () => {
    setImportFiles([])
    setImportPreviewRows([])
    setImportSummary(undefined)
    setImportError('')
    setImporting(false)
    onClose()
  }

  const handleImport = async () => {
    if (!target) return
    const importFile = (importFiles[0]?.originFileObj ?? importFiles[0]) as File | undefined
    const nextFileError = validateImportFile(t, importFile)
    if (nextFileError) {
      setImportError(nextFileError)
      return
    }

    setImportError('')
    setImportSummary(undefined)
    setImporting(true)

    try {
      const rows = parseCsv(await importFile!.text())
      if (rows.length === 0) throw new Error(t('portal.vendors.import.invalidCsv'))

      const summary =
        target.kind === 'product'
          ? await runProductImport({
              importTarget: target,
              rows,
              productTypeGroups,
              t,
            })
          : await runCostCenterImport({
              importTarget: target,
              rows,
              t,
            })
      setImportSummary(summary)

      if (summary.created) {
        if (target.kind === 'product') {
          void queryClient.invalidateQueries({
            queryKey: vendorKeys.productsRoot(target.vendorId),
          })
        } else if (target.kind === 'costCenter') {
          void queryClient.invalidateQueries({
            queryKey: vendorKeys.costCentersRoot(target.productId),
          })
          void queryClient.invalidateQueries({
            queryKey: vendorKeys.productsRoot(target.vendorId),
          })
        }
      }

      showFeedbackToast(
        summary.failed.length ? 'warning' : 'success',
        t('portal.vendors.import.result', {
          total: summary.total,
          created: summary.created,
          failed: summary.failed.length,
        }),
      )
      if (summary.failed.length === 0) handleClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('portal.vendors.import.failed')
      setImportError(message)
      showFeedbackToast('error', t('portal.vendors.import.failed'), message)
    } finally {
      setImporting(false)
    }
  }

  if (!target) return null

  return (
    <Modal
      centered
      title={
        target.kind === 'product'
          ? t('portal.vendors.importProducts')
          : t('portal.vendors.importCostCenters')
      }
      open
      destroyOnClose
      onCancel={handleClose}
      onOk={handleImport}
      okButtonProps={{
        loading: importing,
        disabled:
          !importFiles.length ||
          importing ||
          (target.kind === 'product' && (productTypeGroupsLoading || productTypeGroupsError)),
      }}
      okText={importing ? t('portal.vendors.import.importing') : t('portal.vendors.import.submit')}
      cancelText={t('portal.vendors.cancel')}
    >
      <Space className={styles.importModalBody} direction="vertical" size={12}>
        <Space size={8} wrap>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={() => downloadImportTemplate(target)}
          >
            {t('portal.vendors.import.downloadTemplate')}
          </Button>
          <FileUpload
            accept=".csv"
            title={t('portal.vendors.import.chooseFile')}
            description={t('portal.vendors.import.description')}
            maxCount={1}
            fileList={importFiles}
            onChange={async (info) => {
              const nextFiles = info.fileList.slice(-1)
              const selected = (nextFiles[0]?.originFileObj ?? nextFiles[0]) as File | undefined
              const nextError = validateImportFile(t, selected)

              const hydratePreview = async () => {
                if (!selected) {
                  setImportPreviewRows([])
                  return
                }

                const fileRows = parseCsv(await selected.text())
                setImportPreviewRows(fileRows.slice(0, IMPORT_PREVIEW_LIMIT))
                if (!fileRows.length) {
                  setImportError(t('portal.vendors.import.invalidCsv'))
                }
              }

              if (nextError) {
                setImportFiles([])
                setImportPreviewRows([])
                setImportError(nextError)
                return
              }

              setImportFiles(nextFiles)
              setImportError('')
              setImportSummary(undefined)
              await hydratePreview()
            }}
          />
        </Space>
        {target.kind === 'product' ? (
          <Typography.Text type="secondary">
            {t('portal.vendors.import.productTip')}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {t('portal.vendors.import.costCenterTip')}
          </Typography.Text>
        )}
        {importError ? <Typography.Text type="danger">{importError}</Typography.Text> : null}
        {importFiles.length ? (
          importPreviewRows.length ? (
            <>
              <Typography.Text strong>
                {t('portal.vendors.import.previewTitle', { limit: IMPORT_PREVIEW_LIMIT })}
              </Typography.Text>
              <ul className={styles.importPreviewList}>
                {importPreviewRows.map((row, index) => (
                  <li key={row.code || String(index)}>
                    <Typography.Text type="secondary">{JSON.stringify(row)}</Typography.Text>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Typography.Text type="secondary">
              {t('portal.vendors.import.previewEmpty')}
            </Typography.Text>
          )
        ) : null}
        {importSummary ? (
          <>
            <Typography.Text strong>
              {t('portal.vendors.import.summary', {
                total: importSummary.total,
                created: importSummary.created,
                failed: importSummary.failed.length,
              })}
            </Typography.Text>
            {importSummary.failed.length ? (
              <ul className={styles.importPreviewList}>
                {importSummary.failed.map((error) => (
                  <li key={error}>
                    <Typography.Text type="danger">{error}</Typography.Text>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </Space>
    </Modal>
  )
})

export default VendorCsvImportModal
