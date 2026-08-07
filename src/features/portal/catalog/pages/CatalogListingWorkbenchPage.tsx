import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { EyeOutlined, MoreOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Button,
  Descriptions,
  Dropdown,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  DataTable,
  DetailDrawer,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SectionCard,
  useFeedbackToast,
} from '@/shared/ui'

import {
  approveListing,
  type CatalogListParams,
  createListing,
  type CreateListingInput,
  getListing,
  getListingOptions,
  getListingSummary,
  type Listing,
  listListings,
  listListingVariants,
  rejectListing,
  requestListingVariantPsd,
  updateListing,
  type UpdateListingInput,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import { CatalogListingEditorModal } from './CatalogListingEditorModal'
import styles from './CatalogListingWorkbenchPage.module.scss'
import { ListingVariantManager } from './ListingVariantManager'

const PAGE_SIZE = 20

function InlineListingVariants({ listing, canWrite }: { listing: Listing; canWrite: boolean }) {
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const variants = useQuery({
    queryKey: catalogKeys.variants(listing.id),
    queryFn: () => listListingVariants(listing.id),
  })
  const requestPsd = useMutation({
    mutationFn: (variantId: string) => requestListingVariantPsd(listing.id, variantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogKeys.variants(listing.id) })
      toast('success', 'PSD task requested')
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not request PSD'),
  })

  return (
    <div className={styles.inlineVariants}>
      <div className={styles.variantHeader}>
        <Typography.Text strong>Variants ({variants.data?.length ?? 0})</Typography.Text>
        <Typography.Text type="secondary">Production setup by product type</Typography.Text>
      </div>
      <div className={styles.variantColumns} aria-hidden="true">
        <span>Product type</span>
        <span>Internal template</span>
        <span>Variant</span>
        <span>PSD readiness</span>
        <span>Action</span>
      </div>
      {variants.isLoading ? (
        <Typography.Text type="secondary">Loading variants...</Typography.Text>
      ) : null}
      {(variants.data ?? []).map((variant) => {
        const isDefault = listing.defaultVariantId === variant.id
        return (
          <div className={styles.inlineVariant} key={variant.id}>
            <div>
              <Typography.Text strong>{variant.productTypeGroup.name}</Typography.Text>
              {variant.productTypeGroup.code ? (
                <Typography.Text className={styles.cellMeta} type="secondary">
                  {variant.productTypeGroup.code}
                </Typography.Text>
              ) : null}
            </div>
            <div>
              <Typography.Text>
                {variant.internalTemplate?.name ?? 'Not configured'}
              </Typography.Text>
              {variant.internalTemplate?.code ? (
                <Typography.Text className={styles.cellMeta} type="secondary">
                  {variant.internalTemplate.code}
                </Typography.Text>
              ) : null}
            </div>
            <Space size={4} wrap>
              <Tag color={variant.status === 'ACTIVE' ? 'green' : 'default'}>{variant.status}</Tag>
              {isDefault ? <Tag color="blue">Default</Tag> : null}
            </Space>
            <Tag color={variant.psdReadiness.status === 'PRESENT' ? 'green' : 'orange'}>
              PSD {variant.psdReadiness.status.toLowerCase().replace('_', ' ')}
            </Tag>
            <div>
              {canWrite && variant.psdReadiness.status === 'MISSING' ? (
                <Button
                  size="small"
                  loading={requestPsd.isPending && requestPsd.variables === variant.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    requestPsd.mutate(variant.id)
                  }}
                >
                  Request PSD
                </Button>
              ) : (
                <Typography.Text type="secondary">Ready</Typography.Text>
              )}
            </div>
          </div>
        )
      })}
      {!variants.isLoading && variants.data?.length === 0 ? (
        <Typography.Text type="secondary">No variants configured</Typography.Text>
      ) : null}
    </div>
  )
}

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
  const [rejectReason, setRejectReason] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const params: CatalogListParams = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    shopId,
    salesChannelCode,
    qcStatus,
  }
  const summaryParams = {
    search: params.search,
    shopId,
    salesChannelCode,
    qcStatus,
  }
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
  const openEdit = async (listing: Listing) => {
    try {
      const latestListing = await queryClient.fetchQuery({
        queryKey: catalogKeys.detail(listing.id),
        queryFn: () => getListing(listing.id),
      })
      setSelectedId(undefined)
      setEditing(latestListing)
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not load listing')
    }
  }
  const refresh = async () => queryClient.invalidateQueries({ queryKey: catalogKeys.all })
  const save = useMutation({
    mutationFn: (input: CreateListingInput | UpdateListingInput) =>
      editing === 'create'
        ? createListing(input as CreateListingInput)
        : updateListing((editing as Listing).id, input as UpdateListingInput),
    onSuccess: async () => {
      setEditing(undefined)
      await refresh()
      toast('success', t('portal.catalog.saved'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not save listing'),
  })
  const approve = useMutation({
    mutationFn: approveListing,
    onSuccess: async () => {
      await refresh()
      toast('success', t('portal.catalog.approved'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not approve listing'),
  })
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectListing(id, reason),
    onSuccess: async () => {
      setRejectOpen(false)
      setRejectReason('')
      await refresh()
      toast('success', t('portal.catalog.rejected'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not reject listing'),
  })
  const resetPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }
  const columns: TableColumnsType<Listing> = [
    {
      title: t('portal.catalog.columns.listing'),
      width: 280,
      render: (_, row) => (
        <div className={styles.listingIdentity}>
          <Typography.Text strong>{row.sku}</Typography.Text>
          <Space size={6} wrap>
            <Typography.Text type="secondary">{row.asin ? 'ASIN' : 'Etsy ID'}</Typography.Text>
            <Typography.Text copyable>{row.asin ?? row.etsyListingId ?? '-'}</Typography.Text>
          </Space>
        </div>
      ),
    },
    {
      title: t('portal.catalog.columns.shopChannel'),
      render: (_, row) => (
        <div className={styles.listingIdentity}>
          <Typography.Text strong>{row.shop?.name ?? row.shopId}</Typography.Text>
          <Space size={4} wrap>
            <Tag>{row.salesChannelCode}</Tag>
            <Typography.Text type="secondary">{row.marketplaceCode}</Typography.Text>
          </Space>
        </div>
      ),
    },
    {
      title: 'Setup',
      width: 170,
      render: (_, row) => (
        <Space size={4} wrap>
          <Tag color={row.status === 'ACTIVE' ? 'green' : 'default'}>{row.status}</Tag>
          <Tag color={row.costCenterStatus === 'READY' ? 'blue' : 'gold'}>
            {row.costCenterStatus}
          </Tag>
        </Space>
      ),
    },
    {
      title: t('portal.catalog.columns.sales'),
      width: 150,
      render: (_, row) => (
        <div className={styles.salesStats}>
          <span>
            <strong>{row.salesStats.quantitySold}</strong> quantity
          </span>
          <span>
            <strong>{row.salesStats.orderCount}</strong> orders
          </span>
        </div>
      ),
    },
    {
      title: t('portal.catalog.columns.updated'),
      width: 170,
      dataIndex: 'updatedAt',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      key: 'actions',
      title: t('portal.catalog.actions'),
      width: 130,
      fixed: 'right',
      render: (_, row) => (
        <Space onClick={(event) => event.stopPropagation()}>
          <Tooltip title={t('portal.catalog.view')}>
            <Button
              type="text"
              aria-label={t('portal.catalog.view')}
              icon={<EyeOutlined />}
              onClick={() => setSelectedId(row.id)}
            />
          </Tooltip>
          {canWrite(row) ? (
            <Dropdown
              menu={{
                items: [
                  { key: 'edit', label: t('portal.catalog.edit') },
                  ...(row.qcStatus === 'DRAFT'
                    ? [
                        { key: 'approve', label: t('portal.catalog.approve') },
                        { key: 'reject', label: t('portal.catalog.reject'), danger: true },
                      ]
                    : []),
                ],
                onClick: ({ key }) => {
                  if (key === 'edit') void openEdit(row)
                  if (key === 'approve')
                    Modal.confirm({
                      title: t('portal.catalog.approve'),
                      onOk: () => approve.mutate(row.id),
                    })
                  if (key === 'reject') {
                    setSelectedId(row.id)
                    setRejectOpen(true)
                  }
                },
              }}
            >
              <Button
                type="text"
                aria-label={t('portal.catalog.moreActions')}
                icon={<MoreOutlined />}
              />
            </Dropdown>
          ) : null}
        </Space>
      ),
    },
  ]
  const selected = detail.data
  const metrics = [
    [t('portal.catalog.metrics.total'), summary.data?.totalListingCount ?? 0],
    [t('portal.catalog.metrics.noPsd'), summary.data?.noPsdCount ?? 0],
    [t('portal.catalog.metrics.draft'), summary.data?.draftCount ?? 0],
    [t('portal.catalog.metrics.approved'), summary.data?.approvedCount ?? 0],
    [t('portal.catalog.metrics.rejected'), summary.data?.rejectedCount ?? 0],
  ] as const

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
      {listings.error || summary.error || options.error ? (
        <FeedbackAlert type="error" title={t('portal.catalog.unavailable')} />
      ) : null}
      <div className={styles.metrics}>
        {metrics.map(([label, value]) => (
          <div className={styles.metric} key={label}>
            <Typography.Text type="secondary">{label}</Typography.Text>
            <Typography.Title level={3}>{value}</Typography.Title>
          </div>
        ))}
      </div>
      <SectionCard>
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={listings.data?.items ?? []}
          loading={listings.isLoading}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          expandable={{
            expandedRowKeys: (listings.data?.items ?? []).map((listing) => listing.id),
            showExpandColumn: false,
            expandedRowRender: (listing) => (
              <InlineListingVariants listing={listing} canWrite={canWrite(listing)} />
            ),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: listings.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar label={t('portal.catalog.filters')} contentClassName={styles.filters}>
              <Input.Search
                allowClear
                className={styles.search}
                placeholder={t('portal.catalog.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => setPage(1)}
              />
              <Select
                allowClear
                className={styles.filter}
                placeholder={t('portal.catalog.allShops')}
                value={shopId}
                onChange={resetPage(setShopId)}
                options={(options.data?.shops ?? []).map(({ id, name }) => ({
                  value: id,
                  label: name,
                }))}
              />
              <Select
                allowClear
                className={styles.filter}
                placeholder={t('portal.catalog.allChannels')}
                value={salesChannelCode}
                onChange={resetPage(setSalesChannelCode)}
                options={['AMAZON', 'ETSY'].map((value) => ({ value, label: value }))}
              />
              <Select
                allowClear
                className={styles.filter}
                placeholder={t('portal.catalog.allQcStatuses')}
                value={qcStatus}
                onChange={resetPage(setQcStatus)}
                options={['DRAFT', 'APPROVED', 'REJECTED'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </FilterBar>
          }
        />
      </SectionCard>
      <DetailDrawer
        open={Boolean(selectedId)}
        width={720}
        title={
          selected ? `${selected.sku} · ${selected.title}` : t('portal.catalog.columns.listing')
        }
        onClose={() => setSelectedId(undefined)}
        footer={
          selected && canWrite(selected) ? (
            <div className={styles.drawerActions}>
              <Button onClick={() => void openEdit(selected)}>{t('portal.catalog.edit')}</Button>
              {selected.qcStatus === 'DRAFT' ? (
                <>
                  <Button
                    type="primary"
                    loading={approve.isPending}
                    onClick={() =>
                      Modal.confirm({
                        title: t('portal.catalog.approve'),
                        onOk: () => approve.mutate(selected.id),
                      })
                    }
                  >
                    {t('portal.catalog.approve')}
                  </Button>
                  <Button danger onClick={() => setRejectOpen(true)}>
                    {t('portal.catalog.reject')}
                  </Button>
                </>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {selected ? (
          <div className={styles.detail}>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'identity',
                  label: t('portal.catalog.fields.identity'),
                  children: `${selected.salesChannelCode} · ${selected.marketplaceCode} · ${selected.sku}`,
                },
                {
                  key: 'externalIdentity',
                  label: selected.salesChannelCode === 'AMAZON' ? 'ASIN' : 'Etsy listing ID',
                  children:
                    selected.salesChannelCode === 'AMAZON'
                      ? (selected.asin ?? '-')
                      : (selected.etsyListingId ?? '-'),
                },
                {
                  key: 'shop',
                  label: t('portal.catalog.fields.shop'),
                  children: selected.shop?.name ?? selected.shopId,
                },
                {
                  key: 'cost',
                  label: t('portal.catalog.fields.baseCost'),
                  children: `${selected.baseCostAmount} ${selected.currency}`,
                },
                {
                  key: 'setup',
                  label: t('portal.catalog.details.setup'),
                  children: `${selected.costCenterStatus} · ${selected.status}`,
                },
                {
                  key: 'sales',
                  label: t('portal.catalog.columns.sales'),
                  children: `${selected.salesStats.quantitySold} · ${selected.salesStats.orderCount} · ${selected.salesStats.orderItemCount}`,
                },
                {
                  key: 'lastSold',
                  label: t('portal.catalog.details.lastSold'),
                  children: selected.salesStats.lastSoldAt
                    ? new Date(selected.salesStats.lastSoldAt).toLocaleString()
                    : '-',
                },
                { key: 'qc', label: 'QC', children: selected.qcStatus },
                {
                  key: 'rejection',
                  label: t('portal.catalog.rejectReason'),
                  children: selected.rejectionReason ?? '-',
                },
                {
                  key: 'approvedAt',
                  label: t('portal.catalog.details.approvedAt'),
                  children: selected.approvedAt
                    ? new Date(selected.approvedAt).toLocaleString()
                    : '-',
                },
                {
                  key: 'created',
                  label: t('portal.catalog.details.created'),
                  children: new Date(selected.createdAt).toLocaleString(),
                },
                {
                  key: 'updated',
                  label: t('portal.catalog.columns.updated'),
                  children: new Date(selected.updatedAt).toLocaleString(),
                },
              ]}
            />
            <ListingVariantManager
              listing={selected}
              productTypes={options.data?.productTypeGroups ?? []}
              templates={options.data?.internalTemplates ?? []}
              canWrite={canWrite(selected)}
            />
          </div>
        ) : null}
      </DetailDrawer>
      <CatalogListingEditorModal
        open={Boolean(editing)}
        listing={editing === 'create' ? undefined : editing}
        shops={options.data?.shops ?? []}
        saving={save.isPending}
        onClose={() => setEditing(undefined)}
        onSubmit={(input) => save.mutate(input)}
      />
      <Modal
        open={rejectOpen}
        title={t('portal.catalog.reject')}
        okText={t('portal.catalog.reject')}
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={reject.isPending}
        onCancel={() => setRejectOpen(false)}
        onOk={() => selected && reject.mutate({ id: selected.id, reason: rejectReason.trim() })}
      >
        <Input.TextArea
          aria-label={t('portal.catalog.rejectReason')}
          rows={4}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder={t('portal.catalog.reasonRequired')}
        />
      </Modal>
    </section>
  )
}
