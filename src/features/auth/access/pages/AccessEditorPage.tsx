import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeftOutlined,
  BuildOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SettingOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Form, Modal, Result, Select, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { hasAnyPermission } from '@/shared/auth/permissions'
import {
  ConfirmDangerModal,
  DateTimePicker,
  EmptyState,
  FeedbackAlert,
  LoadingState,
  PageHeader,
  PermissionCheckboxGroup,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import { type AccessExplorerSnapshot, loadAccessExplorer } from '../../api/accessExplorerApi'
import {
  type AccessAssignmentInput,
  createAccessAssignment,
  deleteAccessAssignment,
  setScopedRolePermissions,
  updateAccessAssignment,
  updateGlobalAccess,
} from '../api/accessMutationsApi'
import styles from './AccessEditorPage.module.scss'

type Assignment = AccessExplorerSnapshot['assignments']['items'][number]
type AssignmentFormValues = Omit<AccessAssignmentInput, 'accountId'>
type GlobalAccessFormValues = {
  customPermissionIds?: string[]
  roleIds?: string[]
  validFrom?: string | null
  validUntil?: string | null
}

export function AccessEditorPage() {
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

  const { data, error, isLoading, refetch } = useQuery({
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
    if (data?.account.access) {
      globalForm.setFieldsValue({
        customPermissionIds: data.account.access.customPermissionIds ?? [],
        roleIds: data.account.access.roleIds ?? [],
        validFrom: data.account.access.validFrom ?? null,
        validUntil: data.account.access.validUntil ?? null,
      })
    }
  }, [data?.account.access, globalForm])

  const roleById = useMemo(
    () => new Map((data?.roles.items ?? []).map((role) => [role.id, role])),
    [data?.roles.items],
  )

  const scopeById = useMemo(
    () => new Map((data?.scopes.items ?? []).map((scope) => [scope.scopeId ?? scope.id, scope])),
    [data?.scopes.items],
  )

  const scopeOptions = (data?.scopes.items ?? []).map((scope) => ({
    label: `${scope.name} (${scope.scopeType ?? ''})`,
    value: scope.scopeId ?? scope.id,
  }))
  const roleOptions = (data?.roles.items ?? []).map((role) => ({
    label: role.name ?? role.code,
    value: role.id,
  }))
  const permissionSections = useMemo(() => {
    const groups = new Map<string, { title: string; options: { label: string; value: string }[] }>()

    for (const permission of data?.permissions.items ?? []) {
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
  }, [data?.permissions.items])

  function openAssignment(assignment?: Assignment) {
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

  function openOverride(assignment: Assignment) {
    const rule = data?.scopedRolePermissions.items.find(
      (item) => item.roleId === assignment.roleId && item.scopeId === assignment.scopeId,
    )
    setOverrideAssignment(assignment)
    overrideForm.setFieldsValue({
      permissionIds:
        rule?.permissionIds ?? roleById.get(assignment.roleId ?? '')?.permissions ?? [],
    })
  }

  function submitAssignment(values: Omit<AssignmentFormValues, 'scopeType'>) {
    const scope = scopeById.get(values.scopeId)
    if (!scope?.scopeType) return
    assignmentMutation.mutate({
      ...values,
      customPermissionIds: values.customPermissionIds ?? [],
      scopeType: scope.scopeType,
    })
  }

  const getScopeIcon = (scopeType?: string) => {
    if (scopeType === 'shop') return <ShopOutlined />
    if (scopeType === 'vendor') return <BuildOutlined />
    return <SafetyCertificateOutlined />
  }

  const accountStatus = String(data?.account.account.status ?? '')
  const getAssignmentWindowText = (item: Assignment) => {
    const from = item.validFrom
      ? `${t('auth.accessEditor.from')}: ${dayjs(item.validFrom).format('YYYY-MM-DD HH:mm')}`
      : null
    const until = item.validUntil
      ? `${t('auth.accessEditor.until')}: ${dayjs(item.validUntil).format('YYYY-MM-DD HH:mm')}`
      : null
    return [from, until].filter(Boolean).join(' • ') || t('auth.accessEditor.always')
  }

  if (!canWrite) return <Result status="403" title="403" />

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accessEditor.title')}
        description={t('auth.accessEditor.description')}
        actions={
          <Button
            icon={<ArrowLeftOutlined aria-hidden />}
            onClick={() => navigate('/auth/accounts')}
          >
            {t('auth.accessEditor.backToAccounts')}
          </Button>
        }
      />
      {isLoading ? <LoadingState variant="page" /> : null}
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
      {data ? (
        <>
          <div className={styles.accountSummary}>
            <Avatar size={48} icon={<SafetyCertificateOutlined />} />
            <div>
              <Typography.Title level={4} className={styles.accountTitle}>
                {data.account.account.email}
              </Typography.Title>
              <StatusTag
                status={accountStatus.toLowerCase() === 'active' ? 'approved' : 'cancelled'}
              >
                {accountStatus || t('auth.accessExplorer.unknown')}
              </StatusTag>
            </div>
          </div>
          <div className={styles.grid}>
            <SectionCard title={t('auth.accessEditor.globalAccess')}>
              <Typography.Text type="secondary" className={styles.hint}>
                {t('auth.accessEditor.globalAccessHint')}
              </Typography.Text>
              <Form
                form={globalForm}
                layout="vertical"
                onFinish={(values) =>
                  globalMutation.mutate({
                    customPermissionIds: values.customPermissionIds ?? [],
                    roleIds: values.roleIds ?? [],
                    validFrom: values.validFrom ?? null,
                    validUntil: values.validUntil ?? null,
                  })
                }
              >
                <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
                  <Select mode="multiple" options={roleOptions} />
                </Form.Item>
                <div className={styles.globalWindow}>
                  <Form.Item label={t('auth.accessEditor.validFrom')} name="validFrom">
                    <DateTimePicker mode="datetime" />
                  </Form.Item>
                  <Form.Item label={t('auth.accessEditor.validUntil')} name="validUntil">
                    <DateTimePicker mode="datetime" />
                  </Form.Item>
                </div>
                <Form.Item
                  label={t('auth.accessEditor.customPermissions')}
                  name="customPermissionIds"
                >
                  <PermissionCheckboxGroup
                    sections={permissionSections}
                    columns={4}
                    searchPlaceholder={t('auth.accessEditor.searchPermissions')}
                    emptyText={t('auth.accessEditor.emptyPermissionSearch')}
                  />
                </Form.Item>
                <Button
                  htmlType="submit"
                  type="primary"
                  icon={<SaveOutlined aria-hidden />}
                  loading={globalMutation.isPending}
                >
                  {t('auth.accessEditor.saveGlobal')}
                </Button>
              </Form>
            </SectionCard>

            <SectionCard>
              <div className={styles.scopedTitleBar}>
                <div>
                  <Typography.Title level={4} className={styles.scopedTitle}>
                    {t('auth.accessEditor.scopedAccess')}
                  </Typography.Title>
                  <Typography.Text type="secondary" className={styles.scopedSubtitle}>
                    {t('auth.accessEditor.scopedAccessHint')}
                  </Typography.Text>
                </div>
                <Button
                  type="primary"
                  ghost
                  icon={<PlusOutlined aria-hidden />}
                  onClick={() => openAssignment()}
                >
                  {t('auth.accessEditor.addScoped')}
                </Button>
              </div>

              <div className={styles.assignmentList}>
                {(data.assignments.items ?? []).map((item) => {
                  const scopeName = scopeById.get(item.scopeId ?? '')?.name ?? item.scopeId
                  const roleName =
                    roleById.get(item.roleId ?? '')?.name ??
                    roleById.get(item.roleId ?? '')?.code ??
                    item.roleId

                  return (
                    <div key={item.id} className={styles.assignmentCard}>
                      <div className={styles.assignmentIdentity}>
                        <Avatar
                          style={{ backgroundColor: '#f0f2f5', color: '#1890ff' }}
                          icon={getScopeIcon(item.scopeType)}
                        />
                        <div className={styles.assignmentInfo}>
                          <Typography.Text strong>{scopeName}</Typography.Text>
                          <Typography.Text type="secondary" className={styles.assignmentMeta}>
                            {item.scopeType}
                          </Typography.Text>
                        </div>
                      </div>

                      <div className={styles.assignmentRole}>
                        <Tag color="blue" style={{ borderRadius: 4, fontWeight: 500 }}>
                          {roleName}
                        </Tag>
                        <Tag style={{ borderRadius: 4 }}>{getAssignmentWindowText(item)}</Tag>
                        {item.customPermissionIds?.length ? (
                          <Tag style={{ borderRadius: 4 }}>
                            {t('auth.accessEditor.permissionCount', {
                              count: item.customPermissionIds.length,
                            })}
                          </Tag>
                        ) : null}
                      </div>

                      <div className={styles.assignmentActions}>
                        <Tooltip title={t('auth.accessEditor.edit', 'Edit')}>
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openAssignment(item)}
                          />
                        </Tooltip>
                        <Tooltip
                          title={t('auth.accessEditor.overridePermissions', 'Override Permissions')}
                        >
                          <Button
                            type="text"
                            icon={<SettingOutlined />}
                            onClick={() => openOverride(item)}
                          />
                        </Tooltip>
                        <Tooltip title={t('auth.accessEditor.delete', 'Delete')}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => setAssignmentToDelete(item)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  )
                })}
                {(data.assignments.items ?? []).length === 0 ? (
                  <EmptyState
                    title={t('auth.accessEditor.emptyAssignments')}
                    description={t('auth.accessEditor.emptyAssignmentsDescription')}
                    action={
                      <Button
                        type="primary"
                        ghost
                        icon={<PlusOutlined aria-hidden />}
                        onClick={() => openAssignment()}
                      >
                        {t('auth.accessEditor.addScoped')}
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      <Modal
        open={isAssignmentOpen}
        title={
          editingAssignment ? t('auth.accessEditor.editScoped') : t('auth.accessEditor.addScoped')
        }
        width={1180}
        onCancel={() => {
          setEditingAssignment(undefined)
          setIsAssignmentOpen(false)
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={assignmentForm} layout="vertical" onFinish={submitAssignment}>
          <Form.Item
            label={t('auth.accessEditor.scope')}
            name="scopeId"
            rules={[{ required: true }]}
          >
            <Select options={scopeOptions} />
          </Form.Item>
          <Form.Item label={t('auth.accessEditor.role')} name="roleId" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item label={t('auth.accessEditor.customPermissions')} name="customPermissionIds">
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>
          <Form.Item label={t('auth.accessEditor.validFrom')} name="validFrom">
            <DateTimePicker mode="datetime" />
          </Form.Item>
          <Form.Item label={t('auth.accessEditor.validUntil')} name="validUntil">
            <DateTimePicker mode="datetime" />
          </Form.Item>
          <div className={styles.formActions}>
            <Button
              onClick={() => {
                setEditingAssignment(undefined)
                setIsAssignmentOpen(false)
              }}
            >
              {t('auth.accessEditor.cancel')}
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<SaveOutlined />}
              loading={assignmentMutation.isPending}
            >
              {t('auth.accessEditor.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        open={overrideAssignment !== undefined}
        title={t('auth.accessEditor.overridePermissions')}
        width={1180}
        onCancel={() => setOverrideAssignment(undefined)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={overrideForm}
          layout="vertical"
          onFinish={(values) => overrideMutation.mutate(values.permissionIds ?? [])}
        >
          <Form.Item label={t('auth.accessEditor.permissions')} name="permissionIds">
            <PermissionCheckboxGroup
              sections={permissionSections}
              columns={4}
              searchPlaceholder={t('auth.accessEditor.searchPermissions')}
              emptyText={t('auth.accessEditor.emptyPermissionSearch')}
            />
          </Form.Item>
          <div className={styles.formActions}>
            <Button onClick={() => setOverrideAssignment(undefined)}>
              {t('auth.accessEditor.cancel')}
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<SaveOutlined />}
              loading={overrideMutation.isPending}
            >
              {t('auth.accessEditor.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      <ConfirmDangerModal
        open={assignmentToDelete !== undefined}
        title={t('auth.accessEditor.deleteAssignment')}
        description={t('auth.accessEditor.deleteAssignmentDescription')}
        confirmIcon={<DeleteOutlined aria-hidden />}
        confirmLabel={t('auth.accessEditor.delete')}
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={deleteMutation.isPending}
        onCancel={() => setAssignmentToDelete(undefined)}
        onConfirm={() => assignmentToDelete && deleteMutation.mutate(assignmentToDelete.id)}
      />
    </section>
  )
}
