import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  IdcardOutlined,
  KeyOutlined,
  LockOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  UnlockOutlined,
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
import { AccessDeniedResult } from '@/shared/auth/AccessDeniedResult'
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

function roleCodesForScope(
  account: AccessExplorerSnapshot['accounts']['items'][number],
  scopeType: string,
) {
  return [
    ...new Set(
      (account.roleAssignments ?? [])
        .filter((assignment) => assignment.scopeType?.toLowerCase() === scopeType)
        .map((assignment) => assignment.roleCode)
        .filter((roleCode): roleCode is string => Boolean(roleCode)),
    ),
  ]
}

type MatrixModuleKey = 'orders' | 'catalog' | 'design' | 'hr' | 'reports'
type PermLevel = 'FULL' | 'WRITE' | 'READ' | 'NONE'

function getModuleLevel(
  account: AccessExplorerSnapshot['accounts']['items'][number],
  module: MatrixModuleKey,
): PermLevel {
  const allRoles = new Set([
    ...(account.roles ?? []).map((r) => r.toUpperCase()),
    ...(account.roleAssignments ?? []).map((a) => (a.roleCode ?? '').toUpperCase()).filter(Boolean),
  ])

  if (allRoles.has('SUPER_ADMIN') || allRoles.has('ADMIN')) {
    return 'FULL'
  }

  switch (module) {
    case 'orders': {
      if (allRoles.has('OPS_MANAGER') || allRoles.has('ORDER_MANAGER')) return 'FULL'
      if (
        allRoles.has('OPS_LEADER') ||
        allRoles.has('SALES_LEADER') ||
        allRoles.has('OPS_OPERATOR')
      )
        return 'WRITE'
      if (allRoles.has('OPS_VIEWER') || allRoles.has('REVIEWER') || allRoles.has('SALES_VIEWER'))
        return 'READ'
      return 'NONE'
    }
    case 'catalog': {
      if (allRoles.has('CATALOG_MANAGER') || allRoles.has('PRODUCT_MANAGER')) return 'FULL'
      if (
        allRoles.has('CATALOG_EDITOR') ||
        allRoles.has('PRODUCT_EDITOR') ||
        allRoles.has('DESIGNER') ||
        allRoles.has('DESIGN_LEADER')
      )
        return 'WRITE'
      if (allRoles.has('CATALOG_VIEWER') || allRoles.has('REVIEWER')) return 'READ'
      return 'NONE'
    }
    case 'design': {
      if (allRoles.has('DESIGN_LEADER') || allRoles.has('DESIGN_MANAGER')) return 'FULL'
      if (allRoles.has('DESIGNER')) return 'WRITE'
      if (allRoles.has('REVIEWER')) return 'READ'
      return 'NONE'
    }
    case 'hr': {
      if (allRoles.has('HR_MANAGER') || allRoles.has('HR_ADMIN')) return 'FULL'
      if (allRoles.has('LEADER') || allRoles.has('HR_STAFF')) return 'WRITE'
      if (allRoles.has('EMPLOYEE') || allRoles.has('HR_VIEWER')) return 'READ'
      return 'NONE'
    }
    case 'reports': {
      if (allRoles.has('FINANCE_MANAGER') || allRoles.has('REPORT_MANAGER')) return 'FULL'
      if (allRoles.has('SALES_LEADER') || allRoles.has('FINANCE_STAFF')) return 'WRITE'
      if (
        allRoles.has('OPS_VIEWER') ||
        allRoles.has('FINANCE_VIEWER') ||
        allRoles.has('REPORT_VIEWER')
      )
        return 'READ'
      return 'NONE'
    }
  }
}

function renderMatrixBadge(level: PermLevel, t: (key: string) => string) {
  switch (level) {
    case 'FULL':
      return (
        <span className={`${styles.matrixBadge} ${styles.badgeFull}`}>
          {t('auth.accessExplorer.permFull')}
        </span>
      )
    case 'WRITE':
      return (
        <span className={`${styles.matrixBadge} ${styles.badgeWrite}`}>
          {t('auth.accessExplorer.permWrite')}
        </span>
      )
    case 'READ':
      return (
        <span className={`${styles.matrixBadge} ${styles.badgeRead}`}>
          {t('auth.accessExplorer.permRead')}
        </span>
      )
    default:
      return <span className={`${styles.matrixBadge} ${styles.badgeNone}`}>—</span>
  }
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
  const inspectedAccountDetailQuery = useQuery({
    queryKey: accountKeys.detail(inspectedAccountId ?? ''),
    queryFn: () => loadAccount(inspectedAccountId!),
    enabled: Boolean(inspectedAccountId),
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
          if (!entry.teams.some((t) => t.id === account.team!.id)) {
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
          dept.teams.some((t) => t.name.toLowerCase().includes(searchLower)),
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
      await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
      if (inspectedAccountId) {
        await queryClient.invalidateQueries({ queryKey: accountKeys.detail(inspectedAccountId) })
      }
      showFeedbackToast('success', t('actionFeedback.saved'))
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
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

  const effectivePermissionsList = useMemo(() => {
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
    const groups = new Map<string, typeof effectivePermissionsList>()
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
        const detail = await loadAccount(selectedAccountIds[0])
        bulkAccessForm.setFieldsValue({
          roleIds: detail.access?.roleIds ?? detail.account.roles ?? [],
          customPermissionIds: detail.access?.customPermissionIds ?? [],
          validFrom: detail.access?.validFrom ? dayjs(detail.access.validFrom) : null,
          validUntil: detail.access?.validUntil ? dayjs(detail.access.validUntil) : null,
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

  if (!canRead) return <AccessDeniedResult />

  return (
    <section className={styles.page}>
      <div className={styles.workspace}>
        {/* ==================== CỘT 1: CÂY TỔ CHỨC & SCOPE ==================== */}
        <aside
          className={styles.scopeSidebar}
          aria-label={t('auth.accessExplorer.scopesNavigation', 'Phạm vi & Tổ chức')}
        >
          <div className={styles.scopeHeader}>
            <span>{t('auth.accessExplorer.scopesNavigation', 'Phạm vi & Tổ chức')}</span>
            <Tag color="blue">{allAccounts.length}</Tag>
          </div>
          <div className={styles.scopeSearch}>
            <Input
              size="small"
              placeholder={t('auth.accessExplorer.searchScopes', 'Lọc phạm vi...')}
              value={scopeSearch}
              onChange={(e) => setScopeSearch(e.target.value)}
              allowClear
            />
          </div>
          <div className={styles.scopeList}>
            {/* All accounts node */}
            <button
              type="button"
              className={
                selectedScopeId === 'ALL'
                  ? `${styles.scopeItem} ${styles.scopeItemActive}`
                  : styles.scopeItem
              }
              onClick={() => {
                setSelectedScopeId('ALL')
                setCurrentPage(1)
              }}
            >
              <span>🌐 {t('auth.accessExplorer.allScopes', 'Tất cả tài khoản')}</span>
              <span className={styles.scopeCountBadge}>{getScopeAccountCount('ALL')}</span>
            </button>

            {/* Global Admin node */}
            <button
              type="button"
              className={
                selectedScopeId === 'global'
                  ? `${styles.scopeItem} ${styles.scopeItemActive}`
                  : styles.scopeItem
              }
              onClick={() => {
                setSelectedScopeId('global')
                setCurrentPage(1)
              }}
            >
              <span>⭐ {t('auth.accessExplorer.globalScope', 'Toàn cục (Global)')}</span>
              <span className={styles.scopeCountBadge}>{getScopeAccountCount('global')}</span>
            </button>

            {/* Departments & Teams */}
            {scopeCategories.departments.length > 0 ? (
              <>
                <div className={styles.scopeCategoryHeader}>
                  🏢 {t('auth.accessExplorer.departmentScope', 'Phòng ban')}
                </div>
                {scopeCategories.departments.map((dept) => {
                  const isDeptSelected = selectedScopeId === dept.id
                  return (
                    <div key={dept.id}>
                      <button
                        type="button"
                        className={
                          isDeptSelected
                            ? `${styles.scopeItem} ${styles.scopeItemActive}`
                            : styles.scopeItem
                        }
                        onClick={() => {
                          setSelectedScopeId(dept.id)
                          setCurrentPage(1)
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{dept.name}</span>
                        <span className={styles.scopeCountBadge}>
                          {getScopeAccountCount(dept.id, 'department')}
                        </span>
                      </button>
                      {dept.teams.map((team) => {
                        const isTeamSelected = selectedScopeId === team.id
                        return (
                          <button
                            type="button"
                            key={team.id}
                            style={{ paddingLeft: 20 }}
                            className={
                              isTeamSelected
                                ? `${styles.scopeItem} ${styles.scopeItemActive}`
                                : styles.scopeItem
                            }
                            onClick={() => {
                              setSelectedScopeId(team.id)
                              setCurrentPage(1)
                            }}
                          >
                            <span>👥 {team.name}</span>
                            <span className={styles.scopeCountBadge}>
                              {getScopeAccountCount(team.id, 'team')}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            ) : null}

            {/* Shops & Vendors */}
            {scopeCategories.shopsAndVendors.length > 0 ? (
              <>
                <div className={styles.scopeCategoryHeader}>
                  🏪 {t('auth.accessExplorer.shopScope', 'Cửa hàng & Vendor')}
                </div>
                {scopeCategories.shopsAndVendors.map((item) => {
                  const isSelected = selectedScopeId === item.id
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={
                        isSelected
                          ? `${styles.scopeItem} ${styles.scopeItemActive}`
                          : styles.scopeItem
                      }
                      onClick={() => {
                        setSelectedScopeId(item.id)
                        setCurrentPage(1)
                      }}
                    >
                      <span>
                        {item.type === 'shop' ? '🛍️' : '🚚'} {item.name}
                      </span>
                      <span className={styles.scopeCountBadge}>
                        {getScopeAccountCount(item.id, item.type)}
                      </span>
                    </button>
                  )
                })}
              </>
            ) : null}
          </div>
          <div className={styles.keyboardHint}>
            {t('auth.accessExplorer.keyboardHint', 'Dùng phím ↑ ↓ để duyệt nhanh')}
          </div>
        </aside>

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
                <span>{t('auth.accessExplorer.globalRoles')}</span>
                <span>{t('auth.accessExplorer.teamAccess')}</span>
                <span className={styles.matrixColHeader}>
                  {t('auth.accessExplorer.matrixOrders')}
                </span>
                <span className={styles.matrixColHeader}>
                  {t('auth.accessExplorer.matrixCatalog')}
                </span>
                <span className={styles.matrixColHeader}>
                  {t('auth.accessExplorer.matrixDesign')}
                </span>
                <span className={styles.matrixColHeader}>{t('auth.accessExplorer.matrixHr')}</span>
                <span className={styles.matrixColHeader}>
                  {t('auth.accessExplorer.matrixReports')}
                </span>
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
                  const isSelected = inspectedAccountId === account.id
                  const globalRoles = roleCodesForScope(account, 'global')
                  const teamRoles = roleCodesForScope(account, 'team')
                  const globalRoleDisplay = account.roleAssignments
                    ? globalRoles
                    : (account.roles ?? [])
                  const orderLevel = getModuleLevel(account, 'orders')
                  const catalogLevel = getModuleLevel(account, 'catalog')
                  const designLevel = getModuleLevel(account, 'design')
                  const hrLevel = getModuleLevel(account, 'hr')
                  const reportsLevel = getModuleLevel(account, 'reports')

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
                      <div className={styles.accountRoles}>
                        {globalRoleDisplay.length ? (
                          <Tag color="blue">{globalRoleDisplay.join(', ')}</Tag>
                        ) : (
                          <Typography.Text type="secondary" className={styles.accountMeta}>
                            {t('auth.accessExplorer.noRoles')}
                          </Typography.Text>
                        )}
                      </div>
                      <div className={styles.teamAccess}>
                        {teamRoles.length ? (
                          <Tag color="cyan">
                            {account.team?.name ?? t('auth.accessExplorer.teamScope')} ·{' '}
                            {teamRoles.join(', ')}
                          </Tag>
                        ) : (
                          <Typography.Text type="secondary" className={styles.accountMeta}>
                            {t('auth.accessExplorer.noTeamAccess')}
                          </Typography.Text>
                        )}
                      </div>

                      <div className={styles.matrixCell}>{renderMatrixBadge(orderLevel, t)}</div>
                      <div className={styles.matrixCell}>{renderMatrixBadge(catalogLevel, t)}</div>
                      <div className={styles.matrixCell}>{renderMatrixBadge(designLevel, t)}</div>
                      <div className={styles.matrixCell}>{renderMatrixBadge(hrLevel, t)}</div>
                      <div className={styles.matrixCell}>{renderMatrixBadge(reportsLevel, t)}</div>

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
                              ...(canWrite
                                ? [
                                    {
                                      key: 'scoped-access',
                                      icon: <KeyOutlined />,
                                      label: t('auth.accessExplorer.manageScopedAccess'),
                                    },
                                  ]
                                : []),
                              {
                                key: 'security',
                                icon: <KeyOutlined />,
                                label: t('auth.accessExplorer.securitySettings'),
                              },
                            ],
                            onClick: ({ key }) => {
                              if (key === 'details') openInspector(account)
                              if (key === 'global-access') openInspector(account, 'access')
                              if (key === 'scoped-access')
                                navigate(`/auth/accounts/${account.id}/access`)
                              if (key === 'security') openInspector(account, 'security')
                            },
                          }}
                        >
                          <Button
                            aria-label={t('auth.accessEditor.actions')}
                            icon={<MoreOutlined />}
                            loading={isOpeningQuickAccess && quickAccessAccount?.id === account.id}
                            type="text"
                            onClick={(e) => e.stopPropagation()}
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
          <>
            <div
              className={styles.drawerBackdrop}
              onClick={() => setInspectedAccountId(undefined)}
              aria-hidden
            />
            <aside
              className={styles.drawerInspector}
              aria-label={t('auth.accessExplorer.accountInspector')}
            >
              {/* Header: Identity Bar + Meta */}
              <div className={styles.inspectorHeader}>
                <div className={styles.inspectorIdentityRow}>
                  <Avatar size={36} className={styles.inspectorAvatar}>
                    {inspectedAccount.email.charAt(0).toUpperCase()}
                  </Avatar>
                  <div className={styles.inspectorIdentityText}>
                    <div className={styles.inspectorTitleRow}>
                      <Typography.Title level={3} className={styles.inspectorTitle}>
                        {inspectedAccount.email}
                      </Typography.Title>
                      <StatusTag status={statusTone(inspectedAccount.status)}>
                        {inspectedAccount.status ?? t('auth.accessExplorer.unknown')}
                      </StatusTag>
                      {inspectedAccount.team?.name ? (
                        <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
                          {inspectedAccount.team.name}
                        </Tag>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    aria-label={t('auth.accessExplorer.closeInspector')}
                    className={styles.closeInspectorBtn}
                    icon={<CloseOutlined />}
                    onClick={() => setInspectedAccountId(undefined)}
                    type="text"
                  />
                </div>

                {/* Meta Info Strip */}
                <div className={styles.inspectorMetaInline}>
                  <span>
                    {t('auth.accessExplorer.lastLogin')}:{' '}
                    <strong>
                      {inspectedAccount.lastLoginAt
                        ? dayjs(inspectedAccount.lastLoginAt).format('DD/MM/YYYY HH:mm')
                        : t('auth.accessExplorer.neverLoggedIn')}
                    </strong>
                    {inspectedAccount.lastLoginIp ? ` (IP: ${inspectedAccount.lastLoginIp})` : ''}
                  </span>
                  <span>•</span>
                  <span>
                    {inspectedAccount.roles?.length ?? 0} {t('auth.accessEditor.roles', 'vai trò')}
                  </span>
                  <span>•</span>
                  <span>
                    {effectivePermissionsList.length} {t('auth.accessEditor.permissions', 'quyền')}
                  </span>
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
                      <>
                        {/* Compact 1-line assigned scopes bar */}
                        <div className={styles.assignedScopesCompact}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>
                              🛡️ {t('auth.accessExplorer.assignedScopes', 'Phân quyền')}:
                            </span>
                            <span style={{ color: 'var(--ant-color-text-secondary)' }}>
                              {t('auth.accessExplorer.globalScope', 'Toàn cục')}:
                            </span>
                            {inspectedAccount.roles?.length ? (
                              inspectedAccount.roles.map((r) => (
                                <Tag color="blue" key={r} style={{ marginInlineEnd: 0 }}>
                                  {r}
                                </Tag>
                              ))
                            ) : (
                              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                {t('auth.accessExplorer.noRoles')}
                              </Typography.Text>
                            )}
                            {(inspectedAccount.roleAssignments ?? []).filter(
                              (a) => a.scopeType !== 'global',
                            ).length > 0 ? (
                              <>
                                <span style={{ color: 'var(--ant-color-text-secondary)' }}>
                                  • {t('auth.accessExplorer.scoped', 'Phạm vi')}:
                                </span>
                                {(inspectedAccount.roleAssignments ?? [])
                                  .filter((a) => a.scopeType !== 'global')
                                  .map((a, idx) => (
                                    <Tag color="cyan" key={idx} style={{ marginInlineEnd: 0 }}>
                                      {a.scopeType}: {a.roleCode}
                                    </Tag>
                                  ))}
                              </>
                            ) : null}
                          </div>
                          {canWrite && (
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto', fontSize: 11 }}
                              onClick={() =>
                                navigate(`/auth/accounts/${inspectedAccount.id}/access`)
                              }
                            >
                              {t('auth.accessExplorer.manageScopedAccess')} →
                            </Button>
                          )}
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <div className={styles.permMatrixHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Typography.Text strong style={{ fontSize: 13 }}>
                                ⚡ {t('auth.accessExplorer.effectiveMatrix', 'Quyền thực tế')}
                              </Typography.Text>
                              <Tag color="blue" style={{ borderRadius: 999 }}>
                                {effectivePermissionsList.length}
                              </Tag>
                            </div>
                            <Input
                              className={styles.permSearch}
                              size="small"
                              placeholder={t(
                                'auth.accessExplorer.searchPermissions',
                                'Tìm kiếm quyền...',
                              )}
                              value={permSearch}
                              onChange={(e) => setPermSearch(e.target.value)}
                              allowClear
                            />
                          </div>

                          {availablePermModules.length > 1 && (
                            <div className={styles.permModuleFilters} style={{ marginBottom: 10 }}>
                              {availablePermModules.map((mod) => (
                                <Button
                                  key={mod}
                                  size="small"
                                  type={selectedPermModule === mod ? 'primary' : 'default'}
                                  onClick={() => setSelectedPermModule(mod)}
                                  style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                                >
                                  {mod === 'ALL'
                                    ? t('auth.accessExplorer.allModules', 'Tất cả')
                                    : mod}
                                </Button>
                              ))}
                            </div>
                          )}

                          <div className={styles.permModulesList}>
                            {inspectedAccountDetailQuery.isLoading ? (
                              <Skeleton active paragraph={{ rows: 3 }} />
                            ) : groupedEffectivePermissions.length === 0 ? (
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {t(
                                  'auth.accessExplorer.emptyPermissionsDescription',
                                  'Tài khoản chưa có quyền hiệu lực nào.',
                                )}
                              </Typography.Text>
                            ) : (
                              groupedEffectivePermissions.map(({ module, perms }) => (
                                <div key={module} className={styles.permModuleCard}>
                                  <div className={styles.permModuleTitle}>
                                    <span>
                                      {module} ({perms.length})
                                    </span>
                                  </div>
                                  <div className={styles.permPillList}>
                                    {perms.map((p) => (
                                      <div key={p.code} className={styles.permPill}>
                                        <span>{p.code}</span>
                                        <span className={styles.provenanceBadge}>
                                          {p.provenance}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
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
                              icon={<LockOutlined />}
                              onClick={() => setPendingInspectorSecurityAction('deactivate')}
                              size="small"
                            >
                              {t('auth.accountSecurity.deactivate')}
                            </Button>
                          ) : (
                            <Button
                              disabled={!canWrite}
                              icon={<UnlockOutlined />}
                              loading={toggleStatusMutation.isPending}
                              onClick={() => toggleStatusMutation.mutate('active')}
                              size="small"
                            >
                              {t('auth.accessExplorer.unlockAccount', 'Mở khóa tài khoản')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </aside>
          </>
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
