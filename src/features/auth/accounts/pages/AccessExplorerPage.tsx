import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircleOutlined,
  DownOutlined,
  EyeOutlined,
  IdcardOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Dropdown,
  Form,
  Input,
  Modal,
  Pagination,
  Result,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { updateGlobalAccess } from '@/features/auth/access/api/accessMutationsApi'
import { loadRoleCatalog } from '@/features/auth/roles/api/rolesApi'
import { loadScopes } from '@/features/auth/scopes/api/scopesApi'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { modalQueryOptions } from '@/shared/query/modalQuery'
import {
  EmptyState,
  FeedbackAlert,
  FilterBar,
  MetricCard,
  PageHeader,
  PermissionCheckboxGroup,
  SearchInput,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  type AccessExplorerSnapshot,
  loadAccessAccounts,
  loadAccessExplorer,
} from '../../api/accessExplorerApi'
import { createAccount, type CreateAccountInput } from '../api/accountManagementApi'
import styles from './AccessExplorerPage.module.scss'

type ScopeType = 'global' | 'department' | 'team' | 'shop' | 'vendor' | 'own'
type CreateAccountForm = {
  email: string
  password: string
  roleId?: string
  scopeType: ScopeType
  scopeId?: string
  customPermissionIds?: string[]
}

function statusTone(status?: string) {
  return String(status ?? '').toLowerCase() === 'active' ? 'operational' : 'cancelled'
}

function normalize(value?: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function AccessExplorerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [quickAccessForm] = Form.useForm<{ roleIds: string[]; customPermissionIds: string[] }>()
  const [createForm] = Form.useForm<CreateAccountForm>()
  const [quickAccessAccount, setQuickAccessAccount] =
    useState<AccessExplorerSnapshot['accounts']['items'][number]>()
  const [isOpeningQuickAccess, setIsOpeningQuickAccess] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createScopeType, setCreateScopeType] = useState<ScopeType>('global')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const canRead = hasAnyPermission(['AUTH:READ', 'AUTH:WRITE'], { globalOnly: true })
  const canWrite = hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['access-accounts'],
    queryFn: loadAccessAccounts,
  })
  const roleCatalogQuery = useQuery({
    queryKey: ['auth-role-catalog'],
    queryFn: loadRoleCatalog,
    ...modalQueryOptions,
    enabled: Boolean(quickAccessAccount) || isCreateOpen,
  })
  const scopeQuery = useQuery({
    queryKey: ['auth-scopes'],
    queryFn: loadScopes,
    ...modalQueryOptions,
    enabled: isCreateOpen,
  })

  const createRoleOptions = useMemo(
    () =>
      (roleCatalogQuery.data?.roles.items ?? []).map((role) => ({
        label: role.name ?? role.code,
        value: role.id,
      })),
    [roleCatalogQuery.data?.roles.items],
  )
  const permissionSections = useMemo(() => {
    const groups = new Map<string, { title: string; options: { label: string; value: string }[] }>()

    for (const permission of roleCatalogQuery.data?.permissions.items ?? []) {
      const label = `${permission.code}${permission.name ? ` - ${permission.name}` : ''}`
      const sectionKey = permission.code.includes(':')
        ? permission.code.split(':')[0]
        : permission.code.includes('.')
          ? permission.code.split('.')[0]
          : permission.code.includes('_')
            ? permission.code.split('_')[0]
            : 'general'

      const section = groups.get(sectionKey) ?? { title: sectionKey, options: [] }
      section.options.push({ label, value: permission.id })
      groups.set(sectionKey, section)
    }

    return Array.from(groups.values())
  }, [roleCatalogQuery.data?.permissions.items])
  const scopeTypeOptions = useMemo(
    () => [
      { label: t('shell.account.scopes.global'), value: 'global' },
      { label: t('shell.account.scopes.department'), value: 'department' },
      { label: t('shell.account.scopes.team'), value: 'team' },
      { label: t('shell.account.scopes.own'), value: 'own' },
      { label: t('shell.account.scopes.shop'), value: 'shop' },
      { label: t('shell.account.scopes.vendor'), value: 'vendor' },
    ],
    [t],
  )
  const scopedScopeOptions = useMemo(
    () =>
      (scopeQuery.data?.items ?? [])
        .filter((scope) => String(scope.scopeType).toLowerCase() === createScopeType)
        .map((scope) => ({ label: scope.name, value: scope.scopeId })),
    [createScopeType, scopeQuery.data?.items],
  )
  const requiresScopeId = createScopeType !== 'global' && createScopeType !== 'own'

  const quickAccessMutation = useMutation({
    mutationFn: (payload: {
      accountId: string
      roleIds: string[]
      customPermissionIds: string[]
    }) =>
      updateGlobalAccess(payload.accountId, {
        roleIds: payload.roleIds,
        customPermissionIds: payload.customPermissionIds,
      }),
    onSuccess: async () => {
      setQuickAccessAccount(undefined)
      quickAccessForm.resetFields()
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const createMutation = useMutation({
    mutationFn: (payload: CreateAccountInput) => createAccount(payload),
    onSuccess: async () => {
      setIsCreateOpen(false)
      createForm.resetFields()
      setCreateScopeType('global')
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const allAccounts = data?.items ?? []
  const searchValue = search.trim().toLowerCase()
  const statusFilter = normalize(status)

  const accounts = useMemo(
    () =>
      allAccounts.filter((account) => {
        const matchesSearch = account.email.toLowerCase().includes(searchValue)
        const matchesStatus = !statusFilter || normalize(account.status) === statusFilter
        return matchesSearch && matchesStatus
      }),
    [allAccounts, searchValue, statusFilter],
  )

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return accounts.slice(start, start + pageSize)
  }, [accounts, currentPage, pageSize])

  const statuses = useMemo(() => {
    const keys = new Set(allAccounts.map((account) => normalize(account.status)).filter(Boolean))
    return [...keys].map((value) => ({ label: value, value }))
  }, [allAccounts])
  const hasFilters = Boolean(searchValue || statusFilter)

  const clearFilters = () => {
    setSearch('')
    setStatus(undefined)
    setCurrentPage(1)
  }

  const openQuickAccess = async (account: AccessExplorerSnapshot['accounts']['items'][number]) => {
    setQuickAccessAccount(account)
    setIsOpeningQuickAccess(true)
    try {
      const snapshot = await loadAccessExplorer(account.id)
      quickAccessForm.setFieldsValue({
        roleIds: snapshot.account.access?.roleIds ?? [],
        customPermissionIds: snapshot.account.access?.customPermissionIds ?? [],
      })
    } catch {
      quickAccessForm.resetFields()
    } finally {
      setIsOpeningQuickAccess(false)
    }
  }

  const closeQuickAccess = () => {
    setQuickAccessAccount(undefined)
    quickAccessForm.resetFields()
  }

  const saveQuickAccess = (values: { roleIds?: string[]; customPermissionIds?: string[] }) => {
    if (!quickAccessAccount?.id) return
    quickAccessMutation.mutate({
      accountId: quickAccessAccount.id,
      roleIds: values.roleIds ?? [],
      customPermissionIds: values.customPermissionIds ?? [],
    })
  }

  const openCreateAccount = () => {
    setIsCreateOpen(true)
    setCreateScopeType('global')
    createForm.resetFields()
    createForm.setFieldsValue({
      email: '',
      password: '',
      roleId: undefined,
      scopeType: 'global',
      customPermissionIds: [],
    })
  }
  const closeCreateAccount = () => {
    setIsCreateOpen(false)
    createForm.resetFields()
  }
  const openCreateFromProfile = () => {
    navigate('/hr/operations/employees?openCreate=1')
  }
  const submitCreateAccount = (values: CreateAccountForm) => {
    if (!values.roleId) return
    createMutation.mutate({
      ...values,
      assignments: [
        {
          roleId: values.roleId,
          scopeType: values.scopeType,
          scopeId: requiresScopeId ? (values.scopeId ?? null) : null,
          customPermissionIds: values.customPermissionIds ?? [],
        },
      ],
      email: values.email.trim(),
      password: values.password,
    })
  }

  if (!canRead) return <Result status="403" title="403" />

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accessExplorer.title')}
        description={t('auth.accessExplorer.directoryDescription')}
        actions={
          <div className={styles.headerActions}>
            {canWrite ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'direct-account',
                      label: t('auth.accessExplorer.createAccountDirect'),
                      icon: <PlusOutlined />,
                    },
                    {
                      key: 'from-profile',
                      label: t('auth.accessExplorer.createAccountFromProfile'),
                      icon: <IdcardOutlined />,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'from-profile') openCreateFromProfile()
                    else openCreateAccount()
                  },
                }}
              >
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  disabled={roleCatalogQuery.isLoading || scopeQuery.isLoading}
                >
                  {t('auth.accessExplorer.createAccount')}
                  <DownOutlined />
                </Button>
              </Dropdown>
            ) : null}
            <StatusTag status="operational">AUTH:READ</StatusTag>
          </div>
        }
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
          value={String(
            allAccounts.filter((account) => normalize(account.status) === 'active').length,
          )}
        />
        <MetricCard
          icon={<SafetyCertificateOutlined aria-hidden className={styles.unassignedIcon} />}
          label={t('auth.accessExplorer.accountsWithoutRoles')}
          value={String(allAccounts.filter((account) => !account.roles?.length).length)}
        />
      </div>

      <SectionCard>
        <div className={styles.sectionHeader}>
          <div>
            <Typography.Title level={4} className={styles.sectionTitle}>
              {t('auth.accessExplorer.accounts')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('auth.accessExplorer.resultsSummary', {
                count: accounts.length,
                total: allAccounts.length,
              })}
            </Typography.Text>
          </div>
          <FilterBar contentClassName={styles.filters} label={t('auth.accessExplorer.filterLabel')}>
            <SearchInput
              className={styles.searchFilter}
              aria-label={t('auth.accessExplorer.searchAccounts')}
              placeholder={t('auth.accessExplorer.searchEmail')}
              value={search}
              onSearchChange={(value) => {
                setSearch(value)
                setCurrentPage(1)
              }}
            />
            <Select
              className={styles.statusFilter}
              aria-label={t('auth.accessExplorer.filterStatus')}
              allowClear
              placeholder={t('auth.accessExplorer.allStatuses')}
              options={statuses}
              value={status}
              onChange={(value) => {
                setStatus(value)
                setCurrentPage(1)
              }}
              onClear={clearFilters}
            />
            <Button type="default" disabled={!hasFilters} onClick={clearFilters}>
              {t('auth.accessExplorer.clearFilters')}
            </Button>
          </FilterBar>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            {t('auth.accessExplorer.loading', 'Loading accounts...')}
          </div>
        ) : (
          <div className={styles.accountList}>
            {paginatedAccounts.length === 0 ? (
              <EmptyState
                title={
                  hasFilters
                    ? t('auth.accessExplorer.noResults', 'No accounts match this filter')
                    : t('auth.accessExplorer.emptyAccounts')
                }
                description={t('auth.accessExplorer.emptyAccountsDescription')}
                action={
                  hasFilters ? (
                    <Button type="link" onClick={clearFilters}>
                      {t('auth.accessExplorer.clearFilters')}
                    </Button>
                  ) : null
                }
              />
            ) : (
              paginatedAccounts.map((account) => {
                const initials = account.email ? account.email.charAt(0).toUpperCase() : 'U'
                return (
                  <div key={account.id} className={styles.accountCard}>
                    <div className={styles.accountIdentity}>
                      <Avatar size={40} style={{ backgroundColor: '#1890ff' }}>
                        {initials}
                      </Avatar>
                      <div>
                        <Typography.Text strong className={styles.emailText}>
                          {account.email}
                        </Typography.Text>
                        <Typography.Text type="secondary" className={styles.accountMeta}>
                          {account.lastLoginAt
                            ? `${t('auth.accessExplorer.lastLogin', 'Last login')}: ${dayjs(account.lastLoginAt).format('YYYY-MM-DD HH:mm')}`
                            : t('auth.accessExplorer.neverLoggedIn', 'Never logged in')}
                        </Typography.Text>
                      </div>
                    </div>

                    <div className={styles.accountRoles}>
                      <span className={styles.sectionLabel}>
                        {t('auth.accessExplorer.currentRoles')}:
                      </span>
                      <Space size={[4, 8]} wrap>
                        {account.roles?.length ? (
                          account.roles.map((role) => (
                            <Tag
                              color="blue"
                              key={role}
                              style={{ borderRadius: 4, fontWeight: 500 }}
                            >
                              {role}
                            </Tag>
                          ))
                        ) : (
                          <Typography.Text type="secondary" className={styles.accountMeta}>
                            {t('auth.accessExplorer.noRoles')}
                          </Typography.Text>
                        )}
                      </Space>
                    </div>

                    <div className={styles.accountStatus}>
                      <StatusTag status={statusTone(account.status)}>
                        {account.status ?? t('auth.accessExplorer.unknown')}
                      </StatusTag>
                    </div>

                    <div className={styles.accountActions}>
                      <Tooltip title={t('auth.accessExplorer.viewDetails', 'View details')}>
                        <Button
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/auth/accounts/${account.id}`)}
                        />
                      </Tooltip>
                      <Tooltip title={t('auth.accessEditor.globalAccess')}>
                        <Button
                          type="text"
                          icon={<SettingOutlined />}
                          loading={isOpeningQuickAccess && quickAccessAccount?.id === account.id}
                          onClick={() => void openQuickAccess(account)}
                        />
                      </Tooltip>
                      <Tooltip title={t('auth.accessExplorer.manageAccess', 'Manage access')}>
                        <Link
                          to={`/auth/accounts/${account.id}/access`}
                          className={styles.manageAccessLink}
                        >
                          <Button type="text" icon={<SafetyCertificateOutlined />}>
                            {t('auth.accessExplorer.manageAccess', 'Manage Access')}
                          </Button>
                        </Link>
                      </Tooltip>
                      <Tooltip
                        title={t('auth.accessExplorer.securitySettings', 'Security settings')}
                      >
                        <Button
                          type="text"
                          icon={<KeyOutlined />}
                          onClick={() => navigate(`/auth/accounts/${account.id}/security`)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {accounts.length > pageSize && (
          <div className={styles.pagination}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={accounts.length}
              onChange={setCurrentPage}
              showSizeChanger={false}
            />
          </div>
        )}
      </SectionCard>

      <Modal
        open={Boolean(quickAccessAccount)}
        title={`${t('auth.accessEditor.globalAccess')} - ${quickAccessAccount?.email ?? ''}`}
        onCancel={closeQuickAccess}
        width={900}
        bodyStyle={{ paddingBottom: 16 }}
        footer={null}
        destroyOnHidden
      >
        <Form form={quickAccessForm} layout="vertical" onFinish={saveQuickAccess}>
          <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
            <Select
              mode="multiple"
              options={createRoleOptions}
              loading={roleCatalogQuery.isLoading}
            />
          </Form.Item>
          <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
            <PermissionCheckboxGroup sections={permissionSections} columns={3} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeQuickAccess}>{t('auth.accessEditor.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={quickAccessMutation.isPending}>
              {t('auth.accessEditor.saveGlobal')}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        open={isCreateOpen}
        title={t('auth.accessExplorer.createAccount')}
        onCancel={closeCreateAccount}
        width={980}
        bodyStyle={{ paddingBottom: 16 }}
        footer={null}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={submitCreateAccount}>
          <Form.Item
            label={t('auth.accountDetail.email')}
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label={t('auth.login.password')} name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            label={t('auth.accessEditor.roles')}
            name="roleId"
            rules={[{ required: true }]}
          >
            <Select options={createRoleOptions} loading={roleCatalogQuery.isLoading} />
          </Form.Item>
          <div className={styles.scopeRow}>
            <Form.Item
              label={t('auth.accessExplorer.scopeType')}
              name="scopeType"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={scopeTypeOptions}
                value={createScopeType}
                onChange={(scopeType) => {
                  setCreateScopeType(
                    scopeType as 'global' | 'department' | 'team' | 'shop' | 'vendor' | 'own',
                  )
                  createForm.setFieldValue('scopeId', undefined)
                }}
              />
            </Form.Item>
            {requiresScopeId ? (
              <Form.Item
                label={t('auth.accessEditor.scope')}
                name="scopeId"
                rules={[{ required: true }]}
                style={{ flex: 1 }}
              >
                <Select options={scopedScopeOptions} loading={scopeQuery.isLoading} />
              </Form.Item>
            ) : null}
          </div>
          <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
            <PermissionCheckboxGroup sections={permissionSections} columns={3} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeCreateAccount}>{t('auth.accessEditor.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              {t('auth.accessExplorer.create')}
            </Button>
          </div>
        </Form>
      </Modal>
    </section>
  )
}
