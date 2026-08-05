import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Form, Modal, Select, Space, Table, Tag, Typography } from 'antd'

import {
  ConfirmDangerModal,
  EmptyState,
  FeedbackAlert,
  LoadingState,
  PageHeader,
  SectionCard,
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

export function AccessEditorPage() {
  const { t } = useTranslation()
  const { accountId = '' } = useParams()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [globalForm] = Form.useForm()
  const [assignmentForm] = Form.useForm<AssignmentFormValues>()
  const [overrideForm] = Form.useForm<{ permissionIds: string[] }>()
  const [editingAssignment, setEditingAssignment] = useState<Assignment>()
  const [overrideAssignment, setOverrideAssignment] = useState<Assignment>()
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment>()

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
    mutationFn: (values: { roleIds: string[]; customPermissionIds: string[] }) =>
      updateGlobalAccess(accountId, values),
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
  const permissionOptions = (data?.permissions.items ?? []).map((permission) => ({
    label: `${permission.code}${permission.name ? ` — ${permission.name}` : ''}`,
    value: permission.id,
  }))

  const columns: TableColumnsType<Assignment> = [
    {
      title: t('auth.accessEditor.scope'),
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {scopeById.get(item.scopeId ?? '')?.name ?? item.scopeId}
          </Typography.Text>
          <Typography.Text type="secondary">{item.scopeType}</Typography.Text>
        </Space>
      ),
    },
    {
      title: t('auth.accessEditor.role'),
      render: (_, item) =>
        roleById.get(item.roleId ?? '')?.name ??
        roleById.get(item.roleId ?? '')?.code ??
        item.roleId,
    },
    {
      title: t('auth.accessEditor.customPermissions'),
      render: (_, item) =>
        item.customPermissionIds?.length ? (
          <Tag>
            {t('auth.accessEditor.permissionCount', { count: item.customPermissionIds.length })}
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      title: t('auth.accessEditor.actions'),
      align: 'right',
      render: (_, item) => (
        <Space wrap>
          <Button
            type="link"
            icon={<EditOutlined aria-hidden />}
            onClick={() => openAssignment(item)}
          >
            {t('auth.accessEditor.edit')}
          </Button>
          <Button
            type="link"
            icon={<SettingOutlined aria-hidden />}
            onClick={() => openOverride(item)}
          >
            {t('auth.accessEditor.overridePermissions')}
          </Button>
          <Button
            danger
            type="link"
            icon={<DeleteOutlined aria-hidden />}
            onClick={() => setAssignmentToDelete(item)}
          >
            {t('auth.accessEditor.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  function openAssignment(assignment?: Assignment) {
    setEditingAssignment(assignment)
    assignmentForm.setFieldsValue(
      assignment ?? {
        customPermissionIds: [],
        roleId: undefined,
        scopeId: undefined,
        scopeType: undefined,
      },
    )
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

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accessEditor.title')}
        description={t('auth.accessEditor.description')}
        actions={
          <Button icon={<ArrowLeftOutlined aria-hidden />}>
            <Link to="/auth/accounts">{t('auth.accessEditor.backToAccounts')}</Link>
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
            <Typography.Title level={3}>{data.account.account.email}</Typography.Title>
            <Tag color={data.account.account.status === 'active' ? 'success' : 'default'}>
              {data.account.account.status ?? t('auth.accessExplorer.unknown')}
            </Tag>
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
                  })
                }
              >
                <Form.Item label={t('auth.accessEditor.roles')} name="roleIds">
                  <Select mode="multiple" options={roleOptions} />
                </Form.Item>
                <Form.Item
                  label={t('auth.accessEditor.customPermissions')}
                  name="customPermissionIds"
                >
                  <Select mode="multiple" options={permissionOptions} />
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
            <SectionCard title={t('auth.accessEditor.scopedAccess')}>
              <Typography.Text type="secondary" className={styles.hint}>
                {t('auth.accessEditor.scopedAccessHint')}
              </Typography.Text>
              <Button
                type="primary"
                icon={<PlusOutlined aria-hidden />}
                onClick={() => openAssignment()}
              >
                {t('auth.accessEditor.addScoped')}
              </Button>
            </SectionCard>
          </div>
          <SectionCard title={t('auth.accessEditor.scopedAssignments')}>
            {(data.assignments.items ?? []).length ? (
              <Table
                rowKey="id"
                columns={columns}
                dataSource={data.assignments.items}
                pagination={false}
              />
            ) : (
              <EmptyState
                title={t('auth.accessEditor.emptyAssignments')}
                description={t('auth.accessEditor.emptyAssignmentsDescription')}
              />
            )}
          </SectionCard>
        </>
      ) : null}
      <Modal
        open={editingAssignment !== undefined}
        title={
          editingAssignment ? t('auth.accessEditor.editScoped') : t('auth.accessEditor.addScoped')
        }
        onCancel={() => setEditingAssignment(undefined)}
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
            <Select mode="multiple" options={permissionOptions} />
          </Form.Item>
          <Space>
            <Button
              icon={<CloseOutlined aria-hidden />}
              onClick={() => setEditingAssignment(undefined)}
            >
              {t('auth.accessEditor.cancel')}
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<SaveOutlined aria-hidden />}
              loading={assignmentMutation.isPending}
            >
              {t('auth.accessEditor.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
      <Modal
        open={overrideAssignment !== undefined}
        title={t('auth.accessEditor.overridePermissions')}
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
            <Select mode="multiple" options={permissionOptions} />
          </Form.Item>
          <Space>
            <Button
              icon={<CloseOutlined aria-hidden />}
              onClick={() => setOverrideAssignment(undefined)}
            >
              {t('auth.accessEditor.cancel')}
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<SaveOutlined aria-hidden />}
              loading={overrideMutation.isPending}
            >
              {t('auth.accessEditor.save')}
            </Button>
          </Space>
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
