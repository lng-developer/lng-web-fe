import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppstoreOutlined,
  CloudDownloadOutlined,
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Form, Image, Input, Modal, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { FeedbackAlert, FilterBar, SearchInput, StatusTag } from '@/shared/ui'

import { RecordStatus, VendorProduct } from '../api/vendorApi'
import { mockVendorProducts } from './vendorProductTabMocks'
import styles from './VendorWorkspacePage.module.scss'

interface SelectOption {
  readonly value: string
  readonly label: string
}

interface VendorWorkspaceProductsTabPageProps {
  readonly canWrite: boolean
  readonly searchProducts: string
  readonly productStatus: RecordStatus | undefined
  readonly vendorFilter: string | undefined
  readonly productTypeGroupFilter: string | undefined
  readonly productsPage: number
  readonly productsPageSize: number
  readonly products: VendorProduct[] | undefined
  readonly productsLoading: boolean
  readonly productsTotal: number | undefined
  readonly productsError: unknown
  readonly refetchProducts?: () => void
  readonly vendorFilterOptions: SelectOption[]
  readonly productTypeGroupOptions: SelectOption[]
  readonly onSearchProductsChange: (value: string) => void
  readonly onVendorFilterChange: (value: string | undefined) => void
  readonly onProductTypeGroupFilterChange: (value: string | undefined) => void
  readonly onProductStatusChange: (value: RecordStatus | undefined) => void
  readonly onProductsPageChange: (page: number, pageSize: number) => void
  readonly onAddProduct: (vendorId: string) => void
  readonly onOpenProductImport: (vendorId: string | undefined) => void
  readonly onOpenMerchizeSync?: (vendorId: string) => void
  readonly isMerchizeSelected?: boolean
  readonly onEditProduct: (product: VendorProduct) => void
  readonly onCloneProduct: (
    product: VendorProduct,
    input: { vendorId: string; code?: string; name?: string },
  ) => Promise<VendorProduct>
  readonly cloneVendorOptions: SelectOption[]
  readonly cloningProduct: boolean
}

export function VendorWorkspaceProductsTabPage({
  canWrite,
  searchProducts,
  productStatus,
  vendorFilter,
  productTypeGroupFilter,
  productsPage,
  productsPageSize,
  products,
  productsLoading,
  productsTotal,
  productsError,
  refetchProducts,
  vendorFilterOptions,
  productTypeGroupOptions,
  onSearchProductsChange,
  onVendorFilterChange,
  onProductTypeGroupFilterChange,
  onProductStatusChange,
  onProductsPageChange,
  onAddProduct,
  onOpenProductImport,
  onOpenMerchizeSync,
  isMerchizeSelected,
  onEditProduct,
  onCloneProduct,
  cloneVendorOptions,
  cloningProduct,
}: VendorWorkspaceProductsTabPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [cloneProduct, setCloneProduct] = useState<VendorProduct>()
  const [cloneForm] = Form.useForm<{ vendorId: string; code?: string; name?: string }>()
  const useProductTabMocks = import.meta.env.VITE_USE_VENDOR_PRODUCTS_TAB_MOCKS === 'true'
  const displayedProducts = useMemo(() => {
    if (!useProductTabMocks) return products

    const query = searchProducts.trim().toLowerCase()
    const matching = mockVendorProducts.filter((product) => {
      const matchesQuery =
        !query || [product.code, product.name].some((value) => value.toLowerCase().includes(query))
      const matchesStatus = !productStatus || product.status === productStatus
      return matchesQuery && matchesStatus
    })
    const offset = (productsPage - 1) * productsPageSize
    return matching.slice(offset, offset + productsPageSize)
  }, [productStatus, products, productsPage, productsPageSize, searchProducts, useProductTabMocks])
  const displayedTotal = useMemo(() => {
    if (!useProductTabMocks) return productsTotal

    const query = searchProducts.trim().toLowerCase()
    return mockVendorProducts.filter(
      (product) =>
        (!query ||
          [product.code, product.name].some((value) => value.toLowerCase().includes(query))) &&
        (!productStatus || product.status === productStatus),
    ).length
  }, [productStatus, productsTotal, searchProducts, useProductTabMocks])

  const productColumns = useMemo<TableColumnsType<VendorProduct>>(
    () => [
      {
        title: t('portal.vendors.code'),
        dataIndex: 'code',
        width: 220,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 240 } }),
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: t('portal.vendors.name'),
        dataIndex: 'name',
        width: 340,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 380 } }),
        render: (value) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: t('portal.vendors.image'),
        dataIndex: 'imageUrl',
        width: 96,
        render: (imageUrl, row) =>
          imageUrl ? (
            <Image
              alt={row.name}
              fallback="https://placehold.co/48x48?text=Image"
              height={48}
              preview
              src={imageUrl}
              style={{ borderRadius: 6, objectFit: 'cover' }}
              width={48}
            />
          ) : (
            <Typography.Text type="secondary">{t('portal.vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('portal.vendors.vendor', { defaultValue: 'Vendor' }),
        width: 160,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 180 } }),
        render: (_, row) =>
          row.vendor ? (
            <Space className={styles.vendorCell} direction="vertical" size={0}>
              <Typography.Text ellipsis>{row.vendor.name}</Typography.Text>
              <Typography.Text type="secondary" ellipsis>
                {row.vendor.code}
              </Typography.Text>
            </Space>
          ) : (
            <Typography.Text type="secondary">{t('portal.vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('portal.vendors.statusLabel'),
        width: 110,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 140 } }),
        render: (_, row) => (
          <StatusTag status={row.status === 'ACTIVE' ? 'operational' : 'draft'}>
            {t(`portal.vendors.status.${row.status}`)}
          </StatusTag>
        ),
      },
      {
        title: t('portal.vendors.productsTabActions'),
        width: 96,
        render: (_, row) => (
          <Space size={4}>
            {canWrite ? (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  aria-label={t('portal.vendors.editProduct', { name: row.name })}
                  title={t('portal.vendors.editProduct', { name: row.name })}
                  onClick={() => onEditProduct(row)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  aria-label={`Clone ${row.name}`}
                  title="Clone product"
                  onClick={() => {
                    setCloneProduct(row)
                    cloneForm.setFieldsValue({
                      vendorId: row.vendor?.id,
                      code: `${row.code}-COPY`,
                      name: `${row.name} Copy`,
                    })
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<AppstoreOutlined />}
                  aria-label={t('portal.vendors.manageCostCenters')}
                  title={t('portal.vendors.manageCostCenters')}
                  onClick={() => navigate(`/portal/vendors/products/${row.id}/cost-centers`)}
                />
              </>
            ) : null}
          </Space>
        ),
      },
    ],
    [canWrite, cloneForm, navigate, onEditProduct, t],
  )

  const statusOptions = [
    { value: 'ACTIVE', label: t('portal.vendors.status.ACTIVE') },
    { value: 'INACTIVE', label: t('portal.vendors.status.INACTIVE') },
  ]

  return (
    <>
      <div className={styles.controlsBar}>
        <div className={styles.filtersWrapper}>
          <FilterBar label={t('portal.vendors.filters.label')} contentClassName={styles.filters}>
            <SearchInput
              value={searchProducts}
              onSearchChange={(value) => {
                onSearchProductsChange(value)
              }}
              placeholder={t('portal.vendors.searchProducts')}
            />
            <Select
              allowClear
              options={vendorFilterOptions}
              placeholder={t('portal.vendors.filters.vendor')}
              value={vendorFilter}
              showSearch
              optionFilterProp="label"
              onChange={(value) => onVendorFilterChange(value as string | undefined)}
            />
            <Select
              allowClear
              options={productTypeGroupOptions}
              placeholder={t('portal.vendors.filters.productType', {
                defaultValue: 'Product type',
              })}
              value={productTypeGroupFilter}
              showSearch
              optionFilterProp="label"
              onChange={(value) => onProductTypeGroupFilterChange(value as string | undefined)}
            />
            <Select
              allowClear
              options={statusOptions}
              placeholder={t('portal.vendors.filters.status')}
              value={productStatus}
              onChange={(value) => onProductStatusChange(value as RecordStatus | undefined)}
            />
          </FilterBar>
        </div>
        {canWrite && vendorFilter ? (
          <div className={styles.actionsWrapper}>
            <Space size={8} align="center">
              <Button
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => onAddProduct(vendorFilter)}
              >
                {t('portal.vendors.addProduct')}
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => onOpenProductImport(vendorFilter)}>
                {t('portal.vendors.importProducts')}
              </Button>
              {isMerchizeSelected && onOpenMerchizeSync ? (
                <Button
                  icon={<CloudDownloadOutlined />}
                  onClick={() => onOpenMerchizeSync(vendorFilter)}
                >
                  {t('portal.vendors.merchize.syncAction', {
                    defaultValue: 'Sync Merchize Catalog',
                  })}
                </Button>
              ) : null}
            </Space>
          </div>
        ) : null}
      </div>
      <CoreDataTable
        rowKey="id"
        columns={productColumns}
        className={styles.dataTable}
        fillViewport
        scroll={{ x: 1200 }}
        dataSource={displayedProducts}
        loading={productsLoading}
        error={
          productsError ? (
            <FeedbackAlert
              type="error"
              title={
                productsError instanceof Error
                  ? productsError.message
                  : t('portal.vendors.branchUnavailable')
              }
              action={
                <Button type="link" onClick={() => void refetchProducts?.()}>
                  {t('common.retry', { defaultValue: 'Retry' })}
                </Button>
              }
            />
          ) : undefined
        }
        pagination={{
          current: productsPage,
          pageSize: productsPageSize,
          total: displayedTotal,
          showSizeChanger: true,
          onChange: onProductsPageChange,
        }}
      />
      <Modal
        open={Boolean(cloneProduct)}
        title="Clone vendor product"
        okText="Clone"
        confirmLoading={cloningProduct}
        onCancel={() => setCloneProduct(undefined)}
        onOk={() =>
          void cloneForm.validateFields().then(async (values) => {
            const clonedProduct = await onCloneProduct(cloneProduct!, values)
            setCloneProduct(undefined)
            navigate(`/portal/vendors/products/${clonedProduct.id}/cost-centers`)
          })
        }
      >
        <Form form={cloneForm} layout="vertical">
          <Form.Item name="vendorId" label="Target vendor" rules={[{ required: true }]}>
            <Select options={cloneVendorOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="code" label="Code" rules={[{ required: true, max: 80 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, max: 200 }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
