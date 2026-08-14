import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarOutlined,
  EyeOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  message,
  Select,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import {
  addCustomerNote,
  type Customer,
  type CustomerCareStatus,
  type CustomerLifecycle,
  getCustomer,
  getCustomerSummary,
  getCustomerTimeline,
  listCustomers,
  updateCustomerCareStatus,
} from '@/features/portal/customers/api/customerApi'
import { customerKeys } from '@/features/portal/customers/api/customerKeys'
import { getPermissions } from '@/shared/auth/session'
import { DataTable, FilterBar, MetricCard, PageHeader } from '@/shared/ui'

import styles from './CustomerWorkspacePage.module.scss'

const lifecycleColors: Record<CustomerLifecycle, string> = {
  NEW: 'blue',
  RETURNING: 'green',
  VIP: 'gold',
  AT_RISK: 'red',
  ISSUE_PRONE: 'volcano',
}

const careOptions: CustomerCareStatus[] = ['NONE', 'NEEDS_FOLLOW_UP', 'IN_PROGRESS', 'RESOLVED']
const lifecycleOptions: CustomerLifecycle[] = ['NEW', 'RETURNING', 'VIP', 'AT_RISK', 'ISSUE_PRONE']

export function CustomerWorkspacePage() {
  const { i18n, t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [lifecycle, setLifecycle] = useState<CustomerLifecycle | undefined>()
  const [careStatus, setCareStatus] = useState<CustomerCareStatus | undefined>()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const canWrite = useMemo(() => {
    const permissions = new Set(getPermissions())
    return permissions.has('CUSTOMERS:WRITE') || permissions.has('CUSTOMERS:MANAGE')
  }, [])
  const money = useMemo(
    () =>
      (value: number, currency = 'USD') =>
        new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
          style: 'currency',
          currency,
        }).format((value || 0) / 100),
    [i18n.language],
  )

  const labelOf = (value: string) =>
    t(`customers.values.${value}`, { defaultValue: value.replaceAll('_', ' ') })

  const params = useMemo(
    () => ({ page, limit: 20, search, lifecycle, careStatus, sort: 'lastOrderDesc' }),
    [page, search, lifecycle, careStatus],
  )

  const customers = useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => listCustomers(params),
  })
  const summary = useQuery({
    queryKey: customerKeys.summary({ search, lifecycle, careStatus }),
    queryFn: () => getCustomerSummary({ search, lifecycle, careStatus }),
  })
  const detail = useQuery({
    queryKey: selectedId ? customerKeys.detail(selectedId) : ['customers', 'detail', 'empty'],
    queryFn: () => getCustomer(selectedId as string),
    enabled: Boolean(selectedId),
  })
  const timeline = useQuery({
    queryKey: selectedId ? customerKeys.timeline(selectedId) : ['customers', 'timeline', 'empty'],
    queryFn: () => getCustomerTimeline(selectedId as string),
    enabled: Boolean(selectedId),
  })

  const careMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomerCareStatus }) =>
      updateCustomerCareStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
      message.success(t('customers.messages.updated'))
    },
  })

  const noteMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addCustomerNote(id, body),
    onSuccess: async () => {
      setNote('')
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
      message.success(t('customers.messages.noteAdded'))
    },
  })

  const columns: ColumnsType<Customer> = [
    {
      title: t('customers.columns.customer'),
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {row.name || row.emailMasked || row.phoneMasked || t('customers.empty.unknown')}
          </Typography.Text>
          <Typography.Text type="secondary">
            {row.emailMasked || row.phoneMasked || t('customers.empty.noContact')}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: t('customers.columns.lifecycle'),
      dataIndex: 'lifecycle',
      render: (value: CustomerLifecycle) => (
        <Tag color={lifecycleColors[value]}>{labelOf(value)}</Tag>
      ),
    },
    {
      title: t('customers.columns.care'),
      dataIndex: 'careStatus',
      render: (value: CustomerCareStatus, row) =>
        canWrite ? (
          <Select
            size="small"
            value={value}
            options={careOptions.map((option) => ({ value: option, label: labelOf(option) }))}
            onChange={(status) => careMutation.mutate({ id: row.id, status })}
          />
        ) : (
          <Tag>{labelOf(value)}</Tag>
        ),
    },
    { title: t('customers.columns.orders'), dataIndex: 'orderCount', sorter: true },
    {
      title: t('customers.columns.revenue'),
      render: (_, row) => money(row.totalRevenueAmount, row.currency),
    },
    {
      title: t('customers.columns.lastOrder'),
      render: (_, row) =>
        row.lastOrderAt ? dayjs(row.lastOrderAt).format('DD MMM YYYY') : t('customers.empty.dash'),
    },
    {
      title: '',
      render: (_, row) => (
        <Button type="link" onClick={() => setSelectedId(row.id)}>
          <EyeOutlined /> {t('customers.actions.view')}
        </Button>
      ),
    },
  ]

  const selected = detail.data

  return (
    <section className={styles.page}>
      <PageHeader title={t('customers.title')} description={t('customers.description')} />

      <section className={styles.metrics}>
        <MetricCard
          icon={<TeamOutlined />}
          label={t('customers.metrics.total')}
          value={summary.data?.total ?? 0}
          loading={summary.isFetching}
          variant="primary"
        />
        <MetricCard
          icon={<UserAddOutlined />}
          label={t('customers.metrics.new')}
          value={summary.data?.newCount ?? 0}
          loading={summary.isFetching}
          variant="info"
        />
        <MetricCard
          icon={<UserSwitchOutlined />}
          label={t('customers.metrics.returning')}
          value={summary.data?.returningCount ?? 0}
          loading={summary.isFetching}
          variant="success"
        />
        <MetricCard
          icon={<WarningOutlined />}
          label={t('customers.metrics.followUp')}
          value={summary.data?.needsFollowUpCount ?? 0}
          loading={summary.isFetching}
          variant="warning"
        />
        <MetricCard
          icon={<DollarOutlined />}
          label={t('customers.metrics.revenue')}
          value={money(summary.data?.totalRevenueAmount ?? 0)}
          loading={summary.isFetching}
          variant="neutral"
        />
      </section>

      <Card>
        <FilterBar label={t('customers.filters.label')}>
          <Input.Search
            allowClear
            placeholder={t('customers.filters.search')}
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            className={styles.search}
          />
          <Select
            allowClear
            placeholder={t('customers.filters.lifecycle')}
            value={lifecycle}
            options={lifecycleOptions.map((option) => ({ value: option, label: labelOf(option) }))}
            onChange={(value) => {
              setPage(1)
              setLifecycle(value)
            }}
            className={styles.select}
          />
          <Select
            allowClear
            placeholder={t('customers.filters.careStatus')}
            value={careStatus}
            options={careOptions.map((option) => ({ value: option, label: labelOf(option) }))}
            onChange={(value) => {
              setPage(1)
              setCareStatus(value)
            }}
            className={styles.select}
          />
        </FilterBar>

        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={customers.data?.items ?? []}
          loading={customers.isFetching}
          emptyText={t('customers.empty.noCustomers')}
          pagination={{
            current: page,
            pageSize: 20,
            total: customers.data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Drawer
        title={selected?.name || selected?.emailMasked || t('customers.title')}
        open={Boolean(selectedId)}
        width={520}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <Space direction="vertical" size="large" className={styles.drawer}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Lifecycle">
                <Tag color={lifecycleColors[selected.lifecycle]}>{labelOf(selected.lifecycle)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('customers.columns.care')}>
                {labelOf(selected.careStatus)}
              </Descriptions.Item>
              <Descriptions.Item label={t('customers.columns.orders')}>
                {selected.orderCount}
              </Descriptions.Item>
              <Descriptions.Item label={t('customers.columns.revenue')}>
                {money(selected.totalRevenueAmount, selected.currency)}
              </Descriptions.Item>
              <Descriptions.Item label={t('customers.columns.country')}>
                {selected.countries.join(', ') || t('customers.empty.dash')}
              </Descriptions.Item>
              <Descriptions.Item label={t('customers.columns.shop')}>
                {selected.shops
                  .map((shop) => shop.name)
                  .filter(Boolean)
                  .join(', ') || t('customers.empty.dash')}
              </Descriptions.Item>
            </Descriptions>

            {canWrite ? (
              <Space.Compact className={styles.noteBox}>
                <Input.TextArea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('customers.actions.addNote')}
                />
                <Button
                  type="primary"
                  disabled={!note.trim()}
                  loading={noteMutation.isPending}
                  onClick={() =>
                    selectedId && noteMutation.mutate({ id: selectedId, body: note.trim() })
                  }
                >
                  {t('customers.actions.add')}
                </Button>
              </Space.Compact>
            ) : null}

            <Timeline
              items={[
                ...(timeline.data?.notes ?? []).map((item) => ({
                  children: (
                    <>
                      <Typography.Text>{item.body}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">
                        {item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY HH:mm') : '-'}
                      </Typography.Text>
                    </>
                  ),
                })),
                ...(timeline.data?.events ?? []).map((item) => ({
                  children: (
                    <>
                      <Typography.Text>{item.message || item.eventType}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">
                        {item.occurredAt ? dayjs(item.occurredAt).format('DD MMM YYYY HH:mm') : '-'}
                      </Typography.Text>
                    </>
                  ),
                })),
              ]}
            />
          </Space>
        ) : null}
      </Drawer>
    </section>
  )
}
