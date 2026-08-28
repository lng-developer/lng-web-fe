import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { FilterBar, SearchInput, StatusTag } from '@/shared/ui'

import { getVendorProduct, listVendorCostCenters, type VendorCostCenter } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { VendorCostCenterEditorModal } from './VendorCostCenterEditorModal'
import styles from './VendorWorkspacePage.module.scss'

const PAGE_SIZE = 20

const formatMoney = (value?: number | null, currency = 'USD') => {
  if (value == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100)
}

export function VendorProductCostCentersPage() {
  const { t } = useTranslation()
  const { productId } = useParams<{ productId: string }>()
  const canWrite = hasAnyPermission(['VENDORS:WRITE'], { globalOnly: true })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedCostCenter, setSelectedCostCenter] = useState<VendorCostCenter>()
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const product = useQuery({
    queryKey: productId
      ? vendorKeys.product(productId)
      : ['portal', 'vendors', 'products', 'missing'],
    queryFn: () => getVendorProduct(productId!),
    enabled: Boolean(productId),
    retry: false,
  })

  const params = useMemo(
    () => ({ limit: PAGE_SIZE, page, q: search.trim() || undefined }),
    [page, search],
  )
  const costCenters = useQuery({
    queryKey: productId
      ? vendorKeys.costCenters(productId, params)
      : ['portal', 'vendors', 'cost-centers', 'missing'],
    queryFn: () => listVendorCostCenters(productId!, params),
    enabled: Boolean(productId),
    retry: false,
  })

  const columns = useMemo<TableColumnsType<VendorCostCenter>>(
    () => [
      {
        title: t('portal.vendors.code'),
        dataIndex: 'code',
        width: 250,
        ellipsis: true,
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: t('portal.vendors.name'),
        dataIndex: 'name',
        width: 280,
        ellipsis: true,
        render: (value) => <Typography.Text>{value}</Typography.Text>,
      },
      {
        title: t('portal.vendors.sku', { defaultValue: 'SKU' }),
        dataIndex: 'sku',
        width: 130,
        ellipsis: true,
        render: (value) =>
          value ? (
            <Typography.Text type="secondary">{value}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">{t('portal.vendors.none')}</Typography.Text>
          ),
      },
      {
        title: t('portal.vendors.baseCostAmount'),
        width: 150,
        render: (_, row) =>
          row.baseCostAmount == null ? (
            <Typography.Text type="secondary">{t('portal.vendors.none')}</Typography.Text>
          ) : (
            formatMoney(row.baseCostAmount, row.currency || 'USD')
          ),
      },
      {
        title: t('portal.vendors.statusLabel'),
        width: 110,
        render: (_, row) => (
          <StatusTag status={row.status === 'ACTIVE' ? 'operational' : 'draft'}>
            {t(`portal.vendors.status.${row.status}`)}
          </StatusTag>
        ),
      },
      {
        title: t('portal.vendors.costCenterActions'),
        width: 90,
        render: (_, row) =>
          canWrite ? (
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              aria-label={t('portal.vendors.viewCostCenter', { name: row.name })}
              title={t('portal.vendors.viewCostCenter', { name: row.name })}
              onClick={() => {
                setSelectedCostCenter(row)
                setIsCreating(false)
                setIsEditing(false)
              }}
            />
          ) : null,
      },
    ],
    [canWrite, t],
  )

  const error = product.error ?? costCenters.error

  return (
    <section className={styles.page}>
      <div className={styles.workspaceSection}>
        <FilterBar
          label={t('portal.vendors.filters.label')}
          contentClassName={styles.filters}
          actions={
            canWrite ? (
              <Space size={8}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!product.data}
                  onClick={() => {
                    setIsCreating(true)
                    setIsEditing(true)
                    setSelectedCostCenter(undefined)
                  }}
                >
                  {t('portal.vendors.addCostCenter')}
                </Button>
              </Space>
            ) : null
          }
        >
          <SearchInput
            value={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder={t('portal.vendors.searchCostCenters')}
          />
        </FilterBar>
        {isCreating && product.data ? (
          <VendorCostCenterEditorModal
            mode="inline"
            open
            productId={product.data.id}
            vendorId={product.data.vendor?.id ?? ''}
            onCancel={() => {
              setIsCreating(false)
              setIsEditing(false)
            }}
            onSaved={() => {
              setIsCreating(false)
              setIsEditing(false)
            }}
          />
        ) : null}
        <CoreDataTable
          rowKey="id"
          className={styles.dataTable}
          columns={columns}
          dataSource={costCenters.data?.items}
          loading={product.isLoading || costCenters.isLoading}
          scroll={{ x: 1010 }}
          error={
            error ? (
              <Typography.Text type="danger">
                {error instanceof Error ? error.message : t('portal.vendors.branchUnavailable')}
              </Typography.Text>
            ) : undefined
          }
          expandable={{
            expandedRowKeys: selectedCostCenter ? [selectedCostCenter.id] : [],
            onExpand: (expanded, row) => {
              if (expanded) {
                setSelectedCostCenter(row)
                setIsCreating(false)
                setIsEditing(false)
              } else {
                setSelectedCostCenter(undefined)
                setIsEditing(false)
              }
            },
            expandedRowRender: (row) =>
              selectedCostCenter?.id === row.id && product.data ? (
                <VendorCostCenterEditorModal
                  item={selectedCostCenter}
                  mode="inline"
                  open
                  productId={product.data.id}
                  vendorId={product.data.vendor?.id ?? ''}
                  readOnly={!isEditing}
                  onEdit={() => setIsEditing(true)}
                  onCancel={() => {
                    setSelectedCostCenter(undefined)
                    setIsEditing(false)
                  }}
                  onSaved={(costCenter) => {
                    setSelectedCostCenter(costCenter)
                    setIsEditing(false)
                  }}
                />
              ) : null,
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: costCenters.data?.pagination.total,
            onChange: (nextPage) => setPage(nextPage),
            showSizeChanger: false,
          }}
        />
      </div>
    </section>
  )
}
