import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  GlobalOutlined,
  ShopOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Skeleton, Space, Table, Tag, Typography } from 'antd'

import { EmptyState, MetricCard, StatusTag } from '@/shared/ui'

import { getListingSummary, type Listing, listListings } from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'
import styles from './CatalogDashboardPage.module.scss'

const topListingsColumns = [
  {
    title: 'SKU',
    dataIndex: 'sku',
    render: (sku: string, row: Listing) => (
      <div>
        <Typography.Text strong style={{ fontSize: 13 }}>
          {sku}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
          {row.shop?.name}
        </Typography.Text>
      </div>
    ),
  },
  {
    title: 'Channel',
    dataIndex: 'salesChannelCode',
    width: 90,
    render: (code: string) => (
      <StatusTag status={code === 'AMAZON' ? 'processing' : 'ready'}>
        {code === 'AMAZON' ? <GlobalOutlined /> : <ShopOutlined />} {code}
      </StatusTag>
    ),
  },
  {
    title: 'Qty Sold',
    dataIndex: ['salesStats', 'quantitySold'],
    width: 90,
    render: (val: number) => <Typography.Text strong>{val.toLocaleString()}</Typography.Text>,
  },
  {
    title: 'Status',
    dataIndex: 'qcStatus',
    width: 90,
    render: (qc: string) => (
      <StatusTag
        status={qc === 'APPROVED' ? 'approved' : qc === 'REJECTED' ? 'rejected' : 'pending'}
      >
        {qc}
      </StatusTag>
    ),
  },
]

function marketplaceListingUrl(listing: Listing) {
  if (listing.salesChannelCode === 'ETSY' && listing.etsyListingId) {
    return `https://www.etsy.com/listing/${listing.etsyListingId}`
  }
  if (listing.asin) return `https://www.amazon.com/dp/${listing.asin}`
  return null
}

export function CatalogDashboardPage() {
  const summary = useQuery({
    queryKey: catalogKeys.summary({}),
    queryFn: () => getListingSummary({}),
  })

  const topListings = useQuery({
    queryKey: catalogKeys.list({ page: 1, limit: 5, sort: 'quantitySoldDesc' }),
    queryFn: () => listListings({ page: 1, limit: 5, sort: 'quantitySoldDesc' }),
  })

  const draftListings = useQuery({
    queryKey: catalogKeys.list({ page: 1, limit: 8, qcStatus: 'DRAFT' }),
    queryFn: () => listListings({ page: 1, limit: 8, qcStatus: 'DRAFT' }),
  })

  const s = summary.data

  const totalCount = s?.totalListingCount ?? 0
  const approvedCount = s?.approvedCount ?? 0
  const draftCount = s?.draftCount ?? 0
  const rejectedCount = s?.rejectedCount ?? 0
  const noPsdCount = s?.noPsdCount ?? 0
  const approvedPct = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label="Total Listings"
            value={totalCount}
            variant="primary"
            icon={<GlobalOutlined />}
            loading={summary.isLoading}
            status={
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {approvedPct}% approved
              </Typography.Text>
            }
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label="Approved"
            value={approvedCount}
            variant="success"
            icon={<CheckCircleFilled />}
            loading={summary.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label="Pending Draft"
            value={draftCount}
            variant="warning"
            icon={<ClockCircleFilled />}
            loading={summary.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            label="Rejected / No PSD"
            value={`${rejectedCount} / ${noPsdCount}`}
            variant="danger"
            icon={<CloseCircleFilled />}
            loading={summary.isLoading}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Top Listings */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                Top 5 Best-Selling Listings
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <Table
              size="small"
              dataSource={topListings.data?.items ?? []}
              columns={topListingsColumns}
              loading={topListings.isLoading}
              pagination={false}
              rowKey="id"
              onRow={(listing) => ({
                onClick: () => {
                  const url = marketplaceListingUrl(listing)
                  if (url) window.open(url, '_blank', 'noopener,noreferrer')
                },
                style: { cursor: marketplaceListingUrl(listing) ? 'pointer' : undefined },
              })}
            />
          </Card>
        </Col>

        {/* Draft / Pending QC */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <ClockCircleFilled style={{ color: '#faad14' }} />
                Pending QC Review
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
            extra={
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {draftListings.data?.pagination?.total ?? 0} total
              </Typography.Text>
            }
          >
            {draftListings.isLoading ? (
              <Skeleton active />
            ) : !draftListings.data?.items.length ? (
              <EmptyState title="All caught up!" description="No listings pending QC review." />
            ) : (
              <div className={styles.pendingList}>
                {draftListings.data.items.map((l) => (
                  <div className={styles.pendingItem} key={l.id}>
                    <div>
                      <Typography.Text strong className={styles.pendingSku}>
                        {l.sku}
                      </Typography.Text>
                      <Typography.Text type="secondary" className={styles.pendingShop}>
                        {l.shop?.name}
                      </Typography.Text>
                    </div>
                    <Tag
                      icon={l.salesChannelCode === 'AMAZON' ? <GlobalOutlined /> : <ShopOutlined />}
                    >
                      {l.salesChannelCode}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
