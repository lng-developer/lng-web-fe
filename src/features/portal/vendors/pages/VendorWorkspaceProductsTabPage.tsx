import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AppstoreOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Select, Space, Tag, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { FilterBar, SearchInput } from '@/shared/ui'

import { RecordStatus, VendorProduct } from '../api/vendorApi'
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
  readonly productsPage: number
  readonly products: VendorProduct[] | undefined
  readonly productsLoading: boolean
  readonly productsTotal: number | undefined
  readonly productsError: unknown
  readonly vendorFilterOptions: SelectOption[]
  readonly onSearchProductsChange: (value: string) => void
  readonly onVendorFilterChange: (value: string | undefined) => void
  readonly onProductStatusChange: (value: RecordStatus | undefined) => void
  readonly onProductsPageChange: (page: number) => void
  readonly onAddProduct: (vendorId: string) => void
  readonly onOpenProductImport: (vendorId: string | undefined) => void
  readonly onEditProduct: (product: VendorProduct) => void
  readonly onOpenCostCenters: (product: VendorProduct) => void
}

export function VendorWorkspaceProductsTabPage({
  canWrite,
  searchProducts,
  productStatus,
  vendorFilter,
  productsPage,
  products,
  productsLoading,
  productsTotal,
  productsError,
  vendorFilterOptions,
  onSearchProductsChange,
  onVendorFilterChange,
  onProductStatusChange,
  onProductsPageChange,
  onAddProduct,
  onOpenProductImport,
  onEditProduct,
  onOpenCostCenters,
}: VendorWorkspaceProductsTabPageProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })

  const productColumns = useMemo<TableColumnsType<VendorProduct>>(
    () => [
      {
        title: t('vendors.code'),
        dataIndex: 'code',
        width: 140,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 170 } }),
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: t('vendors.name'),
        dataIndex: 'name',
        width: 280,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 320 } }),
        render: (value) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: t('vendors.vendorCode'),
        width: 130,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 180 } }),
        render: (_, row) =>
          row.vendor ? (
            row.vendor.code
          ) : (
            <Typography.Text type="secondary">{t('vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('vendors.vendor', { defaultValue: 'Vendor' }),
        width: 240,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 280 } }),
        render: (_, row) =>
          row.vendor ? (
            row.vendor.name
          ) : (
            <Typography.Text type="secondary">{t('vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('vendors.statusLabel'),
        width: 110,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 140 } }),
        render: (_, row) => (
          <Tag color={row.status === 'ACTIVE' ? 'success' : 'default'}>
            {t(`vendors.status.${row.status}`)}
          </Tag>
        ),
      },
      {
        title: t('vendors.productsTabActions'),
        fixed: 'right',
        width: 130,
        render: (_, row) => (
          <Space size={4}>
            {canWrite ? (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  aria-label={t('vendors.editProduct', { name: row.name })}
                  title={t('vendors.editProduct', { name: row.name })}
                  onClick={() => onEditProduct(row)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<AppstoreOutlined />}
                  aria-label={t('vendors.manageCostCenters')}
                  title={t('vendors.manageCostCenters')}
                  onClick={() => onOpenCostCenters(row)}
                />
              </>
            ) : null}
          </Space>
        ),
      },
    ],
    [canWrite, onEditProduct, onOpenCostCenters, t],
  )

  const statusOptions = [
    { value: 'ACTIVE', label: t('vendors.status.ACTIVE') },
    { value: 'INACTIVE', label: t('vendors.status.INACTIVE') },
  ]

  return (
    <>
      <FilterBar
        label={t('vendors.filters.label')}
        contentClassName={styles.filters}
        actions={
          canWrite ? (
            <Space size={8} align="center">
              <Button
                disabled={!vendorFilter}
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => onAddProduct(vendorFilter || '')}
              >
                {t('vendors.addProduct')}
              </Button>
              <Button
                disabled={!vendorFilter}
                icon={<UploadOutlined />}
                onClick={() => onOpenProductImport(vendorFilter)}
              >
                {t('vendors.importProducts')}
              </Button>
            </Space>
          ) : null
        }
      >
        <SearchInput
          value={searchProducts}
          onSearchChange={(value) => {
            onSearchProductsChange(value)
          }}
          placeholder={t('vendors.searchProducts')}
        />
        <Select
          allowClear
          options={vendorFilterOptions}
          placeholder={t('vendors.filters.vendor')}
          value={vendorFilter}
          showSearch
          onChange={(value) => onVendorFilterChange(value as string | undefined)}
        />
        <Select
          allowClear
          options={statusOptions}
          placeholder={t('vendors.filters.status')}
          value={productStatus}
          onChange={(value) => onProductStatusChange(value as RecordStatus | undefined)}
        />
      </FilterBar>
      <CoreDataTable
        rowKey="id"
        columns={productColumns}
        className={styles.dataTable}
        scroll={{ x: 980 }}
        dataSource={products}
        loading={productsLoading}
        error={
          productsError ? (
            <Typography.Text type="danger">
              {productsError instanceof Error
                ? productsError.message
                : t('vendors.branchUnavailable')}
            </Typography.Text>
          ) : undefined
        }
        pagination={{
          current: productsPage,
          pageSize: 20,
          total: productsTotal,
          onChange: onProductsPageChange,
          showSizeChanger: false,
        }}
      />
    </>
  )
}
