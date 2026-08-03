import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteLoaderData } from 'react-router-dom'
import { CheckOutlined, ReloadOutlined, ShopOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Input, Modal, Select, Space, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  DataTable,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  confirmCustomization,
  type CustomizationRow,
  type CustomizationStatus,
  failCustomization,
  getCustomizationSummary,
  listCustomizations,
  retryCustomization,
} from '../api/customizationApi'
import styles from './CustomizationReviewPage.module.scss'

const PAGE_SIZE = 20
const keys = {
  all: ['customizations'] as const,
  list: (params: object) => ['customizations', 'list', params] as const,
  summary: ['customizations', 'summary'] as const,
}

export function CustomizationReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const permissions = [
    ...account.permissions,
    ...account.scopes.flatMap((scope) => scope.permissions),
  ]
  const canWrite = permissions.includes('ORDERS:WRITE')
  const toast = useFeedbackToast()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<CustomizationStatus>()
  const [selected, setSelected] = useState<CustomizationRow>()
  const [failureReason, setFailureReason] = useState('')
  const params = { page, limit: PAGE_SIZE, q: q || undefined, status, blockedOnly: true }
  const queue = useQuery({
    queryKey: keys.list(params),
    queryFn: () => listCustomizations(params),
    retry: false,
  })
  const summary = useQuery({
    queryKey: keys.summary,
    queryFn: () => getCustomizationSummary({ blockedOnly: true }),
    retry: false,
  })
  const action = useMutation({
    mutationFn: async ({
      kind,
      row,
    }: {
      kind: 'retry' | 'confirm' | 'fail'
      row: CustomizationRow
    }) => {
      if (kind === 'retry') return retryCustomization(row.id)
      if (kind === 'confirm') return confirmCustomization(row.id)
      return failCustomization(row.id, failureReason.trim())
    },
    onSuccess: async () => {
      toast('success', t('customization.feedback.updated'))
      setSelected(undefined)
      setFailureReason('')
      await client.invalidateQueries({ queryKey: keys.all })
    },
    onError: (error) =>
      toast(
        'error',
        t('customization.feedback.failed'),
        error instanceof Error ? error.message : undefined,
      ),
  })
  const tone = (value: CustomizationStatus) =>
    value === 'FAILED'
      ? 'critical'
      : value === 'NEEDS_REVIEW'
        ? 'warning'
        : value === 'PARSED'
          ? 'approved'
          : 'pending'
  const columns = useMemo<TableColumnsType<CustomizationRow>>(
    () => [
      {
        title: t('customization.columns.order'),
        render: (_, row) => (
          <>
            <Typography.Text strong>{row.order.externalOrderId || '—'}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{row.item.sku || '—'}</Typography.Text>
          </>
        ),
      },
      {
        title: t('customization.columns.customer'),
        render: (_, row) => row.customer.name || row.customer.email || '—',
      },
      { title: t('customization.columns.shop'), render: (_, row) => row.shop.name || '—' },
      {
        title: t('customization.columns.status'),
        render: (_, row) => <StatusTag status={tone(row.status)}>{row.status}</StatusTag>,
      },
      {
        title: t('customization.columns.issue'),
        render: (_, row) => row.errorMessage || row.errorCode || '—',
      },
      {
        title: t('customization.columns.assets'),
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
    [t],
  )

  return (
    <section className={styles.page}>
      <PageHeader title={t('customization.title')} description={t('customization.description')} />
      <div className={styles.metrics}>
        <MetricCard
          label={t('customization.summary.pending')}
          value={String(summary.data?.pending ?? '—')}
        />
        <MetricCard
          label={t('customization.summary.review')}
          value={String(summary.data?.needsReview ?? '—')}
          status="warning"
        />
        <MetricCard
          label={t('customization.summary.failed')}
          value={String(summary.data?.failed ?? '—')}
          status="critical"
        />
      </div>
      <SectionCard title={t('customization.queue')}>
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
              label: value,
            }))}
          />
        </FilterBar>
        <DataTable
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
        centered
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
                  children: selected.order.externalOrderId || '—',
                },
                { key: 'sku', label: 'SKU', children: selected.item.sku || '—' },
                {
                  key: 'customer',
                  label: t('customization.columns.customer'),
                  children: selected.customer.name || selected.customer.email || '—',
                },
                {
                  key: 'shop',
                  label: t('customization.columns.shop'),
                  children: selected.shop.name || '—',
                },
                {
                  key: 'status',
                  label: t('customization.columns.status'),
                  children: <StatusTag status={tone(selected.status)}>{selected.status}</StatusTag>,
                },
                {
                  key: 'issue',
                  label: t('customization.columns.issue'),
                  children: selected.errorMessage || selected.errorCode || '—',
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
                  onClick={() => action.mutate({ kind: 'retry', row: selected })}
                >
                  {t('customization.actions.retry')}
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={action.isPending}
                  onClick={() => action.mutate({ kind: 'confirm', row: selected })}
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
                  onClick={() => action.mutate({ kind: 'fail', row: selected })}
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
