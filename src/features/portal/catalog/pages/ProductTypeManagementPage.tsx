import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownOutlined, EditOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { printMethodSelectOptions } from '@/shared/constants/printMethods'
import { FeedbackAlert, humanizeCode, SectionCard, StatusTag, TableTextCell } from '@/shared/ui'

import {
  listVendorProducts,
  updateVendorProduct,
  type VendorProduct,
} from '../../vendors/api/vendorApi'
import type { ProductTypeGroup, ProductTypeGroupInput } from '../api/catalogApi'
import { useProductTypesQuery } from '../hooks'

const PAGE_SIZE = DEFAULT_PAGE_SIZE

function formatVendorPrice(amount?: number | null, currency = 'USD') {
  if (amount == null || amount <= 0) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

function VendorProductAssignmentModal({
  productTypeGroup,
  onCancel,
}: {
  readonly onCancel: () => void
  readonly productTypeGroup: ProductTypeGroup
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState<string>()
  const availableProducts = useQuery({
    queryKey: ['portal', 'catalog', 'vendor-products', 'available'],
    queryFn: () => listVendorProducts({ limit: 100, page: 1 }),
  })
  const assign = useMutation({
    mutationFn: (vendorProductId: string) =>
      updateVendorProduct(vendorProductId, { productTypeGroupId: productTypeGroup.id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          'portal',
          'catalog',
          'product-type-groups',
          productTypeGroup.id,
          'vendor-products',
        ],
      })
      void queryClient.invalidateQueries({
        queryKey: ['portal', 'catalog', 'vendor-products', 'available'],
      })
      onCancel()
    },
  })

  return (
    <Modal
      open
      title={t('portal.catalog.master.addVendorProduct')}
      okText={t('portal.vendors.addProduct')}
      okButtonProps={{ disabled: !productId }}
      confirmLoading={assign.isPending}
      onCancel={onCancel}
      onOk={() => productId && assign.mutate(productId)}
    >
      <Form layout="vertical">
        <Form.Item htmlFor="vendor-product-id" label={t('portal.catalog.master.vendorProduct')}>
          <Select
            id="vendor-product-id"
            showSearch
            optionFilterProp="label"
            placeholder={t('portal.catalog.master.selectVendorProduct')}
            loading={availableProducts.isLoading}
            options={(availableProducts.data?.items ?? [])
              .filter((product) => !product.productTypeGroup)
              .map((product) => ({
                value: product.id,
                label: `${product.vendor?.name ?? '-'} · ${product.code} · ${product.name}`,
              }))}
            value={productId}
            onChange={setProductId}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function ProductTypeVendorProducts({
  canCreate,
  onCreate,
  productTypeGroup,
}: {
  readonly canCreate: boolean
  readonly onCreate: () => void
  readonly productTypeGroup: ProductTypeGroup
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const products = useQuery({
    queryKey: ['portal', 'catalog', 'product-type-groups', productTypeGroup.id, 'vendor-products'],
    queryFn: () =>
      listVendorProducts({ limit: PAGE_SIZE, page: 1, productTypeGroupId: productTypeGroup.id }),
    retry: false,
  })
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateVendorProduct(id, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [
          'portal',
          'catalog',
          'product-type-groups',
          productTypeGroup.id,
          'vendor-products',
        ],
      }),
  })

  const items = useMemo(() => products.data?.items ?? [], [products.data?.items])

  const pricingStats = useMemo(() => {
    const activeWithCost = items.filter(
      (p) => p.status === 'ACTIVE' && p.baseCostAmount != null && p.baseCostAmount > 0,
    )
    if (!activeWithCost.length) return null

    const minCost = Math.min(...activeWithCost.map((p) => p.baseCostAmount!))
    const maxCost = Math.max(...activeWithCost.map((p) => p.baseCostAmount!))
    const cheapest = activeWithCost.filter((p) => p.baseCostAmount === minCost)
    const cheapestVendorNames = [...new Set(cheapest.map((p) => p.vendor?.name).filter(Boolean))]
    const currency = activeWithCost[0]?.currency || 'USD'

    return {
      minCost,
      maxCost,
      currency,
      cheapestVendorNames,
    }
  }, [items])

  const columns: TableColumnsType<VendorProduct> = useMemo(
    () => [
      {
        title: t('portal.vendors.vendor'),
        width: 180,
        render: (_, product) => <TableTextCell value={product.vendor?.name} fallback="-" />,
      },
      {
        title: t('portal.vendors.code'),
        dataIndex: 'code',
        width: 170,
        render: (value) => <TableTextCell code value={value} />,
      },
      {
        title: t('portal.vendors.name'),
        dataIndex: 'name',
        width: 220,
        render: (value) => <TableTextCell value={value} />,
      },
      {
        title: t('portal.vendors.externalProductId'),
        dataIndex: 'externalProductId',
        width: 150,
        render: (value) => <TableTextCell value={value} fallback="-" />,
      },
      {
        title: t('portal.vendors.baseCost', { defaultValue: 'Base cost' }),
        dataIndex: 'baseCostAmount',
        width: 160,
        sorter: (a, b) => (a.baseCostAmount ?? 0) - (b.baseCostAmount ?? 0),
        defaultSortOrder: 'ascend',
        render: (value: number | undefined, product) => {
          const hasCost = value != null && value > 0
          if (!hasCost) return <TableTextCell fallback="—" />

          const isCheapest =
            product.status === 'ACTIVE' &&
            pricingStats?.minCost != null &&
            value === pricingStats.minCost

          const priceStr = formatVendorPrice(value, product.currency)
          const tooltipContent = (
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>
              <div>
                <strong>{t('portal.vendors.baseCost', { defaultValue: 'Base cost' })}:</strong>{' '}
                {priceStr} {product.currency || 'USD'}
              </div>
              {product.costCenterCount > 0 ? (
                <div style={{ color: 'var(--ant-color-text-secondary)', marginTop: 2 }}>
                  {t('portal.vendors.variantsCount', {
                    count: product.costCenterCount,
                    defaultValue: `${product.costCenterCount} variants`,
                  })}
                </div>
              ) : null}
            </div>
          )

          return (
            <Tooltip title={tooltipContent}>
              <Flex align="center" gap={6} style={{ cursor: 'default' }}>
                <span
                  style={{
                    fontWeight: isCheapest ? 700 : 500,
                    color: isCheapest ? 'var(--ant-color-success, #16a34a)' : 'inherit',
                    fontSize: 13,
                  }}
                >
                  {priceStr}
                </span>
                {isCheapest ? (
                  <Tag
                    color="success"
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: 11,
                      padding: '0 6px',
                      borderRadius: 4,
                      lineHeight: '18px',
                    }}
                  >
                    🏆 {t('portal.vendors.cheapest', { defaultValue: 'Rẻ nhất' })}
                  </Tag>
                ) : null}
              </Flex>
            </Tooltip>
          )
        },
      },
      {
        title: t('portal.vendors.statusLabel'),
        dataIndex: 'status',
        width: 110,
        align: 'center',
        render: (value, product) => {
          const active = value === 'ACTIVE'
          if (!canCreate) {
            return (
              <StatusTag status={active ? 'operational' : 'cancelled'}>
                {t(`portal.vendors.status.${value}`)}
              </StatusTag>
            )
          }

          return (
            <Switch
              checked={active}
              checkedChildren={t('portal.vendors.status.ACTIVE')}
              unCheckedChildren={t('portal.vendors.status.INACTIVE')}
              loading={updateStatus.isPending}
              aria-label={t(
                `portal.catalog.master.${active ? 'deactivate' : 'activate'}VendorProduct`,
                {
                  name: product.name,
                },
              )}
              onChange={(checked) =>
                updateStatus.mutate({ id: product.id, status: checked ? 'ACTIVE' : 'INACTIVE' })
              }
            />
          )
        },
      },
    ],
    [canCreate, pricingStats, t, updateStatus],
  )

  if (products.isError) return <div role="alert">{t('portal.vendors.branchUnavailable')}</div>

  return (
    <>
      <Flex
        align="center"
        justify="space-between"
        wrap="wrap"
        gap={8}
        style={{
          marginBottom: 10,
          padding: '6px 12px',
          background: pricingStats
            ? 'var(--ant-color-success-bg, #f6ffed)'
            : 'var(--ant-color-fill-quaternary, #f8fafc)',
          border: `1px solid ${
            pricingStats
              ? 'var(--ant-color-success-border, #b7eb8f)'
              : 'var(--ant-color-border-secondary, #e2e8f0)'
          }`,
          borderRadius: 6,
        }}
      >
        {pricingStats ? (
          <Space size={8} wrap align="center">
            <span
              style={{
                fontWeight: 600,
                color: 'var(--ant-color-success-text, #135200)',
                fontSize: 12.5,
              }}
            >
              🏆 {t('portal.vendors.cheapestVendor', { defaultValue: 'Vendor rẻ nhất' })}:
            </span>
            {pricingStats.cheapestVendorNames.map((name) => (
              <Tag key={name} color="success" style={{ fontWeight: 600, margin: 0, fontSize: 12 }}>
                {name}
              </Tag>
            ))}
            <span
              style={{ fontWeight: 700, color: 'var(--ant-color-success, #389e0d)', fontSize: 13 }}
            >
              {formatVendorPrice(pricingStats.minCost, pricingStats.currency)}
            </span>
            {pricingStats.maxCost > pricingStats.minCost ? (
              <span style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
                ({t('portal.vendors.priceRange', { defaultValue: 'Khoảng giá' })}:{' '}
                {formatVendorPrice(pricingStats.minCost, pricingStats.currency)} ~{' '}
                {formatVendorPrice(pricingStats.maxCost, pricingStats.currency)})
              </span>
            ) : null}
          </Space>
        ) : (
          <span style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12.5 }}>
            {t('portal.catalog.master.vendorProductsForProductType', {
              name: productTypeGroup.name,
            })}
          </span>
        )}
        {canCreate ? (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            aria-label={t('portal.catalog.master.addVendorProductFor', {
              name: productTypeGroup.name,
            })}
            onClick={onCreate}
          >
            {t('portal.vendors.addProduct')}
          </Button>
        ) : null}
      </Flex>
      <Table
        columns={columns}
        dataSource={items}
        loading={products.isLoading}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={false}
        rowKey="id"
        size="small"
        tableLayout="auto"
        aria-label={t('portal.catalog.master.vendorProductsForProductType', {
          name: productTypeGroup.name,
        })}
      />
    </>
  )
}

export function ProductTypeManagementPage({ canManage }: { readonly canManage: boolean }) {
  const { t } = useTranslation()
  const canManageVendorProducts = hasAnyPermission(['VENDORS:WRITE'], { globalOnly: true })
  const [form] = Form.useForm<ProductTypeGroupInput>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ProductTypeGroup | null>()
  const [assigningVendorProductFor, setAssigningVendorProductFor] = useState<ProductTypeGroup>()

  const { groups, save } = useProductTypesQuery({
    page,
    pageSize,
    search,
    onSaveSuccess: () => {
      setEditing(undefined)
      form.resetFields()
    },
  })

  const open = useCallback(
    (item: ProductTypeGroup | null) => {
      setEditing(item)
      form.setFieldsValue(
        item
          ? {
              code: item.code ?? '',
              name: item.name,
              sortOrder: item.sortOrder,
              printMethod: item.printMethod ?? null,
              status: item.status,
            }
          : { code: '', name: '', sortOrder: 0, printMethod: null, status: 'ACTIVE' },
      )
    },
    [form],
  )
  const columns: TableColumnsType<ProductTypeGroup> = useMemo(
    () => [
      {
        title: t('portal.catalog.master.code'),
        dataIndex: 'code',
        width: 180,
        render: (value) => <TableTextCell code value={value} />,
      },
      {
        title: t('portal.catalog.master.name'),
        dataIndex: 'name',
        width: 240,
        render: (value) => <TableTextCell strong value={value} />,
      },
      {
        title: t('portal.catalog.master.printMethod', { defaultValue: 'Print method' }),
        dataIndex: 'printMethod',
        width: 160,
        render: (value) => <TableTextCell value={value} fallback="-" />,
      },
      {
        title: t('portal.catalog.master.order'),
        dataIndex: 'sortOrder',
        width: 90,
        align: 'right',
      },
      {
        title: t('portal.catalog.master.status'),
        dataIndex: 'status',
        width: 120,
        align: 'center',
        render: (value) => (
          <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>
            {t(`portal.catalog.master.statuses.${value}`, {
              defaultValue: humanizeCode(value),
            })}
          </StatusTag>
        ),
      },
      ...(canManage
        ? [
            {
              key: 'actions',
              title: t('portal.catalog.actions'),
              width: 80,
              align: 'center' as const,
              render: (_: unknown, row: ProductTypeGroup) => (
                <Tooltip title={t('portal.catalog.master.editProductType')}>
                  <Button
                    type="text"
                    aria-label={t('portal.catalog.master.editProductType')}
                    icon={<EditOutlined />}
                    onClick={(event) => {
                      event.stopPropagation()
                      open(row)
                    }}
                  />
                </Tooltip>
              ),
            },
          ]
        : []),
    ],
    [canManage, open, t],
  )

  const tableError = groups.isError ? (
    <FeedbackAlert
      type="error"
      title={t('portal.catalog.master.loadFailed', {
        defaultValue: 'Failed to load product types',
      })}
      description={groups.error instanceof Error ? groups.error.message : undefined}
      action={
        <Button type="link" onClick={() => void groups.refetch()}>
          {t('common.retry', { defaultValue: 'Retry' })}
        </Button>
      }
    />
  ) : undefined

  return (
    <section>
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        wrap
        style={{ marginBottom: 16, width: '100%' }}
      >
        <Input.Search
          allowClear
          placeholder={t('portal.catalog.master.searchProductTypes')}
          style={{ maxWidth: '100%', width: 320 }}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          onSearch={() => setPage(1)}
        />
        {canManage ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>
            {t('portal.catalog.master.createProductType')}
          </Button>
        ) : null}
      </Flex>
      <SectionCard>
        <CoreDataTable
          fillViewport
          rowKey="id"
          tableLayout="fixed"
          scroll={{ x: 870 }}
          columns={columns}
          dataSource={groups.data?.items ?? []}
          loading={groups.isLoading}
          error={tableError}
          onRow={(row) => ({ onClick: () => canManage && open(row) })}
          pagination={{
            current: page,
            pageSize,
            total: groups.data?.pagination.total ?? groups.data?.items.length ?? 0,
            hideOnSinglePage: false,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1)
              setPageSize(nextPageSize)
            },
          }}
          expandable={{
            expandedRowRender: (productTypeGroup) => (
              <ProductTypeVendorProducts
                canCreate={canManageVendorProducts}
                onCreate={() => setAssigningVendorProductFor(productTypeGroup)}
                productTypeGroup={productTypeGroup}
              />
            ),
            expandIcon: ({ expanded, onExpand, record }) => (
              <Button
                type="text"
                size="small"
                aria-label={t(
                  expanded
                    ? 'portal.catalog.master.closeVendorProducts'
                    : 'portal.catalog.master.openVendorProducts',
                  { name: record.name },
                )}
                icon={expanded ? <DownOutlined /> : <RightOutlined />}
                onClick={(event) => {
                  event.stopPropagation()
                  onExpand(record, event)
                }}
              />
            ),
          }}
        />
      </SectionCard>
      {assigningVendorProductFor ? (
        <VendorProductAssignmentModal
          productTypeGroup={assigningVendorProductFor}
          onCancel={() => setAssigningVendorProductFor(undefined)}
        />
      ) : null}
      <Modal
        open={editing !== undefined}
        title={t(
          editing
            ? 'portal.catalog.master.editProductType'
            : 'portal.catalog.master.createProductType',
        )}
        okText={t('portal.catalog.master.save')}
        confirmLoading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate({ input: values, editing })}
        >
          <Form.Item
            name="code"
            label={t('portal.catalog.master.code')}
            rules={[{ required: true }]}
          >
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('portal.catalog.master.name')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="sortOrder" label={t('portal.catalog.master.order')}>
            <InputNumber precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="printMethod"
            label={t('portal.catalog.master.printMethod', { defaultValue: 'Print method' })}
          >
            <Select allowClear options={printMethodSelectOptions} />
          </Form.Item>
          <Form.Item name="status" label={t('portal.catalog.master.status')}>
            <Select
              options={['ACTIVE', 'INACTIVE'].map((value) => ({
                value,
                label: t(`portal.catalog.master.statuses.${value}`, { defaultValue: value }),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
