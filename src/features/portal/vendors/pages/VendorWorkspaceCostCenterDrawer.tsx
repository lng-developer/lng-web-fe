import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Drawer, Space, Tag, Typography } from 'antd'

import { DataTable, FilterBar, SearchInput } from '@/shared/ui'

import { VendorCostCenter, VendorProduct } from '../api/vendorApi'
import styles from './VendorWorkspacePage.module.scss'

interface VendorWorkspaceCostCenterDrawerProps {
  readonly open: boolean
  readonly product?: VendorProduct
  readonly canWrite: boolean
  readonly searchCostCenters: string
  readonly costCentersPage: number
  readonly costCenters: VendorCostCenter[] | undefined
  readonly costCentersLoading: boolean
  readonly costCentersTotal: number | undefined
  readonly costCentersError: unknown
  readonly onSearchCostCentersChange: (value: string) => void
  readonly onCostCentersPageChange: (page: number) => void
  readonly onClose: () => void
  readonly onAddCostCenter: (product: VendorProduct) => void
  readonly onOpenCostCenterImport: (product: VendorProduct) => void
  readonly onEditCostCenter: (product: VendorProduct, costCenter: VendorCostCenter) => void
}

const formatMoney = (value?: number | null, currency = 'USD') => {
  if (value == null) return '�'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100)
}

export function VendorWorkspaceCostCenterDrawer({
  open,
  product,
  canWrite,
  searchCostCenters,
  costCentersPage,
  costCenters,
  costCentersLoading,
  costCentersTotal,
  costCentersError,
  onSearchCostCentersChange,
  onCostCentersPageChange,
  onClose,
  onAddCostCenter,
  onOpenCostCenterImport,
  onEditCostCenter,
}: VendorWorkspaceCostCenterDrawerProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })

  const costCenterColumns = useMemo<TableColumnsType<VendorCostCenter>>(
    () => [
      {
        title: t('vendors.code'),
        dataIndex: 'code',
        width: 150,
        ellipsis: true,
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: t('vendors.name'),
        dataIndex: 'name',
        width: 260,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 280 } }),
        render: (value, row) => (
          <Typography.Text>
            {value}
            {row.sku ? <Typography.Text type="secondary"> � {row.sku}</Typography.Text> : null}
          </Typography.Text>
        ),
      },
      {
        title: t('vendors.sku', { defaultValue: 'SKU' }),
        dataIndex: 'sku',
        width: 150,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 170 } }),
        render: (value) =>
          value ? (
            <Typography.Text type="secondary">{value}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">{t('vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('vendors.baseCostAmount'),
        align: 'right',
        width: 150,
        ellipsis: true,
        onCell: () => ({ style: { maxWidth: 180 } }),
        render: (_, row) =>
          row.baseCostAmount == null ? (
            <Typography.Text type="secondary">{t('vendors.none')}</Typography.Text>
          ) : (
            formatMoney(row.baseCostAmount, row.currency || 'USD')
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
        title: t('vendors.costCenterActions'),
        fixed: 'right',
        width: 100,
        render: (_, row) =>
          canWrite ? (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              aria-label={t('vendors.editCostCenter', { name: row.name })}
              title={t('vendors.editCostCenter', { name: row.name })}
              onClick={() => product && onEditCostCenter(product, row)}
            />
          ) : null,
      },
    ],
    [canWrite, onEditCostCenter, product, t],
  )

  return (
    <Drawer
      title={
        product ? t('vendors.productCostCenters', { name: product.name }) : t('vendors.costCenters')
      }
      destroyOnClose
      width="min(1100px, calc(100vw - 32px))"
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 0 } }}
    >
      {product ? (
        <div className={styles.costCenterDrawer}>
          <FilterBar
            label={t('vendors.filters.label')}
            contentClassName={styles.filters}
            actions={
              canWrite ? (
                <Space size={8} align="center">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => onAddCostCenter(product)}
                  >
                    {t('vendors.addCostCenter')}
                  </Button>
                  <Button icon={<UploadOutlined />} onClick={() => onOpenCostCenterImport(product)}>
                    {t('vendors.importCostCenters')}
                  </Button>
                </Space>
              ) : null
            }
          >
            <SearchInput
              value={searchCostCenters}
              onSearchChange={(value) => {
                onSearchCostCentersChange(value)
              }}
              placeholder={t('vendors.searchCostCenters')}
            />
          </FilterBar>
          <DataTable
            rowKey="id"
            columns={costCenterColumns}
            className={styles.dataTable}
            scroll={{ x: 900 }}
            dataSource={costCenters}
            loading={costCentersLoading}
            error={
              costCentersError ? (
                <Typography.Text type="danger">
                  {costCentersError instanceof Error
                    ? costCentersError.message
                    : t('vendors.branchUnavailable')}
                </Typography.Text>
              ) : undefined
            }
            pagination={{
              current: costCentersPage,
              pageSize: 20,
              total: costCentersTotal,
              onChange: onCostCentersPageChange,
              showSizeChanger: false,
            }}
          />
        </div>
      ) : null}
    </Drawer>
  )
}
