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
  Switch,
  Table,
  Tooltip,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { printMethodSelectOptions } from '@/shared/constants/printMethods'
import { PageHeader, SectionCard, StatusTag } from '@/shared/ui'

import { listVendorProducts, updateVendorProduct, type VendorProduct } from '../../vendors/api/vendorApi'
import type { ProductTypeGroup, ProductTypeGroupInput } from '../api/catalogApi'
import { useProductTypesQuery } from '../hooks'

const PAGE_SIZE = 20

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
        queryKey: ['portal', 'catalog', 'product-type-groups', productTypeGroup.id, 'vendor-products'],
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
        queryKey: ['portal', 'catalog', 'product-type-groups', productTypeGroup.id, 'vendor-products'],
      }),
  })
  const columns: TableColumnsType<VendorProduct> = useMemo(
    () => [
      {
        title: t('portal.vendors.vendor'),
        render: (_, product) => product.vendor?.name ?? '-',
      },
      { title: t('portal.vendors.code'), dataIndex: 'code' },
      { title: t('portal.vendors.name'), dataIndex: 'name' },
      {
        title: t('portal.vendors.externalProductId'),
        dataIndex: 'externalProductId',
        render: (value) => value || '-',
      },
      {
        title: t('portal.vendors.statusLabel'),
        dataIndex: 'status',
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
              aria-label={t(`portal.catalog.master.${active ? 'deactivate' : 'activate'}VendorProduct`, {
                name: product.name,
              })}
              onChange={(checked) =>
                updateStatus.mutate({ id: product.id, status: checked ? 'ACTIVE' : 'INACTIVE' })
              }
            />
          )
        },
      },
    ],
    [canCreate, t, updateStatus],
  )

  if (products.isError) return <div role="alert">{t('portal.vendors.branchUnavailable')}</div>

  return (
    <>
      {canCreate ? (
        <Flex justify="flex-end" style={{ marginBottom: 8 }}>
          <Button
            type="link"
            icon={<PlusOutlined />}
            aria-label={t('portal.catalog.master.addVendorProductFor', {
              name: productTypeGroup.name,
            })}
            onClick={onCreate}
          >
            {t('portal.vendors.addProduct')}
          </Button>
        </Flex>
      ) : null}
      <Table
        columns={columns}
        dataSource={products.data?.items ?? []}
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

export function ProductTypeManagementPage({
  canManage,
  showHeader = true,
}: {
  readonly canManage: boolean
  readonly showHeader?: boolean
}) {
  const { t } = useTranslation()
  const canManageVendorProducts = hasAnyPermission(['VENDORS:WRITE'], { globalOnly: true })
  const [form] = Form.useForm<ProductTypeGroupInput>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
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
      { title: t('portal.catalog.master.code'), dataIndex: 'code' },
      { title: t('portal.catalog.master.name'), dataIndex: 'name' },
      {
        title: t('portal.catalog.master.printMethod', { defaultValue: 'Print method' }),
        dataIndex: 'printMethod',
        render: (value) => value || '-',
      },
      {
        title: t('portal.catalog.master.order'),
        dataIndex: 'sortOrder',
        align: 'right',
      },
      {
        title: t('portal.catalog.master.status'),
        dataIndex: 'status',
        align: 'center',
        render: (value) => (
          <StatusTag status={value === 'ACTIVE' ? 'operational' : 'cancelled'}>
            {t(`portal.catalog.master.statuses.${value}`, { defaultValue: value })}
          </StatusTag>
        ),
      },
      ...(canManage
        ? [
            {
              key: 'actions',
              title: t('portal.catalog.actions'),
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

  return (
    <section>
      {showHeader ? (
        <PageHeader
          title={t('portal.catalog.master.productTypes')}
          description={t('portal.catalog.master.productTypeDescription')}
        />
      ) : null}
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
          tableLayout="auto"
          scroll={{ x: 'max-content' }}
          columns={columns}
          dataSource={groups.data?.items ?? []}
          loading={groups.isLoading}
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
