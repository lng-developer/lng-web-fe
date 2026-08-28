import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableProps } from 'antd'
import { Alert, Button, Image, Input, InputNumber, Modal, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { printMethodSelectOptions } from '@/shared/constants/printMethods'

import type { ProductTypeGroup, ProductTypeGroupInput } from '../../catalog/api/catalogApi'
import type { VendorMigrationReviewItem } from '../api/vendorApi'

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
  onPreviewImage: (imageUrl: string, name: string) => void
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
  onPreviewImage,
}: ReviewTableProps) {
  const { t } = useTranslation()
  const columns = useMemo<TableProps<VendorMigrationReviewItem>['columns']>(
    () => [
      {
        title: t('portal.vendors.migration.image', { defaultValue: 'Image' }),
        width: 96,
        render: (_, row) =>
          row.imageUrl ? (
            <Image
              width={72}
              height={72}
              preview={false}
              src={row.imageUrl}
              alt={row.name}
              onClick={() => onPreviewImage(row.imageUrl as string, row.name)}
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
    [onPreviewImage, t],
  )
  return (
    <CoreDataTable
      rowKey="legacyProductId"
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
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)
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
  const handlePreviewImage = useCallback(
    (url: string, name: string) => setPreviewImage({ url, name }),
    [],
  )
  const updateFilters = (next: { vendorId?: string; q?: string }) => {
    setSelectedIds([])
    onFiltersChange?.(next)
  }
  if (error)
    return <Alert type="error" showIcon message={t('portal.vendors.migration.loadFailed')} />
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
          aria-label="Migration vendor filter"
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
          aria-label="Migration product search"
          allowClear
          placeholder={t('portal.vendors.filters.search', { defaultValue: 'Search product or External ID' })}
          value={filters?.q}
          style={{ width: 260 }}
          onChange={(event) => updateFilters({ ...filters, q: event.target.value.trim() || undefined })}
        />
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
        {canCreateProductType ? (
          <Button aria-label="Create product type" onClick={() => setCreateOpen(true)}>
            {t('portal.vendors.migration.createProductType', {
              defaultValue: 'Create product type',
            })}
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
        onPreviewImage={handlePreviewImage}
      />
      {previewImage ? (
        <Modal open title={previewImage.name} footer={null} onCancel={() => setPreviewImage(null)}>
          <Image width="100%" preview={false} src={previewImage.url} alt={previewImage.name} />
        </Modal>
      ) : null}
      {createOpen ? (
        <Modal
          open
          title={t('portal.vendors.migration.createProductType', {
            defaultValue: 'Create product type',
          })}
          okText={t('portal.vendors.migration.createAndSelect', {
            defaultValue: 'Create and select',
          })}
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
              aria-label="Product type code"
              placeholder="Code"
              value={draft.code}
              onChange={(event) => setDraft((value) => ({ ...value, code: event.target.value }))}
            />
            <Input
              aria-label="Product type name"
              placeholder="Name"
              value={draft.name}
              onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
            />
            <Select
              aria-label="Product type print method"
              allowClear
              placeholder="Print method"
              value={draft.printMethod}
              options={printMethodSelectOptions}
              onChange={(value) =>
                setDraft((draftValue) => ({ ...draftValue, printMethod: value }))
              }
            />
            <InputNumber
              aria-label="Product type sort order"
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
    </Space>
  )
}
