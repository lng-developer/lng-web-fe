import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableProps } from 'antd'
import { Alert, Button, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'

import type { ProductTypeGroup } from '../../catalog/api/catalogApi'
import type { VendorMigrationReviewItem } from '../api/vendorApi'

type Props = {
  canWrite: boolean
  rows: VendorMigrationReviewItem[]
  loading: boolean
  error: unknown
  currentPage: number
  currentPageSize: number
  total: number
  productTypeGroups: ProductTypeGroup[]
  pending: number
  onPageChange: (page: number, pageSize: number) => void
  onAssign: (legacyProductIds: string[], productTypeGroupId: string) => void
  assigning: boolean
}

type ReviewTableProps = Pick<
  Props,
  'rows' | 'loading' | 'currentPage' | 'currentPageSize' | 'total' | 'onPageChange'
> & {
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
}

const ReviewTable = memo(function ReviewTable({
  rows,
  loading,
  currentPage,
  currentPageSize,
  total,
  onPageChange,
  selectedIds,
  onSelectedIdsChange,
}: ReviewTableProps) {
  const { t } = useTranslation()
  const columns = useMemo<TableProps<VendorMigrationReviewItem>['columns']>(
    () => [
      {
        title: t('portal.vendors.migration.vendor'),
        width: 180,
        ellipsis: true,
        render: (_, row) =>
          row.vendorName || row.vendorCode || t('portal.vendors.migration.unresolved'),
      },
      {
        title: t('portal.vendors.migration.product'),
        width: 260,
        ellipsis: true,
        render: (_, row) => (
          <>
            <Typography.Text strong>{row.name}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{row.code}</Typography.Text>
          </>
        ),
      },
      {
        title: t('portal.vendors.migration.externalProductId'),
        dataIndex: 'externalProductId',
        width: 220,
        ellipsis: true,
        render: (value) => value || '—',
      },
      {
        title: t('portal.vendors.migration.variants'),
        dataIndex: 'variantCount',
        width: 110,
      },
    ],
    [t],
  )
  return (
    <CoreDataTable
      rowKey="legacyProductId"
      loading={loading}
      columns={columns}
      dataSource={rows}
      scroll={{ x: 900 }}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectedIdsChange(keys.map(String)),
      }}
      pagination={{
        current: currentPage,
        pageSize: currentPageSize,
        total,
        onChange: onPageChange,
      }}
    />
  )
})

export function VendorMigrationTabPage({
  canWrite,
  rows,
  loading,
  error,
  currentPage,
  currentPageSize,
  total,
  productTypeGroups,
  pending,
  onPageChange,
  onAssign,
  assigning,
}: Props) {
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [groupId, setGroupId] = useState<string>()
  const groupOptions = useMemo(
    () =>
      productTypeGroups.map((group) => ({
        value: group.id,
        label: `${group.code} — ${group.name}`,
      })),
    [productTypeGroups],
  )
  const handleSelectedIdsChange = useCallback((ids: string[]) => setSelectedIds(ids), [])
  if (error)
    return <Alert type="error" showIcon message={t('portal.vendors.migration.loadFailed')} />
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="warning"
        showIcon
        message={t('portal.vendors.migration.pending', { count: pending })}
      />
      <Space wrap>
        <Select
          aria-label="Product Type Group for selected migration products"
          style={{ minWidth: 280 }}
          placeholder={t('portal.vendors.migration.selectProductTypeGroup')}
          value={groupId}
          options={groupOptions}
          showSearch
          optionFilterProp="label"
          virtual
          listHeight={256}
          onChange={setGroupId}
        />
        <Button
          type="primary"
          disabled={!canWrite || !groupId || !selectedIds.length}
          loading={assigning}
          onClick={() => groupId && onAssign(selectedIds, groupId)}
        >
          {t('portal.vendors.migration.assign', { count: selectedIds.length })}
        </Button>
      </Space>
      <ReviewTable
        rows={rows}
        loading={loading}
        currentPage={currentPage}
        currentPageSize={currentPageSize}
        total={total}
        onPageChange={onPageChange}
        selectedIds={selectedIds}
        onSelectedIdsChange={handleSelectedIdsChange}
      />
    </Space>
  )
}
