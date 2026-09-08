import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { Button, Form, Input, Modal, Select, Space, Switch, Typography, Upload } from 'antd'

import { FeedbackAlert } from '@/shared/ui'

import type { FinanceImportInput } from '../api/financeApi'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.csv', '.txt']

type Values = Omit<FinanceImportInput, 'file'>

export function FinanceImportModal({
  open,
  shops,
  saving = false,
  error,
  onClose,
  onSubmit,
}: {
  readonly open: boolean
  readonly shops: ReadonlyArray<{ id: string; name: string }>
  readonly saving?: boolean
  readonly error?: Error | null
  readonly onClose: () => void
  readonly onSubmit: (input: FinanceImportInput) => void
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm<Values>()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [fileError, setFileError] = useState('')
  const reset = () => {
    form.resetFields()
    setFiles([])
    setFileError('')
  }

  return (
    <Modal centered width={720} open={open} title={t('finance.imports.modal.title')} footer={null}
      destroyOnHidden afterClose={reset} onCancel={onClose}>
      {error ? <FeedbackAlert type="error" title={error.message} /> : null}
      <Form form={form} layout="vertical" initialValues={{ kind: 'transactions', dryRun: true }}
        onFinish={(values) => {
          const file = (files[0]?.originFileObj ?? files[0]) as File | undefined
          if (file) onSubmit({ ...values, file })
        }}>
        <Space size={12} align="start" wrap>
          <Form.Item name="kind" label={t('finance.imports.modal.type')} rules={[{ required: true }]}>
            <Select style={{ width: 180 }} options={(['transactions', 'settlements', 'ads'] as const).map((value) => ({
              value, label: t(`finance.imports.modal.types.${value}`),
            }))} />
          </Form.Item>
          <Form.Item name="shopId" label={t('finance.imports.modal.shop')} rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" style={{ width: 240 }}
              options={shops.map((shop) => ({ value: shop.id, label: shop.name }))} />
          </Form.Item>
          <Form.Item name="dryRun" label={t('finance.imports.modal.dryRun')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
        <Space size={12} align="start" wrap>
          <Form.Item name="salesChannelCode" label={t('finance.imports.modal.salesChannel')}
            rules={[{ required: true, whitespace: true }]}>
            <Input style={{ width: 260 }} maxLength={50} />
          </Form.Item>
          <Form.Item name="marketplaceCode" label={t('finance.imports.modal.marketplace')}
            rules={[{ required: true, whitespace: true }]}>
            <Input style={{ width: 260 }} maxLength={50} />
          </Form.Item>
        </Space>
        <Form.Item label={t('finance.imports.modal.file')} required>
          <Upload.Dragger accept={ALLOWED_EXTENSIONS.join(',')} fileList={files} maxCount={1}
            beforeUpload={(file) => {
              const validExtension = ALLOWED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))
              if (!validExtension || file.size > MAX_FILE_SIZE) {
                setFiles([])
                setFileError(t('finance.imports.modal.fileError'))
                return Upload.LIST_IGNORE
              }
              setFiles([file])
              setFileError('')
              return false
            }}
            onRemove={() => setFiles([])}>
            <InboxOutlined />
            <div>{t('finance.imports.modal.dropFile')}</div>
          </Upload.Dragger>
          {fileError ? <Typography.Text type="danger">{fileError}</Typography.Text> : null}
        </Form.Item>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>{t('finance.imports.modal.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!files.length}>
            {t('finance.imports.modal.submit')}
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
