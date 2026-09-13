import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Form, Input, Modal, Select, Space, Tag } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import {
  ConfirmDangerModal,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  useFeedbackToast,
} from '@/shared/ui'

import {
  createRole,
  deleteRole,
  loadRoleCatalog,
  type RoleInput,
  updateRole,
} from '../api/rolesApi'
import styles from './RolesPage.module.scss'

type Role = Awaited<ReturnType<typeof loadRoleCatalog>>['roles']['items'][number]

export function RolesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [form] = Form.useForm<RoleInput>()
  const [editingRole, setEditingRole] = useState<Role>()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role>()
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['auth-roles'],
    queryFn: loadRoleCatalog,
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['auth-roles'] })
  const saveMutation = useMutation({
    mutationFn: (values: RoleInput) =>
      editingRole ? updateRole(editingRole.id, values) : createRole(values),
    onSuccess: async () => {
      setEditingRole(undefined)
      setIsEditorOpen(false)
      form.resetFields()
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: async () => {
      setRoleToDelete(undefined)
      showFeedbackToast('success', t('actionFeedback.deleted'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const permissionById = new Map(
    (data?.permissions.items ?? []).map((permission) => [permission.id, permission]),
  )
  const columns: TableColumnsType<Role> = [
    { title: t('auth.roles.name'), render: (_, role) => role.name ?? role.code },
    { title: t('auth.roles.code'), dataIndex: 'code' },
    {
      title: t('auth.roles.permissions'),
      render: (_, role) =>
        (role.permissions ?? role.permissionIds ?? []).map((permissionId) => (
          <Tag key={permissionId}>{permissionById.get(permissionId)?.code ?? permissionId}</Tag>
        )),
    },
    {
      title: t('auth.accessEditor.actions'),
      align: 'right',
      render: (_, role) => (
        <Space>
          <Button type="link" icon={<EditOutlined aria-hidden />} onClick={() => openEditor(role)}>
            {t('auth.accessEditor.edit')}
          </Button>
          <Button
            danger
            type="link"
            icon={<DeleteOutlined aria-hidden />}
            onClick={() => setRoleToDelete(role)}
          >
            {t('auth.accessEditor.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  function openEditor(role?: Role) {
    setEditingRole(role)
    setIsEditorOpen(true)
    form.setFieldsValue(
      role
        ? {
            code: role.code,
            description: role.description,
            name: role.name ?? role.code,
            permissionIds: role.permissions ?? role.permissionIds ?? [],
          }
        : { code: '', description: '', name: '', permissionIds: [] },
    )
  }

  return (
    <section className={styles.page}>
      <PageHeader
        actions={
          <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => openEditor()}>
            {t('auth.roles.create')}
          </Button>
        }
      />
      {error ? (
        <FeedbackAlert
          type="error"
          title={t('auth.roles.unavailable')}
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
      <SectionCard title={t('auth.roles.catalog')}>
        <CoreDataTable
          columns={columns}
          dataSource={data?.roles.items ?? []}
          loading={isLoading}
          rowKey="id"
        />
      </SectionCard>
      <Modal
        open={isEditorOpen}
        title={editingRole ? t('auth.roles.editTitle') : t('auth.roles.createTitle')}
        footer={null}
        transitionName=""
        maskTransitionName=""
        onCancel={() => setIsEditorOpen(false)}
      >
        <Form
          form={form}
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
          <Form.Item label={t('auth.roles.permissions')} name="permissionIds">
            <Select
              mode="multiple"
              options={(data?.permissions.items ?? []).map((permission) => ({
                label: permission.name ?? permission.code,
                value: permission.id,
              }))}
            />
          </Form.Item>
          <Space>
            <Button onClick={() => setIsEditorOpen(false)}>{t('auth.accessEditor.cancel')}</Button>
            <Button htmlType="submit" type="primary" loading={saveMutation.isPending}>
              {t('auth.accessEditor.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
      <ConfirmDangerModal
        open={Boolean(roleToDelete)}
        title={t('auth.roles.deleteTitle')}
        description={t('auth.roles.deleteDescription')}
        confirmLabel={t('auth.accessEditor.delete')}
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={deleteMutation.isPending}
        onConfirm={() => roleToDelete && deleteMutation.mutate(roleToDelete.id)}
        onCancel={() => setRoleToDelete(undefined)}
      />
    </section>
  )
}
