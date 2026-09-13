import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Collapse, Form, Input, InputNumber, Modal, Select, Space, Typography } from 'antd'

import type { CreateListingInput, Listing, UpdateListingInput } from '../api/catalogApi'
import styles from './CatalogListingEditorModal.module.scss'

type Props = {
  open: boolean
  listing?: Listing
  shops: Array<{ id: string; name: string; currency: string }>
  salesChannels: Array<{ code: string; name: string }>
  saving: boolean
  onClose: () => void
  onSubmit: (input: CreateListingInput | UpdateListingInput) => void
}

const CHANNEL_IDENTITY_FIELD: Record<string, 'asin' | 'etsyListingId'> = {
  AMAZON: 'asin',
  ETSY: 'etsyListingId',
}

export function CatalogListingEditorModal({
  open,
  listing,
  shops,
  salesChannels,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<CreateListingInput>()
  const defaultChannel = salesChannels[0]?.code ?? 'AMAZON'
  const channel =
    Form.useWatch('salesChannelCode', form) ?? listing?.salesChannelCode ?? defaultChannel
  const identityField = CHANNEL_IDENTITY_FIELD[channel] ?? null
  const shopOptions = useMemo(
    () => shops.map(({ id, name }) => ({ value: id, label: name })),
    [shops],
  )
  const channelOptions = useMemo(
    () => salesChannels.map(({ code, name }) => ({ value: code, label: name || code })),
    [salesChannels],
  )
  const statusOptions = useMemo(
    () => ['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value })),
    [],
  )

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
            previewImageUrl: listing.previewImageUrl,
            defaultPsdTemplateAssetId: listing.defaultPsdTemplateAssetId,
            baseCostAmount: listing.baseCostAmount,
            currency: listing.currency,
            costCenterStatus: listing.costCenterStatus,
            status: listing.status,
          }
        : { salesChannelCode: defaultChannel, currency: 'USD', baseCostAmount: 0 },
    )
  }, [defaultChannel, form, listing, open])

  const submit = (values: CreateListingInput) => {
    const channelValues = {
      ...values,
      asin: identityField === 'asin' ? values.asin : null,
      etsyListingId: identityField === 'etsyListingId' ? values.etsyListingId : null,
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
      <Form.Item label={t('portal.catalog.fields.baseCost')} name="baseCostAmount">
        <InputNumber min={0} precision={0} className={styles.fullWidth} />
      </Form.Item>
      <Form.Item label={t('portal.catalog.fields.currency')} name="currency" rules={[{ len: 3 }]}>
        <Input maxLength={3} />
      </Form.Item>
      <Form.Item
        className={styles.spanTwo}
        label={t('portal.catalog.fields.defaultPsdTemplateAssetId')}
        name="defaultPsdTemplateAssetId"
      >
        <Input allowClear placeholder="MediaAsset ID" />
      </Form.Item>
      <Form.Item label={t('portal.catalog.fields.costCenterStatus')} name="costCenterStatus">
        <Select
          allowClear
          options={[
            { value: 'MISSING', label: 'MISSING' },
            { value: 'PRESENT', label: 'PRESENT' },
            { value: 'NOT_REQUIRED', label: 'NOT_REQUIRED' },
          ]}
        />
      </Form.Item>
      <Form.Item label={t('portal.catalog.fields.recordStatus')} name="status">
        <Select allowClear options={statusOptions} />
      </Form.Item>
    </div>
  )

  return (
    <Modal
      destroyOnClose
      open={open}
      width="min(1280px, 90vw)"
      style={{ top: 40 }}
      className={styles.modal}
      title={t(listing ? 'portal.catalog.edit' : 'portal.catalog.create')}
      onCancel={onClose}
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
                  options={shopOptions}
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
                <Select options={channelOptions} />
              </Form.Item>
              <Form.Item
                label={t('portal.catalog.fields.marketplace')}
                name="marketplaceCode"
                rules={[{ required: true }]}
              >
                <Input placeholder={`${channel}_US`} />
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
            {identityField === 'asin' ? (
              <Form.Item label={t('portal.catalog.fields.asin')} name="asin">
                <Input />
              </Form.Item>
            ) : null}
            {identityField === 'etsyListingId' ? (
              <Form.Item label={t('portal.catalog.fields.etsyListingId')} name="etsyListingId">
                <Input />
              </Form.Item>
            ) : null}
            <Form.Item
              className={styles.spanTwo}
              label={t('portal.catalog.fields.previewImageUrl')}
              name="previewImageUrl"
              extra={t('portal.catalog.fields.previewImageUrlHelp')}
            >
              <Input allowClear type="url" />
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
    </Modal>
  )
}
