import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteLoaderData } from 'react-router-dom'
import { CheckOutlined, ReloadOutlined, ShopOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Input, Modal, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  CopyableSku,
  DataFreshness,
  FilterBar,
  MetricCard,
  SearchInput,
  SectionCard,
  StatusTag,
  TableTextCell,
  useFeedbackToast,
} from '@/shared/ui'

import { type CustomizationRow, type CustomizationStatus } from '../api/customizationApi'
import {
  useCustomizationActionMutation,
  useCustomizationsQuery,
  useCustomizationSummaryQuery,
} from '../hooks'
import styles from './CustomizationReviewPage.module.scss'

const PAGE_SIZE = DEFAULT_PAGE_SIZE

export const CustomizationReviewPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const permissions = [
    ...account.permissions,
    ...account.scopes.flatMap((scope) => scope.permissions),
  ]
  const canWrite = permissions.includes('ORDERS:WRITE')
  const toast = useFeedbackToast()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<CustomizationStatus>()
  const [selected, setSelected] = useState<CustomizationRow>()
  const [failureReason, setFailureReason] = useState('')

  const params = useMemo(
    () => ({ page, limit: PAGE_SIZE, q: q || undefined, status, blockedOnly: true }),
    [page, q, status],
  )
  const queue = useCustomizationsQuery(params)
  const summary = useCustomizationSummaryQuery()
  const action = useCustomizationActionMutation()

  const handleAction = useCallback(
    (kind: 'retry' | 'confirm' | 'fail', row: CustomizationRow) => {
      action.mutate(
        { kind, row, failureReason },
        {
          onSuccess: () => {
            toast('success', t('customization.feedback.updated'))
            setSelected(undefined)
            setFailureReason('')
          },
          onError: (error) =>
            toast(
              'error',
              t('customization.feedback.failed'),
              error instanceof Error ? error.message : undefined,
            ),
        },
      )
    },
    [action, failureReason, t, toast],
  )

  const tone = useCallback(
    (value: CustomizationStatus) =>
      value === 'FAILED'
        ? 'critical'
        : value === 'NEEDS_REVIEW'
          ? 'warning'
          : value === 'PARSED'
            ? 'approved'
            : 'pending',
    [],
  )
  const columns = useMemo<TableColumnsType<CustomizationRow>>(
    () => [
      {
        title: t('customization.columns.order'),
        width: 184,
        render: (_, row) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}
          >
            <CopyableOrderId strong value={row.order.externalOrderId} />
            {row.item.sku ? (
              <CopyableSku value={row.item.sku} />
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            )}
          </div>
        ),
      },
      {
        title: t('customization.columns.customer'),
        width: 168,
        render: (_, row) => <TableTextCell value={row.customer.name || row.customer.email} />,
      },
      {
        title: t('customization.columns.shop'),
        width: 148,
        render: (_, row) => <TableTextCell value={row.shop.name} />,
      },
      {
        title: t('customization.columns.status'),
        width: 132,
        render: (_, row) => (
          <StatusTag status={tone(row.status)}>
            {t(`customization.statuses.${row.status}`)}
          </StatusTag>
        ),
      },
      {
        title: t('customization.columns.issue'),
        width: 240,
        render: (_, row) => (
          <TableTextCell
            value={row.errorMessage || row.errorCode}
            expandable={Boolean(row.errorMessage && row.errorMessage.length > 36)}
          />
        ),
      },
      {
        title: t('customization.columns.assets'),
        width: 88,
        render: (_, row) => `${row.assets.extracted}/${row.assets.total}`,
      },
      {
        title: '',
        width: 90,
        render: (_, row) => (
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              setSelected(row)
            }}
          >
            {t('customization.actions.review')}
          </Button>
        ),
      },
    ],
    [t, tone],
  )

  return (
    <section className={styles.page}>
      <div className={styles.metrics}>
        <MetricCard
          label={t('customization.summary.pending')}
          value={String(summary.data?.pending ?? '—')}
        />
        <MetricCard
          label={t('customization.summary.review')}
          value={String(summary.data?.needsReview ?? '—')}
          status={t('customization.summary.status.warning')}
        />
        <MetricCard
          label={t('customization.summary.failed')}
          value={String(summary.data?.failed ?? '—')}
          status={t('customization.summary.status.critical')}
        />
      </div>
      <SectionCard
        title={t('customization.queue')}
        extra={
          <DataFreshness
            timestamp={queue.dataUpdatedAt}
            onRefresh={() => void queue.refetch()}
            loading={queue.isFetching}
          />
        }
      >
        <FilterBar label={t('customization.filters.label')} contentClassName={styles.filters}>
          <SearchInput
            value={q}
            onSearchChange={(value) => {
              setQ(value)
              setPage(1)
            }}
            placeholder={t('customization.filters.search')}
          />
          <Select
            allowClear
            value={status}
            onChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            placeholder={t('customization.filters.status')}
            options={['PENDING', 'NEEDS_REVIEW', 'FAILED', 'PARSED'].map((value) => ({
              value,
              label: t(`customization.statuses.${value}`),
            }))}
          />
        </FilterBar>
        <CoreDataTable
          fillViewport
          tableLayout="fixed"
          scroll={{ x: 1_040 }}
          rowKey="id"
          columns={columns}
          dataSource={queue.data?.items}
          loading={queue.isLoading}
          error={
            queue.error ? (
              <Typography.Text type="danger">{queue.error.message}</Typography.Text>
            ) : undefined
          }
          onRow={(row) => ({ onClick: () => setSelected(row) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: queue.data?.pagination.total,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </SectionCard>
      <Modal
        width={920}
        open={Boolean(selected)}
        title={t('customization.modal.title')}
        onCancel={() => setSelected(undefined)}
        footer={null}
        destroyOnHidden
      >
        {selected ? (
          <Space direction="vertical" size="large" className={styles.modalBody}>
            <Descriptions
              bordered
              size="small"
              column={2}
              items={[
                {
                  key: 'order',
                  label: t('customization.columns.order'),
                  children: <CopyableOrderId value={selected.order.externalOrderId} />,
                },
                {
                  key: 'sku',
                  label: 'SKU',
                  children: selected.item.sku ? <CopyableSku value={selected.item.sku} /> : '—',
                },
                {
                  key: 'customer',
                  label: t('customization.columns.customer'),
                  children: (
                    <TableTextCell value={selected.customer.name || selected.customer.email} />
                  ),
                },
                {
                  key: 'shop',
                  label: t('customization.columns.shop'),
                  children: <TableTextCell value={selected.shop.name} />,
                },
                {
                  key: 'status',
                  label: t('customization.columns.status'),
                  children: (
                    <StatusTag status={tone(selected.status)}>
                      {t(`customization.statuses.${selected.status}`)}
                    </StatusTag>
                  ),
                },
                {
                  key: 'issue',
                  label: t('customization.columns.issue'),
                  children: (
                    <TableTextCell value={selected.errorMessage || selected.errorCode} expandable />
                  ),
                },
              ]}
            />
            <div>
              <Typography.Title level={5}>{t('customization.modal.inputs')}</Typography.Title>
              {[...(selected.inputs?.texts || []), ...(selected.inputs?.options || [])].map(
                (input, index) => (
                  <div key={`${input.label}-${index}`}>
                    <Typography.Text type="secondary">{input.label || 'Input'}: </Typography.Text>
                    {input.value || '—'}
                  </div>
                ),
              )}
            </div>
            <Typography.Text>
              {t('customization.modal.assets', {
                extracted: selected.assets.extracted,
                total: selected.assets.total,
                failed: selected.assets.failed,
              })}
            </Typography.Text>
            {canWrite ? (
              <Space wrap>
                <Button
                  icon={<ReloadOutlined />}
                  loading={action.isPending}
                  onClick={() => handleAction('retry', selected)}
                >
                  {t('customization.actions.retry')}
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={action.isPending}
                  onClick={() => handleAction('confirm', selected)}
                >
                  {t('customization.actions.confirm')}
                </Button>
                <Input
                  value={failureReason}
                  onChange={(event) => setFailureReason(event.target.value)}
                  placeholder={t('customization.actions.reason')}
                  className={styles.reason}
                />
                <Button
                  danger
                  disabled={!failureReason.trim()}
                  loading={action.isPending}
                  onClick={() => handleAction('fail', selected)}
                >
                  {t('customization.actions.fail')}
                </Button>
              </Space>
            ) : null}
            <Button
              icon={<ShopOutlined />}
              onClick={() =>
                navigate(
                  `/portal/orders?q=${encodeURIComponent(selected.order.externalOrderId || selected.item.sku || '')}`,
                )
              }
            >
              {t('customization.actions.openOrder')}
            </Button>
          </Space>
        ) : null}
      </Modal>
    </section>
  )
}
