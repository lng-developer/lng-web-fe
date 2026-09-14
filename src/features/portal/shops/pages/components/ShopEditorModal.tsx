import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Divider, Form, Input, Modal, Switch } from 'antd'

import { FormActions } from '@/shared/ui'

import type { CreateShopInput, Shop, ShopStatus } from '../../api/shopApi'

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

  const hasChanges = () =>
    shop ? form.getFieldValue('status') !== shop.status : form.isFieldsTouched()

  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      title={
        isEditing
          ? canWrite
            ? t('portal.shops.editTitle')
            : t('portal.shops.inspectTitle')
          : t('portal.shops.createTitle')
      }
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (shop) onUpdateStatus(values.status!)
          else onCreate({ name: values.name, currency: values.currency || 'USD' })
        }}
      >
        <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
          {t('portal.shops.sectionInfo', { defaultValue: 'Store Identity' })}
        </Divider>

        <Form.Item
          label={t('portal.shops.name')}
          name="name"
          rules={[{ required: true, message: t('portal.shops.required') }]}
        >
          <Input disabled={isEditing} placeholder="e.g. My Amazon US Store" />
        </Form.Item>

        <Form.Item label={t('portal.shops.currency')} name="currency">
          <Input disabled={isEditing} maxLength={3} placeholder="USD" />
        </Form.Item>

        {isEditing && (
          <>
            <Divider plain style={{ fontSize: 12, margin: '16px 0' }}>
              {t('portal.shops.sectionStatus', { defaultValue: 'Status & Access' })}
            </Divider>
            <Form.Item
              label={t('portal.shops.status')}
              name="status"
              valuePropName="checked"
              getValueFromEvent={(checked: boolean) => (checked ? 'ACTIVE' : 'INACTIVE')}
              getValueProps={(v) => ({ checked: v === 'ACTIVE' })}
            >
              <Switch
                disabled={!canWrite}
                checkedChildren={t('portal.shops.statuses.ACTIVE')}
                unCheckedChildren={t('portal.shops.statuses.INACTIVE')}
              />
            </Form.Item>
          </>
        )}

        {canWrite || !isEditing ? (
          <Form.Item shouldUpdate noStyle>
            {() => (
              <FormActions
                cancelLabel={t('portal.shops.cancel')}
                dirty={hasChanges()}
                onCancel={onClose}
                saving={saving}
                submitLabel={isEditing ? t('portal.shops.saveStatus') : t('portal.shops.create')}
              />
            )}
          </Form.Item>
        ) : (
          <Button onClick={onClose}>{t('portal.shops.cancel')}</Button>
        )}
      </Form>
    </Modal>
  )
}
