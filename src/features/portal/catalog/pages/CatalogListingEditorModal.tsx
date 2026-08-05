import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Collapse, Drawer, Form, Input, InputNumber, Select, Space, Typography } from 'antd'

import type {
  CreateListingInput,
  InternalTemplate,
  Listing,
  ProductTypeGroup,
  UpdateListingInput,
} from '../api/catalogApi'
import styles from './CatalogListingEditorModal.module.scss'

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
  const channel = Form.useWatch('salesChannelCode', form) ?? listing?.salesChannelCode ?? 'AMAZON'

  useEffect(() => {
    if (!open) return
    form.resetFields()
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
    const channelValues = {
      ...values,
      asin: channel === 'AMAZON' ? values.asin : null,
      etsyListingId: channel === 'ETSY' ? values.etsyListingId : null,
    }
    if (!listing) return onSubmit(channelValues)
    const { shopId, salesChannelCode, marketplaceCode, sku, ...update } = channelValues
    void shopId
    void salesChannelCode
    void marketplaceCode
    void sku
    onSubmit(update)
  }

  const advancedFields = (
    <div className={styles.grid}>
      <Form.Item label={t('portal.catalog.fields.previewAssetId')} name="previewAssetId">
        <Input placeholder={t('portal.catalog.fields.previewAssetHelp')} />
      </Form.Item>
      <Form.Item label={t('portal.catalog.fields.baseCost')} name="baseCostAmount">
        <InputNumber min={0} precision={0} className={styles.fullWidth} />
      </Form.Item>
      <Form.Item label={t('portal.catalog.fields.currency')} name="currency" rules={[{ len: 3 }]}>
        <Input maxLength={3} />
      </Form.Item>
      <Form.Item label={t('portal.catalog.fields.costCenterStatus')} name="costCenterStatus">
        <Select
          allowClear
          options={['MISSING', 'PRESENT', 'NOT_REQUIRED'].map((value) => ({
            value,
            label: value,
          }))}
        />
      </Form.Item>
      <Form.Item label={t('portal.catalog.fields.recordStatus')} name="status">
        <Select
          allowClear
          options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))}
        />
      </Form.Item>
    </div>
  )

  return (
    <Drawer
      open={open}
      width={820}
      className={styles.modal}
      title={t(listing ? 'portal.catalog.edit' : 'portal.catalog.create')}
      onClose={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('auth.accessEditor.cancel')}</Button>
          <Button type="primary" loading={saving} onClick={() => void form.submit()}>
            {t(listing ? 'portal.catalog.save' : 'portal.catalog.create')}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
        <section className={styles.section}>
          <Typography.Title level={5}>{t('portal.catalog.sections.identity')}</Typography.Title>
          {listing ? (
            <div className={styles.identitySummary}>
              <div>
                <Typography.Text type="secondary">
                  {t('portal.catalog.fields.shop')}
                </Typography.Text>
                <Typography.Text strong>{listing.shop?.name ?? listing.shopId}</Typography.Text>
              </div>
              <div>
                <Typography.Text type="secondary">
                  {t('portal.catalog.fields.identity')}
                </Typography.Text>
                <Typography.Text strong>
                  {listing.salesChannelCode} · {listing.marketplaceCode} · {listing.sku}
                </Typography.Text>
              </div>
            </div>
          ) : (
            <div className={styles.grid}>
              <Form.Item
                label={t('portal.catalog.fields.shop')}
                name="shopId"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={shops.map(({ id, name }) => ({ value: id, label: name }))}
                  onChange={(shopId) => {
                    const shop = shops.find(({ id }) => id === shopId)
                    if (shop) form.setFieldValue('currency', shop.currency)
                  }}
                />
              </Form.Item>
              <Form.Item
                label={t('portal.catalog.fields.salesChannel')}
                name="salesChannelCode"
                rules={[{ required: true }]}
              >
                <Select options={['AMAZON', 'ETSY'].map((value) => ({ value, label: value }))} />
              </Form.Item>
              <Form.Item
                label={t('portal.catalog.fields.marketplace')}
                name="marketplaceCode"
                rules={[{ required: true }]}
              >
                <Input placeholder={channel === 'AMAZON' ? 'AMAZON_US' : 'ETSY_US'} />
              </Form.Item>
              <Form.Item
                label={t('portal.catalog.fields.sku')}
                name="sku"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <Typography.Title level={5}>{t('portal.catalog.sections.product')}</Typography.Title>
          <div className={styles.grid}>
            <Form.Item
              className={styles.spanTwo}
              label={t('portal.catalog.fields.title')}
              name="title"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            {channel === 'AMAZON' ? (
              <Form.Item label={t('portal.catalog.fields.asin')} name="asin">
                <Input />
              </Form.Item>
            ) : (
              <Form.Item label={t('portal.catalog.fields.etsyListingId')} name="etsyListingId">
                <Input />
              </Form.Item>
            )}
            <Form.Item
              label={t('portal.catalog.fields.productType')}
              name="productTypeGroupId"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={productTypes.map(({ id, name, code }) => ({
                  value: id,
                  label: `${name} (${code})`,
                }))}
                onChange={() => form.setFieldValue('internalTemplateId', null)}
              />
            </Form.Item>
            <Form.Item
              label={t('portal.catalog.fields.internalTemplate')}
              name="internalTemplateId"
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={templates
                  .filter(({ productTypeGroup }) => productTypeGroup?.id === productTypeGroupId)
                  .map(({ id, name, code }) => ({ value: id, label: `${name} (${code})` }))}
              />
            </Form.Item>
          </div>
        </section>

        <Collapse
          ghost
          className={styles.advanced}
          items={[
            {
              key: 'advanced',
              label: t('portal.catalog.sections.advanced'),
              children: advancedFields,
            },
          ]}
        />
      </Form>
    </Drawer>
  )
}
