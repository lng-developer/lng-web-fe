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
  readonly integrationOnly?: boolean
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
  integrationOnly = false,
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
  onEditVendor,
  onOpenIntegration,
}: VendorWorkspaceVendorsTabPageProps) {
  const { t } = useTranslation()

  const vendorColumns = useMemo<TableColumnsType<Vendor>>(
    () => [
      {
        title: t('portal.vendors.code'),
        dataIndex: 'code',
        width: 140,
        ellipsis: true,
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: t('portal.vendors.name'),
        dataIndex: 'name',
        width: 220,
        ellipsis: true,
        render: (value) => <Typography.Text strong>{value}</Typography.Text>,
      },
      {
        title: t('portal.vendors.fulfillmentType'),
        dataIndex: 'fulfillmentType',
        width: 130,
        ellipsis: true,
        render: (value: Vendor['fulfillmentType']) =>
          value ? <Tag color={fulfillmentTypeColors[value]}>{value}</Tag> : null,
      },
      {
        title: t('portal.vendors.providerKey'),
        dataIndex: 'providerKey',
        width: 170,
        ellipsis: true,
        render: (value) =>
          value ? (
            <Tag color="processing">{value}</Tag>
          ) : (
            <Typography.Text type="secondary">{t('portal.vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('portal.vendors.statusLabel'),
        dataIndex: 'status',
        width: 110,
        ellipsis: true,
        render: (status) => (
          <StatusTag status={status === 'ACTIVE' ? 'operational' : 'draft'}>
            {t(`portal.vendors.status.${status}`)}
          </StatusTag>
        ),
      },
      {
        title: t('portal.vendors.vendorsTabActions'),
        width: 190,
        render: (_, vendor) => (
          <Space size={4}>
            {canWrite ? (
              integrationOnly ? (
                <Button
                  type="text"
                  size="small"
                  icon={<ApiOutlined />}
                  aria-label={t('portal.vendors.configureIntegration', { name: vendor.name })}
                  title={t('portal.vendors.configureIntegration', { name: vendor.name })}
                  onClick={() => onOpenIntegration(vendor)}
                />
              ) : (
                <>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    aria-label={t('portal.vendors.editVendor', { name: vendor.name })}
                    title={t('portal.vendors.editVendor', { name: vendor.name })}
                    onClick={() => onEditVendor(vendor)}
                  />
                </>
              )
            ) : null}
          </Space>
        ),
      },
    ],
    [canWrite, integrationOnly, onEditVendor, onOpenIntegration, t],
  )

  const statusOptions = [
    { value: 'ACTIVE', label: t('portal.vendors.status.ACTIVE') },
    { value: 'INACTIVE', label: t('portal.vendors.status.INACTIVE') },
  ]

  return (
    <>
      <div className={styles.controlsBar}>
        <div className={styles.filtersWrapper}>
          <FilterBar
            bordered={false}
            label={t('portal.vendors.filters.label')}
            contentClassName={styles.filters}
          >
            <SearchInput
              value={searchVendors}
              onSearchChange={(value) => {
                onSearchVendorsChange(value)
              }}
              placeholder={t('portal.vendors.searchVendors')}
            />
            <Select
              allowClear
              options={statusOptions}
              placeholder={t('portal.vendors.filters.status')}
              value={vendorStatus}
              onChange={(value) => onVendorStatusChange(value as RecordStatus | undefined)}
            />
          </FilterBar>
        </div>
        {canWrite && !integrationOnly ? (
          <div className={styles.actionsWrapper}>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAddVendor}>
              {t('portal.vendors.addVendor')}
            </Button>
          </div>
        ) : null}
      </div>
      <CoreDataTable
        rowKey="id"
        columns={vendorColumns}
        className={styles.dataTable}
        fillViewport
        scroll={{ x: 1200 }}
        dataSource={vendors}
        loading={vendorsLoading}
        error={
          vendorsError ? (
            <Typography.Text type="danger">
              {vendorsError instanceof Error
                ? vendorsError.message
                : t('portal.vendors.unavailable')}
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
