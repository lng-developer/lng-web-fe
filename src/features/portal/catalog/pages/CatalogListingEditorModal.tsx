import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, InputNumber, Modal, Select } from 'antd'

import type {
  CreateListingInput,
  InternalTemplate,
  Listing,
  ProductTypeGroup,
  UpdateListingInput,
} from '../api/catalogApi'

type Props = {
  open: boolean
  listing?: Listing
  shops: Array<{ id: string; name: string; currency: string }>
  productTypes: ProductTypeGroup[]
  templates: InternalTemplate[]
  saving: boolean
  onClose: () => void
  onSubmit: (input: CreateListingInput | UpdateListingInput) => void
}

export function CatalogListingEditorModal({
  open,
  listing,
  shops,
  productTypes,
  templates,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<CreateListingInput>()
  const productTypeGroupId = Form.useWatch('productTypeGroupId', form)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(
      listing
        ? {
            shopId: listing.shopId,
            salesChannelCode: listing.salesChannelCode,
            marketplaceCode: listing.marketplaceCode,
            sku: listing.sku,
            title: listing.title,
            asin: listing.asin,
            etsyListingId: listing.etsyListingId,
            productTypeGroupId: listing.productTypeGroup?.id,
            internalTemplateId: listing.internalTemplate?.id,
            previewAssetId: listing.previewAssetId,
            baseCostAmount: listing.baseCostAmount,
            currency: listing.currency,
            costCenterStatus: listing.costCenterStatus,
            status: listing.status,
          }
        : { salesChannelCode: 'AMAZON', currency: 'USD', baseCostAmount: 0 },
    )
  }, [form, listing, open])

  const submit = (values: CreateListingInput) => {
    if (!listing) return onSubmit(values)
    const { shopId, salesChannelCode, marketplaceCode, sku, ...update } = values
    void shopId
    void salesChannelCode
    void marketplaceCode
    void sku
    onSubmit(update)
  }

  return (
    <Modal
      open={open}
      title={t(listing ? 'portal.catalog.edit' : 'portal.catalog.create')}
      okText={t(listing ? 'portal.catalog.save' : 'portal.catalog.create')}
      confirmLoading={saving}
      onCancel={onClose}
      onOk={() => void form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
        <Form.Item
          label={t('portal.catalog.fields.shop')}
          name="shopId"
          rules={[{ required: true }]}
        >
          <Select
            disabled={Boolean(listing)}
            options={shops.map(({ id, name }) => ({ value: id, label: name }))}
          />
        </Form.Item>
        <Form.Item
          label={t('portal.catalog.fields.salesChannel')}
          name="salesChannelCode"
          rules={[{ required: true }]}
        >
          <Select
            disabled={Boolean(listing)}
            options={['AMAZON', 'ETSY'].map((value) => ({ value, label: value }))}
          />
        </Form.Item>
        <Form.Item
          label={t('portal.catalog.fields.marketplace')}
          name="marketplaceCode"
          rules={[{ required: true }]}
        >
          <Input disabled={Boolean(listing)} />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.sku')} name="sku" rules={[{ required: true }]}>
          <Input disabled={Boolean(listing)} />
        </Form.Item>
        <Form.Item
          label={t('portal.catalog.fields.title')}
          name="title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.asin')} name="asin">
          <Input />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.etsyListingId')} name="etsyListingId">
          <Input />
        </Form.Item>
        <Form.Item
          label={t('portal.catalog.fields.productType')}
          name="productTypeGroupId"
          rules={[{ required: true }]}
        >
          <Select
            options={productTypes.map(({ id, name, code }) => ({
              value: id,
              label: `${name} (${code})`,
            }))}
            onChange={() => form.setFieldValue('internalTemplateId', null)}
          />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.internalTemplate')} name="internalTemplateId">
          <Select
            allowClear
            options={templates
              .filter(({ productTypeGroup }) => productTypeGroup?.id === productTypeGroupId)
              .map(({ id, name, code }) => ({ value: id, label: `${name} (${code})` }))}
          />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.previewAssetId')} name="previewAssetId">
          <Input />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.baseCost')} name="baseCostAmount">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.currency')} name="currency" rules={[{ len: 3 }]}>
          <Input maxLength={3} />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.costCenterStatus')} name="costCenterStatus">
          <Select
            options={['MISSING', 'PRESENT', 'NOT_REQUIRED'].map((value) => ({
              value,
              label: value,
            }))}
          />
        </Form.Item>
        <Form.Item label={t('portal.catalog.fields.recordStatus')} name="status">
          <Select options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
