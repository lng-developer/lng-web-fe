import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  AppstoreOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  FileImageOutlined,
  FileTextOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Space, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableText,
  FeedbackAlert,
  MetricCard,
  PageHeader,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import { getListing, type Listing } from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import { useCatalogListingsQuery, useCatalogMutations } from '../hooks'
import { CatalogListingEditorModal } from './CatalogListingEditorModal'
import styles from './CatalogListingWorkbenchPage.module.scss'
import { ListingVariantManager } from './ListingVariantManager'

dayjs.extend(relativeTime)

const QC_STATUS_I18N_KEY: Record<string, string> = {
  DRAFT: 'portal.catalog.qc.statuses.DRAFT',
  APPROVED: 'portal.catalog.qc.statuses.APPROVED',
  REJECTED: 'portal.catalog.qc.statuses.REJECTED',
}
const RECORD_STATUS_I18N_KEY: Record<string, string> = {
  ACTIVE: 'portal.catalog.master.statuses.ACTIVE',
  INACTIVE: 'portal.catalog.master.statuses.INACTIVE',
}

function marketplaceProductUrl(listing: Listing) {
  if (listing.salesChannelCode === 'ETSY' && listing.etsyListingId) {
    return `https://www.etsy.com/listing/${listing.etsyListingId}`
  }
  if (listing.asin) return `https://www.amazon.com/dp/${listing.asin}`
  return null
}

export function CatalogListingWorkbenchPage({
  account: accountProp,
  fixedSalesChannelCode,
  hideCatalogHeader = false,
}: {
  readonly account?: CurrentAccount
  readonly fixedSalesChannelCode?: string
  readonly hideCatalogHeader?: boolean
}) {
  const loadedAccount = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const { t } = useTranslation()
  const account = accountProp ?? loadedAccount
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [shopId, setShopId] = useState<string>()
  const [salesChannelCode, setSalesChannelCode] = useState<string>()
  const [qcStatus, setQcStatus] = useState<string>()
  const [psdState, setPsdState] = useState<'missing' | 'ready'>()
  const [sort, setSort] = useState<string>()
  const [editing, setEditing] = useState<Listing | 'create'>()
  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly string[]>([])

  const effectiveSalesChannelCode = fixedSalesChannelCode ?? salesChannelCode

  const { params, options, listings, summary } = useCatalogListingsQuery({
    page,
    pageSize,
    search,
    shopId,
    salesChannelCode: effectiveSalesChannelCode,
    qcStatus,
    psdState,
    sort,
  })

  const { save, requestDefaultPsd, exportCsv } = useCatalogMutations({
    params,
    editing,
    onSaveSuccess: () => setEditing(undefined),
  })

  const canWrite = useCallback(
    (listing?: Listing) => {
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
    },
    [account?.permissions, account?.scopes],
  )

  const openEdit = useCallback(
    async (listing: Listing) => {
      setEditing(listing)
      try {
        const latest = await queryClient.fetchQuery({
          queryKey: catalogKeys.detail(listing.id),
          queryFn: () => getListing(listing.id),
        })
        setEditing(latest)
      } catch {
        toast('error', t('portal.catalog.loadFailed'))
      }
    },
    [queryClient, t, toast],
  )

  const resetPage =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v)
      setPage(1)
    }

  const psdSummary = useCallback(
    (listing: Listing) => {
      if (listing.defaultPsdTemplateAssetId) {
        return {
          label: t('portal.catalog.psd.default'),
          stateKey: 'ready',
          detail: listing.variantCount
            ? t('portal.catalog.psd.variantsCovered', { count: listing.variantCount })
            : t('portal.catalog.psd.listingTemplate'),
        }
      }
      const total = listing.psdVariantCount ?? listing.variantCount ?? 0
      const ready = listing.psdReadyCount ?? 0
      const label = total ? `${ready} / ${total}` : '-'
      const stateKey = !total
        ? 'notConfigured'
        : ready === total
          ? 'ready'
          : ready > 0
            ? 'partial'
            : 'missing'
      return {
        label,
        stateKey,
        detail: total ? t('portal.catalog.psd.variant') : t('portal.catalog.psd.noVariant'),
      }
    },
    [t],
  )

  const metricPercent = (value = 0) => {
    const total = summary.data?.totalListingCount ?? 0
    return total ? `${Math.round((value / total) * 1000) / 10}%` : '0%'
  }

  const columns: TableColumnsType<Listing> = useMemo(
    () => [
      {
        title: t('portal.catalog.columns.preview'),
        width: 76,
        render: (_, listing) =>
          listing.productImageUrl ? (
            <img src={listing.productImageUrl} alt={listing.title} className={styles.thumbnail} />
          ) : (
            <div className={styles.thumbnailFallback}>-</div>
          ),
      },
      {
        title: t('portal.catalog.columns.listing'),
        width: 220,
        render: (_, listing) => (
          <Space direction="vertical" size={2} className={styles.titleCell}>
            <CopyableText
              value={listing.sku}
              strong
              className={styles.skuButton}
              title={t('portal.catalog.copySku')}
              copiedMessage={t('portal.catalog.skuCopied')}
            />
            <Space size={4} className={styles.marketplaceIdentity}>
              <Typography.Text type="secondary">
                {listing.asin ? 'ASIN ' : listing.etsyListingId ? 'Etsy ' : ''}
                <CopyableText
                  value={listing.asin ?? listing.etsyListingId}
                  title={
                    listing.asin ? t('portal.catalog.copyAsin') : t('portal.catalog.copyListingId')
                  }
                  copiedMessage={
                    listing.asin
                      ? t('portal.catalog.asinCopied')
                      : t('portal.catalog.listingIdCopied')
                  }
                />
              </Typography.Text>
              {marketplaceProductUrl(listing) ? (
                <Tooltip
                  title={
                    listing.asin
                      ? t('portal.catalog.openAmazonProduct')
                      : t('portal.catalog.openEtsyListing')
                  }
                >
                  <Button
                    type="text"
                    size="small"
                    className={styles.marketplaceLink}
                    icon={<ExportOutlined />}
                    href={marketplaceProductUrl(listing) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                  />
                </Tooltip>
              ) : null}
            </Space>
          </Space>
        ),
      },
      {
        title: t('portal.catalog.fields.salesChannel'),
        width: 110,
        render: (_, listing) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{listing.salesChannelCode}</Typography.Text>
            <Typography.Text type="secondary">{listing.marketplaceCode}</Typography.Text>
          </Space>
        ),
      },
      {
        title: t('portal.catalog.fields.shop'),
        width: 140,
        ellipsis: true,
        render: (_, listing) => listing.shop?.name ?? listing.shopId,
      },
      {
        title: t('portal.catalog.variants.shortTitle'),
        width: 80,
        align: 'center',
        render: (_, listing) => (
          <Typography.Text strong>{listing.variantCount ?? 0}</Typography.Text>
        ),
      },
      {
        title: t('portal.catalog.columns.psd'),
        width: 140,
        render: (_, listing) => {
          const summary = psdSummary(listing)
          const dotClass =
            summary.stateKey === 'ready'
              ? styles.dotReady
              : summary.stateKey === 'missing'
                ? styles.dotMissing
                : styles.dotPartial
          return (
            <Space direction="vertical" size={0} className={styles.psdCell}>
              <Typography.Text strong>{summary.label}</Typography.Text>
              <span className={styles.psdState}>
                <span className={`${styles.psdDot} ${dotClass}`} />
                {t(`portal.catalog.psdStates.${summary.stateKey}`)}
              </span>
              <Typography.Text type="secondary" className={styles.psdSource}>
                {summary.detail}
              </Typography.Text>
            </Space>
          )
        },
      },
      {
        title: t('portal.catalog.columns.qc'),
        align: 'center',
        width: 150,
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
            {t(QC_STATUS_I18N_KEY[listing.qcStatus] ?? '', {
              defaultValue: listing.qcStatus,
            })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.catalog.columns.sales'),
        key: 'sales',
        width: 100,
        align: 'right',
        render: (_, listing) => (
          <Space direction="vertical" size={0} style={{ textAlign: 'right', width: '100%' }}>
            <Typography.Text>
              {t('portal.catalog.sales.soldCount', { count: listing.salesStats.quantitySold })}
            </Typography.Text>
            <Typography.Text type="secondary">
              {t('portal.catalog.sales.orderCount', { count: listing.salesStats.orderCount })}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t('portal.catalog.master.status'),
        align: 'center',
        width: 100,
        render: (_, listing) => (
          <StatusTag status={listing.status === 'ACTIVE' ? 'operational' : 'draft'}>
            {t(RECORD_STATUS_I18N_KEY[listing.status] ?? '', {
              defaultValue: listing.status,
            })}
          </StatusTag>
        ),
      },
      {
        title: t('portal.catalog.columns.updated'),
        width: 110,
        render: (_, listing) => (
          <Tooltip title={dayjs(listing.updatedAt).format('DD/MM/YYYY HH:mm:ss')}>
            {dayjs(listing.updatedAt).fromNow()}
          </Tooltip>
        ),
      },
      {
        title: t('portal.catalog.actions'),
        width: 100,
        fixed: 'right',
        render: (_, listing) =>
          canWrite(listing) ? (
            <Space size={2}>
              {!listing.defaultPsdTemplateAssetId ? (
                <Tooltip title={t('portal.catalog.psd.requestDefault')}>
                  <Button
                    type="text"
                    icon={<FileImageOutlined />}
                    aria-label={t('portal.catalog.psd.requestDefault')}
                    loading={
                      requestDefaultPsd.isPending && requestDefaultPsd.variables === listing.id
                    }
                    onClick={() => requestDefaultPsd.mutate(listing.id)}
                  />
                </Tooltip>
              ) : null}
              <Tooltip title={t('portal.catalog.edit')}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  aria-label={t('portal.catalog.edit')}
                  onClick={() => openEdit(listing)}
                />
              </Tooltip>
            </Space>
          ) : null,
      },
    ],
    [canWrite, openEdit, psdSummary, requestDefaultPsd, t],
  )

  const renderExpandedRow = useCallback(
    (listing: Listing) => (
      <div className={styles.expandedVariants}>
        <ListingVariantManager
          listing={listing}
          productTypes={options.data?.productTypeGroups ?? []}
          templates={options.data?.internalTemplates ?? []}
          canWrite={canWrite(listing)}
        />
      </div>
    ),
    [canWrite, options.data?.internalTemplates, options.data?.productTypeGroups],
  )

  return (
    <section className={styles.page}>
      {!hideCatalogHeader ? (
        <PageHeader
          title={t('portal.catalog.title')}
          description={t('portal.catalog.description')}
        />
      ) : null}
      {listings.error || summary.error ? (
        <FeedbackAlert type="error" title={t('portal.catalog.unavailable')} />
      ) : null}

      <div className={styles.metrics}>
        <MetricCard
          icon={<AppstoreOutlined />}
          label={t('portal.catalog.metrics.totalListings')}
          value={summary.data?.totalListingCount ?? 0}
          variant="primary"
          status={<span className={styles.metricPercent}>100%</span>}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          label={t('portal.catalog.metrics.approved')}
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
          label={t('portal.catalog.metrics.draft')}
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
          label={t('portal.catalog.metrics.psdMissing')}
          value={summary.data?.noPsdCount ?? 0}
          variant="danger"
          onClick={() => {
            setPsdState('missing')
            setPage(1)
          }}
          status={
            <span className={styles.metricPercentDanger}>
              {metricPercent(summary.data?.noPsdCount ?? 0)}
            </span>
          }
        />
        <MetricCard
          icon={<StopOutlined />}
          label={t('portal.catalog.metrics.rejected')}
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
          className={styles.channelFilter}
          placeholder={t('portal.catalog.allChannels')}
          value={effectiveSalesChannelCode}
          disabled={Boolean(fixedSalesChannelCode)}
          onChange={resetPage(setSalesChannelCode)}
          options={(options.data?.salesChannels ?? []).map(({ code, name }) => ({
            value: code,
            label: name || code,
          }))}
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('portal.catalog.allQcStatuses')}
          value={qcStatus}
          onChange={resetPage(setQcStatus)}
          options={[
            { value: 'DRAFT', label: t('portal.catalog.metrics.draft') },
            { value: 'APPROVED', label: t('portal.catalog.metrics.approved') },
            { value: 'REJECTED', label: t('portal.catalog.metrics.rejected') },
          ]}
        />
        <Select
          allowClear
          className={styles.filter}
          placeholder={t('portal.catalog.allPsdStatuses')}
          value={psdState}
          onChange={resetPage(setPsdState)}
          options={[
            { value: 'missing', label: t('portal.catalog.psd.missingTag') },
            { value: 'ready', label: t('portal.catalog.psd.readyTag') },
          ]}
        />
        <Space className={styles.filterActions}>
          <Button
            icon={<DownloadOutlined />}
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            {t('portal.catalog.exportCsv')}
          </Button>
          {canWrite() ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('create')}>
              {t('portal.catalog.create')}
            </Button>
          ) : null}
        </Space>
      </div>

      <div className={styles.tableShell}>
        <div className={styles.tableHeader}>
          <div>
            <Typography.Title level={4} className={styles.tableTitle}>
              {t('portal.catalog.tableTitle')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('portal.catalog.tableDescription')}
            </Typography.Text>
          </div>
          <Tag color="blue">
            {t('portal.catalog.results', { count: listings.data?.pagination.total ?? 0 })}
          </Tag>
        </div>
        <CoreDataTable
          tableLayout="fixed"
          rowKey="id"
          size="middle"
          loading={listings.isLoading}
          columns={columns}
          serverSorting={{
            enabled: true,
            value: sort,
            columns: { sales: { asc: 'quantitySoldAsc', desc: 'quantitySoldDesc' } },
            onChange: (nextSort) => {
              setSort(nextSort)
              setPage(1)
            },
          }}
          dataSource={listings.data?.items ?? []}
          scroll={{ x: 1200, y: 'max(280px, calc(100vh - 500px))' }}
          pagination={{
            current: page,
            pageSize,
            total: listings.data?.pagination.total ?? listings.data?.items.length ?? 0,
            hideOnSinglePage: false,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1)
              setPageSize(nextPageSize)
            },
          }}
          expandable={{
            expandIcon: ({ expanded, onExpand, record }) => (
              <Button
                type="text"
                size="small"
                className={styles.expandButton}
                icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                aria-label={
                  expanded
                    ? t('portal.catalog.variants.collapse')
                    : t('portal.catalog.variants.expand')
                }
                onClick={(event) => onExpand(record, event)}
              />
            ),
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            expandedRowRender: renderExpandedRow,
          }}
        />
      </div>

      <CatalogListingEditorModal
        open={Boolean(editing)}
        listing={editing === 'create' ? undefined : editing}
        shops={options.data?.shops ?? []}
        salesChannels={options.data?.salesChannels ?? []}
        saving={save.isPending}
        onClose={() => setEditing(undefined)}
        onSubmit={(input) => save.mutate(input)}
      />
    </section>
  )
}
