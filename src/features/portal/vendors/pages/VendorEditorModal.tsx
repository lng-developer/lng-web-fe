import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Divider, Form, Input, Modal, Select, Space, Switch } from 'antd'

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
    if (!form.isFieldsTouched()) return onCancel()
    Modal.confirm({
      title: t('actionFeedback.unsaved'),
      content: t('vendors.discardChanges'),
      okText: t('vendors.discard', { defaultValue: 'Discard' }),
      cancelText: t('vendors.cancel'),
      onOk: onCancel,
    })
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
        <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
          {t('vendors.sectionIdentity', { defaultValue: 'Vendor Identity' })}
        </Divider>

        <Form.Item label={t('vendors.name')} name="name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Printway POD" />
        </Form.Item>

        <Form.Item label={t('vendors.code')} name="code" rules={[{ required: !item }]}>
          <Input disabled={Boolean(item)} placeholder="PRINTWAY" />
        </Form.Item>

        <Divider plain style={{ fontSize: 12, margin: '16px 0' }}>
          {t('vendors.sectionFulfillment', { defaultValue: 'Fulfillment & SLA' })}
        </Divider>

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
          <Input placeholder="PRINTWAY" />
        </Form.Item>

        <Divider plain style={{ fontSize: 12, margin: '16px 0' }}>
          {t('vendors.sectionStatus', { defaultValue: 'Status' })}
        </Divider>

        <Form.Item
          label={t('vendors.statusLabel')}
          name="status"
          valuePropName="checked"
          getValueFromEvent={(checked: boolean) => (checked ? 'ACTIVE' : 'INACTIVE')}
          getValueProps={(v) => ({ checked: v === 'ACTIVE' })}
        >
          <Switch
            checkedChildren={t('vendors.status.ACTIVE')}
            unCheckedChildren={t('vendors.status.INACTIVE')}
          />
        </Form.Item>

        <Space style={{ marginTop: 12 }}>
          <Button onClick={close}>{t('vendors.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            {t('vendors.save')}
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
