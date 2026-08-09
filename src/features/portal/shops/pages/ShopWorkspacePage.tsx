import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  CheckCircleOutlined,
  EditOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShopOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Empty, Select, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  DataTable,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  createShop,
  type CreateShopInput,
  listShops,
  type Shop,
  type ShopListParams,
  type ShopStatus,
  updateShopStatus,
} from '../api/shopApi'
import { shopKeys } from '../api/shopKeys'
import { ShopEditorModal } from './ShopEditorModal'
import styles from './ShopWorkspacePage.module.scss'

const PAGE_SIZE = 20
const SHOP_STATUSES: ShopStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED']

function readParams(searchParams: URLSearchParams): ShopListParams {
  const pageValue = Number(searchParams.get('page'))
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const search = searchParams.get('search')?.trim().slice(0, 120) || undefined
  const rawStatus = searchParams.get('status')
  const status = SHOP_STATUSES.find((item) => item === rawStatus)
  return { page, limit: PAGE_SIZE, ...(search ? { search } : {}), ...(status ? { status } : {}) }
}

function canWriteShop(account: CurrentAccount, shopId: string) {
  if (account.permissions.includes('SHOPS:WRITE')) return true
  return account.scopes.some(
    (scope) =>
      scope.scopeType === 'shop' &&
      (scope.scopeId === shopId || scope.resourceId === shopId) &&
      scope.permissions.includes('SHOPS:WRITE'),
  )
}

function statusTone(status: ShopStatus) {
  return status === 'ACTIVE' ? 'operational' : status === 'INACTIVE' ? 'cancelled' : 'warning'
}

export function ShopWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [editingShop, setEditingShop] = useState<Shop>()
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const deferredSearch = useDeferredValue(search)

  const params = useMemo(() => {
    const p = readParams(searchParams)
    return { ...p, search: deferredSearch.trim().slice(0, 120) || undefined }
  }, [searchParams, deferredSearch])

  const canCreate = account.permissions.includes('SHOPS:WRITE')
  const canWriteAnyShop =
    canCreate ||
    account.scopes.some(
      (scope) => scope.scopeType === 'shop' && scope.permissions.includes('SHOPS:WRITE'),
    )

  const shops = useQuery({
    queryKey: shopKeys.list(params),
    queryFn: () => listShops(params),
    retry: false,
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: shopKeys.all }),
    [queryClient],
  )

  const createMutation = useMutation({
    mutationFn: (input: CreateShopInput) => createShop(input),
    onSuccess: async () => {
      setCreating(false)
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const statusMutation = useMutation({
    mutationFn: ({ shopId, status }: { shopId: string; status: ShopStatus }) =>
      updateShopStatus(shopId, status),
    onSuccess: async () => {
      setEditingShop(undefined)
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const updateParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const updated = new URLSearchParams(searchParams)
      Object.entries(next).forEach(([key, value]) => {
        if (value) updated.set(key, value)
        else updated.delete(key)
      })
      setSearchParams(updated)
    },
    [searchParams, setSearchParams],
  )

  const columns = useMemo<TableColumnsType<Shop>>(
    () => [
      {
        title: t('portal.shops.id'),
        dataIndex: 'id',
        width: 320,
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
            {name || shop.id || '—'}
          </Typography.Text>
        ),
      },
      {
        title: t('portal.shops.currency'),
        dataIndex: 'currency',
        width: 100,
        render: (curr: string) => curr || 'USD',
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
        render: (value: string) => (value ? new Date(value).toLocaleString() : '—'),
      },
      ...(canWriteAnyShop
        ? [
            {
              title: t('portal.shops.actions'),
              align: 'right' as const,
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
                        setEditingShop(shop)
                      }}
                    />
                  </Tooltip>
                ) : null,
            },
          ]
        : []),
    ],
    [account, canWriteAnyShop, t],
  )

  const totalShops = shops.data?.pagination.total ?? 0
  const activeCount = useMemo(
    () => (shops.data?.items ?? []).filter((s) => s.status === 'ACTIVE').length,
    [shops.data?.items],
  )
  const inactiveCount = useMemo(
    () => (shops.data?.items ?? []).filter((s) => s.status !== 'ACTIVE').length,
    [shops.data?.items],
  )

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.shops.title')}
        description={t('portal.shops.description')}
        actions={
          canCreate ? (
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden />}
              onClick={() => setCreating(true)}
            >
              {t('portal.shops.createAction')}
            </Button>
          ) : null
        }
      />

      {/* Summary Metric Cards */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<ShopOutlined />}
          variant="neutral"
          label={t('portal.shops.metrics.total', { defaultValue: 'Total Shops' })}
          value={totalShops}
          loading={shops.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('portal.shops.metrics.active', { defaultValue: 'Active Shops' })}
          value={activeCount}
          loading={shops.isLoading}
        />
        <MetricCard
          icon={<StopOutlined />}
          variant="danger"
          label={t('portal.shops.metrics.inactive', { defaultValue: 'Inactive Shops' })}
          value={inactiveCount}
          loading={shops.isLoading}
        />
        <MetricCard
          icon={<GlobalOutlined />}
          variant="info"
          label={t('portal.shops.metrics.channel', { defaultValue: 'Sales Channels' })}
          value="Amazon & Etsy"
          loading={shops.isLoading}
        />
      </div>

      {shops.error ? (
        <FeedbackAlert
          type="error"
          title={t('portal.shops.unavailable')}
          action={
            <Button
              type="link"
              icon={<ReloadOutlined aria-hidden />}
              onClick={() => void shops.refetch()}
            >
              {t('portal.shops.retry')}
            </Button>
          }
        />
      ) : null}

      <SectionCard>
        <DataTable
          columns={columns}
          dataSource={shops.data?.items ?? []}
          emptyText={
            params.search || params.status ? (
              <Empty description={t('portal.shops.noFilteredResults')}>
                <Button onClick={() => setSearchParams({ page: '1' })}>
                  {t('portal.shops.clearFilters')}
                </Button>
              </Empty>
            ) : (
              <Empty description={t('portal.shops.noAuthorizedShops')} />
            )
          }
          loading={shops.isLoading}
          rowKey="id"
          onRow={(shop) => ({ onClick: () => setEditingShop(shop) })}
          pagination={{
            current: params.page,
            pageSize: params.limit,
            total: shops.data?.pagination.total,
            onChange: (page) => updateParams({ page: String(page) }),
          }}
          toolbar={
            <FilterBar label={t('portal.shops.filters')} contentClassName={styles.filters}>
              <SearchInput
                aria-label={t('portal.shops.search')}
                placeholder={t('portal.shops.search')}
                value={search}
                onSearchChange={(val) => {
                  setSearch(val)
                  updateParams({ search: val || undefined, page: '1' })
                }}
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
                onChange={(status) => updateParams({ status, page: '1' })}
              />
            </FilterBar>
          }
        />
      </SectionCard>

      <ShopEditorModal
        canWrite={Boolean(editingShop && canWriteShop(account, editingShop.id))}
        open={creating || Boolean(editingShop)}
        saving={createMutation.isPending || statusMutation.isPending}
        shop={editingShop}
        onClose={() => {
          setCreating(false)
          setEditingShop(undefined)
        }}
        onCreate={(input: CreateShopInput) => canCreate && createMutation.mutate(input)}
        onUpdateStatus={(status) =>
          editingShop &&
          canWriteShop(account, editingShop.id) &&
          statusMutation.mutate({ shopId: editingShop.id, status })
        }
      />
    </section>
  )
}

export default ShopWorkspacePage
