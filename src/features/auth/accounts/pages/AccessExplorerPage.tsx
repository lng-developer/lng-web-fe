import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
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
import { AccessDeniedResult } from '@/shared/auth/AccessDeniedResult'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { modalQueryOptions } from '@/shared/query/modalQuery'
import { useFeedbackToast } from '@/shared/ui'

import { type AccessExplorerSnapshot } from '../../api/accessExplorerApi'
import { accountKeys } from '../api/accountKeys'
import {
  createAccount,
  loadAccount,
  resetAccountPassword,
  revokeAccountSessions,
  type CreateAccountInput,
  updateAccountStatus,
} from '../api/accountManagementApi'
import { useAccessAccountsQuery } from '../hooks'
import {
  AccessExplorerAccountInspector,
  type EffectivePermissionItem,
} from '../components/AccessExplorerAccountInspector'
import {
  AccessExplorerActionModals,
  type BulkAccessFormValues,
  type CreateAccountFormValues,
  type ScopeType,
} from '../components/AccessExplorerActionModals'
import { type AccessAccountItem, normalize } from '../utils/accessExplorerHelpers'
import { AccessExplorerAccountsTable } from '../components/AccessExplorerAccountsTable'
import { AccessExplorerScopeSidebar } from '../components/AccessExplorerScopeSidebar'
import styles from './AccessExplorerPage.module.scss'

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
  const [createForm] = Form.useForm<CreateAccountFormValues>()

  const [quickAccessAccount, setQuickAccessAccount] = useState<AccessAccountItem>()
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [selectedScopeId, setSelectedScopeId] = useState<string>('ALL')
  const [scopeSearch, setScopeSearch] = useState('')
  const [permSearch, setPermSearch] = useState('')
  const [selectedPermModule, setSelectedPermModule] = useState<string>('ALL')
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
  const [pendingInspectorSecurityAction, setPendingInspectorSecurityAction] = useState<
    'deactivate' | 'revoke-sessions'
  >()
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
  const inspectedAccountDetailQuery = useQuery({
    queryKey: accountKeys.detail(inspectedAccountId ?? ''),
    queryFn: () => loadAccount(inspectedAccountId!),
    enabled: Boolean(inspectedAccountId),
  })

  const createRoleOptions = useMemo(
    () =>
      (roleCatalogQuery.data?.roles.items ?? []).map((r) => ({
        label: r.name ?? r.code,
        value: r.id,
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
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
  })

  const securityPasswordMutation = useMutation({
    mutationFn: ({ accountId, password }: { accountId: string; password: string }) =>
      resetAccountPassword(accountId, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
  })

  const revokeSessionsMutation = useMutation({
    mutationFn: (accountId: string) => revokeAccountSessions(accountId),
    onSuccess: async () => {
      setPendingInspectorSecurityAction(undefined)
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
  })

  const deactivateAccountMutation = useMutation({
    mutationFn: (accountId: string) => updateAccountStatus(accountId, 'inactive'),
    onSuccess: async () => {
      setPendingInspectorSecurityAction(undefined)
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      showFeedbackToast('success', t('actionFeedback.deactivated'))
    },
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
  })

  const bulkAccessMutation = useMutation({
    mutationFn: (payload: BulkGlobalAccessInput) => bulkUpdateGlobalAccess(payload),
    onSuccess: async () => {
      setIsBulkAssignOpen(false)
      bulkAccessForm.resetFields()
      setSelectedAccountIds([])
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
  })

  const bulkRevokeMutation = useMutation({
    mutationFn: (accountIds: string[]) => bulkRevokeGlobalAccess({ accountIds }),
    onSuccess: async () => {
      setIsBulkRevokeOpen(false)
      setSelectedAccountIds([])
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
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
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
  })

  const allAccounts = useMemo(() => data?.items ?? [], [data?.items])
  const searchValue = search.trim().toLowerCase()
  const statusFilter = normalize(status)
  const roleFilter = normalize(role)

  const scopeCategories = useMemo(() => {
    const searchLower = scopeSearch.trim().toLowerCase()
    const deptMap = new Map<
      string,
      { id: string; name: string; type: 'department'; teams: { id: string; name: string }[] }
    >()

    allAccounts.forEach((account) => {
      if (account.department) {
        if (!deptMap.has(account.department.id)) {
          deptMap.set(account.department.id, {
            id: account.department.id,
            name: account.department.name,
            type: 'department',
            teams: [],
          })
        }
        if (account.team) {
          const entry = deptMap.get(account.department.id)!
          if (!entry.teams.some((team) => team.id === account.team!.id)) {
            entry.teams.push({ id: account.team.id, name: account.team.name })
          }
        }
      }
      ;(account.roleAssignments ?? []).forEach((assignment) => {
        if (assignment.scopeType === 'department' && assignment.scopeId) {
          if (!deptMap.has(assignment.scopeId)) {
            deptMap.set(assignment.scopeId, {
              id: assignment.scopeId,
              name: assignment.scopeId,
              type: 'department',
              teams: [],
            })
          }
        }
      })
    })
    ;(scopeQuery.data?.items ?? []).forEach((scope) => {
      if (scope.scopeType === 'department') {
        const existing = deptMap.get(scope.scopeId)
        if (existing) {
          existing.name = scope.name
        } else {
          deptMap.set(scope.scopeId, {
            id: scope.scopeId,
            name: scope.name,
            type: 'department',
            teams: [],
          })
        }
      }
    })

    const shopsAndVendors: { id: string; name: string; type: 'shop' | 'vendor' }[] = []
    ;(scopeQuery.data?.items ?? []).forEach((scope) => {
      if (scope.scopeType === 'shop' || scope.scopeType === 'vendor') {
        shopsAndVendors.push({ id: scope.scopeId, name: scope.name, type: scope.scopeType })
      }
    })

    return {
      departments: Array.from(deptMap.values()).filter(
        (dept) =>
          !searchLower ||
          dept.name.toLowerCase().includes(searchLower) ||
          dept.teams.some((team) => team.name.toLowerCase().includes(searchLower)),
      ),
      shopsAndVendors: shopsAndVendors.filter(
        (item) => !searchLower || item.name.toLowerCase().includes(searchLower),
      ),
    }
  }, [allAccounts, scopeQuery.data?.items, scopeSearch])

  const getScopeAccountCount = (scopeId: string, scopeType?: string) => {
    if (scopeId === 'ALL') return allAccounts.length
    if (scopeId === 'global') {
      return allAccounts.filter(
        (acc) =>
          (acc.roles && acc.roles.length > 0) ||
          (acc.roleAssignments ?? []).some((asg) => asg.scopeType === 'global'),
      ).length
    }
    return allAccounts.filter((acc) => {
      if (scopeType === 'department') {
        return (
          acc.department?.id === scopeId ||
          (acc.roleAssignments ?? []).some(
            (asg) => asg.scopeType === 'department' && asg.scopeId === scopeId,
          )
        )
      }
      if (scopeType === 'team') {
        return (
          acc.team?.id === scopeId ||
          (acc.roleAssignments ?? []).some(
            (asg) => asg.scopeType === 'team' && asg.scopeId === scopeId,
          )
        )
      }
      return (acc.roleAssignments ?? []).some((asg) => asg.scopeId === scopeId)
    }).length
  }

  const accounts = useMemo(
    () =>
      allAccounts.filter((account) => {
        if (selectedScopeId !== 'ALL') {
          if (selectedScopeId === 'global') {
            const hasGlobal =
              (account.roles && account.roles.length > 0) ||
              (account.roleAssignments ?? []).some((asg) => asg.scopeType === 'global')
            if (!hasGlobal) return false
          } else {
            const inDept = account.department?.id === selectedScopeId
            const inTeam = account.team?.id === selectedScopeId
            const inAssignment = (account.roleAssignments ?? []).some(
              (asg) => asg.scopeId === selectedScopeId,
            )
            if (!inDept && !inTeam && !inAssignment) return false
          }
        }

        const matchesSearch =
          account.email.toLowerCase().includes(searchValue) ||
          (account.team?.name?.toLowerCase().includes(searchValue) ?? false) ||
          (account.department?.name?.toLowerCase().includes(searchValue) ?? false)
        const matchesStatus = !statusFilter || normalize(account.status) === statusFilter
        const matchesRole =
          !roleFilter || account.roles?.some((accountRole) => normalize(accountRole) === roleFilter)
        return matchesSearch && matchesStatus && matchesRole
      }),
    [allAccounts, roleFilter, searchValue, selectedScopeId, statusFilter],
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
  const hasFilters = Boolean(searchValue || statusFilter || roleFilter || selectedScopeId !== 'ALL')

  const toggleStatusMutation = useMutation({
    mutationFn: (targetStatus: 'active' | 'inactive') =>
      updateAccountStatus(inspectedAccount!.id, targetStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKeys.all() })
      if (inspectedAccountId) {
        await queryClient.invalidateQueries({ queryKey: accountKeys.detail(inspectedAccountId) })
      }
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (err) => showFeedbackToast('error', t('actionFeedback.failed'), err.message),
  })

  // Keyboard navigation for fast operator workflow
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && inspectedAccountId) {
        setInspectedAccountId(undefined)
        return
      }

      const activeTag = (document.activeElement?.tagName || '').toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea') return

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const currentIndex = paginatedAccounts.findIndex(
          (account) => account.id === inspectedAccountId,
        )
        if (event.key === 'ArrowDown' && currentIndex < paginatedAccounts.length - 1) {
          setInspectedAccountId(paginatedAccounts[currentIndex + 1].id)
        } else if (event.key === 'ArrowUp' && currentIndex > 0) {
          setInspectedAccountId(paginatedAccounts[currentIndex - 1].id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inspectedAccountId, paginatedAccounts])

  const effectivePermissionsList = useMemo<EffectivePermissionItem[]>(() => {
    const detail = inspectedAccountDetailQuery.data
    const perms = detail?.effectivePermissions ?? []
    const scopes = detail?.scopes ?? []
    const searchLower = permSearch.trim().toLowerCase()

    return perms
      .map((code) => {
        const mod = code.includes(':') ? code.split(':')[0] : 'GENERAL'
        let provenance = 'Inherited'

        const matchingScope = scopes.find((s) => s.permissions?.includes(code))
        if (matchingScope) {
          provenance = `${matchingScope.scopeName || matchingScope.scopeType} (${matchingScope.roles?.join(', ') || 'Scoped'})`
        } else if (detail?.permissions?.includes(code)) {
          provenance = 'Global'
        } else if (detail?.access?.customPermissionIds?.length) {
          provenance = 'Custom'
        }

        return { code, module: mod, provenance }
      })
      .filter((p) => {
        const matchMod = selectedPermModule === 'ALL' || p.module === selectedPermModule
        const matchSearch =
          !searchLower ||
          p.code.toLowerCase().includes(searchLower) ||
          p.provenance.toLowerCase().includes(searchLower)
        return matchMod && matchSearch
      })
  }, [inspectedAccountDetailQuery.data, permSearch, selectedPermModule])

  const groupedEffectivePermissions = useMemo(() => {
    const groups = new Map<string, EffectivePermissionItem[]>()
    for (const item of effectivePermissionsList) {
      const list = groups.get(item.module) ?? []
      list.push(item)
      groups.set(item.module, list)
    }
    return Array.from(groups.entries()).map(([module, perms]) => ({ module, perms }))
  }, [effectivePermissionsList])

  const availablePermModules = useMemo(() => {
    const perms = inspectedAccountDetailQuery.data?.effectivePermissions ?? []
    const mods = new Set(perms.map((code) => (code.includes(':') ? code.split(':')[0] : 'GENERAL')))
    return ['ALL', ...mods]
  }, [inspectedAccountDetailQuery.data?.effectivePermissions])

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

  const openQuickAccess = async (account: AccessExplorerSnapshot['accounts']['items'][number]) => {
    quickAccessForm.resetFields()
    setQuickAccessAccount(account)
    setIsOpeningQuickAccess(true)
    try {
      const detail = await loadAccount(account.id)
      quickAccessForm.setFieldsValue({
        roleIds: detail.access?.roleIds ?? detail.account.roles ?? [],
        customPermissionIds: detail.access?.customPermissionIds ?? [],
        validFrom: detail.access?.validFrom ? dayjs(detail.access.validFrom) : null,
        validUntil: detail.access?.validUntil ? dayjs(detail.access.validUntil) : null,
      })
    } catch {
      quickAccessForm.resetFields()
    } finally {
      setIsOpeningQuickAccess(false)
    }
  }

  const openBulkAssign = async () => {
    setIsBulkAssignOpen(true)
    bulkAccessForm.resetFields()
    if (selectedAccountIds.length === 1) {
      try {
        const detail = await loadAccount(selectedAccountIds[0])
        bulkAccessForm.setFieldsValue({
          roleIds: detail.access?.roleIds ?? detail.account.roles ?? [],
          customPermissionIds: detail.access?.customPermissionIds ?? [],
          validFrom: detail.access?.validFrom ? dayjs(detail.access.validFrom) : null,
          validUntil: detail.access?.validUntil ? dayjs(detail.access.validUntil) : null,
        })
      } catch (err) {
        showFeedbackToast(
          'error',
          t('actionFeedback.failed'),
          err instanceof Error ? err.message : undefined,
        )
      }
      return
    }

    bulkAccessForm.setFieldsValue({
      roleIds: [],
      customPermissionIds: [],
    })
  }

  if (!canRead) return <AccessDeniedResult />

  return (
    <section className={styles.page}>
      <div className={styles.workspace}>
        <AccessExplorerScopeSidebar
          totalAccounts={allAccounts.length}
          scopeSearch={scopeSearch}
          onScopeSearchChange={setScopeSearch}
          selectedScopeId={selectedScopeId}
          onSelectScope={(scopeId) => {
            setSelectedScopeId(scopeId)
            setCurrentPage(1)
          }}
          scopeCategories={scopeCategories}
          getScopeAccountCount={getScopeAccountCount}
        />

        <AccessExplorerAccountsTable
          accounts={accounts}
          allAccountsCount={allAccounts.length}
          activeAccountsCount={
            allAccounts.filter((account) => normalize(account.status) === 'active').length
          }
          inactiveAccountsCount={
            allAccounts.filter((account) => normalize(account.status) === 'inactive').length
          }
          paginatedAccounts={paginatedAccounts}
          isLoading={isLoading}
          error={error}
          onRefetch={() => void refetch()}
          canWrite={canWrite}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          selectedAccountIds={selectedAccountIds}
          onToggleAccountSelection={(id, checked) => {
            setSelectedAccountIds((prev) =>
              checked
                ? prev.includes(id)
                  ? prev
                  : [...prev, id]
                : prev.filter((item) => item !== id),
            )
          }}
          onToggleCurrentPageSelectAll={(checked) => {
            const pageIds = paginatedAccounts.map((account) => account.id)
            setSelectedAccountIds((prev) => {
              if (!checked) return prev.filter((id) => !pageIds.includes(id))
              const merged = [...prev]
              for (const accountId of pageIds) {
                if (!merged.includes(accountId)) merged.push(accountId)
              }
              return merged
            })
          }}
          isAllCurrentPageSelected={isAllCurrentPageSelected}
          inspectedAccountId={inspectedAccountId}
          onOpenInspector={openInspector}
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setCurrentPage(1)
          }}
          status={status}
          onStatusChange={(value) => {
            setStatus(value)
            setCurrentPage(1)
          }}
          role={role}
          onRoleChange={(value) => {
            setRole(value)
            setCurrentPage(1)
          }}
          roleOptions={roleOptions}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          onOpenCreateAccount={() => {
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
          }}
          onOpenCreateFromProfile={() => navigate('/hr/operations/employees?openCreate=1')}
          isCreateDisabled={roleCatalogQuery.isLoading || scopeQuery.isLoading}
          onOpenBulkAssign={() => void openBulkAssign()}
          onOpenBulkRevoke={() => setIsBulkRevokeOpen(true)}
          onClearBulkSelection={() => setSelectedAccountIds([])}
        />

        {inspectedAccount ? (
          <AccessExplorerAccountInspector
            account={inspectedAccount}
            onClose={() => setInspectedAccountId(undefined)}
            inspectorTab={inspectorTab}
            onTabChange={setInspectorTab}
            canWrite={canWrite}
            effectivePermissionsList={effectivePermissionsList}
            groupedEffectivePermissions={groupedEffectivePermissions}
            availablePermModules={availablePermModules}
            selectedPermModule={selectedPermModule}
            onSelectPermModule={setSelectedPermModule}
            permSearch={permSearch}
            onPermSearchChange={setPermSearch}
            isDetailLoading={inspectedAccountDetailQuery.isLoading}
            onOpenQuickAccess={(acc) => void openQuickAccess(acc)}
            onResetPassword={(password) =>
              securityPasswordMutation.mutate({ accountId: inspectedAccount.id, password })
            }
            isResettingPassword={securityPasswordMutation.isPending}
            onSetPendingSecurityAction={setPendingInspectorSecurityAction}
            onUnlockAccount={() => toggleStatusMutation.mutate('active')}
            isUnlockingAccount={toggleStatusMutation.isPending}
          />
        ) : null}
      </div>

      <AccessExplorerActionModals
        quickAccessAccount={quickAccessAccount}
        quickAccessForm={quickAccessForm}
        onCloseQuickAccess={() => {
          setQuickAccessAccount(undefined)
          quickAccessForm.resetFields()
        }}
        onSaveQuickAccess={(values) => {
          if (!quickAccessAccount?.id) return
          quickAccessMutation.mutate({
            accountId: quickAccessAccount.id,
            roleIds: values.roleIds ?? [],
            customPermissionIds: values.customPermissionIds ?? [],
            validFrom: values.validFrom ? values.validFrom.toISOString() : null,
            validUntil: values.validUntil ? values.validUntil.toISOString() : null,
          })
        }}
        isOpeningQuickAccess={isOpeningQuickAccess}
        isQuickAccessSaving={quickAccessMutation.isPending}
        isBulkAssignOpen={isBulkAssignOpen}
        bulkAccessForm={bulkAccessForm}
        selectedAccountIdsCount={selectedAccountIds.length}
        onCloseBulkAssign={() => {
          setIsBulkAssignOpen(false)
          bulkAccessForm.resetFields()
        }}
        onSaveBulkAccess={(values) => {
          if (selectedAccountIds.length === 0) return
          bulkAccessMutation.mutate({
            accountIds: selectedAccountIds,
            roleIds: values.roleIds ?? [],
            customPermissionIds: values.customPermissionIds ?? [],
            validFrom: values.validFrom ? values.validFrom.toISOString() : null,
            validUntil: values.validUntil ? values.validUntil.toISOString() : null,
          })
        }}
        isBulkAssignSaving={bulkAccessMutation.isPending}
        isCreateOpen={isCreateOpen}
        createForm={createForm}
        createScopeType={createScopeType}
        onScopeTypeChange={(nextScopeType) => {
          setCreateScopeType(nextScopeType)
          createForm.setFieldValue('scopeId', undefined)
        }}
        onCloseCreateAccount={() => {
          setIsCreateOpen(false)
          createForm.resetFields()
        }}
        onSubmitCreateAccount={(values) => {
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
        }}
        isCreateSaving={createMutation.isPending}
        requiresScopeId={requiresScopeId}
        scopedScopeOptions={scopedScopeOptions}
        scopeTypeOptions={scopeTypeOptions}
        isScopeLoading={scopeQuery.isLoading}
        createRoleOptions={createRoleOptions}
        isRoleCatalogLoading={roleCatalogQuery.isLoading}
        permissionSections={permissionSections}
        pendingInspectorSecurityAction={pendingInspectorSecurityAction}
        onCancelSecurityAction={() => setPendingInspectorSecurityAction(undefined)}
        onConfirmSecurityAction={() => {
          if (!inspectedAccount) return
          if (pendingInspectorSecurityAction === 'revoke-sessions') {
            revokeSessionsMutation.mutate(inspectedAccount.id)
          }
          if (pendingInspectorSecurityAction === 'deactivate') {
            deactivateAccountMutation.mutate(inspectedAccount.id)
          }
        }}
        isSecurityActionPending={
          revokeSessionsMutation.isPending || deactivateAccountMutation.isPending
        }
        isBulkRevokeOpen={isBulkRevokeOpen}
        onCancelBulkRevoke={() => setIsBulkRevokeOpen(false)}
        onConfirmBulkRevoke={() => bulkRevokeMutation.mutate(selectedAccountIds)}
        isBulkRevoking={bulkRevokeMutation.isPending}
      />
    </section>
  )
}

export default AccessExplorerPage
