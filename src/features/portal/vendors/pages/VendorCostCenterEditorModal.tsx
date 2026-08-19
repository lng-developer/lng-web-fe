import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CarOutlined, DollarOutlined, SettingOutlined, TagOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Drawer, Flex, Form, Input, InputNumber, Modal, Select, Switch, Tabs } from 'antd'

import { printMethodSelectOptions } from '@/shared/constants/printMethods'
import { FormActions, useFeedbackToast } from '@/shared/ui'

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
        : { status: 'ACTIVE', currency: 'USD' },
    )
  }, [form, item, open])

  const save = useMutation({
    mutationFn: (values: EditorValues) => {
      const { attributesText, code, metadataText, ...rest } = values
      const input = {
        ...rest,
        attributes: parseJsonObject(attributesText),
        currency: rest.currency?.toUpperCase(),
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
    if (!form.isFieldsTouched()) return onCancel()
    Modal.confirm({
      title: t('actionFeedback.unsaved'),
      content: t('vendors.discardChanges'),
      okText: t('vendors.discard', { defaultValue: 'Discard' }),
      cancelText: t('vendors.cancel'),
      onOk: onCancel,
    })
  }

  const numberRule = { type: 'number' as const, min: 0 }

  const tabItems = [
    {
      key: 'identity',
      label: (
        <span>
          <TagOutlined style={{ marginRight: 6 }} />
          Identity & Attributes
        </span>
      ),
      children: (
        <Flex flex={1} vertical gap={16}>
          <Card className={styles.editorCard} size="small" title="Variant Identity">
            <div className={styles.formGrid}>
              <Form.Item label={t('vendors.name')} name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Black / XL" />
              </Form.Item>
              <Form.Item label={t('vendors.code')} name="code" rules={[{ required: !item }]}>
                <Input disabled={Boolean(item)} placeholder="BLACK_XL" />
              </Form.Item>
              <Form.Item label={t('vendors.sku')} name="sku">
                <Input placeholder="Vendor SKU Code" />
              </Form.Item>
              <Form.Item label={t('vendors.lngCode')} name="lngCode">
                <Input placeholder="LNG Internal Code" />
              </Form.Item>
            </div>
          </Card>

          <Card className={styles.editorCard} size="small" title="Size & Color Matrix">
            <div className={styles.formGrid}>
              <Form.Item label={t('vendors.standardSize')} name="standardSize">
                <Input placeholder="XL, L, M, S" />
              </Form.Item>
              <Form.Item label={t('vendors.standardColor')} name="standardColor">
                <Input placeholder="Black, White, Navy" />
              </Form.Item>
              <Form.Item label={t('vendors.vendorSize')} name="vendorSize">
                <Input placeholder="Vendor specific size" />
              </Form.Item>
              <Form.Item label={t('vendors.vendorColor')} name="vendorColor">
                <Input placeholder="Vendor specific color" />
              </Form.Item>
              <Form.Item label={t('vendors.printMethod')} name="printMethod">
                <Select allowClear options={printMethodSelectOptions} />
              </Form.Item>
            </div>
          </Card>
        </Flex>
      ),
    },
    {
      key: 'pricing',
      label: (
        <span>
          <DollarOutlined style={{ marginRight: 6 }} />
          Base Pricing & Taxes
        </span>
      ),
      children: (
        <Flex flex={1} vertical gap={16}>
          <Card className={styles.editorCard} size="small" title="Base Production Cost">
            <div className={styles.formGrid}>
              <Form.Item
                label={t('vendors.baseCostAmount')}
                name="baseCostAmount"
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="Base cost (cents)"
                />
              </Form.Item>
              <Form.Item
                label="Import Tax Amount (cents)"
                name="importTaxAmount"
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="Import Tax (cents)"
                />
              </Form.Item>
              <Form.Item label={t('vendors.currency')} name="currency">
                <Input maxLength={3} placeholder="USD" />
              </Form.Item>
            </div>
          </Card>

          <Card className={styles.editorCard} size="small" title="Additional Printing Costs">
            <div className={styles.formGrid}>
              <Form.Item
                label="Embroidery Cost (cents)"
                name={['additionalCosts', 'embroideryAmount']}
                rules={[numberRule]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
              <Form.Item
                label="Two-Sided Print Cost (cents)"
                name={['additionalCosts', 'twoSidedPrintAmount']}
                rules={[numberRule]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
              <Form.Item
                label="Two-Position Print Cost (cents)"
                name={['additionalCosts', 'twoPositionPrintAmount']}
                rules={[numberRule]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </div>
          </Card>
        </Flex>
      ),
    },
    {
      key: 'shipping',
      label: (
        <span>
          <CarOutlined style={{ marginRight: 6 }} />
          Shipping Rates & Dimensions
        </span>
      ),
      children: (
        <Flex flex={1} vertical gap={16}>
          <Card
            size="small"
            title="Domestic Shipping Rates (Nội địa)"
            className={styles.editorCard}
          >
            <div className={styles.formGrid}>
              <Form.Item
                label="Base Shipping (cents)"
                name={['domesticShipping', 'economyAmount']}
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="e.g. 450"
                />
              </Form.Item>
              <Form.Item
                label="Additional Item Cost (cents)"
                name={['domesticShipping', 'additionalAmount']}
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="e.g. 200"
                />
              </Form.Item>
            </div>
          </Card>

          <Card
            size="small"
            title="International Shipping Rates (Quốc tế)"
            className={styles.editorCard}
          >
            <div className={styles.formGrid}>
              <Form.Item
                label="Base Shipping (cents)"
                name={['internationalShipping', 'economyAmount']}
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="e.g. 850"
                />
              </Form.Item>
              <Form.Item
                label="Additional Item Cost (cents)"
                name={['internationalShipping', 'additionalAmount']}
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="e.g. 350"
                />
              </Form.Item>
            </div>
          </Card>

          <Card
            size="small"
            title="Priority / Express Shipping Rates (Hỏa tốc)"
            className={styles.editorCard}
          >
            <div className={styles.formGrid}>
              <Form.Item
                label="Base Express Cost (cents)"
                name={['priorityShipping', 'economyAmount']}
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="e.g. 1500"
                />
              </Form.Item>
              <Form.Item
                label="Additional Express Item (cents)"
                name={['priorityShipping', 'additionalAmount']}
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="e.g. 600"
                />
              </Form.Item>
            </div>
          </Card>

          <Card className={styles.editorCard} size="small" title="Weight & Package Dimensions">
            <div className={styles.formGrid}>
              <Form.Item label="Weight" name="weight" rules={[numberRule]}>
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="e.g. 8.5"
                />
              </Form.Item>
              <Form.Item label="Weight Unit" name="weightUnit">
                <Select
                  options={['oz', 'g', 'kg', 'lb'].map((u) => ({ label: u, value: u }))}
                  placeholder="oz"
                />
              </Form.Item>

              <Form.Item label="Width / Length / Height" style={{ marginBottom: 0 }}>
                <Flex gap={8}>
                  <Form.Item name="width" noStyle rules={[numberRule]}>
                    <InputNumber min={0} precision={1} placeholder="W" style={{ width: '33%' }} />
                  </Form.Item>
                  <Form.Item name="length" noStyle rules={[numberRule]}>
                    <InputNumber min={0} precision={1} placeholder="L" style={{ width: '33%' }} />
                  </Form.Item>
                  <Form.Item name="height" noStyle rules={[numberRule]}>
                    <InputNumber min={0} precision={1} placeholder="H" style={{ width: '33%' }} />
                  </Form.Item>
                </Flex>
              </Form.Item>
              <Form.Item label="Dimension Unit" name="dimensionUnit">
                <Select
                  options={['in', 'cm', 'mm'].map((u) => ({ label: u, value: u }))}
                  placeholder="in"
                />
              </Form.Item>
            </div>
          </Card>
        </Flex>
      ),
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 6 }} />
          Status & Metadata
        </span>
      ),
      children: (
        <Flex flex={1} vertical gap={16}>
          <Card className={styles.editorCard} size="small" title="Status">
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
          </Card>

          <Card className={styles.editorCard} size="small" title="Attributes JSON">
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
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 8 }}
                placeholder="{}"
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </Form.Item>
          </Card>
        </Flex>
      ),
    },
  ]

  return (
    <Drawer
      className={styles.editorDrawer}
      destroyOnClose
      open={open}
      title={t(item ? 'vendors.editCostCenterTitle' : 'vendors.createCostCenterTitle')}
      width={760}
      onClose={close}
      footer={
        <FormActions
          cancelLabel={t('vendors.cancel')}
          dirty
          form="vendor-cost-center-form"
          onSubmit={() => form.submit()}
          onCancel={close}
          saving={save.isPending}
          submitLabel={t('vendors.save')}
        />
      }
    >
      <Form
        id="vendor-cost-center-form"
        form={form}
        layout="vertical"
        onFinish={(values) => save.mutate(values)}
      >
        <Tabs items={tabItems} defaultActiveKey="identity" />
      </Form>
    </Drawer>
  )
}
