import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  CheckCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Input, Select, Tag } from 'antd'

import {
  DataTable,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusTag,
} from '@/shared/ui'

import { type AccessExplorerSnapshot, loadAccessAccounts } from '../../api/accessExplorerApi'
import styles from './AccessExplorerPage.module.scss'

type Account = AccessExplorerSnapshot['accounts']['items'][number]

export function AccessExplorerPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>()
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['access-accounts'],
    queryFn: loadAccessAccounts,
  })
  const accounts = useMemo(
    () =>
      (data?.items ?? []).filter((account) => {
        const matchesSearch = account.email.toLowerCase().includes(search.trim().toLowerCase())
        return matchesSearch && (!status || account.status === status)
      }),
    [data?.items, search, status],
  )
  const allAccounts = data?.items ?? []
  const statuses = [
    ...new Set((data?.items ?? []).map((account) => account.status).filter(Boolean)),
  ]
  const columns: TableColumnsType<Account> = [
    { title: t('auth.accessExplorer.account'), dataIndex: 'email' },
    {
      title: t('auth.accessExplorer.currentRoles'),
      render: (_, account) =>
        account.roles?.length
          ? account.roles.map((role) => <Tag key={role}>{role}</Tag>)
          : t('auth.accessExplorer.noRoles'),
    },
    {
      title: t('auth.accessExplorer.status'),
      render: (_, account) => (
        <Tag color={account.status === 'active' ? 'success' : 'default'}>
          {account.status ?? t('auth.accessExplorer.unknown')}
        </Tag>
      ),
    },
    {
      title: t('auth.accessEditor.actions'),
      align: 'right',
      render: (_, account) => (
        <Button type="primary" icon={<SafetyCertificateOutlined aria-hidden />}>
          <Link to={`/auth/accounts/${account.id}`}>{t('auth.accessExplorer.manageAccount')}</Link>
        </Button>
      ),
    },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accessExplorer.title')}
        description={t('auth.accessExplorer.directoryDescription')}
        actions={<StatusTag status="operational">AUTH:READ</StatusTag>}
      />
      {error ? (
        <FeedbackAlert
          type="error"
          title={t('auth.accessExplorer.unavailable')}
          description={t('auth.accessExplorer.unavailableDescription')}
          action={
            <Button
              type="link"
              icon={<ReloadOutlined aria-hidden />}
              onClick={() => void refetch()}
            >
              {t('auth.accessExplorer.retry')}
            </Button>
          }
        />
      ) : null}
      <div className={styles.metrics}>
        <MetricCard
          icon={<TeamOutlined aria-hidden className={styles.totalIcon} />}
          label={t('auth.accessExplorer.totalAccounts')}
          value={String(allAccounts.length)}
        />
        <MetricCard
          icon={<CheckCircleOutlined aria-hidden className={styles.activeIcon} />}
          label={t('auth.accessExplorer.activeAccounts')}
          value={String(allAccounts.filter((account) => account.status === 'active').length)}
        />
        <MetricCard
          icon={<SafetyCertificateOutlined aria-hidden className={styles.unassignedIcon} />}
          label={t('auth.accessExplorer.accountsWithoutRoles')}
          value={String(allAccounts.filter((account) => !account.roles?.length).length)}
        />
      </div>
      <SectionCard title={t('auth.accessExplorer.accounts')}>
        <DataTable
          columns={columns}
          dataSource={accounts}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowKey="id"
          toolbar={
            <FilterBar
              contentClassName={styles.filters}
              label={t('auth.accessExplorer.filterLabel')}
            >
              <Input.Search
                className={styles.searchFilter}
                aria-label={t('auth.accessExplorer.searchAccounts')}
                placeholder={t('auth.accessExplorer.searchEmail')}
                allowClear
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                className={styles.statusFilter}
                aria-label={t('auth.accessExplorer.filterStatus')}
                allowClear
                placeholder={t('auth.accessExplorer.allStatuses')}
                options={statuses.map((value) => ({ label: value, value }))}
                onChange={setStatus}
              />
            </FilterBar>
          }
        />
      </SectionCard>
    </section>
  )
}
