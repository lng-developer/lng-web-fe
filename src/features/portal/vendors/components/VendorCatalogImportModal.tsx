import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import type { UploadFile } from 'antd'
import { Button, Modal, Space, Typography } from 'antd'

import { FileUpload, useFeedbackToast } from '@/shared/ui'

import {
  importVendorTemplate,
  type VendorTemplateImportPayload,
  type VendorTemplateImportSummary,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import styles from '../pages/VendorWorkspacePage.module.scss'
import { parseVendorTemplateCsv, validateImportFile } from './vendorCsvUtils'

type FileKey = 'vendors' | 'vendorProducts' | 'vendorCostCenters'

const fileLabels: Record<FileKey, string> = {
  vendors: 'vendors.csv',
  vendorProducts: 'vendor_products.csv',
  vendorCostCenters: 'vendor_cost_centers.csv',
}

export const VendorCatalogImportModal = memo(function VendorCatalogImportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [files, setFiles] = useState<Record<FileKey, UploadFile[]>>({
    vendors: [],
    vendorProducts: [],
    vendorCostCenters: [],
  })
  const [summary, setSummary] = useState<VendorTemplateImportSummary>()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setFiles({ vendors: [], vendorProducts: [], vendorCostCenters: [] })
    setSummary(undefined)
    setError('')
    setSubmitting(false)
    onClose()
  }

  const readPayload = async (dryRun: boolean): Promise<VendorTemplateImportPayload> => {
    const parsed = await Promise.all(
      (Object.keys(fileLabels) as FileKey[]).map(async (key) => {
        const file = (files[key][0]?.originFileObj ?? files[key][0]) as File | undefined
        const fileError = validateImportFile(t, file)
        if (fileError) throw new Error(fileError)
        const rows = parseVendorTemplateCsv(await file!.text())
        if (!rows.length)
          throw new Error(t('portal.vendors.catalogImport.emptyFile', { file: fileLabels[key] }))
        return [key, rows] as const
      }),
    )
    return { ...Object.fromEntries(parsed), dryRun } as VendorTemplateImportPayload
  }

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const dryRun = !summary?.valid
      const result = await importVendorTemplate(await readPayload(dryRun))
      setSummary(result)
      if (dryRun) {
        if (!result.valid) throw new Error(t('portal.vendors.catalogImport.invalid'))
        showFeedbackToast('success', t('portal.vendors.catalogImport.validated'))
      } else {
        void queryClient.invalidateQueries({ queryKey: vendorKeys.all })
        showFeedbackToast('success', t('portal.vendors.catalogImport.completed'))
        reset()
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : t('portal.vendors.catalogImport.failed')
      setError(message)
      showFeedbackToast('error', t('portal.vendors.catalogImport.failed'), message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('portal.vendors.catalogImport.title')}
      onCancel={reset}
      footer={
        <Space>
          <Button onClick={reset}>{t('portal.vendors.cancel')}</Button>
          <Button type="primary" loading={submitting} onClick={submit}>
            {summary?.valid
              ? t('portal.vendors.catalogImport.import')
              : t('portal.vendors.catalogImport.validate')}
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <div className={styles.importModalBody}>
        <Typography.Text type="secondary">
          {t('portal.vendors.catalogImport.description')}
        </Typography.Text>
        {(Object.keys(fileLabels) as FileKey[]).map((key) => (
          <div className={styles.importUploadWrapper} key={key}>
            <Typography.Text strong>{fileLabels[key]}</Typography.Text>
            <FileUpload
              accept=".csv"
              maxCount={1}
              title={t('portal.vendors.import.chooseFile')}
              description={fileLabels[key]}
              fileList={files[key]}
              onChange={(info) => {
                setFiles((current) => ({ ...current, [key]: info.fileList.slice(-1) }))
                setSummary(undefined)
                setError('')
              }}
            />
          </div>
        ))}
        {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
        {summary ? (
          <div className={styles.importSummarySection}>
            <Typography.Text strong>
              {t('portal.vendors.catalogImport.summary', summary.counts)}
            </Typography.Text>
            {summary.errors.length ? (
              <ul className={styles.importPreviewList}>
                {summary.errors.map((item, index) => (
                  <li key={`${item.type ?? 'error'}-${index}`}>
                    <Typography.Text type="danger">
                      {item.message ?? JSON.stringify(item)}
                    </Typography.Text>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
})
