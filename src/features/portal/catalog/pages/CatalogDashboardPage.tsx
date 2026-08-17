import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppstoreOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  DatabaseOutlined,
  EyeOutlined,
  FileImageOutlined,
  GlobalOutlined,
  ReloadOutlined,
  ShopOutlined,
  TableOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Progress, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { EmptyState, MetricCard, StatusTag } from '@/shared/ui'

import { getListingOptions, getListingSummary, type Listing, listListings } from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import styles from './CatalogDashboardPage.module.scss'

type QuickFilter = 'all' | 'approved' | 'draft' | 'amazon' | 'etsy'

const CHANNEL_ICON = {
  AMAZON: <GlobalOutlined />,
  ETSY: <ShopOutlined />,
} as Record<string, ReactNode>

const quickFilterParams = {
  all: {},
  approved: { qcStatus: 'APPROVED' },
  draft: { qcStatus: 'DRAFT' },
  amazon: { salesChannelCode: 'AMAZON' },
  etsy: { salesChannelCode: 'ETSY' },
} satisfies Record<QuickFilter, Record<string, string>>

function marketplaceListingUrl(listing: Listing) {
  switch (listing.salesChannelCode) {
    case 'ETSY':
      return listing.etsyListingId ? `https://www.etsy.com/listing/${listing.etsyListingId}` : null
    case 'AMAZON':
      return listing.asin ? `https://www.amazon.com/dp/${listing.asin}` : null
    default:
      return null
  }
}

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

function listingMarketplaceId(listing: Listing) {
  if (listing.salesChannelCode === 'ETSY') return listing.etsyListingId || listing.sku
  if (listing.salesChannelCode === 'AMAZON') return listing.asin || listing.sku
  return listing.asin || listing.etsyListingId || listing.sku
}

export function CatalogDashboardPage({ onOpenListings }: { readonly onOpenListings?: () => void }) {
  const { t } = useTranslation()
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')

  const baseParams = useMemo(() => quickFilterParams[quickFilter], [quickFilter])

  const options = useQuery({
    queryKey: catalogKeys.options(),
    queryFn: getListingOptions,
  })
  const summary = useQuery({
    queryKey: catalogKeys.summary(baseParams),
    queryFn: () => getListingSummary(baseParams),
  })
  const topListings = useQuery({
    queryKey: catalogKeys.list({ ...baseParams, page: 1, limit: 24, sort: 'quantitySoldDesc' }),
    queryFn: () => listListings({ ...baseParams, page: 1, limit: 24, sort: 'quantitySoldDesc' }),
  })
  const draftListings = useQuery({
    queryKey: catalogKeys.list({ ...baseParams, page: 1, limit: 8, qcStatus: 'DRAFT' }),
    queryFn: () => listListings({ ...baseParams, page: 1, limit: 8, qcStatus: 'DRAFT' }),
  })

  const s = summary.data
  const totalCount = s?.totalListingCount ?? 0
  const approvedCount = s?.approvedCount ?? 0
  const draftCount = s?.draftCount ?? 0
  const noPsdCount = s?.noPsdCount ?? 0
  const approvedPct = pct(approvedCount, totalCount)
  const psdReadyCount = Math.max(totalCount - noPsdCount, 0)
  const psdReadyPct = pct(psdReadyCount, totalCount)
  const masterCount =
    (options.data?.productTypeGroups?.length ?? 0) + (options.data?.internalTemplates?.length ?? 0)

  const refresh = () => {
    void Promise.all([
      summary.refetch(),
      topListings.refetch(),
      draftListings.refetch(),
      options.refetch(),
    ])
  }

  const topListingsColumns = useMemo<ColumnsType<Listing>>(
    () => [
      {
        title: t('portal.catalog.overview.preview'),
        width: 70,
        render: (_, row) =>
          row.productImageUrl ? (
            <img
              src={row.productImageUrl}
              alt={row.title}
              className={styles.thumb}
              loading="lazy"
            />
          ) : (
            <div className={styles.thumbFallback}>
              <FileImageOutlined />
            </div>
          ),
      },
      {
        title: t('portal.catalog.overview.marketplaceId'),
        render: (_, row) => {
          const url = marketplaceListingUrl(row)
          return (
            <Space direction="vertical" size={0}>
              <Typography.Text strong className={styles.marketplaceId}>
                {listingMarketplaceId(row)}{' '}
                {url ? <span className={styles.externalArrow}>↗</span> : null}
              </Typography.Text>
              <Typography.Text type="secondary" className={styles.smallText}>
                {row.salesChannelCode === 'ETSY'
                  ? 'Listing ID'
                  : row.salesChannelCode === 'AMAZON'
                    ? 'ASIN'
                    : row.salesChannelCode}
              </Typography.Text>
            </Space>
          )
        },
      },
      {
        title: t('portal.catalog.overview.channel'),
        width: 116,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Tag
              className={styles.channelTag}
              icon={CHANNEL_ICON[row.salesChannelCode] ?? <ShopOutlined />}
            >
              {row.salesChannelCode}
            </Tag>
            <Typography.Text type="secondary" className={styles.smallText}>
              {row.shop?.name ?? row.shopId}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t('portal.catalog.overview.qtySold'),
        width: 96,
        align: 'right',
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{row.salesStats.quantitySold.toLocaleString()}</Typography.Text>
            <Typography.Text type="secondary" className={styles.smallText}>
              {t('portal.catalog.overview.orders', { count: row.salesStats.orderCount ?? 0 })}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t('portal.catalog.overview.status'),
        width: 104,
        render: (_, row) => (
          <StatusTag
            status={
              row.qcStatus === 'APPROVED'
                ? 'approved'
                : row.qcStatus === 'REJECTED'
                  ? 'rejected'
                  : 'pending'
            }
          >
            {row.qcStatus}
          </StatusTag>
        ),
      },
      {
        title: '',
        width: 44,
        render: (_, row) => (
          <Button
            type="text"
            aria-label={t('portal.catalog.view')}
            icon={<EyeOutlined />}
            disabled={!marketplaceListingUrl(row)}
            onClick={() => {
              const url = marketplaceListingUrl(row)
              if (url) window.open(url, '_blank', 'noopener,noreferrer')
            }}
          />
        ),
      },
    ],
    [t],
  )

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <Typography.Title level={3} className={styles.title}>
            {t('portal.catalog.overview.title')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('portal.catalog.overview.description')}
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            {t('portal.catalog.refresh')}
          </Button>
          <Button type="primary" danger icon={<TableOutlined />} onClick={onOpenListings}>
            {t('portal.catalog.overview.goToWorkbench')}
          </Button>
        </Space>
      </div>

      <Card className={styles.filterBar} bordered={false}>
        <Space wrap size={10}>
          <Typography.Text type="secondary" className={styles.quickLabel}>
            {t('portal.catalog.overview.quickFilter')}
          </Typography.Text>
          {(['all', 'approved', 'draft', 'amazon', 'etsy'] as QuickFilter[]).map((key) => (
            <Button
              key={key}
              shape="round"
              type={quickFilter === key ? 'primary' : 'default'}
              icon={
                key === 'amazon' ? (
                  <GlobalOutlined />
                ) : key === 'etsy' ? (
                  <ShopOutlined />
                ) : undefined
              }
              onClick={() => setQuickFilter(key)}
            >
              {t(`portal.catalog.overview.filters.${key}`)}
              {key === 'draft' && draftCount ? (
                <span className={styles.badge}>{draftCount}</span>
              ) : null}
            </Button>
          ))}
        </Space>
      </Card>

      <div className={styles.metrics}>
        <MetricCard
          icon={<GlobalOutlined />}
          label={t('portal.catalog.metrics.total')}
          value={totalCount}
          variant="primary"
          loading={summary.isLoading}
          status={
            <Typography.Text type="secondary">
              {approvedPct}% {t('portal.catalog.approved')}
            </Typography.Text>
          }
        />
        <MetricCard
          icon={<CheckCircleFilled />}
          label={t('portal.catalog.overview.approvedRate')}
          value={`${approvedPct}%`}
          variant="success"
          loading={summary.isLoading}
          status={
            <Typography.Text type="success">
              {approvedCount} / {totalCount}
            </Typography.Text>
          }
        />
        <MetricCard
          icon={<ClockCircleFilled />}
          label={t('portal.catalog.overview.pendingQc')}
          value={draftCount}
          variant="warning"
          loading={summary.isLoading}
          status={
            draftCount ? (
              <Typography.Text type="warning">
                {t('portal.catalog.overview.actionRequired')}
              </Typography.Text>
            ) : null
          }
        />
        <MetricCard
          icon={<FileImageOutlined />}
          label={t('portal.catalog.overview.psdHealth')}
          value={`${psdReadyPct}%`}
          variant={noPsdCount ? 'warning' : 'success'}
          loading={summary.isLoading}
          status={
            <Typography.Text type={noPsdCount ? 'warning' : 'success'}>
              {noPsdCount
                ? `${noPsdCount} ${t('portal.catalog.psd.missing')}`
                : t('portal.catalog.psd.readyTag')}
            </Typography.Text>
          }
        />
        <MetricCard
          icon={<AppstoreOutlined />}
          label={t('portal.catalog.overview.masterData')}
          value={masterCount}
          variant="neutral"
          loading={options.isLoading}
          status={
            <Typography.Text type="secondary">
              {options.data?.internalTemplates?.length ?? 0} {t('portal.catalog.tabs.templates')}
            </Typography.Text>
          }
        />
      </div>

      <div className={styles.insightGrid}>
        <Card className={styles.panel} bordered={false}>
          <PanelTitle
            icon={<GlobalOutlined />}
            title={t('portal.catalog.overview.channelDistribution')}
          />
          <Typography.Text type="secondary">
            {t('portal.catalog.overview.channelDescription')}
          </Typography.Text>
          <div className={styles.channelGrid}>
            {(s?.channelCounts ?? []).map((channel) => (
              <div className={styles.channelCard} key={channel.code}>
                <Space>
                  {CHANNEL_ICON[channel.code] ?? <ShopOutlined />}
                  <Typography.Text strong>{channel.code}</Typography.Text>
                  <Tag color="blue">{pct(channel.count, totalCount)}%</Tag>
                </Space>
                <div className={styles.channelValue}>{channel.count.toLocaleString()}</div>
                <Progress percent={pct(channel.count, totalCount)} showInfo={false} size="small" />
              </div>
            ))}
          </div>
        </Card>

        <Card className={styles.panel} bordered={false}>
          <PanelTitle
            icon={<FileImageOutlined />}
            title={t('portal.catalog.overview.psdPipeline')}
          />
          <Typography.Text type="secondary">
            {t('portal.catalog.overview.psdDescription')}
          </Typography.Text>
          <Progress
            percent={psdReadyPct}
            strokeColor="var(--ant-color-success)"
            showInfo={false}
            className={styles.pipeline}
          />
          <div className={styles.pipelineLegend}>
            <span>
              <span className={styles.readyDot} /> {t('portal.catalog.psd.readyTag')}:{' '}
              {psdReadyCount}
            </span>
            <span>
              <span className={styles.missingDot} /> {t('portal.catalog.psd.missingTag')}:{' '}
              {noPsdCount}
            </span>
            <strong>{psdReadyPct}%</strong>
          </div>
        </Card>

        <Card className={styles.panel} bordered={false}>
          <PanelTitle
            icon={<DatabaseOutlined />}
            title={t('portal.catalog.overview.masterDataSourcing')}
          />
          <Typography.Text type="secondary">
            {t('portal.catalog.master.productTypeDescription')}
          </Typography.Text>
          <div className={styles.masterGrid}>
            <MasterBox
              label={t('portal.catalog.tabs.productTypes')}
              value={options.data?.productTypeGroups?.length ?? 0}
            />
            <MasterBox
              label={t('portal.catalog.tabs.templates')}
              value={options.data?.internalTemplates?.length ?? 0}
            />
          </div>
        </Card>
      </div>

      <div className={styles.workGrid}>
        <Card
          className={styles.panel}
          bordered={false}
          title={
            <PanelTitle
              icon={<TrophyOutlined />}
              title={t('portal.catalog.overview.topListings')}
            />
          }
          extra={
            <Button type="link" onClick={onOpenListings}>
              {t('portal.catalog.overview.viewAll')}
            </Button>
          }
        >
          <Typography.Text type="secondary">
            {t('portal.catalog.overview.topDescription')}
          </Typography.Text>
          <Table
            rowKey="id"
            size="small"
            className={styles.topTable}
            dataSource={topListings.data?.items ?? []}
            columns={topListingsColumns}
            loading={topListings.isLoading}
            pagination={false}
            scroll={{ y: 360 }}
          />
        </Card>

        <Card
          className={styles.panel}
          bordered={false}
          title={
            <PanelTitle icon={<ClockCircleFilled />} title={t('portal.catalog.overview.qcQueue')} />
          }
          extra={
            <Button type="link" onClick={onOpenListings}>
              {t('portal.catalog.overview.viewAll')}
            </Button>
          }
        >
          <Typography.Text type="secondary">
            {t('portal.catalog.overview.qcDescription')}
          </Typography.Text>
          {!draftListings.data?.items.length && !draftListings.isLoading ? (
            <EmptyState
              title={t('portal.catalog.overview.emptyQc')}
              description={t('portal.catalog.overview.emptyQcDescription')}
            />
          ) : (
            <div className={styles.pendingList}>
              {(draftListings.data?.items ?? []).map((listing) => (
                <div className={styles.pendingItem} key={listing.id}>
                  {listing.productImageUrl ? (
                    <img
                      src={listing.productImageUrl}
                      alt={listing.title}
                      className={styles.pendingImage}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.pendingImageFallback}>
                      <FileImageOutlined />
                    </div>
                  )}
                  <div className={styles.pendingBody}>
                    <Space size={6} wrap>
                      <Typography.Text strong>{listingMarketplaceId(listing)}</Typography.Text>
                      <Tag color="blue">{listing.salesChannelCode}</Tag>
                    </Space>
                  </div>
                  <Button size="small" icon={<EyeOutlined />} onClick={onOpenListings} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}

function PanelTitle({ icon, title }: { readonly icon: ReactNode; readonly title: ReactNode }) {
  return (
    <Space size={8}>
      {icon}
      <Typography.Text strong>{title}</Typography.Text>
    </Space>
  )
}

function MasterBox({ label, value }: { readonly label: ReactNode; readonly value: number }) {
  return (
    <div className={styles.masterBox}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Title level={3}>{value}</Typography.Title>
    </div>
  )
}
