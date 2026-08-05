import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Modal, Select, Space } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import {
  createVendorProduct,
  updateVendorProduct,
  type VendorProduct,
  type VendorProductInput,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { conflictField, isConflictError, parseJsonObject } from './vendorEditorHelpers'
import styles from './VendorWorkspacePage.module.scss'

type EditorValues = VendorProductInput & { metadataText?: string }

export interface VendorProductEditorModalProps {
  readonly item?: VendorProduct
  readonly open: boolean
  readonly vendorId: string
  readonly onCancel: () => void
  readonly onSaved: (product: VendorProduct) => void
}

export function VendorProductEditorModal({
  item,
  open,
  vendorId,
  onCancel,
  onSaved,
}: VendorProductEditorModalProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [form] = Form.useForm<EditorValues>()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  useEffect(() => {
    if (!open) return
    form.setFieldsValue(
      item
        ? {
            ...item,
            metadataText: JSON.stringify(item.metadata ?? {}, null, 2),
            productTypeGroupId: item.productTypeGroup?.id ?? '',
            vendorId,
          }
        : { status: 'ACTIVE', vendorId },
    )
  }, [form, item, open, vendorId])
  const save = useMutation({
    mutationFn: (values: EditorValues) => {
      const { code, metadataText, vendorId: ignoredVendorId, ...rest } = values
      const input = { ...rest, metadata: parseJsonObject(metadataText) }
      if (!item) return createVendorProduct({ ...input, code, vendorId })
      void ignoredVendorId
      return updateVendorProduct(item.id, input)
    },
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.productsRoot(vendorId) })
      showFeedbackToast('success', t('actionFeedback.saved'))
      onSaved(product)
    },
    onError: (error) => {
      const field = conflictField(error)
      if (field) form.setFields([{ name: field as keyof EditorValues, errors: [error.message] }])
      else if (isConflictError(error)) {
        showFeedbackToast(
          'error',
          t('vendors.duplicateConflict', {
            defaultValue:
              'A record with this code already exists. Review the form and choose another code.',
          }),
        )
      } else showFeedbackToast('error', t('actionFeedback.failed'))
    },
  })
  const close = () => {
    if (form.isFieldsTouched() && !window.confirm(t('vendors.discardChanges'))) return
    onCancel()
  }
  const maxDays = Form.useWatch('maxProductionDays', form)
  const minDays = Form.useWatch('minProductionDays', form)
  const numberRule = { type: 'integer' as const, min: 0 }
  const urlRules = [{ type: 'url' as const }, { max: 1000 }]

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      title={t(item ? 'vendors.editProductTitle' : 'vendors.createProductTitle')}
      width="min(880px, calc(100vw - 32px))"
      onCancel={close}
    >
      <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.identity')}</legend>
          <div className={styles.formGrid}>
            <Form.Item
              label={t('vendors.name')}
              name="name"
              rules={[{ required: true }, { max: 200 }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={t('vendors.code')}
              name="code"
              rules={[{ required: !item }, { max: 80 }]}
            >
              <Input disabled={Boolean(item)} />
            </Form.Item>
            <Form.Item
              label={t('vendors.externalProductId')}
              name="externalProductId"
              rules={[{ max: 120 }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={t('vendors.productTypeGroupId')}
              name="productTypeGroupId"
              rules={[{ required: true }, { len: 24 }, { pattern: /^[a-f\d]{24}$/i }]}
            >
              <Input />
            </Form.Item>
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.production')}</legend>
          <div className={styles.formGrid}>
            <Form.Item
              label={t('vendors.minProductionDays')}
              name="minProductionDays"
              rules={[
                numberRule,
                {
                  validator: (_, value) =>
                    value != null && maxDays != null && value > maxDays
                      ? Promise.reject(new Error(t('vendors.productionRangeInvalid')))
                      : Promise.resolve(),
                },
              ]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item
              label={t('vendors.maxProductionDays')}
              name="maxProductionDays"
              rules={[
                numberRule,
                {
                  validator: (_, value) =>
                    value != null && minDays != null && value < minDays
                      ? Promise.reject(new Error(t('vendors.productionRangeInvalid')))
                      : Promise.resolve(),
                },
              ]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item
              label={t('vendors.baseCostAmount')}
              name="baseCostAmount"
              rules={[numberRule]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item
              label={t('vendors.currency')}
              name="currency"
              normalize={(value) => String(value ?? '').toUpperCase()}
              rules={[{ len: 3 }]}
            >
              <Input maxLength={3} />
            </Form.Item>
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.links')}</legend>
          <div className={styles.formGrid}>
            <Form.Item label={t('vendors.imageUrl')} name="imageUrl" rules={urlRules}>
              <Input />
            </Form.Item>
            <Form.Item label={t('vendors.productUrl')} name="productUrl" rules={urlRules}>
              <Input />
            </Form.Item>
            <Form.Item
              label={t('vendors.designTemplateUrl')}
              name="designTemplateUrl"
              rules={urlRules}
            >
              <Input />
            </Form.Item>
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.advanced')}</legend>
          <Form.Item
            label={t('vendors.metadata')}
            name="metadataText"
            rules={[
              {
                validator: (_, value) => {
                  try {
                    parseJsonObject(value)
                    return Promise.resolve()
                  } catch {
                    return Promise.reject(new Error(t('vendors.invalidJson')))
                  }
                },
              },
            ]}
          >
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
          </Form.Item>
          <Form.Item label={t('vendors.statusLabel')} name="status">
            <Select
              options={['ACTIVE', 'INACTIVE'].map((value) => ({
                label: t(`vendors.status.${value}`),
                value,
              }))}
            />
          </Form.Item>
        </fieldset>
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
