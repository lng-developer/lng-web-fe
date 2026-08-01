import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form, Input, Modal, Select } from 'antd'

import { FormActions } from '@/shared/ui'

import type { CreateShopInput, Shop, ShopStatus } from '../api/shopApi'

type EditorValues = CreateShopInput & { status?: ShopStatus }

export interface ShopEditorModalProps {
  readonly canWrite: boolean
  readonly shop?: Shop
  readonly open: boolean
  readonly saving?: boolean
  readonly onClose: () => void
  readonly onCreate: (input: CreateShopInput) => void
  readonly onUpdateStatus: (status: ShopStatus) => void
}

export function ShopEditorModal({
  canWrite,
  shop,
  open,
  saving = false,
  onClose,
  onCreate,
  onUpdateStatus,
}: ShopEditorModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<EditorValues>()
  const isEditing = Boolean(shop)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue(shop ? { ...shop } : { currency: 'USD' })
  }, [form, open, shop])

  const close = () => {
    if (!form.isFieldsTouched()) return onClose()
    Modal.confirm({
      title: t('actionFeedback.unsaved'),
      content: t('portal.shops.unsavedDescription'),
      okText: t('portal.shops.discard'),
      cancelText: t('portal.shops.cancel'),
      onOk: onClose,
    })
  }

  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      title={t(
        isEditing
          ? canWrite
            ? 'portal.shops.editTitle'
            : 'portal.shops.inspectTitle'
          : 'portal.shops.createTitle',
      )}
      onCancel={close}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (shop) onUpdateStatus(values.status!)
          else onCreate({ name: values.name, currency: values.currency || 'USD' })
        }}
      >
        <Form.Item
          label={t('portal.shops.name')}
          name="name"
          rules={[{ required: true, message: t('portal.shops.required') }]}
        >
          <Input disabled={isEditing} />
        </Form.Item>
        <Form.Item label={t('portal.shops.currency')} name="currency">
          <Input disabled={isEditing} maxLength={3} />
        </Form.Item>
        {isEditing && (
          <Form.Item label={t('portal.shops.status')} name="status" rules={[{ required: true }]}>
            <Select
              disabled={!canWrite}
              options={(['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((status) => ({
                label: t(`portal.shops.statuses.${status}`),
                value: status,
              }))}
            />
          </Form.Item>
        )}
        {canWrite || !isEditing ? (
          <Form.Item shouldUpdate noStyle>
            {() => (
              <FormActions
                cancelLabel={t('portal.shops.cancel')}
                dirty={form.isFieldsTouched()}
                onCancel={close}
                saving={saving}
                submitLabel={t(isEditing ? 'portal.shops.saveStatus' : 'portal.shops.create')}
              />
            )}
          </Form.Item>
        ) : (
          <Button onClick={close}>{t('portal.shops.cancel')}</Button>
        )}
      </Form>
    </Modal>
  )
}
