import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Collapse,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
} from 'antd'

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
import { getPermissions } from '@/shared/auth/session'
import {
  ConfirmDangerModal,
  FeedbackAlert,
  PageHeader,
  SectionCard,
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
const scopeTypes: ScopeInput['scopeType'][] = ['DEPARTMENT', 'TEAM', 'SHOP', 'VENDOR']

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
        <Input
          allowClear
          prefix={<SearchOutlined aria-hidden />}
          placeholder={t('auth.accessControl.searchPermissions')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
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
            <span className={styles.code}>{permission.code}</span>
          </Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  )
})

export function AccessControlPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [search, setSearch] = useState('')
  const [rolePermissionSearch, setRolePermissionSearch] = useState('')
  const [editor, setEditor] = useState<Editor>()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>()
  const [roleForm] = Form.useForm<RoleInput>()
  const [permissionForm] = Form.useForm<PermissionInput>()
  const [scopeForm] = Form.useForm<ScopeInput>()
  const canWrite = getPermissions().includes('AUTH:WRITE')
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
        scopeType: scope?.scopeType ?? 'DEPARTMENT',
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

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.accessControl.title')}
        description={t('auth.accessControl.description')}
        actions={<SafetyCertificateOutlined className={styles.icon} aria-hidden />}
      />
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
        <Input
          allowClear
          className={styles.search}
          prefix={<SearchOutlined aria-hidden />}
          placeholder={t('auth.accessControl.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <SectionCard title={t('auth.accessControl.workspace')}>
        {rolesQuery.isLoading || scopesQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Collapse
            className={styles.tree}
            bordered={false}
            defaultActiveKey={['roles', 'scopes']}
            items={[
              {
                key: 'roles',
                label: (
                  <div className={styles.rootLabel}>
                    <SafetyCertificateOutlined aria-hidden />
                    {t('auth.accessControl.roles')}
                    <Tag>{roles.length}</Tag>
                    {canWrite ? (
                      <Button
                        className={styles.addButton}
                        type="text"
                        icon={<PlusOutlined aria-hidden />}
                        aria-label={t('auth.roles.create')}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditor({ kind: 'role' })
                        }}
                      />
                    ) : null}
                  </div>
                ),
                children: (
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
                            <strong>{role.name ?? role.code}</strong>
                            <span className={styles.code}>{role.code}</span>
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
                ),
              },
              {
                key: 'permissions',
                label: (
                  <div className={styles.rootLabel}>
                    <KeyOutlined aria-hidden />
                    {t('auth.permissions.catalog')}
                    <Tag>{visiblePermissions.length}</Tag>
                    {canWrite ? (
                      <Button
                        className={styles.addButton}
                        type="text"
                        icon={<PlusOutlined aria-hidden />}
                        aria-label={t('auth.permissions.create')}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditor({ kind: 'permission' })
                        }}
                      />
                    ) : null}
                  </div>
                ),
                children: (
                  <div className={styles.catalogGrid}>
                    {visiblePermissions.map((permission) => (
                      <div className={styles.catalogItem} key={permission.id}>
                        <span>{permission.name ?? permission.code}</span>
                        <span className={styles.code}>{permission.code}</span>
                        {nodeActions(
                          () => openEditor({ kind: 'permission', item: permission }),
                          () => setDeleteTarget({ kind: 'permission', item: permission }),
                          t('auth.accessEditor.delete'),
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'scopes',
                label: (
                  <div className={styles.rootLabel}>
                    <ApartmentOutlined aria-hidden />
                    {t('auth.scopes.catalog')}
                    <Tag>{scopes.length}</Tag>
                    {canWrite ? (
                      <Button
                        className={styles.addButton}
                        type="text"
                        icon={<PlusOutlined aria-hidden />}
                        aria-label={t('auth.scopes.create')}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditor({ kind: 'scope' })
                        }}
                      />
                    ) : null}
                  </div>
                ),
                children: (
                  <div className={styles.scopeList}>
                    {scopes.map((scope) => (
                      <div className={styles.scopeRow} key={scope.id}>
                        <span className={styles.scopeIdentity}>
                          <strong>{scope.name}</strong>
                          <span className={styles.code}>{scope.scopeId}</span>
                        </span>
                        <Tag color="geekblue">{scope.scopeType}</Tag>
                        <Tag color={scope.status === 'ACTIVE' ? 'green' : undefined}>
                          {scope.status}
                        </Tag>
                        {nodeActions(
                          () => openEditor({ kind: 'scope', item: scope }),
                          () => setDeleteTarget({ kind: 'scope', item: scope }),
                          t('auth.scopes.deactivate'),
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
      {editor?.kind === 'role' ? (
        <Modal
          open={editor?.kind === 'role'}
          width={820}
          transitionName=""
          maskTransitionName=""
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
            <Form.Item label={t('auth.roles.code')} name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.roles.name')} name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.roles.descriptionLabel')} name="description">
              <Input.TextArea />
            </Form.Item>
            <Form.Item label={t('auth.roles.permissions')}>
              <Input
                allowClear
                prefix={<SearchOutlined aria-hidden />}
                placeholder={t('auth.accessControl.searchPermissions')}
                value={rolePermissionSearch}
                onChange={(event) => setRolePermissionSearch(event.target.value)}
              />
            </Form.Item>
            <Form.Item name="permissionIds">
              <Checkbox.Group className={styles.roleFormPermissions}>
                {roleFormPermissions.map((permission) => (
                  <Checkbox key={permission.id} value={permission.id}>
                    <span className={styles.permissionName}>
                      {permission.name ?? permission.code}
                    </span>
                    <span className={styles.code}>{permission.code}</span>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
            <Space>
              <Button onClick={closeEditor}>{t('auth.accessEditor.cancel')}</Button>
              <Button htmlType="submit" type="primary" loading={saveMutation.isPending}>
                {t('auth.accessEditor.save')}
              </Button>
            </Space>
          </Form>
        </Modal>
      ) : null}
      {editor?.kind === 'permission' ? (
        <Modal
          open={editor?.kind === 'permission'}
          transitionName=""
          maskTransitionName=""
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
            <Form.Item label={t('auth.permissions.code')} name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.permissions.name')} name="name">
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.permissions.descriptionLabel')} name="description">
              <Input.TextArea />
            </Form.Item>
            <Space>
              <Button onClick={closeEditor}>{t('auth.accessEditor.cancel')}</Button>
              <Button htmlType="submit" type="primary" loading={saveMutation.isPending}>
                {t('auth.accessEditor.save')}
              </Button>
            </Space>
          </Form>
        </Modal>
      ) : null}
      {editor?.kind === 'scope' ? (
        <Modal
          open={editor?.kind === 'scope'}
          transitionName=""
          maskTransitionName=""
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
            <Form.Item label={t('auth.scopes.name')} name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('auth.scopes.type')} name="scopeType" rules={[{ required: true }]}>
              <Select
                disabled={editor?.kind === 'scope' && Boolean(editor.item)}
                options={scopeTypes.map((scopeType) => ({ label: scopeType, value: scopeType }))}
              />
            </Form.Item>
            <Form.Item label={t('auth.scopes.scopeId')} name="scopeId" rules={[{ required: true }]}>
              <Input disabled={editor?.kind === 'scope' && Boolean(editor.item)} />
            </Form.Item>
            <Space>
              <Button onClick={closeEditor}>{t('auth.accessEditor.cancel')}</Button>
              <Button htmlType="submit" type="primary" loading={saveMutation.isPending}>
                {t('auth.accessEditor.save')}
              </Button>
            </Space>
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
