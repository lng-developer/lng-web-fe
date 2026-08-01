import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Modal, Select, Space } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import { createVendor, updateVendor, type Vendor, type VendorInput } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

export interface VendorEditorModalProps {
  readonly item?: Vendor
  readonly open: boolean
  readonly onCancel: () => void
  readonly onSaved: (vendor: Vendor) => void
}

export function VendorEditorModal({ item, open, onCancel, onSaved }: VendorEditorModalProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [form] = Form.useForm<VendorInput>()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  useEffect(() => {
    if (!open) return
    form.setFieldsValue(
      item
        ? { ...item, fulfillmentType: item.fulfillmentType ?? 'POD' }
        : { fulfillmentType: 'POD', status: 'ACTIVE' },
    )
  }, [form, item, open])
  const save = useMutation({
    mutationFn: (values: VendorInput) => {
      if (!item) return createVendor(values)
      const { code: _code, ...input } = values
      void _code
      return updateVendor(item.id, input)
    },
    onSuccess: (vendor) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      showFeedbackToast('success', t('actionFeedback.saved'))
      onSaved(vendor)
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const close = () => {
    if (form.isFieldsTouched() && !window.confirm(t('vendors.discardChanges'))) return
    onCancel()
  }

  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      title={t(item ? 'vendors.editVendorTitle' : 'vendors.createVendorTitle')}
      onCancel={close}
    >
      <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
        <Form.Item label={t('vendors.name')} name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label={t('vendors.code')} name="code" rules={[{ required: !item }]}>
          <Input disabled={Boolean(item)} />
        </Form.Item>
        <Form.Item
          label={t('vendors.fulfillmentType')}
          name="fulfillmentType"
          rules={[{ required: true }]}
        >
          <Select
            options={['FBM', 'FBA', 'POD', 'DROPSHIP', 'CUSTOM'].map((value) => ({
              label: value,
              value,
            }))}
          />
        </Form.Item>
        <Form.Item label={t('vendors.providerKey')} name="providerKey">
          <Input />
        </Form.Item>
        <Form.Item label={t('vendors.statusLabel')} name="status">
          <Select
            options={['ACTIVE', 'INACTIVE'].map((value) => ({
              label: t(`vendors.status.${value}`),
              value,
            }))}
          />
        </Form.Item>
        <Space>
          <Button onClick={close}>{t('vendors.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            {t('vendors.save')}
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
