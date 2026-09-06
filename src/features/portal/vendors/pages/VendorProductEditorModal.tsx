import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppstoreOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Drawer,
  Flex,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tabs,
} from 'antd'

import { FormActions, useFeedbackToast } from '@/shared/ui'

import { listProductTypeGroups } from '../../catalog/api/catalogApi'
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
  const productTypeGroups = useQuery({
    queryKey: ['portal', 'catalog', 'product-type-groups', 'vendor-product-editor'],
    queryFn: () => listProductTypeGroups({ page: 1, limit: 100, status: 'ACTIVE' }),
    enabled: open,
  })

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
    if (!form.isFieldsTouched()) return onCancel()
    Modal.confirm({
      title: t('actionFeedback.unsaved'),
      content: t('vendors.discardChanges'),
      okText: t('vendors.discard', { defaultValue: 'Discard' }),
      cancelText: t('vendors.cancel'),
      onOk: onCancel,
    })
  }

  const maxDays = Form.useWatch('maxProductionDays', form)
  const minDays = Form.useWatch('minProductionDays', form)
  const imageUrl = Form.useWatch('imageUrl', form)
  const numberRule = { type: 'integer' as const, min: 0 }
  const urlRules = [{ type: 'url' as const }, { max: 1000 }]

  const tabItems = [
    {
      key: 'identity',
      label: (
        <span>
          <AppstoreOutlined style={{ marginRight: 6 }} />
          Product Identity & SLA
        </span>
      ),
      children: (
        <Flex flex={1} vertical gap={16}>
          <Card className={styles.editorCard} size="small" title="Basic Info">
            <div className={styles.formGrid}>
              <Form.Item
                label={t('vendors.name')}
                name="name"
                rules={[{ required: true }, { max: 200 }]}
              >
                <Input placeholder="e.g. Unisex Heavy Cotton Tee" />
              </Form.Item>
              <Form.Item
                label={t('vendors.code')}
                name="code"
                rules={[{ required: !item }, { max: 80 }]}
              >
                <Input disabled={Boolean(item)} placeholder="TSHIRT_5000" />
              </Form.Item>
              <Form.Item
                label={t('vendors.externalProductId')}
                name="externalProductId"
                rules={[{ max: 120 }]}
              >
                <Input placeholder="Vendor SKU or Product ID" />
              </Form.Item>
              <Form.Item
                label={t('vendors.productTypeGroup')}
                name="productTypeGroupId"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  loading={productTypeGroups.isLoading}
                  optionFilterProp="label"
                  placeholder={t('vendors.selectProductTypeGroup')}
                  options={(productTypeGroups.data?.items ?? []).map((group) => ({
                    value: group.id,
                    label: `${group.code} · ${group.name}`,
                  }))}
                />
              </Form.Item>
            </div>
          </Card>

          <Card className={styles.editorCard} size="small" title="Production SLA & Base Cost">
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
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="2" />
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
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="5" />
              </Form.Item>
              <Form.Item
                label={t('vendors.baseCostAmount')}
                name="baseCostAmount"
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="750 (in cents)"
                />
              </Form.Item>
              <Form.Item
                label={t('vendors.unitSurchargeAmount')}
                name="unitSurchargeAmount"
                rules={[numberRule]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="100 (in cents)"
                />
              </Form.Item>
              <Form.Item
                label={t('vendors.currency')}
                name="currency"
                normalize={(value) => String(value ?? '').toUpperCase()}
                rules={[{ len: 3 }]}
              >
                <Input maxLength={3} placeholder="USD" />
              </Form.Item>
            </div>
          </Card>
        </Flex>
      ),
    },
    {
      key: 'media',
      label: (
        <span>
          <LinkOutlined style={{ marginRight: 6 }} />
          Asset Links & Media
        </span>
      ),
      children: (
        <Flex flex={1} vertical gap={16}>
          {imageUrl ? (
            <Card className={styles.editorPreviewCard} size="small" title="Image Preview">
              <Image
                src={imageUrl}
                alt="Product preview"
                style={{ maxHeight: 180, borderRadius: 8, objectFit: 'contain' }}
                fallback="https://placehold.co/200x200?text=Invalid+Image+URL"
              />
            </Card>
          ) : null}

          <Card className={styles.editorCard} size="small" title="URLs">
            <Form.Item label={t('vendors.imageUrl')} name="imageUrl" rules={urlRules}>
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item label={t('vendors.productUrl')} name="productUrl" rules={urlRules}>
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item
              label={t('vendors.designTemplateUrl')}
              name="designTemplateUrl"
              rules={urlRules}
            >
              <Input placeholder="https://..." />
            </Form.Item>
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

          <Card className={styles.editorCard} size="small" title="Metadata JSON">
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
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 10 }}
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
      title={t(item ? 'vendors.editProductTitle' : 'vendors.createProductTitle')}
      width={720}
      onClose={close}
      footer={
        <FormActions
          cancelLabel={t('vendors.cancel')}
          dirty
          form="vendor-product-form"
          onSubmit={() => form.submit()}
          onCancel={close}
          saving={save.isPending}
          submitLabel={t('vendors.save')}
        />
      }
    >
      <Form
        id="vendor-product-form"
        form={form}
        layout="vertical"
        onFinish={(values) => save.mutate(values)}
      >
        <Tabs items={tabItems} defaultActiveKey="identity" />
      </Form>
    </Drawer>
  )
}
