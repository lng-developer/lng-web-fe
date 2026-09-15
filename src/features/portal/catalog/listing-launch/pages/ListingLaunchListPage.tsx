import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useRouteLoaderData } from 'react-router-dom'
import { Card, Select, Space, Typography } from 'antd'
import { CoreDataTable } from '@/app/common/CoreDataTable'
import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { FeedbackAlert } from '@/shared/ui'
import LaunchDraftForm from '../components/LaunchDraftForm'
import { useLaunches, useLaunchOptions } from '../hooks/useListingLaunchQueries'
import styles from './ListingLaunchDetailPage.module.scss'
export default function ListingLaunchListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const account = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const [page, setPage] = useState(1)
  const [shopId, setShopId] = useState<string>()
  const [state, setState] = useState<string>()
  const query = useLaunches({ page, limit: 20, shopId, state })
  const options = useLaunchOptions()
  return (
    <div className={styles.page}>
      <Typography.Title level={3}>{t('listingLaunch.title')}</Typography.Title>
      <FeedbackAlert type="info" title={t('listingLaunch.candidateNotice')} />
      <Card title={t('listingLaunch.create')}>
        <LaunchDraftForm
          account={account}
          onSaved={(launch) => navigate(workspaceRouteLinks.listingLaunchDetail(launch.id))}
        />
      </Card>
      <Space wrap>
        <Select
          allowClear
          aria-label={t('listingLaunch.shop')}
          placeholder={t('listingLaunch.shop')}
          value={shopId}
          onChange={(id) => {
            setShopId(id)
            setPage(1)
          }}
          options={options.data?.shops.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          allowClear
          aria-label={t('listingLaunch.state')}
          placeholder={t('listingLaunch.state')}
          value={state}
          onChange={(value) => {
            setState(value)
            setPage(1)
          }}
          options={['BRIEF', 'PRODUCT_SELECTED'].map((value) => ({
            value,
            label: t(`listingLaunch.${value}`),
          }))}
        />
      </Space>
      <CoreDataTable
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.items || []}
        error={
          query.error ? (
            <FeedbackAlert
              type="error"
              title={t('listingLaunch.error')}
              description={query.error.message}
            />
          ) : undefined
        }
        columns={[
          {
            title: t('listingLaunch.brief'),
            dataIndex: 'brief',
            render: (_, launch) => (
              <Link to={workspaceRouteLinks.listingLaunchDetail(launch.id)}>
                {launch.workingTitle || launch.brief}
              </Link>
            ),
          },
          {
            title: t('listingLaunch.state'),
            dataIndex: 'state',
            render: (value) => t(`listingLaunch.${value}`),
          },
        ]}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total || 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />
    </div>
  )
}
