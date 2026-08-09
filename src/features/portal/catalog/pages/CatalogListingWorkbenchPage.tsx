import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Pagination, Select, Space } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { EmptyState, FeedbackAlert, LoadingState, PageHeader, useFeedbackToast } from '@/shared/ui'

import {
  type CatalogListParams,
  createListing,
  type CreateListingInput,
  getListing,
  getListingOptions,
  getListingSummary,
  type Listing,
  listListings,
  updateListing,
  type UpdateListingInput,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import { ListingCard } from '../components/ListingCard'
import { ListingDetailPanel } from '../components/ListingDetailPanel'
import { CatalogListingEditorModal } from './CatalogListingEditorModal'
import styles from './CatalogListingWorkbenchPage.module.scss'

const PAGE_SIZE = 20

export function CatalogListingWorkbenchPage({
  account: accountProp,
}: {
  readonly account?: CurrentAccount
}) {
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const { t } = useTranslation()
  const account = accountProp ?? loadedAccount
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [shopId, setShopId] = useState<string>()
  const [salesChannelCode, setSalesChannelCode] = useState<string>()
  const [qcStatus, setQcStatus] = useState<string>()
  const [selectedId, setSelectedId] = useState<string>()
  const [editing, setEditing] = useState<Listing | 'create'>()

  const deferredSearch = useDeferredValue(search)

  const params: CatalogListParams = {
    page,
    limit: PAGE_SIZE,
    search: deferredSearch || undefined,
    shopId,
    salesChannelCode,
    qcStatus,
  }

  const summaryParams = { search: params.search, shopId, salesChannelCode, qcStatus }

  const options = useQuery({
    queryKey: catalogKeys.options(),
    queryFn: getListingOptions,
    retry: false,
  })
  const listings = useQuery({
    queryKey: catalogKeys.list(params),
    queryFn: () => listListings(params),
    retry: false,
  })
  const summary = useQuery({
    queryKey: catalogKeys.summary(summaryParams),
    queryFn: () => getListingSummary(summaryParams),
    retry: false,
  })
  const detail = useQuery({
    queryKey: catalogKeys.detail(selectedId ?? ''),
    queryFn: () => getListing(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  })

  const canWrite = (listing?: Listing) => {
    if (account?.permissions.includes('CATALOG:WRITE')) return true
    const targetShopId = listing?.shopId
    return Boolean(
      account?.scopes.some(
        (scope) =>
          scope.scopeType === 'shop' &&
          (!targetShopId || scope.scopeId === targetShopId) &&
          scope.permissions.includes('CATALOG:WRITE'),
      ),
    )
  }

  const refresh = async () => queryClient.invalidateQueries({ queryKey: catalogKeys.all })

  const openEdit = async (listing: Listing) => {
    try {
      const latest = await queryClient.fetchQuery({
        queryKey: catalogKeys.detail(listing.id),
        queryFn: () => getListing(listing.id),
      })
      setEditing(latest)
    } catch {
      toast('error', 'Could not load listing')
    }
  }

  const save = useMutation({
    mutationFn: (input: CreateListingInput | UpdateListingInput) =>
      editing === 'create'
        ? createListing(input as CreateListingInput)
        : updateListing((editing as Listing).id, input as UpdateListingInput),
    onSuccess: async (saved) => {
      setEditing(undefined)
      setSelectedId(saved.id)
      await refresh()
      toast('success', t('portal.catalog.saved'))
    },
    onError: (err) => toast('error', err instanceof Error ? err.message : 'Could not save'),
  })

  const resetPage =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v)
      setPage(1)
    }

  const selectedListing = selectedId
    ? (detail.data ?? listings.data?.items.find((l) => l.id === selectedId))
    : undefined

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.catalog.title')}
        description={t('portal.catalog.description')}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
              {t('portal.catalog.refresh')}
            </Button>
            {canWrite() ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('create')}>
                {t('portal.catalog.create')}
              </Button>
            ) : null}
          </Space>
        }
      />

      {listings.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.catalog.unavailable')} />
      ) : null}

      {/* Filters */}
      <div className={styles.filterRow}>
        <Input.Search
          allowClear
          placeholder={t('portal.catalog.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => setPage(1)}
          style={{ maxWidth: 280 }}
        />
        <Select
          allowClear
          style={{ width: 180 }}
          placeholder={t('portal.catalog.allShops')}
          value={shopId}
          onChange={resetPage(setShopId)}
          options={(options.data?.shops ?? []).map(({ id, name }) => ({ value: id, label: name }))}
        />
        <Select
          allowClear
          style={{ width: 150 }}
          placeholder={t('portal.catalog.allChannels')}
          value={salesChannelCode}
          onChange={resetPage(setSalesChannelCode)}
          options={['AMAZON', 'ETSY'].map((v) => ({ value: v, label: v }))}
        />
        <Select
          allowClear
          style={{ width: 150 }}
          placeholder="All QC Statuses"
          value={qcStatus}
          onChange={resetPage(setQcStatus)}
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
          ]}
        />
      </div>

      {/* Master-Detail Layout */}
      <div className={styles.masterDetail}>
        {/* Master Panel — Card List */}
        <div className={styles.masterPanel}>
          {listings.isLoading ? (
            <div className={styles.loadingCenter}>
              <LoadingState variant="card" />
            </div>
          ) : !listings.data?.items.length ? (
            <EmptyState
              title="No listings found"
              description="Try adjusting your filters or create a new listing."
            />
          ) : (
            <>
              <div className={styles.cardList}>
                {listings.data.items.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isSelected={selectedId === listing.id}
                    onClick={() => setSelectedId(listing.id)}
                  />
                ))}
              </div>
              <div className={styles.pagination}>
                <Pagination
                  size="small"
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={listings.data.pagination.total}
                  onChange={setPage}
                  showTotal={(total) => `${total} listings`}
                />
              </div>
            </>
          )}
        </div>

        {/* Detail Panel */}
        <div className={styles.detailPanel}>
          <ListingDetailPanel
            listing={selectedListing}
            isLoading={Boolean(selectedId && detail.isLoading)}
            canWrite={canWrite(selectedListing)}
            onEdit={() => selectedListing && void openEdit(selectedListing)}
            productTypes={options.data?.productTypeGroups ?? []}
            templates={options.data?.internalTemplates ?? []}
          />
        </div>
      </div>

      <CatalogListingEditorModal
        open={Boolean(editing)}
        listing={editing === 'create' ? undefined : editing}
        shops={options.data?.shops ?? []}
        saving={save.isPending}
        onClose={() => setEditing(undefined)}
        onSubmit={(input) => save.mutate(input)}
      />
    </section>
  )
}
