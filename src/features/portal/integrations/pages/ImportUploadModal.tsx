import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd'
import { Form, Input, Modal, Select } from 'antd'

import type { Shop } from '@/features/portal/shops/api/shopApi'
import { FeedbackAlert, FileUpload, FormActions } from '@/shared/ui'

import type { ImportUploadInput, ImportUploadSource } from '../api/integrationApi'

const MAX_FILE_SIZE = 10 * 1024 * 1024

type UploadValues = Omit<ImportUploadInput, 'file'> & {
  source: ImportUploadSource
}

export interface ImportUploadModalProps {
  readonly open: boolean
  readonly shops: readonly Shop[]
  readonly saving?: boolean
  readonly error?: Error | null
  readonly onClose: () => void
  readonly onSubmit: (input: ImportUploadInput & { source: ImportUploadSource }) => void
}

export function ImportUploadModal({
  open,
  shops,
  saving = false,
  error,
  onClose,
  onSubmit,
}: ImportUploadModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<UploadValues>()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [fileError, setFileError] = useState<string>()
  const source = Form.useWatch('source', form) ?? 'AMAZON_ORDER_REPORT'

  const resetForm = () => {
    form.resetFields()
    form.setFieldsValue({ source: 'AMAZON_ORDER_REPORT', shopId: shops[0]?.id })
    setFiles([])
    setFileError(undefined)
  }

  const validateFile = (file: File | undefined) => {
    if (!file) {
      return t('portal.integrations.upload.fileRequired', {
        defaultValue: 'Select a report file',
      })
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('portal.integrations.upload.fileTooLarge', {
        defaultValue: 'File must be 10 MB or smaller',
      })
    }
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    const allowed = source === 'ETSY_SOLD_ORDER_ITEMS' ? ['.csv'] : ['.csv', '.tsv', '.txt']
    if (!allowed.includes(extension)) {
      return t('portal.integrations.upload.fileType', {
        defaultValue: 'Select a supported report file',
      })
    }
    return undefined
  }

  return (
    <Modal
      destroyOnHidden={false}
      footer={null}
      open={open}
      title={t('portal.integrations.upload.title', { defaultValue: 'Upload order report' })}
      afterOpenChange={(visible) => visible && resetForm()}
      onCancel={onClose}
    >
      {error ? (
        <FeedbackAlert
          type="error"
          title={t('portal.integrations.upload.failed', { defaultValue: 'Upload failed' })}
          description={error.message}
        />
      ) : null}
      <Form
        form={form}
        initialValues={{ source: 'AMAZON_ORDER_REPORT', shopId: shops[0]?.id }}
        layout="vertical"
        onFinish={(values) => {
          const file = (files[0]?.originFileObj ?? files[0]) as File | undefined
          const nextFileError = validateFile(file)
          setFileError(nextFileError)
          if (nextFileError || !file) return
          onSubmit({
            source: values.source,
            file,
            shopId: values.shopId,
            marketplaceCode: values.marketplaceCode,
            shopConnectionId: values.shopConnectionId || undefined,
            externalAccountId: values.externalAccountId || undefined,
          })
        }}
      >
        <Form.Item
          label={t('portal.integrations.upload.source', { defaultValue: 'Import format' })}
          name="source"
          rules={[{ required: true }]}
        >
          <Select
            aria-label={t('portal.integrations.upload.source', { defaultValue: 'Import format' })}
            options={[
              {
                label: t('portal.integrations.upload.amazon', {
                  defaultValue: 'Amazon order report',
                }),
                value: 'AMAZON_ORDER_REPORT',
              },
              {
                label: t('portal.integrations.upload.etsy', {
                  defaultValue: 'Etsy sold order items',
                }),
                value: 'ETSY_SOLD_ORDER_ITEMS',
              },
            ]}
          />
        </Form.Item>
        <Form.Item
          label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
          name="shopId"
          rules={[
            {
              required: true,
              message: t('portal.integrations.upload.shopRequired', {
                defaultValue: 'Select a shop',
              }),
            },
          ]}
        >
          <Select
            aria-label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
            options={shops.map((shop) => ({ label: shop.name, value: shop.id }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          label={t('portal.integrations.upload.marketplace', { defaultValue: 'Marketplace code' })}
          name="marketplaceCode"
          rules={[
            {
              required: true,
              message: t('portal.integrations.upload.marketplaceRequired', {
                defaultValue: 'Enter a marketplace code',
              }),
            },
          ]}
        >
          <Input
            aria-label={t('portal.integrations.upload.marketplace', {
              defaultValue: 'Marketplace code',
            })}
          />
        </Form.Item>
        <Form.Item
          label={t('portal.integrations.upload.shopConnection', {
            defaultValue: 'Shop connection ID',
          })}
          name="shopConnectionId"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('portal.integrations.upload.externalAccount', {
            defaultValue: 'External account ID',
          })}
          name="externalAccountId"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('portal.integrations.upload.file', { defaultValue: 'Report file' })}
          validateStatus={fileError ? 'error' : undefined}
          help={fileError}
        >
          <FileUpload
            accept={source === 'ETSY_SOLD_ORDER_ITEMS' ? '.csv' : '.csv,.tsv,.txt'}
            description={t('portal.integrations.upload.fileDescription', {
              defaultValue: 'CSV, TSV, or TXT up to 10 MB',
            })}
            maxCount={1}
            fileList={files}
            onChange={(info) => {
              const nextFiles = info.fileList.slice(-1)
              setFiles(nextFiles)
              const file = (nextFiles[0]?.originFileObj ?? nextFiles[0]) as File | undefined
              setFileError(validateFile(file))
            }}
            title={t('portal.integrations.upload.fileTitle', {
              defaultValue: 'Drop a report here or select a file',
            })}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {() => (
            <FormActions
              cancelLabel={t('portal.integrations.cancel', { defaultValue: 'Cancel' })}
              dirty={form.isFieldsTouched() || files.length > 0}
              onCancel={onClose}
              saving={saving}
              submitLabel={t('portal.integrations.upload.submit', { defaultValue: 'Upload' })}
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}
