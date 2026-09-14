import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  IdcardOutlined,
  KeyOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Pagination,
  Result,
  Select,
  Skeleton,
  Spin,
  Tag,
  Tabs,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  type BulkGlobalAccessInput,
  bulkRevokeGlobalAccess,
  bulkUpdateGlobalAccess,
  updateGlobalAccess,
} from '@/features/auth/access/api/accessMutationsApi'
import { authKeys } from '@/features/auth/api/authKeys'
import { loadRoleCatalog } from '@/features/auth/roles/api/rolesApi'
import { loadScopes } from '@/features/auth/scopes/api/scopesApi'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { modalQueryOptions } from '@/shared/query/modalQuery'
import {
  ConfirmDangerModal,
  EmptyState,
  FeedbackAlert,
  PageHeader,
  PermissionCheckboxGroup,
  SearchInput,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import { type AccessExplorerSnapshot, loadAccessExplorer } from '../../api/accessExplorerApi'
import { accountKeys } from '../api/accountKeys'
import {
  createAccount,
  resetAccountPassword,
  revokeAccountSessions,
  type CreateAccountInput,
  updateAccountStatus,
} from '../api/accountManagementApi'
import { useAccessAccountsQuery } from '../hooks'
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
type BulkAccessFormValues = {
  roleIds: string[]
  customPermissionIds: string[]
  validFrom?: Dayjs | null
  validUntil?: Dayjs | null
}
type InspectorSecurityAction = 'deactivate' | 'revoke-sessions'

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
  const [quickAccessForm] = Form.useForm<{
    roleIds: string[]
    customPermissionIds: string[]
    validFrom?: Dayjs | null
    validUntil?: Dayjs | null
  }>()
  const [bulkAccessForm] = Form.useForm<BulkAccessFormValues>()
  const [createForm] = Form.useForm<CreateAccountForm>()
  const [securityPasswordForm] = Form.useForm<{ password: string }>()
  const [quickAccessAccount, setQuickAccessAccount] =
    useState<AccessExplorerSnapshot['accounts']['items'][number]>()
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [isOpeningQuickAccess, setIsOpeningQuickAccess] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false)
  const [isBulkRevokeOpen, setIsBulkRevokeOpen] = useState(false)
  const [createScopeType, setCreateScopeType] = useState<ScopeType>('global')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>()
  const [role, setRole] = useState<string>()
  const [inspectedAccountId, setInspectedAccountId] = useState<string>()
  const [inspectorTab, setInspectorTab] = useState('overview')
  const [pendingInspectorSecurityAction, setPendingInspectorSecurityAction] =
    useState<InspectorSecurityAction>()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const canRead = hasAnyPermission(['AUTH:READ', 'AUTH:WRITE'], { globalOnly: true })
  const canWrite = hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })
  const { data, error, isLoading, refetch } = useAccessAccountsQuery()
  const roleCatalogQuery = useQuery({
    queryKey: authKeys.roles.catalog(),
    queryFn: loadRoleCatalog,
    ...modalQueryOptions,
    enabled: Boolean(quickAccessAccount) || isCreateOpen || isBulkAssignOpen,
  })
  const scopeQuery = useQuery({
    queryKey: authKeys.scopes.all(),
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
      const label = permission.code
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
      validFrom?: string | null
      validUntil?: string | null
    }) =>
      updateGlobalAccess(payload.accountId, {
        roleIds: payload.roleIds,
        customPermissionIds: payload.customPermissionIds,
        validFrom: payload.validFrom,
        validUntil: payload.validUntil,
      }),
    onSuccess: async () => {
      setQuickAccessAccount(undefined)
      quickAccessForm.resetFields()
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const securityPasswordMutation = useMutation({
    mutationFn: ({ accountId, password }: { accountId: string; password: string }) =>
      resetAccountPassword(accountId, password),
    onSuccess: async () => {
      securityPasswordForm.resetFields()
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const revokeSessionsMutation = useMutation({
    mutationFn: (accountId: string) => revokeAccountSessions(accountId),
    onSuccess: async () => {
      setPendingInspectorSecurityAction(undefined)
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const deactivateAccountMutation = useMutation({
    mutationFn: (accountId: string) => updateAccountStatus(accountId, 'inactive'),
    onSuccess: async () => {
      setPendingInspectorSecurityAction(undefined)
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      showFeedbackToast('success', t('actionFeedback.deactivated'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const bulkAccessMutation = useMutation({
    mutationFn: (payload: BulkGlobalAccessInput) => bulkUpdateGlobalAccess(payload),
    onSuccess: async () => {
      setIsBulkAssignOpen(false)
      bulkAccessForm.resetFields()
      setSelectedAccountIds([])
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const bulkRevokeMutation = useMutation({
    mutationFn: (accountIds: string[]) => bulkRevokeGlobalAccess({ accountIds }),
    onSuccess: async () => {
      setIsBulkRevokeOpen(false)
      setSelectedAccountIds([])
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
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const allAccounts = useMemo(() => data?.items ?? [], [data?.items])
  const searchValue = search.trim().toLowerCase()
  const statusFilter = normalize(status)
  const roleFilter = normalize(role)

  const accounts = useMemo(
    () =>
      allAccounts.filter((account) => {
        const matchesSearch = account.email.toLowerCase().includes(searchValue)
        const matchesStatus = !statusFilter || normalize(account.status) === statusFilter
        const matchesRole =
          !roleFilter || account.roles?.some((accountRole) => normalize(accountRole) === roleFilter)
        return matchesSearch && matchesStatus && matchesRole
      }),
    [allAccounts, roleFilter, searchValue, statusFilter],
  )

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return accounts.slice(start, start + pageSize)
  }, [accounts, currentPage, pageSize])
  const isAllCurrentPageSelected = paginatedAccounts.every((account) =>
    selectedAccountIds.includes(account.id),
  )

  const roleOptions = useMemo(() => {
    const roles = new Set(allAccounts.flatMap((account) => account.roles ?? []))
    return [...roles].map((value) => ({ label: value, value }))
  }, [allAccounts])
  const inspectedAccount = allAccounts.find((account) => account.id === inspectedAccountId)
  const hasFilters = Boolean(searchValue || statusFilter || roleFilter)

  const clearFilters = () => {
    setSearch('')
    setStatus(undefined)
    setRole(undefined)
    setCurrentPage(1)
  }

  const openInspector = (
    account: AccessExplorerSnapshot['accounts']['items'][number],
    tab = 'overview',
  ) => {
    setInspectedAccountId(account.id)
    setInspectorTab(tab)
  }

  const confirmInspectorSecurityAction = () => {
    if (!inspectedAccount) return
    if (pendingInspectorSecurityAction === 'revoke-sessions') {
      revokeSessionsMutation.mutate(inspectedAccount.id)
    }
    if (pendingInspectorSecurityAction === 'deactivate') {
      deactivateAccountMutation.mutate(inspectedAccount.id)
    }
  }

  const openQuickAccess = async (account: AccessExplorerSnapshot['accounts']['items'][number]) => {
    quickAccessForm.resetFields()
    setQuickAccessAccount(account)
    setIsOpeningQuickAccess(true)
    try {
      const snapshot = await loadAccessExplorer(account.id)
      quickAccessForm.setFieldsValue({
        roleIds: snapshot.account.access?.roleIds ?? snapshot.account.account.roles ?? [],
        customPermissionIds: snapshot.account.access?.customPermissionIds ?? [],
        validFrom: snapshot.account.access?.validFrom
          ? dayjs(snapshot.account.access.validFrom)
          : null,
        validUntil: snapshot.account.access?.validUntil
          ? dayjs(snapshot.account.access.validUntil)
          : null,
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

  const toggleAccountSelection = (accountId: string, checked: boolean) => {
    setSelectedAccountIds((previous) => {
      if (checked) {
        return previous.includes(accountId) ? previous : [...previous, accountId]
      }
      return previous.filter((id) => id !== accountId)
    })
  }

  const toggleCurrentPageSelectAll = (checked: boolean) => {
    const pageIds = paginatedAccounts.map((account) => account.id)
    setSelectedAccountIds((previous) => {
      if (!checked) {
        return previous.filter((id) => !pageIds.includes(id))
      }
      const merged = [...previous]
      for (const accountId of pageIds) {
        if (!merged.includes(accountId)) merged.push(accountId)
      }
      return merged
    })
  }

  const closeBulkAssign = () => {
    setIsBulkAssignOpen(false)
    bulkAccessForm.resetFields()
  }

  const openBulkAssign = async () => {
    setIsBulkAssignOpen(true)
    bulkAccessForm.resetFields()
    if (selectedAccountIds.length === 1) {
      try {
        const snapshot = await loadAccessExplorer(selectedAccountIds[0])
        bulkAccessForm.setFieldsValue({
          roleIds: snapshot.account.access?.roleIds ?? snapshot.account.account.roles ?? [],
          customPermissionIds: snapshot.account.access?.customPermissionIds ?? [],
          validFrom: snapshot.account.access?.validFrom
            ? dayjs(snapshot.account.access.validFrom)
            : null,
          validUntil: snapshot.account.access?.validUntil
            ? dayjs(snapshot.account.access.validUntil)
            : null,
        })
      } catch (error) {
        showFeedbackToast(
          'error',
          t('actionFeedback.failed'),
          error instanceof Error ? error.message : undefined,
        )
      }
      return
    }

    bulkAccessForm.setFieldsValue({
      roleIds: [],
      customPermissionIds: [],
    })
  }

  const saveBulkAccess = (values: {
    roleIds?: string[]
    customPermissionIds?: string[]
    validFrom?: Dayjs | null
    validUntil?: Dayjs | null
  }) => {
    if (selectedAccountIds.length === 0) return
    bulkAccessMutation.mutate({
      accountIds: selectedAccountIds,
      roleIds: values.roleIds ?? [],
      customPermissionIds: values.customPermissionIds ?? [],
      validFrom: values.validFrom ? values.validFrom.toISOString() : null,
      validUntil: values.validUntil ? values.validUntil.toISOString() : null,
    })
  }

  const saveQuickAccess = (values: {
    roleIds?: string[]
    customPermissionIds?: string[]
    validFrom?: Dayjs | null
    validUntil?: Dayjs | null
  }) => {
    if (!quickAccessAccount?.id) return
    quickAccessMutation.mutate({
      accountId: quickAccessAccount.id,
      roleIds: values.roleIds ?? [],
      customPermissionIds: values.customPermissionIds ?? [],
      validFrom: values.validFrom ? values.validFrom.toISOString() : null,
      validUntil: values.validUntil ? values.validUntil.toISOString() : null,
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
      <div className={inspectedAccount ? styles.workspaceWithInspector : styles.workspace}>
        <main className={styles.directory}>
          <div className={styles.directoryHeader}>
            <PageHeader
              title={t('auth.accessExplorer.title')}
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
          </div>
          <div className={styles.directoryTable}>
            <div className={styles.filters}>
              <div className={styles.quickFilters}>
                <Button
                  className={!statusFilter ? styles.quickFilterActive : undefined}
                  onClick={() => {
                    setStatus(undefined)
                    setCurrentPage(1)
                  }}
                >
                  {t('auth.accessExplorer.allAccountsFilter')}
                  <span className={styles.filterCount}>{allAccounts.length}</span>
                </Button>
                <Button
                  className={statusFilter === 'active' ? styles.quickFilterActive : undefined}
                  onClick={() => {
                    setStatus('active')
                    setCurrentPage(1)
                  }}
                >
                  {t('auth.accessExplorer.activeAccountsFilter')}
                  <span className={styles.filterCount}>
                    {allAccounts.filter((account) => normalize(account.status) === 'active').length}
                  </span>
                </Button>
                <Button
                  className={statusFilter === 'inactive' ? styles.quickFilterActive : undefined}
                  onClick={() => {
                    setStatus('inactive')
                    setCurrentPage(1)
                  }}
                >
                  {t('auth.accessExplorer.inactiveAccountsFilter')}
                  <span className={styles.filterCount}>
                    {
                      allAccounts.filter((account) => normalize(account.status) === 'inactive')
                        .length
                    }
                  </span>
                </Button>
              </div>
              <Select
                className={styles.roleFilter}
                aria-label={t('auth.accessExplorer.currentRoles')}
                allowClear
                placeholder={t('auth.accessExplorer.allRoles')}
                options={roleOptions}
                value={role}
                onChange={(value) => {
                  setRole(value)
                  setCurrentPage(1)
                }}
              />
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
              <Button type="text" disabled={!hasFilters} onClick={clearFilters}>
                {t('auth.accessExplorer.clearFilters')}
              </Button>
            </div>

            <div className={styles.tableShell}>
              <div className={styles.tableHeader}>
                {canWrite ? (
                  <Checkbox
                    aria-label={t('auth.accessExplorer.selectCurrentPage')}
                    checked={isAllCurrentPageSelected}
                    disabled={paginatedAccounts.length === 0}
                    onChange={(event) => toggleCurrentPageSelectAll(event.target.checked)}
                  />
                ) : (
                  <span />
                )}
                <span>{t('auth.accessExplorer.account')}</span>
                <span>{t('auth.accessExplorer.searchEmail')}</span>
                <span>{t('auth.accessExplorer.currentRoles')}</span>
                <span>{t('auth.accessExplorer.status')}</span>
                <span>{t('auth.accessExplorer.lastLogin')}</span>
                <span />
              </div>
              {isLoading ? (
                <div className={styles.loading}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton.Input key={i} active block style={{ height: 58, borderRadius: 0 }} />
                  ))}
                </div>
              ) : paginatedAccounts.length === 0 ? (
                <EmptyState
                  title={
                    hasFilters
                      ? t('auth.accessExplorer.noResults')
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
                  const isSelected = inspectedAccount?.id === account.id
                  return (
                    <div
                      key={account.id}
                      className={
                        isSelected
                          ? `${styles.accountRow} ${styles.accountRowSelected}`
                          : styles.accountRow
                      }
                      onClick={() => openInspector(account)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openInspector(account)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {canWrite ? (
                        <Checkbox
                          checked={selectedAccountIds.includes(account.id)}
                          onChange={(event) =>
                            toggleAccountSelection(account.id, event.target.checked)
                          }
                          onClick={(event) => event.stopPropagation()}
                        />
                      ) : (
                        <span />
                      )}
                      <div className={styles.accountIdentity}>
                        <Avatar size={32} className={styles.avatar}>
                          {initials}
                        </Avatar>
                        <Typography.Text strong className={styles.emailText}>
                          {account.email}
                        </Typography.Text>
                      </div>
                      <Typography.Text className={styles.accountMeta}>
                        {account.email}
                      </Typography.Text>
                      <div className={styles.accountRoles}>
                        {account.roles?.length ? (
                          <Tag color="blue">{account.roles[0]}</Tag>
                        ) : (
                          <Typography.Text type="secondary" className={styles.accountMeta}>
                            {t('auth.accessExplorer.noRoles')}
                          </Typography.Text>
                        )}
                      </div>
                      <span
                        className={
                          statusTone(account.status) === 'operational'
                            ? `${styles.accountStatus} ${styles.accountStatusActive}`
                            : `${styles.accountStatus} ${styles.accountStatusInactive}`
                        }
                      >
                        <span aria-hidden className={styles.statusDot} />
                        {account.status ?? t('auth.accessExplorer.unknown')}
                      </span>
                      <Typography.Text className={styles.accountMeta}>
                        {account.lastLoginAt
                          ? dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm')
                          : t('auth.accessExplorer.neverLoggedIn')}
                      </Typography.Text>
                      <div className={styles.rowActionMenu}>
                        <Dropdown
                          trigger={['click']}
                          menu={{
                            items: [
                              {
                                key: 'details',
                                icon: <EyeOutlined />,
                                label: t('auth.accessExplorer.viewDetails'),
                              },
                              {
                                key: 'global-access',
                                icon: <SettingOutlined />,
                                label: t('auth.accessEditor.globalAccess'),
                              },
                              {
                                key: 'security',
                                icon: <KeyOutlined />,
                                label: t('auth.accessExplorer.securitySettings'),
                              },
                            ],
                            onClick: ({ key }) => {
                              if (key === 'details') openInspector(account)
                              if (key === 'global-access') openInspector(account, 'access')
                              if (key === 'security') openInspector(account, 'security')
                            },
                          }}
                        >
                          <Button
                            aria-label={t('auth.accessEditor.actions')}
                            icon={<MoreOutlined />}
                            loading={isOpeningQuickAccess && quickAccessAccount?.id === account.id}
                            type="text"
                          />
                        </Dropdown>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {accounts.length > pageSize ? (
              <div className={styles.pagination}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={accounts.length}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                />
              </div>
            ) : null}
          </div>
        </main>

        {inspectedAccount ? (
          <aside
            className={styles.inspector}
            aria-label={t('auth.accessExplorer.accountInspector')}
          >
            <Button
              aria-label={t('auth.accessExplorer.closeInspector')}
              className={styles.closeInspector}
              icon={<CloseOutlined />}
              onClick={() => setInspectedAccountId(undefined)}
              type="text"
            />
            <div className={styles.inspectorIdentity}>
              <Avatar size={72} className={styles.inspectorAvatar}>
                {inspectedAccount.email.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <StatusTag status={statusTone(inspectedAccount.status)}>
                  {inspectedAccount.status ?? t('auth.accessExplorer.unknown')}
                </StatusTag>
                <Typography.Title level={3}>{inspectedAccount.email}</Typography.Title>
                <Typography.Text type="secondary">
                  {inspectedAccount.roles?.length
                    ? inspectedAccount.roles.join(', ')
                    : t('auth.accessExplorer.noRoles')}
                </Typography.Text>
              </div>
            </div>
            <div className={styles.inspectorStats}>
              <div>
                <span>{t('auth.accessExplorer.currentRoles')}</span>
                <strong>{inspectedAccount.roles?.length ?? 0}</strong>
              </div>
              <div>
                <span>{t('auth.accessExplorer.status')}</span>
                <strong>{inspectedAccount.status ?? t('auth.accessExplorer.unknown')}</strong>
              </div>
              <div>
                <span>{t('auth.accessExplorer.lastLogin')}</span>
                <strong>
                  {inspectedAccount.lastLoginAt
                    ? dayjs(inspectedAccount.lastLoginAt).format('DD/MM/YYYY')
                    : t('auth.accessExplorer.neverLoggedIn')}
                </strong>
              </div>
            </div>
            <Tabs
              activeKey={inspectorTab}
              className={styles.inspectorTabs}
              onChange={setInspectorTab}
              items={[
                {
                  key: 'overview',
                  label: t('auth.accessExplorer.overview'),
                  children: (
                    <dl className={styles.detailList}>
                      <div>
                        <dt>{t('auth.accessExplorer.searchEmail')}</dt>
                        <dd>{inspectedAccount.email}</dd>
                      </div>
                      <div>
                        <dt>{t('auth.accessExplorer.status')}</dt>
                        <dd>{inspectedAccount.status ?? t('auth.accessExplorer.unknown')}</dd>
                      </div>
                      <div>
                        <dt>{t('auth.accessExplorer.currentRoles')}</dt>
                        <dd>
                          {inspectedAccount.roles?.length
                            ? inspectedAccount.roles.join(', ')
                            : t('auth.accessExplorer.noRoles')}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('auth.accessExplorer.lastLogin')}</dt>
                        <dd>
                          {inspectedAccount.lastLoginAt
                            ? dayjs(inspectedAccount.lastLoginAt).format('DD/MM/YYYY HH:mm')
                            : t('auth.accessExplorer.neverLoggedIn')}
                        </dd>
                      </div>
                    </dl>
                  ),
                },
                {
                  key: 'access',
                  label: t('auth.accessEditor.globalAccess'),
                  children: (
                    <div className={styles.inspectorSection}>
                      <Typography.Text type="secondary">
                        {t('auth.accessExplorer.accessSummary')}
                      </Typography.Text>
                      <div className={styles.inspectorRoles}>
                        {inspectedAccount.roles?.length ? (
                          inspectedAccount.roles.map((accountRole) => (
                            <Tag color="blue" key={accountRole}>
                              {accountRole}
                            </Tag>
                          ))
                        ) : (
                          <Typography.Text type="secondary">
                            {t('auth.accessExplorer.noRoles')}
                          </Typography.Text>
                        )}
                      </div>
                      <Button
                        aria-label={t('auth.accessExplorer.editGlobalAccess')}
                        className={styles.inspectorTabAction}
                        disabled={!canWrite}
                        icon={<SettingOutlined />}
                        onClick={() => void openQuickAccess(inspectedAccount)}
                        size="small"
                        type="primary"
                      >
                        {t('auth.accessExplorer.editGlobalAccess')}
                      </Button>
                    </div>
                  ),
                },
                {
                  key: 'security',
                  label: t('auth.accessExplorer.securitySettings'),
                  children: (
                    <div className={styles.inspectorSection}>
                      <Typography.Text type="secondary">
                        {t('auth.accessExplorer.securitySummary')}
                      </Typography.Text>
                      <Form
                        className={styles.inspectorPasswordForm}
                        form={securityPasswordForm}
                        layout="vertical"
                        onFinish={({ password }) =>
                          securityPasswordMutation.mutate({
                            accountId: inspectedAccount.id,
                            password,
                          })
                        }
                      >
                        <Form.Item
                          label={t('auth.accountSecurity.newPassword')}
                          name="password"
                          rules={[{ min: 6, required: true }]}
                        >
                          <Input.Password autoComplete="new-password" disabled={!canWrite} />
                        </Form.Item>
                        <Button
                          className={styles.inspectorTabAction}
                          disabled={!canWrite}
                          htmlType="submit"
                          loading={securityPasswordMutation.isPending}
                          size="small"
                          type="primary"
                        >
                          {t('auth.accountSecurity.resetPassword')}
                        </Button>
                      </Form>
                      <div className={styles.inspectorSecurityActions}>
                        <Button
                          disabled={!canWrite}
                          onClick={() => setPendingInspectorSecurityAction('revoke-sessions')}
                          size="small"
                        >
                          {t('auth.accountSecurity.revokeSessions')}
                        </Button>
                        {normalize(inspectedAccount.status) === 'active' ? (
                          <Button
                            danger
                            disabled={!canWrite}
                            onClick={() => setPendingInspectorSecurityAction('deactivate')}
                            size="small"
                          >
                            {t('auth.accountSecurity.deactivate')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </aside>
        ) : null}
      </div>

      {selectedAccountIds.length > 0 && canWrite ? (
        <div className={styles.bulkBar}>
          <span className={styles.bulkBarLabel}>
            {t('auth.accessExplorer.selectedCount', {
              count: selectedAccountIds.length,
              defaultValue: `${selectedAccountIds.length} account(s) selected`,
            })}
          </span>
          <div className={styles.bulkBarActions}>
            <Button onClick={() => void openBulkAssign()}>
              {t('auth.accessExplorer.bulkAssign', 'Bulk assign')}
            </Button>
            <Button danger onClick={() => setIsBulkRevokeOpen(true)}>
              {t('auth.accessExplorer.bulkRevoke', 'Revoke now')}
            </Button>
            <Button type="text" onClick={() => setSelectedAccountIds([])}>
              {t('auth.accessExplorer.clearSelection', 'Clear')}
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(quickAccessAccount)}
        title={`${t('auth.accessEditor.globalAccess')} - ${quickAccessAccount?.email ?? ''}`}
        onCancel={closeQuickAccess}
        width={1180}
        bodyStyle={{ paddingBottom: 16 }}
        footer={null}
        destroyOnHidden
      >
        <Spin spinning={isOpeningQuickAccess}>
          <Form form={quickAccessForm} layout="vertical" onFinish={saveQuickAccess}>
            <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
              <Select
                mode="multiple"
                options={createRoleOptions}
                loading={roleCatalogQuery.isLoading}
              />
            </Form.Item>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Form.Item
                label={t('auth.accessEditor.validFrom', 'Valid from')}
                name="validFrom"
                style={{ flex: 1, minWidth: 220 }}
              >
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
              <Form.Item
                label={t('auth.accessEditor.validUntil', 'Valid until')}
                name="validUntil"
                style={{ flex: 1, minWidth: 220 }}
              >
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </div>
            <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
              <PermissionCheckboxGroup
                sections={permissionSections}
                columns={4}
                searchPlaceholder={t('auth.accessEditor.searchPermissions')}
                emptyText={t('auth.accessEditor.emptyPermissionSearch')}
              />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={closeQuickAccess}>{t('auth.accessEditor.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={quickAccessMutation.isPending}>
                {t('auth.accessEditor.saveGlobal')}
              </Button>
            </div>
          </Form>
        </Spin>
      </Modal>

      <Modal
        open={isBulkAssignOpen}
        title={t('auth.accessEditor.globalAccess')}
        onCancel={closeBulkAssign}
        width={1180}
        bodyStyle={{ paddingBottom: 16 }}
        footer={null}
        destroyOnHidden
      >
        <p>
          {t(
            'auth.accessExplorer.selectedAccounts',
            `${selectedAccountIds.length} account(s) selected`,
          )}
        </p>
        <Form form={bulkAccessForm} layout="vertical" onFinish={saveBulkAccess}>
          <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
            <Select
              mode="multiple"
              options={createRoleOptions}
              loading={roleCatalogQuery.isLoading}
            />
          </Form.Item>
          <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Form.Item
              label={t('auth.accessEditor.validFrom', 'Valid from')}
              name="validFrom"
              style={{ flex: 1, minWidth: 220 }}
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item
              label={t('auth.accessEditor.validUntil', 'Valid until')}
              name="validUntil"
              style={{ flex: 1, minWidth: 220 }}
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeBulkAssign}>{t('auth.accessEditor.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={bulkAccessMutation.isPending}>
              {t('auth.accessEditor.saveGlobal')}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        open={isCreateOpen}
        title={t('auth.accessExplorer.createAccount')}
        onCancel={closeCreateAccount}
        width={1180}
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
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeCreateAccount}>{t('auth.accessEditor.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              {t('auth.accessExplorer.create')}
            </Button>
          </div>
        </Form>
      </Modal>

      <ConfirmDangerModal
        open={Boolean(pendingInspectorSecurityAction)}
        title={
          pendingInspectorSecurityAction === 'revoke-sessions'
            ? t('auth.accountSecurity.revokeSessionsTitle')
            : t('auth.accountSecurity.deactivateTitle')
        }
        description={
          pendingInspectorSecurityAction === 'revoke-sessions'
            ? t('auth.accountSecurity.revokeSessionsDescription')
            : t('auth.accountSecurity.deactivateDescription')
        }
        confirmLabel={
          pendingInspectorSecurityAction === 'revoke-sessions'
            ? t('auth.accountSecurity.revokeSessions')
            : t('auth.accountSecurity.deactivate')
        }
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={revokeSessionsMutation.isPending || deactivateAccountMutation.isPending}
        onCancel={() => setPendingInspectorSecurityAction(undefined)}
        onConfirm={confirmInspectorSecurityAction}
      />

      <ConfirmDangerModal
        open={isBulkRevokeOpen}
        title={t('auth.accessExplorer.bulkRevokeTitle', 'Revoke selected access now?')}
        description={t(
          'auth.accessExplorer.bulkRevokeDescription',
          'This immediately removes global access from selected accounts. Scoped access is not changed.',
        )}
        confirmIcon={<DeleteOutlined aria-hidden />}
        confirmLabel={t('auth.accessExplorer.bulkRevoke', 'Revoke now')}
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={bulkRevokeMutation.isPending}
        onCancel={() => setIsBulkRevokeOpen(false)}
        onConfirm={() => bulkRevokeMutation.mutate(selectedAccountIds)}
      />
    </section>
  )
}
