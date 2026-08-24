import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Collapse,
  Divider,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import {
  createPermission,
  deletePermission,
  type PermissionInput,
  updatePermission,
} from '@/features/auth/permissions/api/permissionsApi'
import {
  createRole,
  deleteRole,
  loadRoleCatalog,
  type RoleCatalog,
  type RoleInput,
  updateRole,
} from '@/features/auth/roles/api/rolesApi'
import {
  createScope,
  deactivateScope,
  loadScopes,
  type ScopeInput,
  updateScope,
} from '@/features/auth/scopes/api/scopesApi'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import {
  ConfirmDangerModal,
  FeedbackAlert,
  FormActions,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import styles from './AccessControlPage.module.scss'

type Role = RoleCatalog['roles']['items'][number]
type Permission = RoleCatalog['permissions']['items'][number]
type Scope = Awaited<ReturnType<typeof loadScopes>>['items'][number]
type Editor =
  | { kind: 'role'; item?: Role }
  | { kind: 'permission'; item?: Permission }
  | { kind: 'scope'; item?: Scope }
type DeleteTarget =
  | { kind: 'role'; item: Role }
  | { kind: 'permission'; item: Permission }
  | { kind: 'scope'; item: Scope }
const scopeTypes: ScopeInput['scopeType'][] = ['department', 'team', 'shop', 'vendor']
type AccessControlTab = 'roles' | 'permissions' | 'scopes'
const VALID_TABS: AccessControlTab[] = ['roles', 'permissions', 'scopes']

const RolePermissions = memo(function RolePermissions({
  canWrite,
  permissions,
  role,
}: {
  canWrite: boolean
  permissions: Permission[]
  role: Role
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const initialIds = role.permissionIds ?? role.permissions ?? []
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)
  const [search, setSearch] = useState('')
  const saveMutation = useMutation({
    mutationFn: () =>
      updateRole(role.id, {
        code: role.code,
        description: role.description,
        name: role.name ?? role.code,
        permissionIds: selectedIds,
      }),
    onSuccess: () => {
      showFeedbackToast('success', t('actionFeedback.saved'))
      return queryClient.invalidateQueries({ queryKey: ['auth-roles'] })
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const filteredPermissions = permissions.filter((permission) =>
    `${permission.name ?? ''} ${permission.code}`.toLowerCase().includes(search.toLowerCase()),
  )
  const isDirty = [...selectedIds].sort().join('|') !== [...initialIds].sort().join('|')

  return (
    <div className={styles.permissionEditor}>
      <div className={styles.editorToolbar}>
        <SearchInput
          placeholder={t('auth.accessControl.searchPermissions')}
          value={search}
          onSearchChange={setSearch}
        />
        <Button
          type="primary"
          disabled={!canWrite || !isDirty}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {t('auth.accessControl.savePermissions')}
        </Button>
      </div>
      {isDirty && <FeedbackAlert type="warning" title={t('actionFeedback.unsaved')} />}
      <Checkbox.Group
        disabled={!canWrite}
        className={styles.permissionGrid}
        value={selectedIds}
        onChange={(values) => setSelectedIds(values as string[])}
      >
        {filteredPermissions.map((permission) => (
          <Checkbox key={permission.id} value={permission.id}>
            <span className={styles.permissionName}>{permission.name ?? permission.code}</span>
            <Typography.Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
              {permission.code}
            </Typography.Text>
          </Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  )
})

export function AccessControlPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [search, setSearch] = useState('')
  const [rolePermissionSearch, setRolePermissionSearch] = useState('')
  const [editor, setEditor] = useState<Editor>()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>()
  const [roleForm] = Form.useForm<RoleInput>()
  const [permissionForm] = Form.useForm<PermissionInput>()
  const [scopeForm] = Form.useForm<ScopeInput>()
  const canRead = hasAnyPermission(['AUTH:READ', 'AUTH:WRITE'], { globalOnly: true })
  const canWrite = hasAnyPermission(['AUTH:WRITE'], { globalOnly: true })
  const activeTab = VALID_TABS.includes(searchParams.get('tab') as AccessControlTab)
    ? (searchParams.get('tab') as AccessControlTab)
    : 'roles'
  const handleTabChange = (nextTab: string) => {
    if (!VALID_TABS.includes(nextTab as AccessControlTab)) return
    setSearchParams({ tab: nextTab })
  }

  const rolesQuery = useQuery({ queryKey: ['auth-roles'], queryFn: loadRoleCatalog })
  const scopesQuery = useQuery({ queryKey: ['auth-scopes'], queryFn: loadScopes })

  const closeEditor = () => setEditor(undefined)

  const saveMutation = useMutation({
    mutationFn: async (values: RoleInput | PermissionInput | ScopeInput) => {
      if (!editor) return
      if (editor.kind === 'role') {
        return editor.item
          ? updateRole(editor.item.id, values as RoleInput)
          : createRole(values as RoleInput)
      }
      if (editor.kind === 'permission') {
        return editor.item
          ? updatePermission(editor.item.id, values as PermissionInput)
          : createPermission(values as PermissionInput)
      }
      return editor.item
        ? updateScope(editor.item.id, { name: (values as ScopeInput).name })
        : createScope(values as ScopeInput)
    },
    onSuccess: async () => {
      closeEditor()
      showFeedbackToast('success', t('actionFeedback.saved'))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['auth-scopes'] }),
      ])
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.kind === 'role') return deleteRole(target.item.id)
      if (target.kind === 'permission') return deletePermission(target.item.id)
      return deactivateScope(target.item.id)
    },
    onSuccess: async (_result, target) => {
      setDeleteTarget(undefined)
      showFeedbackToast(
        'success',
        t(target.kind === 'scope' ? 'actionFeedback.deactivated' : 'actionFeedback.deleted'),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['auth-scopes'] }),
      ])
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const query = search.trim().toLowerCase()
  const roles = useMemo(
    () =>
      (rolesQuery.data?.roles.items ?? []).filter((role) =>
        `${role.name ?? ''} ${role.code}`.toLowerCase().includes(query),
      ),
    [query, rolesQuery.data],
  )
  const permissions = rolesQuery.data?.permissions.items ?? []
  const visiblePermissions = permissions.filter((permission) =>
    `${permission.name ?? ''} ${permission.code}`.toLowerCase().includes(query),
  )
  const scopes = (scopesQuery.data?.items ?? []).filter((scope) =>
    `${scope.name} ${scope.scopeType} ${scope.scopeId}`.toLowerCase().includes(query),
  )
  const roleFormPermissions = permissions.filter((permission) =>
    `${permission.name ?? ''} ${permission.code}`
      .toLowerCase()
      .includes(rolePermissionSearch.toLowerCase()),
  )

  function openEditor(nextEditor: Editor) {
    setEditor(nextEditor)
    if (nextEditor.kind === 'role') {
      setRolePermissionSearch('')
      const role = nextEditor.item
      roleForm.setFieldsValue({
        code: role?.code ?? '',
        description: role?.description ?? '',
        name: role?.name ?? '',
        permissionIds: role?.permissionIds ?? role?.permissions ?? [],
      })
    } else if (nextEditor.kind === 'permission') {
      const permission = nextEditor.item
      permissionForm.setFieldsValue({
        code: permission?.code ?? '',
        description: permission?.description ?? '',
        name: permission?.name ?? '',
      })
    } else {
      const scope = nextEditor.item
      scopeForm.setFieldsValue({
        name: scope?.name ?? '',
        scopeId: scope?.scopeId ?? '',
        scopeType: (scope?.scopeType ?? 'department').toLowerCase() as ScopeInput['scopeType'],
      })
    }
  }

  function nodeActions(edit: () => void, remove: () => void, removeLabel: string) {
    if (!canWrite) return null
    return (
      <Space className={styles.nodeActions} onClick={(event) => event.stopPropagation()}>
        <Tooltip title={t('auth.accessEditor.edit')}>
          <Button
            type="text"
            icon={<EditOutlined aria-hidden />}
            aria-label={t('auth.accessEditor.edit')}
            onClick={edit}
          />
        </Tooltip>
        <Tooltip title={removeLabel}>
          <Button
            danger
            type="text"
            icon={<DeleteOutlined aria-hidden />}
            aria-label={removeLabel}
            onClick={remove}
          />
        </Tooltip>
      </Space>
    )
  }

  const tabItems = [
    {
      key: 'roles',
      label: (
        <span>
          <SafetyCertificateOutlined style={{ marginRight: 6 }} />
          {t('auth.accessControl.roles')} ({roles.length})
        </span>
      ),
      children: (
        <SectionCard
          title={t('auth.accessControl.roles')}
          extra={
            canWrite ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openEditor({ kind: 'role' })}
              >
                {t('auth.roles.create')}
              </Button>
            ) : null
          }
        >
          <Collapse
            className={styles.branch}
            bordered={false}
            items={roles.map((role) => {
              const isSystemRole = role.code === 'SUPER_ADMIN'
              return {
                key: role.id,
                collapsible: isSystemRole ? ('disabled' as const) : undefined,
                label: (
                  <span className={styles.nodeLabel}>
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      {role.name ?? role.code}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, fontFamily: 'monospace' }}
                    >
                      {role.code}
                    </Typography.Text>
                    {isSystemRole ? (
                      <Tag color="gold">{t('auth.accessControl.fullAccessAutomatic')}</Tag>
                    ) : (
                      <Tag color="blue">
                        {(role.permissionIds ?? role.permissions ?? []).length}{' '}
                        {t('auth.accessControl.granted')}
                      </Tag>
                    )}
                    {isSystemRole
                      ? null
                      : nodeActions(
                          () => openEditor({ kind: 'role', item: role }),
                          () => setDeleteTarget({ kind: 'role', item: role }),
                          t('auth.accessEditor.delete'),
                        )}
                  </span>
                ),
                children: isSystemRole ? null : (
                  <RolePermissions
                    key={`${role.id}:${(role.permissionIds ?? role.permissions ?? []).join(',')}`}
                    canWrite={canWrite}
                    role={role}
                    permissions={permissions}
                  />
                ),
              }
            })}
          />
        </SectionCard>
      ),
    },
    {
      key: 'permissions',
      label: (
        <span>
          <KeyOutlined style={{ marginRight: 6 }} />
          {t('auth.permissions.catalog')} ({visiblePermissions.length})
        </span>
      ),
      children: (
        <SectionCard
          title={t('auth.permissions.catalog')}
          extra={
            canWrite ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openEditor({ kind: 'permission' })}
              >
                {t('auth.permissions.create')}
              </Button>
            ) : null
          }
        >
          <div className={styles.catalogGrid}>
            {visiblePermissions.map((permission) => (
              <div className={styles.catalogItem} key={permission.id}>
                <span>{permission.name ?? permission.code}</span>
                <Typography.Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  {permission.code}
                </Typography.Text>
                {nodeActions(
                  () => openEditor({ kind: 'permission', item: permission }),
                  () => setDeleteTarget({ kind: 'permission', item: permission }),
                  t('auth.accessEditor.delete'),
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      ),
    },
    {
      key: 'scopes',
      label: (
        <span>
          <ApartmentOutlined style={{ marginRight: 6 }} />
          {t('auth.scopes.catalog')} ({scopes.length})
        </span>
      ),
      children: (
        <SectionCard
          title={t('auth.scopes.catalog')}
          extra={
            canWrite ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openEditor({ kind: 'scope' })}
              >
                {t('auth.scopes.create')}
              </Button>
            ) : null
          }
        >
          <CoreDataTable
            size="small"
            rowKey="id"
            loading={scopesQuery.isLoading}
            dataSource={scopes}
            scroll={{ y: 'calc(100vh - 500px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
            columns={[
              {
                title: t('auth.scopes.name'),
                dataIndex: 'name',
                render: (val) => <Typography.Text strong>{val}</Typography.Text>,
              },
              {
                title: t('auth.scopes.scopeId'),
                dataIndex: 'scopeId',
                render: (val) => (
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, fontFamily: 'monospace' }}
                  >
                    {val}
                  </Typography.Text>
                ),
              },
              {
                title: t('auth.scopes.type'),
                dataIndex: 'scopeType',
                render: (val) => (
                  <Tag color="geekblue">
                    {t(`auth.scopes.types.${String(val).toLowerCase()}`, {
                      defaultValue: String(val),
                    })}
                  </Tag>
                ),
              },
              {
                title: t('auth.scopes.status'),
                dataIndex: 'status',
                render: (val) => {
                  const normalized = String(val).toLowerCase()
                  return (
                    <StatusTag status={normalized === 'active' ? 'approved' : 'cancelled'}>
                      {t(`auth.scopes.statuses.${normalized}`, { defaultValue: String(val) })}
                    </StatusTag>
                  )
                },
              },
              {
                title: '',
                align: 'right',
                render: (_, scope) =>
                  nodeActions(
                    () => openEditor({ kind: 'scope', item: scope }),
                    () => setDeleteTarget({ kind: 'scope', item: scope }),
                    t('auth.scopes.deactivate'),
                  ),
              },
            ]}
          />
        </SectionCard>
      ),
    },
  ]

  if (!canRead) return <Result status="403" title="403" />

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accessControl.title', { defaultValue: 'Access Control & RBAC Matrix' })}
        description={t('auth.accessControl.description', {
          defaultValue: 'Manage roles, permission catalogs, and organizational scope assignments.',
        })}
      />

      {/* Summary Metric Cards */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<SafetyCertificateOutlined />}
          variant="primary"
          label={t('auth.accessControl.roles')}
          value={roles.length}
          loading={rolesQuery.isLoading}
        />
        <MetricCard
          icon={<KeyOutlined />}
          variant="info"
          label={t('auth.permissions.catalog')}
          value={permissions.length}
          loading={rolesQuery.isLoading}
        />
        <MetricCard
          icon={<ApartmentOutlined />}
          variant="success"
          label={t('auth.scopes.catalog')}
          value={scopes.length}
          loading={scopesQuery.isLoading}
        />
        <MetricCard
          icon={<LockOutlined />}
          variant="neutral"
          label={t('auth.accessControl.scopedAccessStatus')}
          value={t('auth.accessControl.scopedAccessEnforced')}
          loading={rolesQuery.isLoading}
        />
      </div>

      {rolesQuery.error || scopesQuery.error ? (
        <FeedbackAlert
          type="error"
          title={t('auth.accessControl.unavailable')}
          action={
            <Button
              type="link"
              icon={<ReloadOutlined aria-hidden />}
              onClick={() => void Promise.all([rolesQuery.refetch(), scopesQuery.refetch()])}
            >
              {t('auth.accessExplorer.retry')}
            </Button>
          }
        />
      ) : null}

      <div className={styles.toolbar}>
        <SearchInput
          placeholder={t('auth.accessControl.search')}
          value={search}
          onSearchChange={setSearch}
        />
      </div>

      <Tabs items={tabItems} activeKey={activeTab} onChange={handleTabChange} />

      {/* Role Editor Modal */}
      {editor?.kind === 'role' ? (
        <Modal
          open={editor?.kind === 'role'}
          width={720}
          destroyOnHidden
          centered
          title={
            editor?.kind === 'role' && editor.item
              ? t('auth.roles.editTitle')
              : t('auth.roles.createTitle')
          }
          footer={null}
          onCancel={closeEditor}
        >
          <Form
            form={roleForm}
            layout="vertical"
            onFinish={(values) =>
              saveMutation.mutate({ ...values, permissionIds: values.permissionIds ?? [] })
            }
          >
            <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
              {t('auth.accessControl.roleIdentity')}
            </Divider>
            <Form.Item label={t('auth.roles.code')} name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.roles.name')} name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.roles.descriptionLabel')} name="description">
              <Input.TextArea rows={2} />
            </Form.Item>

            <Divider plain style={{ fontSize: 12, margin: '16px 0' }}>
              {t('auth.accessControl.grantedPermissions')}
            </Divider>
            <Form.Item label={t('auth.roles.permissions')}>
              <SearchInput
                placeholder={t('auth.accessControl.searchPermissions')}
                value={rolePermissionSearch}
                onSearchChange={setRolePermissionSearch}
              />
            </Form.Item>
            <Form.Item name="permissionIds">
              <Checkbox.Group className={styles.roleFormPermissions}>
                {roleFormPermissions.map((permission) => (
                  <Checkbox key={permission.id} value={permission.id}>
                    <span className={styles.permissionName}>
                      {permission.name ?? permission.code}
                    </span>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 11, fontFamily: 'monospace' }}
                    >
                      {permission.code}
                    </Typography.Text>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() => (
                <FormActions
                  cancelLabel={t('auth.accessEditor.cancel')}
                  dirty={roleForm.isFieldsTouched()}
                  onCancel={closeEditor}
                  saving={saveMutation.isPending}
                  submitLabel={t('auth.accessEditor.save')}
                />
              )}
            </Form.Item>
          </Form>
        </Modal>
      ) : null}

      {/* Permission Editor Modal */}
      {editor?.kind === 'permission' ? (
        <Modal
          open={editor?.kind === 'permission'}
          destroyOnHidden
          centered
          width={520}
          title={
            editor?.kind === 'permission' && editor.item
              ? t('auth.permissions.editTitle')
              : t('auth.permissions.createTitle')
          }
          footer={null}
          onCancel={closeEditor}
        >
          <Form
            form={permissionForm}
            layout="vertical"
            onFinish={(values) => saveMutation.mutate(values)}
          >
            <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
              {t('auth.accessControl.permissionDetails')}
            </Divider>
            <Form.Item label={t('auth.permissions.code')} name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.permissions.name')} name="name">
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.permissions.descriptionLabel')} name="description">
              <Input.TextArea rows={2} />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() => (
                <FormActions
                  cancelLabel={t('auth.accessEditor.cancel')}
                  dirty={permissionForm.isFieldsTouched()}
                  onCancel={closeEditor}
                  saving={saveMutation.isPending}
                  submitLabel={t('auth.accessEditor.save')}
                />
              )}
            </Form.Item>
          </Form>
        </Modal>
      ) : null}

      {/* Scope Editor Modal */}
      {editor?.kind === 'scope' ? (
        <Modal
          open={editor?.kind === 'scope'}
          destroyOnHidden
          centered
          width={520}
          title={
            editor?.kind === 'scope' && editor.item
              ? t('auth.scopes.editTitle')
              : t('auth.scopes.createTitle')
          }
          footer={null}
          onCancel={closeEditor}
        >
          <Form
            form={scopeForm}
            layout="vertical"
            onFinish={(values) => saveMutation.mutate(values)}
          >
            <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
              {t('auth.accessControl.scopeTargetDetails')}
            </Divider>
            <Form.Item label={t('auth.scopes.name')} name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.scopes.type')} name="scopeType" rules={[{ required: true }]}>
              <Select
                disabled={editor?.kind === 'scope' && Boolean(editor.item)}
                options={scopeTypes.map((scopeType) => ({
                  label: t(`auth.scopes.types.${scopeType}`),
                  value: scopeType,
                }))}
              />
            </Form.Item>
            <Form.Item label={t('auth.scopes.scopeId')} name="scopeId" rules={[{ required: true }]}>
              <Input disabled={editor?.kind === 'scope' && Boolean(editor.item)} />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() => (
                <FormActions
                  cancelLabel={t('auth.accessEditor.cancel')}
                  dirty={scopeForm.isFieldsTouched()}
                  onCancel={closeEditor}
                  saving={saveMutation.isPending}
                  submitLabel={t('auth.accessEditor.save')}
                />
              )}
            </Form.Item>
          </Form>
        </Modal>
      ) : null}

      <ConfirmDangerModal
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === 'scope'
            ? t('auth.scopes.deactivateTitle')
            : deleteTarget?.kind === 'permission'
              ? t('auth.permissions.deleteTitle')
              : t('auth.roles.deleteTitle')
        }
        description={
          deleteTarget?.kind === 'scope'
            ? t('auth.scopes.deactivateDescription')
            : deleteTarget?.kind === 'permission'
              ? t('auth.permissions.deleteDescription')
              : t('auth.roles.deleteDescription')
        }
        confirmLabel={
          deleteTarget?.kind === 'scope'
            ? t('auth.scopes.deactivate')
            : t('auth.accessEditor.delete')
        }
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(undefined)}
      />
    </section>
  )
}

export default AccessControlPage
