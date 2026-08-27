import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableProps } from 'antd'
import {
  Alert,
  Button,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'

import { printMethodSelectOptions } from '@/shared/constants/printMethods'

import type { ProductTypeGroup, ProductTypeGroupInput } from '../../catalog/api/catalogApi'
import type { VendorMigrationReviewItem } from '../api/vendorApi'

type Props = {
  canWrite: boolean
  rows: VendorMigrationReviewItem[]
  loading: boolean
  error: unknown
  productTypeGroups: ProductTypeGroup[]
  pending: number
  orphaned: number
  onAssign: (productIds: string[], productTypeGroupId: string) => void
  assigning: boolean
  canCreateProductType: boolean
  creatingProductType: boolean
  onCreateProductType: (input: ProductTypeGroupInput) => Promise<ProductTypeGroup>
}

type ReviewTableProps = Pick<Props, 'rows' | 'loading'> & {
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  onPreviewImage: (imageUrl: string, name: string) => void
}

const ReviewTable = memo(function ReviewTable({
  rows,
  loading,
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
        render: (_, row) =>
          row.vendorName || row.vendorCode || t('portal.vendors.migration.unresolved'),
      },
      {
        title: t('portal.vendors.migration.product'),
        render: (_, row) => <Typography.Text strong>{row.name}</Typography.Text>,
      },
      {
        title: t('portal.vendors.migration.externalProductId'),
        dataIndex: 'externalProductId',
        render: (value) => value || '—',
      },
      { title: t('portal.vendors.migration.variants'), dataIndex: 'variantCount', align: 'right' },
    ],
    [onPreviewImage, t],
  )
  return (
    <Table
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={rows}
      virtual
      scroll={{ y: 560 }}
      rowSelection={{
        columnWidth: 40,
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
  orphaned,
  onAssign,
  assigning,
  canCreateProductType,
  creatingProductType,
  onCreateProductType,
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
