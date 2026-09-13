import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableProps } from 'antd'
import { Alert, Button, Input, InputNumber, Modal, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { printMethodSelectOptions } from '@/shared/constants/printMethods'
import { ZoomableImage } from '@/shared/ui'

import type { ProductTypeGroup, ProductTypeGroupInput } from '../../catalog/api/catalogApi'
import type { VendorMigrationReviewItem } from '../api/vendorApi'
import styles from './VendorWorkspacePage.module.scss'

type Props = {
  canWrite: boolean
  rows: VendorMigrationReviewItem[]
  loading: boolean
  error: unknown
  currentPage?: number
  currentPageSize?: number
  total?: number
  productTypeGroups: ProductTypeGroup[]
  pending: number
  orphaned: number
  onAssign: (productIds: string[], productTypeGroupId: string) => void
  onPageChange?: (page: number, pageSize: number) => void
  assigning: boolean
  canCreateProductType: boolean
  creatingProductType: boolean
  onCreateProductType: (input: ProductTypeGroupInput) => Promise<ProductTypeGroup>
  filters?: { vendorId?: string; q?: string }
  vendorOptions?: Array<{ value: string; label: string }>
  onFiltersChange?: (filters: { vendorId?: string; q?: string }) => void
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
  currentPage = 1,
  currentPageSize = 20,
  total = 0,
  onPageChange = () => undefined,
  selectedIds,
  onSelectedIdsChange,
}: ReviewTableProps) {
  const { t } = useTranslation()
  const columns = useMemo<TableProps<VendorMigrationReviewItem>['columns']>(
    () => [
      {
        title: t('portal.vendors.migration.image', { defaultValue: 'Image' }),
        width: 96,
        render: (_, row) =>
          row.imageUrl ? (
            <ZoomableImage
              width={72}
              height={72}
              src={row.imageUrl}
              alt={row.name}
              style={{ cursor: 'zoom-in', objectFit: 'cover', borderRadius: 6 }}
            />
          ) : null,
      },
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
      rowKey="id"
      className={styles.dataTable}
      fillViewport
      paginationAtBottom
      loading={loading}
      columns={columns}
      dataSource={rows}
      scroll={{ x: 900 }}
      rowSelection={{
        columnWidth: 40,
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
  orphaned,
  onPageChange,
  onAssign,
  assigning,
  canCreateProductType,
  creatingProductType,
  onCreateProductType,
  filters,
  vendorOptions = [],
  onFiltersChange,
}: Props) {
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [groupId, setGroupId] = useState<string>()
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<ProductTypeGroupInput>({
    code: '',
    name: '',
    sortOrder: 0,
    status: 'ACTIVE',
  })
  const groupOptions = useMemo(
    () =>
      productTypeGroups.map((group) => ({
        value: group.id,
        label: `${group.code} — ${group.name}`,
      })),
    [productTypeGroups],
  )
  const handleSelectedIdsChange = useCallback((ids: string[]) => setSelectedIds(ids), [])
  const updateFilters = (next: { vendorId?: string; q?: string }) => {
    setSelectedIds([])
    onFiltersChange?.(next)
  }
  if (error)
    return <Alert type="error" showIcon message={t('portal.vendors.migration.loadFailed')} />
  return (
    <div className={styles.migrationContent}>
      <Alert
        type="warning"
        showIcon
        message={t('portal.vendors.migration.pending', { count: pending })}
        description={
          orphaned
            ? t('portal.vendors.migration.unresolvedCount', {
                count: orphaned,
                defaultValue:
                  '{{count}} source products are unresolved because their vendor is missing.',
              })
            : undefined
        }
      />
      <Space wrap>
        <Select
          aria-label={t('portal.vendors.migration.vendorFilterAria')}
          allowClear
          placeholder={t('portal.vendors.filters.vendor')}
          value={filters?.vendorId}
          options={vendorOptions}
          showSearch
          optionFilterProp="label"
          style={{ minWidth: 200 }}
          onChange={(vendorId) => updateFilters({ ...filters, vendorId: vendorId || undefined })}
        />
        <Input
          aria-label={t('portal.vendors.migration.productSearchAria')}
          allowClear
          placeholder={t('portal.vendors.filters.search')}
          value={filters?.q}
          style={{ width: 260 }}
          onChange={(event) =>
            updateFilters({ ...filters, q: event.target.value.trim() || undefined })
          }
        />
        <Select
          aria-label={t('portal.vendors.migration.productTypeGroupAria')}
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
        {canCreateProductType ? (
          <Button
            aria-label={t('portal.vendors.migration.createProductType')}
            onClick={() => setCreateOpen(true)}
          >
            {t('portal.vendors.migration.createProductType')}
          </Button>
        ) : null}
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
      {createOpen ? (
        <Modal
          open
          title={t('portal.vendors.migration.createProductType')}
          okText={t('portal.vendors.migration.createAndSelect')}
          confirmLoading={creatingProductType}
          okButtonProps={{ disabled: !draft.code.trim() || !draft.name.trim() }}
          onCancel={() => setCreateOpen(false)}
          onOk={async () => {
            const group = await onCreateProductType({
              ...draft,
              code: draft.code.trim(),
              name: draft.name.trim(),
            })
            setGroupId(group.id)
            setCreateOpen(false)
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              aria-label={t('portal.vendors.migration.productTypeCode')}
              placeholder={t('portal.vendors.migration.productTypeCode')}
              value={draft.code}
              onChange={(event) => setDraft((value) => ({ ...value, code: event.target.value }))}
            />
            <Input
              aria-label={t('portal.vendors.migration.productTypeName')}
              placeholder={t('portal.vendors.migration.productTypeName')}
              value={draft.name}
              onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
            />
            <Select
              aria-label={t('portal.vendors.migration.productTypePrintMethod')}
              allowClear
              placeholder={t('portal.vendors.migration.productTypePrintMethod')}
              value={draft.printMethod}
              options={printMethodSelectOptions}
              onChange={(value) =>
                setDraft((draftValue) => ({ ...draftValue, printMethod: value }))
              }
            />
            <InputNumber
              aria-label={t('portal.vendors.migration.productTypeSortOrder')}
              min={0}
              precision={0}
              value={draft.sortOrder}
              onChange={(value) =>
                setDraft((draftValue) => ({ ...draftValue, sortOrder: value ?? 0 }))
              }
              style={{ width: '100%' }}
            />
          </Space>
        </Modal>
      ) : null}
    </div>
  )
}
