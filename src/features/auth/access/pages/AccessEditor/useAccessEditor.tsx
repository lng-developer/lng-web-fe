import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { BuildOutlined, SafetyCertificateOutlined, ShopOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import dayjs from 'dayjs'

import { hasAnyPermission } from '@/shared/auth/permissions'
import { useFeedbackToast } from '@/shared/ui'

import { type AccessExplorerSnapshot, loadAccessExplorer } from '../../../api/accessExplorerApi'
import {
  type AccessAssignmentInput,
  createAccessAssignment,
  deleteAccessAssignment,
  setScopedRolePermissions,
  updateAccessAssignment,
  updateGlobalAccess,
} from '../../api/accessMutationsApi'

type Assignment = AccessExplorerSnapshot['assignments']['items'][number]
type AssignmentFormValues = Omit<AccessAssignmentInput, 'accountId'>
type GlobalAccessFormValues = {
  customPermissionIds?: string[]
  roleIds?: string[]
  validFrom?: string | null
  validUntil?: string | null
}

export const useAccessEditor = () => {
  const { t } = useTranslation()
  const { accountId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [globalForm] = Form.useForm<GlobalAccessFormValues>()
  const [assignmentForm] = Form.useForm<AssignmentFormValues>()
  const [overrideForm] = Form.useForm<{ permissionIds: string[] }>()

  const [editingAssignment, setEditingAssignment] = useState<Assignment>()
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)
  const [overrideAssignment, setOverrideAssignment] = useState<Assignment>()
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment>()

  const canWrite = hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })

  const accessExplorer = useQuery({
    queryKey: ['access-explorer', accountId],
    queryFn: () => loadAccessExplorer(accountId),
    enabled: Boolean(accountId),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['access-explorer', accountId] })
    await queryClient.invalidateQueries({ queryKey: ['access-accounts'] })
  }

  const globalMutation = useMutation({
    mutationFn: (values: {
      roleIds: string[]
      customPermissionIds: string[]
      validFrom?: string | null
      validUntil?: string | null
    }) => updateGlobalAccess(accountId, values),
    onSuccess: async () => {
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const assignmentMutation = useMutation({
    mutationFn: (values: AssignmentFormValues) =>
      editingAssignment
        ? updateAccessAssignment(editingAssignment.id, values)
        : createAccessAssignment({ ...values, accountId }),
    onSuccess: async () => {
      setEditingAssignment(undefined)
      setIsAssignmentOpen(false)
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccessAssignment,
    onSuccess: async () => {
      setAssignmentToDelete(undefined)
      showFeedbackToast('success', t('actionFeedback.deleted'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const overrideMutation = useMutation({
    mutationFn: (permissionIds: string[]) =>
      setScopedRolePermissions({
        permissionIds,
        roleId: overrideAssignment?.roleId ?? '',
        scopeId: overrideAssignment?.scopeId ?? '',
        scopeType: overrideAssignment?.scopeType ?? '',
      }),
    onSuccess: async () => {
      setOverrideAssignment(undefined)
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  useEffect(() => {
    if (accessExplorer.data?.account.access) {
      globalForm.setFieldsValue({
        customPermissionIds: accessExplorer.data.account.access.customPermissionIds ?? [],
        roleIds: accessExplorer.data.account.access.roleIds ?? [],
        validFrom: accessExplorer.data.account.access.validFrom ?? null,
        validUntil: accessExplorer.data.account.access.validUntil ?? null,
      })
    }
  }, [accessExplorer.data?.account.access, globalForm])

  const roleById = useMemo(
    () => new Map((accessExplorer.data?.roles.items ?? []).map((role) => [role.id, role])),
    [accessExplorer.data?.roles.items],
  )

  const scopeById = useMemo(
    () =>
      new Map(
        (accessExplorer.data?.scopes.items ?? []).map((scope) => [
          scope.scopeId ?? scope.id,
          scope,
        ]),
      ),
    [accessExplorer.data?.scopes.items],
  )

  const scopeOptions = (accessExplorer.data?.scopes.items ?? []).map((scope) => ({
    label: `${scope.name} (${scope.scopeType ?? ''})`,
    value: scope.scopeId ?? scope.id,
  }))

  const roleOptions = (accessExplorer.data?.roles.items ?? []).map((role) => ({
    label: role.name ?? role.code,
    value: role.id,
  }))

  const permissionSections = useMemo(() => {
    const groups = new Map<string, { title: string; options: { label: string; value: string }[] }>()

    for (const permission of accessExplorer.data?.permissions.items ?? []) {
      const label = permission.code
      const key = permission.code.includes(':')
        ? permission.code.split(':')[0]
        : permission.code.includes('.')
          ? permission.code.split('.')[0]
          : permission.code.includes('_')
            ? permission.code.split('_')[0]
            : 'general'

      const group = groups.get(key) ?? { title: key, options: [] }
      group.options.push({ label, value: permission.id })
      groups.set(key, group)
    }

    return Array.from(groups.values())
  }, [accessExplorer.data?.permissions.items])

  const openAssignment = (assignment?: Assignment) => {
    setEditingAssignment(assignment)
    assignmentForm.setFieldsValue(
      assignment ?? {
        customPermissionIds: [],
        roleId: undefined,
        scopeId: undefined,
        scopeType: undefined,
        validFrom: null,
        validUntil: null,
      },
    )
    setIsAssignmentOpen(true)
  }

  const closeAssignment = () => {
    setEditingAssignment(undefined)
    setIsAssignmentOpen(false)
  }

  const openOverride = (assignment: Assignment) => {
    const rule = accessExplorer.data?.scopedRolePermissions.items.find(
      (item) => item.roleId === assignment.roleId && item.scopeId === assignment.scopeId,
    )

    setOverrideAssignment(assignment)
    overrideForm.setFieldsValue({
      permissionIds:
        rule?.permissionIds ?? roleById.get(assignment.roleId ?? '')?.permissions ?? [],
    })
  }

  const closeOverride = () => setOverrideAssignment(undefined)

  const openDeleteAssignment = (assignment: Assignment) => {
    setAssignmentToDelete(assignment)
  }

  const closeDeleteAssignment = () => setAssignmentToDelete(undefined)

  const submitGlobalAccess = (values: GlobalAccessFormValues) => {
    globalMutation.mutate({
      customPermissionIds: values.customPermissionIds ?? [],
      roleIds: values.roleIds ?? [],
      validFrom: values.validFrom ?? null,
      validUntil: values.validUntil ?? null,
    })
  }

  const submitAssignment = (values: Omit<AssignmentFormValues, 'scopeType'>) => {
    const scope = scopeById.get(values.scopeId)
    if (!scope?.scopeType) return

    assignmentMutation.mutate({
      ...values,
      customPermissionIds: values.customPermissionIds ?? [],
      scopeType: scope.scopeType,
    })
  }

  const submitOverride = (values: { permissionIds?: string[] }) => {
    overrideMutation.mutate(values.permissionIds ?? [])
  }

  const confirmDeleteAssignment = () => {
    if (assignmentToDelete) deleteMutation.mutate(assignmentToDelete.id)
  }

  const getScopeIcon = (scopeType?: string) => {
    if (scopeType === 'shop') return <ShopOutlined />
    if (scopeType === 'vendor') return <BuildOutlined />
    return <SafetyCertificateOutlined />
  }

  const getScopeName = (assignment: Assignment) =>
    scopeById.get(assignment.scopeId ?? '')?.name ?? assignment.scopeId

  const getRoleName = (assignment: Assignment) =>
    roleById.get(assignment.roleId ?? '')?.name ??
    roleById.get(assignment.roleId ?? '')?.code ??
    assignment.roleId

  const getAssignmentWindowText = (assignment: Assignment) => {
    const from = assignment.validFrom
      ? `${t('auth.accessEditor.from')}: ${dayjs(assignment.validFrom).format('DD/MM/YYYY HH:mm')}`
      : null
    const until = assignment.validUntil
      ? `${t('auth.accessEditor.until')}: ${dayjs(assignment.validUntil).format('DD/MM/YYYY HH:mm')}`
      : null

    return [from, until].filter(Boolean).join(' • ') || t('auth.accessEditor.always')
  }

  const accountStatus = String(accessExplorer.data?.account.account.status ?? '')

  return [
    {
      t,
      globalForm,
      assignmentForm,
      overrideForm,
      editingAssignment,
      isAssignmentOpen,
      overrideAssignment,
      assignmentToDelete,
      scopeOptions,
      roleOptions,
      permissionSections,
      accountStatus,
      globalMutation,
      assignmentMutation,
      deleteMutation,
      overrideMutation,
      openAssignment,
      closeAssignment,
      openOverride,
      closeOverride,
      openDeleteAssignment,
      closeDeleteAssignment,
      submitGlobalAccess,
      submitAssignment,
      submitOverride,
      confirmDeleteAssignment,
      getScopeIcon,
      getScopeName,
      getRoleName,
      getAssignmentWindowText,
      backToAccounts: () => navigate('/auth/accounts'),
    },
    {
      canWrite,
      accessExplorer,
    },
  ] as const
}
