import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableProps } from 'antd'
import { Alert, Button, Select, Space, Table, Typography } from 'antd'

import type { ProductTypeGroup } from '../../catalog/api/catalogApi'
import type { VendorMigrationReviewItem } from '../api/vendorApi'

type Props = {
  canWrite: boolean
  rows: VendorMigrationReviewItem[]
  loading: boolean
  error: unknown
  productTypeGroups: ProductTypeGroup[]
  pending: number
  onAssign: (legacyProductIds: string[], productTypeGroupId: string) => void
  assigning: boolean
}

type ReviewTableProps = Pick<Props, 'rows' | 'loading'> & {
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
}

const ReviewTable = memo(function ReviewTable({
  rows,
  loading,
  selectedIds,
  onSelectedIdsChange,
}: ReviewTableProps) {
  const { t } = useTranslation()
  const columns = useMemo<TableProps<VendorMigrationReviewItem>['columns']>(
    () => [
      {
        title: t('portal.vendors.migration.vendor'),
        render: (_, row) =>
          row.vendorName || row.vendorCode || t('portal.vendors.migration.unresolved'),
      },
      {
        title: t('portal.vendors.migration.product'),
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
        render: (value) => value || '—',
      },
      { title: t('portal.vendors.migration.variants'), dataIndex: 'variantCount', align: 'right' },
    ],
    [t],
  )
  return (
    <Table
      rowKey="legacyProductId"
      loading={loading}
      columns={columns}
      dataSource={rows}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectedIdsChange(keys.map(String)),
      }}
      pagination={false}
    />
  )
})

export function VendorMigrationTabPage({
  canWrite,
  rows,
  loading,
  error,
  productTypeGroups,
  pending,
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
        selectedIds={selectedIds}
        onSelectedIdsChange={handleSelectedIdsChange}
      />
    </Space>
  )
}
