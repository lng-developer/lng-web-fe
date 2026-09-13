import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CarOutlined,
  CloseOutlined,
  DollarOutlined,
  EditOutlined,
  InboxOutlined,
  SaveOutlined,
  SettingOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { printMethodSelectOptions } from '@/shared/constants/printMethods'
import { FormActions, StatusTag, useFeedbackToast } from '@/shared/ui'

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

const formatMoney = (value?: number | null, currency = 'USD') =>
  value == null
    ? '—'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100)

export interface VendorCostCenterEditorModalProps {
  readonly item?: VendorCostCenter
  readonly open: boolean
  readonly productId: string
  readonly vendorId: string
  readonly mode?: 'drawer' | 'page' | 'inline'
  readonly readOnly?: boolean
  readonly onEdit?: () => void
  readonly onCancel: () => void
  readonly onSaved: (costCenter: VendorCostCenter) => void
}

export function VendorCostCenterEditorModal({
  item,
  open,
  productId,
  vendorId,
  mode = 'drawer',
  readOnly = false,
  onEdit,
  onCancel,
  onSaved,
}: VendorCostCenterEditorModalProps) {
  const { t, i18n } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [form] = Form.useForm<EditorValues>()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()

  const initialValues = useMemo<Partial<EditorValues>>(
    () =>
      item
        ? {
            ...item,
            attributesText: JSON.stringify(item.attributes ?? {}, null, 2),
            metadataText: JSON.stringify(item.metadata ?? {}, null, 2),
          }
        : { status: 'ACTIVE', currency: 'USD' },
    [item],
  )

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(initialValues)
  }, [form, initialValues, open])

  const save = useMutation({
    mutationFn: (values: EditorValues) => {
      const { attributesText, code, metadataText, ...rest } = values
      const input = {
        ...rest,
        standardSize: rest.standardSize ?? rest.vendorSize,
        standardColor: rest.standardColor ?? rest.vendorColor,
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
      showFeedbackToast('success', i18n.t('actionFeedback.saved'))
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
      } else showFeedbackToast('error', i18n.t('actionFeedback.failed'))
    },
  })

  const close = onCancel

  const numberRule = useMemo(() => ({ type: 'number' as const, min: 0 }), [])

  const tabItems = useMemo(
    () => [
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
              </div>
            </Card>

            <Card className={styles.editorCard} size="small" title="Size & Color">
              <div className={styles.formGrid}>
                <Form.Item label={t('vendors.vendorSize')} name="vendorSize">
                  <Input placeholder="Size (e.g. XL, L, M, S)" />
                </Form.Item>
                <Form.Item label={t('vendors.vendorColor')} name="vendorColor">
                  <Input placeholder="Color (e.g. Black, White, Navy)" />
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
    ],
    [item, numberRule, t],
  )

  const formContent = (
    <Form
      disabled={readOnly}
      id="vendor-cost-center-form"
      key={item?.id ?? 'new'}
      form={form}
      initialValues={initialValues}
      layout="vertical"
      onFinish={(values) => save.mutate(values)}
    >
      <Tabs items={tabItems} defaultActiveKey="identity" />
    </Form>
  )

  const inlineTableColumns: TableColumnsType<VendorCostCenter> = useMemo(
    () => [
      {
        title: t('vendors.sku'),
        width: 170,
        render: () => (
          <div className={styles.inlineTableCell}>
            <Form.Item name="sku" noStyle>
              <Input placeholder={t('vendors.sku')} />
            </Form.Item>
          </div>
        ),
      },
      {
        title: t('vendors.vendorColor'),
        width: 180,
        render: () => (
          <div className={styles.inlineTableCell}>
            <Form.Item name="vendorColor" noStyle>
              <Input placeholder={t('vendors.vendorColor')} />
            </Form.Item>
          </div>
        ),
      },
      {
        title: t('vendors.printMethod'),
        width: 170,
        render: () => (
          <div className={styles.inlineTableCell}>
            <Form.Item name="printMethod" noStyle>
              <Select
                allowClear
                options={printMethodSelectOptions}
                placeholder={t('vendors.printMethod')}
              />
            </Form.Item>
          </div>
        ),
      },
      {
        title: t('vendors.pricing'),
        width: 190,
        render: () => (
          <div className={styles.inlineTableCell}>
            <Form.Item name="baseCostAmount" noStyle rules={[numberRule]}>
              <InputNumber<number>
                addonAfter="USD"
                formatter={(value) => (value == null ? '' : String(Number(value) / 100))}
                min={0}
                parser={(value) => Number(value || 0) * 100}
                precision={2}
                placeholder={t('vendors.baseCostAmount')}
              />
            </Form.Item>
          </div>
        ),
      },
      {
        title: 'Domestic shipping',
        align: 'center',
        children: [
          {
            title: 'Economy',
            align: 'center',
            width: 130,
            render: () => (
              <Form.Item name={['domesticShipping', 'economyAmount']} noStyle rules={[numberRule]}>
                <InputNumber min={0} precision={0} />
              </Form.Item>
            ),
          },
          {
            title: 'Additional',
            align: 'center',
            width: 130,
            render: () => (
              <Form.Item
                name={['domesticShipping', 'additionalAmount']}
                noStyle
                rules={[numberRule]}
              >
                <InputNumber min={0} precision={0} />
              </Form.Item>
            ),
          },
        ],
      },
      {
        title: 'International shipping',
        align: 'center',
        children: [
          {
            title: 'Economy',
            align: 'center',
            width: 130,
            render: () => (
              <Form.Item
                name={['internationalShipping', 'economyAmount']}
                noStyle
                rules={[numberRule]}
              >
                <InputNumber min={0} precision={0} />
              </Form.Item>
            ),
          },
          {
            title: 'Additional',
            align: 'center',
            width: 130,
            render: () => (
              <Form.Item
                name={['internationalShipping', 'additionalAmount']}
                noStyle
                rules={[numberRule]}
              >
                <InputNumber min={0} precision={0} />
              </Form.Item>
            ),
          },
        ],
      },
      {
        title: 'Priority shipping',
        align: 'center',
        children: [
          {
            title: 'Economy',
            align: 'center',
            width: 130,
            render: () => (
              <Form.Item name={['priorityShipping', 'economyAmount']} noStyle rules={[numberRule]}>
                <InputNumber min={0} precision={0} />
              </Form.Item>
            ),
          },
          {
            title: 'Additional',
            align: 'center',
            width: 130,
            render: () => (
              <Form.Item
                name={['priorityShipping', 'additionalAmount']}
                noStyle
                rules={[numberRule]}
              >
                <InputNumber min={0} precision={0} />
              </Form.Item>
            ),
          },
        ],
      },
      {
        title: t('vendors.statusLabel'),
        align: 'center',
        width: 100,
        render: (_: unknown, row: VendorCostCenter) =>
          readOnly ? (
            <StatusTag status={row.status === 'ACTIVE' ? 'operational' : 'draft'}>
              {t(`vendors.status.${row.status}`)}
            </StatusTag>
          ) : (
            <Form.Item
              name="status"
              noStyle
              valuePropName="checked"
              getValueFromEvent={(checked: boolean) => (checked ? 'ACTIVE' : 'INACTIVE')}
              getValueProps={(value) => ({ checked: value === 'ACTIVE' })}
            >
              <Switch
                checkedChildren={t('vendors.status.ACTIVE')}
                unCheckedChildren={t('vendors.status.INACTIVE')}
              />
            </Form.Item>
          ),
      },
      {
        title: t('vendors.costCenterActions'),
        align: 'center',
        width: 100,
        render: () =>
          readOnly ? (
            <Button
              aria-label={t('vendors.edit')}
              disabled={!onEdit}
              icon={<EditOutlined />}
              size="small"
              title={t('vendors.edit')}
              type="text"
              onClick={onEdit}
            />
          ) : (
            <Space size={2}>
              <Button
                aria-label={t('vendors.cancel')}
                icon={<CloseOutlined />}
                size="small"
                title={t('vendors.cancel')}
                type="text"
                onClick={close}
              />
              <Button
                aria-label={t('vendors.save')}
                icon={<SaveOutlined />}
                loading={save.isPending}
                size="small"
                title={t('vendors.save')}
                type="text"
                onClick={() => form.submit()}
              />
            </Space>
          ),
      },
    ],
    [close, form, numberRule, onEdit, readOnly, save.isPending, t],
  )

  const inlineTableFormContent = (
    <Form
      disabled={readOnly}
      id="vendor-cost-center-form"
      key={item?.id ?? 'new'}
      form={form}
      initialValues={initialValues}
      layout="vertical"
      onFinish={(values) => save.mutate(values)}
    >
      <CoreDataTable
        className={styles.inlineEditorTable}
        columns={inlineTableColumns}
        dataSource={item ? [item] : [{ id: 'new-cost-center' } as VendorCostCenter]}
        pagination={false}
        rowKey="id"
        scroll={{ x: 1770 }}
      />
    </Form>
  )

  const formActions = (
    <FormActions
      cancelLabel={readOnly ? t('vendors.backToCostCenters') : t('vendors.cancel')}
      dirty={readOnly ? Boolean(onEdit) : true}
      form="vendor-cost-center-form"
      onSubmit={readOnly ? onEdit : () => form.submit()}
      onCancel={close}
      saving={readOnly ? false : save.isPending}
      submitLabel={readOnly ? t('vendors.edit') : t('vendors.save')}
    />
  )

  if (mode === 'page') {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <Typography.Text className={styles.kicker}>{t('vendors.costCenters')}</Typography.Text>
            <Typography.Title level={3}>
              {t(
                readOnly && item
                  ? 'vendors.costCenterDetails'
                  : item
                    ? 'vendors.editCostCenterTitle'
                    : 'vendors.createCostCenterTitle',
              )}
            </Typography.Title>
          </div>
          {formActions}
        </header>
        <div className={styles.workspaceSection}>{formContent}</div>
      </section>
    )
  }

  if (mode === 'inline' && readOnly && item) {
    return (
      <div className={styles.variantDetailContainer}>
        <div className={styles.variantDetailGrid}>
          {/* Card 1: Variant Specs & Print Method (no duplicate SKU or Base Cost from parent table) */}
          <Card
            size="small"
            className={styles.variantCard}
            title={
              <Space size={6}>
                <TagOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <span>{t('vendors.overview')}</span>
              </Space>
            }
          >
            <Descriptions size="small" column={1} className={styles.detailDescriptions}>
              <Descriptions.Item label={t('vendors.vendorColor')}>
                {item.vendorColor || item.standardColor || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('vendors.vendorSize')}>
                {item.vendorSize || item.standardSize || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('vendors.printMethod')}>
                {item.printMethod ? <Tag color="blue">{item.printMethod}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('vendors.importTaxAmount')}>
                {formatMoney(item.importTaxAmount, item.currency)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Card 2: Shipping Rates Matrix */}
          <Card
            size="small"
            className={styles.variantCard}
            title={
              <Space size={6}>
                <CarOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <span>{t('vendors.shipping')}</span>
              </Space>
            }
          >
            <div className={styles.shippingRatesList}>
              <div className={styles.shippingRateItem}>
                <div className={styles.shippingRateTier}>
                  <span className={styles.shippingRateDot} />
                  <span className={styles.shippingRateName}>{t('vendors.domesticShipping')}</span>
                </div>
                <div className={styles.shippingRateValues}>
                  <span className={styles.shippingBasePrice}>
                    {formatMoney(item.domesticShipping?.economyAmount, item.currency)}
                  </span>
                  <span className={styles.shippingAddPrice}>
                    +{formatMoney(item.domesticShipping?.additionalAmount, item.currency)}{' '}
                    {t('vendors.additionalAmount')}
                  </span>
                </div>
              </div>

              <div className={styles.shippingRateItem}>
                <div className={styles.shippingRateTier}>
                  <span className={styles.shippingRateDot} style={{ background: '#1677ff' }} />
                  <span className={styles.shippingRateName}>
                    {t('vendors.internationalShipping')}
                  </span>
                </div>
                <div className={styles.shippingRateValues}>
                  <span className={styles.shippingBasePrice}>
                    {formatMoney(item.internationalShipping?.economyAmount, item.currency)}
                  </span>
                  <span className={styles.shippingAddPrice}>
                    +{formatMoney(item.internationalShipping?.additionalAmount, item.currency)}{' '}
                    {t('vendors.additionalAmount')}
                  </span>
                </div>
              </div>

              <div className={styles.shippingRateItem}>
                <div className={styles.shippingRateTier}>
                  <span className={styles.shippingRateDot} style={{ background: '#52c41a' }} />
                  <span className={styles.shippingRateName}>{t('vendors.priorityShipping')}</span>
                </div>
                <div className={styles.shippingRateValues}>
                  <span className={styles.shippingBasePrice}>
                    {formatMoney(item.priorityShipping?.economyAmount, item.currency)}
                  </span>
                  <span className={styles.shippingAddPrice}>
                    +{formatMoney(item.priorityShipping?.additionalAmount, item.currency)}{' '}
                    {t('vendors.additionalAmount')}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3: Package Specs & Actions (no duplicate Status from parent table) */}
          <Card
            size="small"
            className={styles.variantCard}
            title={
              <Space size={6}>
                <InboxOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <span>{t('vendors.dimensions')}</span>
              </Space>
            }
          >
            <Descriptions size="small" column={1} className={styles.detailDescriptions}>
              <Descriptions.Item label={t('vendors.weight')}>
                {item.weight != null ? `${item.weight} ${item.weightUnit || 'oz'}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('vendors.dimensions')}>
                {item.length != null && item.width != null && item.height != null
                  ? `${item.length} × ${item.width} × ${item.height} ${item.dimensionUnit || 'in'}`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('vendors.unitSurchargeAmount')}>
                {formatMoney(item.unitSurchargeAmount, item.currency)}
              </Descriptions.Item>
            </Descriptions>

            {onEdit ? (
              <div className={styles.cardActionFooter}>
                <Button
                  type="primary"
                  ghost
                  icon={<EditOutlined />}
                  onClick={onEdit}
                  style={{ width: '100%' }}
                >
                  {t('vendors.editCostCenter', { name: item.name })}
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    )
  }

  if (mode === 'inline' && !readOnly) {
    return (
      <div className={styles.inlineFormContainer}>
        <div className={styles.inlineFormHeader}>
          <span className={styles.inlineFormHeaderTitle}>
            {t(item ? 'vendors.editCostCenterTitle' : 'vendors.createCostCenterTitle')}
            {item?.name ? ` — ${item.name}` : ''}
          </span>
          <Space size={8}>
            <Button onClick={close} size="small">
              {t('vendors.cancel')}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={save.isPending}
              onClick={() => form.submit()}
              size="small"
            >
              {t('vendors.save')}
            </Button>
          </Space>
        </div>
        {formContent}
      </div>
    )
  }

  if (mode === 'inline') {
    return <div className={styles.workspaceSection}>{inlineTableFormContent}</div>
  }

  return (
    <Modal
      className={styles.editorDrawer}
      destroyOnClose
      open={open}
      title={t(item ? 'vendors.editCostCenterTitle' : 'vendors.createCostCenterTitle')}
      width="min(1280px, 90vw)"
      style={{ top: 40 }}
      onCancel={close}
      footer={formActions}
    >
      {formContent}
    </Modal>
  )
}
