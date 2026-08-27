import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AppstoreOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { FilterBar, SearchInput, StatusTag } from '@/shared/ui'

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
  readonly productTypeGroupFilter: string | undefined
  readonly productsPage: number
  readonly products: VendorProduct[] | undefined
  readonly productsLoading: boolean
  readonly productsTotal: number | undefined
  readonly productsError: unknown
  readonly vendorFilterOptions: SelectOption[]
  readonly productTypeGroupOptions: SelectOption[]
  readonly onSearchProductsChange: (value: string) => void
  readonly onVendorFilterChange: (value: string | undefined) => void
  readonly onProductTypeGroupFilterChange: (value: string | undefined) => void
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
  productTypeGroupFilter,
  productsPage,
  products,
  productsLoading,
  productsTotal,
  productsError,
  vendorFilterOptions,
  productTypeGroupOptions,
  onSearchProductsChange,
  onVendorFilterChange,
  onProductTypeGroupFilterChange,
  onProductStatusChange,
  onProductsPageChange,
  onAddProduct,
  onOpenProductImport,
  onEditProduct,
  onOpenCostCenters,
}: VendorWorkspaceProductsTabPageProps) {
  const { t } = useTranslation()

  const productColumns = useMemo<TableColumnsType<VendorProduct>>(
    () => [
      {
        title: t('portal.vendors.code'),
        dataIndex: 'code',
        width: 170,
        ellipsis: true,
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: t('portal.vendors.name'),
        dataIndex: 'name',
        width: 420,
        render: (value) => (
          <Typography.Text className={styles.productName} strong>
            {value}
          </Typography.Text>
        ),
      },
      {
        title: t('portal.vendors.vendor', { defaultValue: 'Vendor' }),
        width: 210,
        ellipsis: true,
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
        fixed: 'right',
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
                  icon={<AppstoreOutlined />}
                  aria-label={t('portal.vendors.manageCostCenters')}
                  title={t('portal.vendors.manageCostCenters')}
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
    { value: 'ACTIVE', label: t('portal.vendors.status.ACTIVE') },
    { value: 'INACTIVE', label: t('portal.vendors.status.INACTIVE') },
  ]

  return (
    <>
      <FilterBar
        label={t('portal.vendors.filters.label')}
        contentClassName={styles.filters}
        actions={
          canWrite && vendorFilter ? (
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
            </Space>
          ) : null
        }
      >
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
          placeholder={t('portal.vendors.filters.productType', { defaultValue: 'Product type' })}
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
      <CoreDataTable
        rowKey="id"
        columns={productColumns}
        className={styles.dataTable}
        scroll={{ x: 820 }}
        dataSource={products}
        loading={productsLoading}
        error={
          productsError ? (
            <Typography.Text type="danger">
              {productsError instanceof Error
                ? productsError.message
                : t('portal.vendors.branchUnavailable')}
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
