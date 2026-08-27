import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Select, Space, Tag, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { FilterBar, SearchInput, StatusTag } from '@/shared/ui'

import { RecordStatus, Vendor } from '../api/vendorApi'
import styles from './VendorWorkspacePage.module.scss'

interface VendorWorkspaceVendorsTabPageProps {
  readonly canWrite: boolean
  readonly searchVendors: string
  readonly vendorStatus?: RecordStatus
  readonly vendorsPage: number
  readonly vendorsPageSize: number
  readonly vendors: Vendor[] | undefined
  readonly vendorsLoading: boolean
  readonly vendorsTotal: number | undefined
  readonly vendorsError: unknown
  readonly onSearchVendorsChange: (value: string) => void
  readonly onVendorStatusChange: (value: RecordStatus | undefined) => void
  readonly onVendorsPageChange: (page: number, pageSize: number) => void
  readonly onAddVendor: () => void
  readonly onAddProduct: (vendorId: string) => void
  readonly onEditVendor: (vendor: Vendor) => void
  readonly onOpenIntegration: (vendor: Vendor) => void
}

const fulfillmentTypeColors = {
  POD: 'purple',
  FBM: 'blue',
  FBA: 'green',
  DROPSHIP: 'orange',
  CUSTOM: 'cyan',
} satisfies Record<string, string>

export function VendorWorkspaceVendorsTabPage({
  canWrite,
  searchVendors,
  vendorStatus,
  vendorsPage,
  vendorsPageSize,
  vendors,
  vendorsLoading,
  vendorsTotal,
  vendorsError,
  onSearchVendorsChange,
  onVendorStatusChange,
  onVendorsPageChange,
  onAddVendor,
  onAddProduct,
  onEditVendor,
  onOpenIntegration,
}: VendorWorkspaceVendorsTabPageProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })

  const vendorColumns = useMemo<TableColumnsType<Vendor>>(
    () => [
      {
        title: t('vendors.code'),
        dataIndex: 'code',
        width: 140,
        ellipsis: true,
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: t('vendors.name'),
        dataIndex: 'name',
        width: 220,
        ellipsis: true,
        render: (value) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: t('vendors.fulfillmentType'),
        dataIndex: 'fulfillmentType',
        width: 130,
        ellipsis: true,
        render: (value: Vendor['fulfillmentType']) =>
          value ? <Tag color={fulfillmentTypeColors[value]}>{value}</Tag> : null,
      },
      {
        title: t('vendors.providerKey'),
        dataIndex: 'providerKey',
        width: 170,
        ellipsis: true,
        render: (value) =>
          value ? (
            <Tag color="processing">{value}</Tag>
          ) : (
            <Typography.Text type="secondary">{t('vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('vendors.statusLabel'),
        dataIndex: 'status',
        width: 110,
        ellipsis: true,
        render: (status) => (
          <StatusTag status={status === 'ACTIVE' ? 'operational' : 'draft'}>
            {t(`vendors.status.${status}`)}
          </StatusTag>
        ),
      },
      {
        title: t('vendors.vendorsTabActions'),
        width: 190,
        render: (_, vendor) => (
          <Space size={4}>
            {canWrite ? (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  aria-label={t('vendors.addProduct')}
                  title={t('vendors.addProduct')}
                  onClick={() => onAddProduct(vendor.id)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  aria-label={t('vendors.editVendor', { name: vendor.name })}
                  title={t('vendors.editVendor', { name: vendor.name })}
                  onClick={() => onEditVendor(vendor)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ApiOutlined />}
                  aria-label={t('vendors.configureIntegration', { name: vendor.name })}
                  title={t('vendors.configureIntegration', { name: vendor.name })}
                  onClick={() => onOpenIntegration(vendor)}
                />
              </>
            ) : null}
          </Space>
        ),
      },
    ],
    [canWrite, onAddProduct, onEditVendor, onOpenIntegration, t],
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
            <Button type="primary" icon={<PlusOutlined />} onClick={onAddVendor}>
              {t('vendors.addVendor')}
            </Button>
          ) : null
        }
      >
        <SearchInput
          value={searchVendors}
          onSearchChange={(value) => {
            onSearchVendorsChange(value)
          }}
          placeholder={t('vendors.searchVendors')}
        />
        <Select
          allowClear
          options={statusOptions}
          placeholder={t('vendors.filters.status')}
          value={vendorStatus}
          onChange={(value) => onVendorStatusChange(value as RecordStatus | undefined)}
        />
      </FilterBar>
      <CoreDataTable
        rowKey="id"
        columns={vendorColumns}
        className={styles.dataTable}
        scroll={{ x: 1200 }}
        dataSource={vendors}
        loading={vendorsLoading}
        error={
          vendorsError ? (
            <Typography.Text type="danger">
              {vendorsError instanceof Error ? vendorsError.message : t('vendors.unavailable')}
            </Typography.Text>
          ) : undefined
        }
        pagination={{
          current: vendorsPage,
          pageSize: vendorsPageSize,
          total: vendorsTotal,
          onChange: onVendorsPageChange,
        }}
      />
    </>
  )
}
