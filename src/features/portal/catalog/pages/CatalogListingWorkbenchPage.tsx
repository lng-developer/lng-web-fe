import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Input, Modal, Select, Space, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  DataTable,
  DetailDrawer,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusTag,
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
  rejectListing,
  updateListing,
  type UpdateListingInput,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import { CatalogListingEditorModal } from './CatalogListingEditorModal'
import styles from './CatalogListingWorkbenchPage.module.scss'

const PAGE_SIZE = 20
const qcTone = (status: Listing['qcStatus']) =>
  status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'pending'
const psdTone = (status?: string) =>
  status === 'PRESENT' ? 'operational' : status === 'NOT_REQUIRED' ? 'cancelled' : 'warning'

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
  const [psdReadinessStatus, setPsdReadinessStatus] =
    useState<CatalogListParams['psdReadinessStatus']>()
  const [productTypeGroupId, setProductTypeGroupId] = useState<string>()
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
    psdReadinessStatus,
    productTypeGroupId,
  }
  const summaryParams = {
    search: params.search,
    shopId,
    salesChannelCode,
    qcStatus,
    psdReadinessStatus,
    productTypeGroupId,
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
      title: t('portal.catalog.columns.preview'),
      width: 72,
      render: (_, row) =>
        row.previewAsset?.previewUrl ? (
          <img className={styles.preview} src={row.previewAsset.previewUrl} alt="" />
        ) : (
          '-'
        ),
    },
    {
      title: t('portal.catalog.columns.listing'),
      render: (_, row) => (
        <>
          <Typography.Text strong>{row.sku}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{row.title}</Typography.Text>
        </>
      ),
    },
    {
      title: t('portal.catalog.columns.shopChannel'),
      render: (_, row) => (
        <>
          {row.shop?.name ?? row.shopId}
          <br />
          <Typography.Text type="secondary">{row.salesChannelCode}</Typography.Text>
        </>
      ),
    },
    {
      title: t('portal.catalog.columns.productTemplate'),
      render: (_, row) => (
        <>
          {row.productTypeGroup?.name ?? '-'}
          <br />
          <Typography.Text type="secondary">{row.internalTemplate?.name ?? '-'}</Typography.Text>
        </>
      ),
    },
    {
      title: t('portal.catalog.columns.sales'),
      width: 100,
      render: (_, row) => `${row.salesStats.quantitySold} / ${row.salesStats.orderCount}`,
    },
    {
      title: t('portal.catalog.columns.psd'),
      width: 130,
      render: (_, row) => (
        <StatusTag status={psdTone(row.psdReadiness?.status)}>
          {row.psdReadiness?.status ?? 'MISSING'}
        </StatusTag>
      ),
    },
    {
      title: t('portal.catalog.columns.qc'),
      width: 110,
      render: (_, row) => <StatusTag status={qcTone(row.qcStatus)}>{row.qcStatus}</StatusTag>,
    },
    {
      title: t('portal.catalog.columns.updated'),
      width: 170,
      dataIndex: 'updatedAt',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
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
              <Select
                allowClear
                className={styles.filter}
                placeholder={t('portal.catalog.allPsdStatuses')}
                value={psdReadinessStatus}
                onChange={resetPage(setPsdReadinessStatus)}
                options={['MISSING', 'PRESENT', 'NOT_REQUIRED'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Select
                allowClear
                className={styles.filter}
                placeholder={t('portal.catalog.allProductTypes')}
                value={productTypeGroupId}
                onChange={resetPage(setProductTypeGroupId)}
                options={(options.data?.productTypeGroups ?? []).map(({ id, name }) => ({
                  value: id,
                  label: name,
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
              <Button onClick={() => setEditing(selected)}>{t('portal.catalog.edit')}</Button>
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
                  label: 'Identity',
                  children: `${selected.salesChannelCode} · ${selected.marketplaceCode} · ${selected.sku}`,
                },
                { key: 'shop', label: 'Shop', children: selected.shop?.name ?? selected.shopId },
                {
                  key: 'product',
                  label: 'Product type',
                  children: selected.productTypeGroup?.name ?? '-',
                },
                {
                  key: 'template',
                  label: 'Internal template',
                  children: selected.internalTemplate?.name ?? '-',
                },
                {
                  key: 'psd',
                  label: 'PSD readiness',
                  children: `${selected.psdReadiness?.status ?? 'MISSING'}${selected.psdReadiness?.source ? ` from ${selected.psdReadiness.source}` : ''}`,
                },
                {
                  key: 'sales',
                  label: 'Sales',
                  children: `${selected.salesStats.quantitySold} quantity · ${selected.salesStats.orderCount} orders`,
                },
                { key: 'qc', label: 'QC', children: selected.qcStatus },
                {
                  key: 'rejection',
                  label: 'Rejection reason',
                  children: selected.rejectionReason ?? '-',
                },
                {
                  key: 'updated',
                  label: 'Updated',
                  children: new Date(selected.updatedAt).toLocaleString(),
                },
              ]}
            />
          </div>
        ) : null}
      </DetailDrawer>
      <CatalogListingEditorModal
        open={Boolean(editing)}
        listing={editing === 'create' ? undefined : editing}
        shops={options.data?.shops ?? []}
        productTypes={options.data?.productTypeGroups ?? []}
        templates={options.data?.internalTemplates ?? []}
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
