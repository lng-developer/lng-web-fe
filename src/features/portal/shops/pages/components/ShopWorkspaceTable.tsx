import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Empty, Select, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DataTable, FilterBar, SearchInput, SectionCard, StatusTag } from '@/shared/ui'

import type { Shop, ShopListParams, ShopStatus } from '../../api/shopApi'
import styles from '../ShopWorkspacePage.module.scss'
import { canWriteShop, SHOP_STATUSES } from '../useShopWorkspacePage'

function statusTone(status: ShopStatus) {
  return status === 'ACTIVE' ? 'operational' : status === 'INACTIVE' ? 'cancelled' : 'warning'
}

export function ShopWorkspaceTable({
  account,
  canWriteAnyShop,
  data,
  loading,
  params,
  search,
  onClearFilters,
  onEditShop,
  onPageChange,
  onSearchChange,
  onStatusChange,
}: {
  account: CurrentAccount
  canWriteAnyShop: boolean
  data?: { items: Shop[]; pagination: { total?: number } }
  loading: boolean
  params: ShopListParams
  search: string
  onClearFilters: () => void
  onEditShop: (shop: Shop) => void
  onPageChange: (page: number) => void
  onSearchChange: (value: string) => void
  onStatusChange: (status?: ShopStatus) => void
}) {
  const { t } = useTranslation()
  const columns = useMemo<TableColumnsType<Shop>>(
    () => [
      {
        title: t('portal.shops.id'),
        dataIndex: 'id',
        width: 150,
        render: (id: string) => (
          <Typography.Text code copyable={{ text: id }}>
            {id}
          </Typography.Text>
        ),
      },
      {
        title: t('portal.shops.name'),
        dataIndex: 'name',
        width: 220,
        ellipsis: true,
        render: (name: string, shop) => (
          <Typography.Text strong style={{ fontSize: 13 }}>
            {name || shop.id || '-'}
          </Typography.Text>
        ),
      },
      {
        title: t('portal.shops.currency'),
        dataIndex: 'currency',
        width: 100,
        render: (currency: string) => currency || 'USD',
      },
      {
        title: t('portal.shops.status'),
        dataIndex: 'status',
        width: 120,
        render: (status: ShopStatus) => (
          <StatusTag status={statusTone(status)}>{t(`portal.shops.statuses.${status}`)}</StatusTag>
        ),
      },
      {
        title: t('portal.shops.updatedAt'),
        dataIndex: 'updatedAt',
        width: 170,
        render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
      },
      ...(canWriteAnyShop
        ? [
            {
              title: t('portal.shops.actions'),
              align: 'center' as const,
              width: 90,
              render: (_: unknown, shop: Shop) =>
                canWriteShop(account, shop.id) ? (
                  <Tooltip title={t('portal.shops.editAction', { name: shop.name })}>
                    <Button
                      aria-label={t('portal.shops.editAction', { name: shop.name })}
                      icon={<EditOutlined aria-hidden />}
                      type="text"
                      onClick={(event) => {
                        event.stopPropagation()
                        onEditShop(shop)
                      }}
                    />
                  </Tooltip>
                ) : null,
            },
          ]
        : []),
    ],
    [account, canWriteAnyShop, onEditShop, t],
  )

  return (
    <SectionCard>
      <DataTable
        columns={columns}
        dataSource={data?.items ?? []}
        emptyText={
          params.search || params.status ? (
            <Empty description={t('portal.shops.noFilteredResults')}>
              <Button onClick={onClearFilters}>{t('portal.shops.clearFilters')}</Button>
            </Empty>
          ) : (
            <Empty description={t('portal.shops.noAuthorizedShops')} />
          )
        }
        loading={loading}
        rowKey="id"
        onRow={(shop) => ({ onClick: () => onEditShop(shop) })}
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total: data?.pagination.total,
          onChange: onPageChange,
        }}
        toolbar={
          <FilterBar label={t('portal.shops.filters')} contentClassName={styles.filters}>
            <SearchInput
              aria-label={t('portal.shops.search')}
              placeholder={t('portal.shops.search')}
              value={search}
              onSearchChange={onSearchChange}
            />
            <Select
              aria-label={t('portal.shops.status')}
              allowClear
              className={styles.statusFilter}
              options={SHOP_STATUSES.map((status) => ({
                label: t(`portal.shops.statuses.${status}`),
                value: status,
              }))}
              placeholder={t('portal.shops.allStatuses')}
              value={params.status}
              onChange={onStatusChange}
            />
          </FilterBar>
        }
      />
    </SectionCard>
  )
}
