import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Modal, Select, Space } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import {
  createVendorCostCenter,
  updateVendorCostCenter,
  type VendorCostCenter,
  type VendorCostCenterInput,
} from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { conflictField, isConflictError, parseJsonObject } from './vendorEditorHelpers'
import styles from './VendorWorkspacePage.module.scss'

type EditorValues = VendorCostCenterInput & { attributesText?: string; metadataText?: string }

export interface VendorCostCenterEditorModalProps {
  readonly item?: VendorCostCenter
  readonly open: boolean
  readonly productId: string
  readonly vendorId: string
  readonly onCancel: () => void
  readonly onSaved: (costCenter: VendorCostCenter) => void
}

const moneyNames = [
  ['domesticShipping', 'economyAmount'],
  ['domesticShipping', 'additionalAmount'],
  ['internationalShipping', 'economyAmount'],
  ['internationalShipping', 'additionalAmount'],
  ['priorityShipping', 'economyAmount'],
  ['priorityShipping', 'additionalAmount'],
] as const

export function VendorCostCenterEditorModal({
  item,
  open,
  productId,
  vendorId,
  onCancel,
  onSaved,
}: VendorCostCenterEditorModalProps) {
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
            attributesText: JSON.stringify(item.attributes ?? {}, null, 2),
            metadataText: JSON.stringify(item.metadata ?? {}, null, 2),
          }
        : { status: 'ACTIVE' },
    )
  }, [form, item, open])
  const save = useMutation({
    mutationFn: (values: EditorValues) => {
      const { attributesText, code, metadataText, ...rest } = values
      const input = {
        ...rest,
        attributes: parseJsonObject(attributesText),
        metadata: parseJsonObject(metadataText),
      }
      return item
        ? updateVendorCostCenter(productId, item.id, input)
        : createVendorCostCenter(productId, { ...input, code })
    },
    onSuccess: (costCenter) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.costCentersRoot(productId) })
      void queryClient.invalidateQueries({ queryKey: vendorKeys.productsRoot(vendorId) })
      showFeedbackToast('success', t('actionFeedback.saved'))
      onSaved(costCenter)
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
  const nonNegative = { type: 'number' as const, min: 0 }
  const integerMoney = { type: 'integer' as const, min: 0 }

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      title={t(item ? 'vendors.editCostCenterTitle' : 'vendors.createCostCenterTitle')}
      width="min(920px, calc(100vw - 32px))"
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
            <Form.Item label={t('vendors.sku')} name="sku" rules={[{ max: 120 }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('vendors.lngCode')} name="lngCode" rules={[{ max: 120 }]}>
              <Input />
            </Form.Item>
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.variants')}</legend>
          <div className={styles.formGrid}>
            {(['vendorSize', 'vendorColor', 'standardSize', 'standardColor'] as const).map(
              (name) => (
                <Form.Item
                  key={name}
                  label={t(`vendors.${name}`)}
                  name={name}
                  rules={[{ max: 80 }]}
                >
                  <Input />
                </Form.Item>
              ),
            )}
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.measurements')}</legend>
          <div className={styles.formGrid}>
            {(['weight', 'width', 'length', 'height'] as const).map((name) => (
              <Form.Item key={name} label={t(`vendors.${name}`)} name={name} rules={[nonNegative]}>
                <InputNumber min={0} />
              </Form.Item>
            ))}
            <Form.Item label={t('vendors.weightUnit')} name="weightUnit" rules={[{ max: 20 }]}>
              <Input />
            </Form.Item>
            <Form.Item
              label={t('vendors.dimensionUnit')}
              name="dimensionUnit"
              rules={[{ max: 20 }]}
            >
              <Input />
            </Form.Item>
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.pricing')}</legend>
          <div className={styles.formGrid}>
            <Form.Item
              label={t('vendors.baseCostAmount')}
              name="baseCostAmount"
              rules={[integerMoney]}
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
            <Form.Item
              label={t('vendors.importTaxAmount')}
              name="importTaxAmount"
              rules={[integerMoney]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            {moneyNames.map((name) => (
              <Form.Item
                key={name.join('.')}
                label={t(`vendors.${name[1]}`)}
                name={[...name]}
                rules={[integerMoney]}
              >
                <InputNumber min={0} precision={0} />
              </Form.Item>
            ))}
            {(['embroideryAmount', 'twoSidedPrintAmount', 'twoPositionPrintAmount'] as const).map(
              (name) => (
                <Form.Item
                  key={name}
                  label={t(`vendors.${name}`)}
                  name={['additionalCosts', name]}
                  rules={[integerMoney]}
                >
                  <InputNumber min={0} precision={0} />
                </Form.Item>
              ),
            )}
          </div>
        </fieldset>
        <fieldset className={styles.formSection}>
          <legend>{t('vendors.advanced')}</legend>
          <Form.Item
            label={t('vendors.attributes')}
            name="attributesText"
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
