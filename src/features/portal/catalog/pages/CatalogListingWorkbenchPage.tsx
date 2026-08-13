import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AppstoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileImageOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  CopyableText,
  FeedbackAlert,
  MetricCard,
  PageHeader,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

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
import { CatalogListingEditorModal } from './CatalogListingEditorModal'
import styles from './CatalogListingWorkbenchPage.module.scss'
import { ListingVariantManager } from './ListingVariantManager'

dayjs.extend(relativeTime)

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
  const [editing, setEditing] = useState<Listing | 'create'>()
  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly string[]>([])

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
    onSuccess: async () => {
      setEditing(undefined)
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

  const psdSummary = (listing: Listing) => {
    const total = listing.psdVariantCount ?? listing.variantCount ?? 0
    const ready = listing.psdReadyCount ?? (listing.psdStatus === 'PRESENT' ? total : 0)
    const label = total ? `${ready} / ${total}` : '-'
    const state = !total
      ? 'Not configured'
      : ready === total
        ? 'Ready'
        : ready > 0
          ? 'Partial'
          : 'Missing'
    return { label, state }
  }

  const metricPercent = (value = 0) => {
    const total = summary.data?.totalListingCount ?? 0
    return total ? `${Math.round((value / total) * 1000) / 10}%` : '0%'
  }

  const columns: TableColumnsType<Listing> = [
    {
      title: 'Image',
      width: 76,
      render: (_, listing) =>
        listing.productImageUrl ? (
          <img src={listing.productImageUrl} alt={listing.title} className={styles.thumbnail} />
        ) : (
          <div className={styles.thumbnailFallback}>-</div>
        ),
    },
    {
      title: 'Listing',
      width: 240,
      render: (_, listing) => (
        <Space direction="vertical" size={2} className={styles.titleCell}>
          <CopyableText
            value={listing.sku}
            strong
            className={styles.skuButton}
            title="Copy SKU"
            copiedMessage="SKU copied"
          />
          <Typography.Text type="secondary">
            {listing.asin ? 'ASIN ' : listing.etsyListingId ? 'Etsy ' : ''}
            <CopyableText
              value={listing.asin ?? listing.etsyListingId}
              title={listing.asin ? 'Copy ASIN' : 'Copy listing ID'}
              copiedMessage={listing.asin ? 'ASIN copied' : 'Listing ID copied'}
            />
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Channel',
      width: 118,
      render: (_, listing) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{listing.salesChannelCode}</Typography.Text>
          <Typography.Text type="secondary">{listing.marketplaceCode}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Shop', width: 150, render: (_, listing) => listing.shop?.name ?? listing.shopId },
    {
      title: 'Variants',
      width: 92,
      align: 'center',
      render: (_, listing) => <Typography.Text strong>{listing.variantCount ?? 0}</Typography.Text>,
    },
    {
      title: 'PSD',
      width: 120,
      render: (_, listing) => {
        const summary = psdSummary(listing)
        const dotClass =
          summary.state === 'Ready'
            ? styles.dotReady
            : summary.state === 'Missing'
              ? styles.dotMissing
              : styles.dotPartial
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{summary.label}</Typography.Text>
            <span className={styles.psdState}>
              <span className={`${styles.psdDot} ${dotClass}`} />
              {summary.state}
            </span>
          </Space>
        )
      },
    },
    {
      title: 'QC',
      width: 112,
      render: (_, listing) => (
        <StatusTag
          status={
            listing.qcStatus === 'APPROVED'
              ? 'operational'
              : listing.qcStatus === 'REJECTED'
                ? 'critical'
                : 'pending'
          }
        >
          {listing.qcStatus}
        </StatusTag>
      ),
    },
    {
      title: 'Sales',
      width: 116,
      render: (_, listing) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{listing.salesStats.quantitySold} sold</Typography.Text>
          <Typography.Text type="secondary">{listing.salesStats.orderCount} orders</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      width: 96,
      render: (_, listing) => (
        <Tag color={listing.status === 'ACTIVE' ? 'green' : 'default'}>{listing.status}</Tag>
      ),
    },
    {
      title: 'Updated',
      width: 150,
      render: (_, listing) => (
        <Tooltip title={dayjs(listing.updatedAt).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(listing.updatedAt).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      width: 88,
      fixed: 'right',
      render: (_, listing) =>
        canWrite(listing) ? (
          <Tooltip title="Edit listing">
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Edit listing"
              onClick={() => void openEdit(listing)}
            />
          </Tooltip>
        ) : null,
    },
  ]

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

      <div className={styles.metrics}>
        <MetricCard
          icon={<AppstoreOutlined />}
          label="Total listings"
          value={summary.data?.totalListingCount ?? 0}
          variant="primary"
          status={<span className={styles.metricPercent}>100%</span>}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          label="Approved"
          value={summary.data?.approvedCount ?? 0}
          variant="success"
          status={
            <span className={styles.metricPercentSuccess}>
              {metricPercent(summary.data?.approvedCount ?? 0)}
            </span>
          }
        />
        <MetricCard
          icon={<FileTextOutlined />}
          label="Draft"
          value={summary.data?.draftCount ?? 0}
          variant="warning"
          status={
            <span className={styles.metricPercentWarning}>
              {metricPercent(summary.data?.draftCount ?? 0)}
            </span>
          }
        />
        <MetricCard
          icon={<FileImageOutlined />}
          label="PSD missing"
          value={summary.data?.noPsdCount ?? 0}
          variant="danger"
          status={
            <span className={styles.metricPercentDanger}>
              {metricPercent(summary.data?.noPsdCount ?? 0)}
            </span>
          }
        />
        <MetricCard
          icon={<StopOutlined />}
          label="Rejected"
          value={summary.data?.rejectedCount ?? 0}
          variant="danger"
          status={
            <span className={styles.metricPercentDanger}>
              {metricPercent(summary.data?.rejectedCount ?? 0)}
            </span>
          }
        />
      </div>

      <div className={styles.filterRow}>
        <Input.Search
          allowClear
          placeholder={t('portal.catalog.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => setPage(1)}
          className={styles.search}
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('portal.catalog.allShops')}
          value={shopId}
          onChange={resetPage(setShopId)}
          options={(options.data?.shops ?? []).map(({ id, name }) => ({ value: id, label: name }))}
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('portal.catalog.allChannels')}
          value={salesChannelCode}
          onChange={resetPage(setSalesChannelCode)}
          options={['AMAZON', 'ETSY'].map((v) => ({ value: v, label: v }))}
        />
        <Select
          allowClear
          className={styles.filter}
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

      <div className={styles.tableShell}>
        <div className={styles.tableHeader}>
          <div>
            <Typography.Title level={4} className={styles.tableTitle}>
              Listing table
            </Typography.Title>
            <Typography.Text type="secondary">
              Expand a listing to manage its product variants, PSD, preview, and scale setup.
            </Typography.Text>
          </div>
          <Tag color="blue">{listings.data?.pagination.total ?? 0} results</Tag>
        </div>
        <Table<Listing>
          rowKey="id"
          size="middle"
          loading={listings.isLoading}
          columns={columns}
          dataSource={listings.data?.items ?? []}
          scroll={{ x: 1500 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: listings.data?.pagination.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `${total} listings`,
            onChange: setPage,
          }}
          expandable={{
            expandIcon: ({ expanded, onExpand, record }) => (
              <Button
                type="text"
                size="small"
                className={styles.expandButton}
                icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                aria-label={expanded ? 'Collapse variants' : 'Expand variants'}
                onClick={(event) => onExpand(record, event)}
              />
            ),
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            expandedRowRender: (listing) => (
              <div className={styles.expandedVariants}>
                <ListingVariantManager
                  listing={listing}
                  productTypes={options.data?.productTypeGroups ?? []}
                  templates={options.data?.internalTemplates ?? []}
                  canWrite={canWrite(listing)}
                />
              </div>
            ),
          }}
        />
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
