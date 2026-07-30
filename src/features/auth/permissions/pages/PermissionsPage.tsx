import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Form, Input, Modal, Space } from 'antd'

import { ConfirmDangerModal, DataTable, FeedbackAlert, PageHeader, SectionCard } from '@/shared/ui'

import {
  createPermission,
  deletePermission,
  loadPermissions,
  type PermissionInput,
  updatePermission,
} from '../api/permissionsApi'
import styles from './PermissionsPage.module.scss'

type Permission = Awaited<ReturnType<typeof loadPermissions>>['items'][number]

export function PermissionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<PermissionInput>()
  const [editingPermission, setEditingPermission] = useState<Permission>()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [permissionToDelete, setPermissionToDelete] = useState<Permission>()
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['auth-permissions'],
    queryFn: loadPermissions,
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['auth-permissions'] })
  const saveMutation = useMutation({
    mutationFn: (values: PermissionInput) =>
      editingPermission ? updatePermission(editingPermission.id, values) : createPermission(values),
    onSuccess: async () => {
      setEditingPermission(undefined)
      setIsEditorOpen(false)
      form.resetFields()
      await invalidate()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (permissionId: string) => deletePermission(permissionId),
    onSuccess: async () => {
      setPermissionToDelete(undefined)
      await invalidate()
    },
  })
  const columns: TableColumnsType<Permission> = [
    { title: t('auth.permissions.code'), dataIndex: 'code' },
    {
      title: t('auth.permissions.name'),
      render: (_, permission) => permission.name ?? permission.code,
    },
    { title: t('auth.permissions.descriptionLabel'), dataIndex: 'description' },
    {
      title: t('auth.accessEditor.actions'),
      align: 'right',
      render: (_, permission) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined aria-hidden />}
            onClick={() => openEditor(permission)}
          >
            {t('auth.accessEditor.edit')}
          </Button>
          <Button
            danger
            type="link"
            icon={<DeleteOutlined aria-hidden />}
            onClick={() => setPermissionToDelete(permission)}
          >
            {t('auth.accessEditor.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  function openEditor(permission?: Permission) {
    setEditingPermission(permission)
    setIsEditorOpen(true)
    form.setFieldsValue(
      permission
        ? { code: permission.code, description: permission.description, name: permission.name }
        : { code: '', description: '', name: '' },
    )
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.permissions.title')}
        description={t('auth.permissions.description')}
        actions={
          <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => openEditor()}>
            {t('auth.permissions.create')}
          </Button>
        }
      />
      {error ? (
        <FeedbackAlert
          type="error"
          title={t('auth.permissions.unavailable')}
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
      <SectionCard title={t('auth.permissions.catalog')}>
        <DataTable
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          rowKey="id"
        />
      </SectionCard>
      <Modal
        open={isEditorOpen}
        title={
          editingPermission ? t('auth.permissions.editTitle') : t('auth.permissions.createTitle')
        }
        footer={null}
        transitionName=""
        maskTransitionName=""
        onCancel={() => setIsEditorOpen(false)}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
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
            <Button onClick={() => setIsEditorOpen(false)}>{t('auth.accessEditor.cancel')}</Button>
            <Button htmlType="submit" type="primary" loading={saveMutation.isPending}>
              {t('auth.accessEditor.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
      <ConfirmDangerModal
        open={Boolean(permissionToDelete)}
        title={t('auth.permissions.deleteTitle')}
        description={t('auth.permissions.deleteDescription')}
        confirmLabel={t('auth.accessEditor.delete')}
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={deleteMutation.isPending}
        onConfirm={() => permissionToDelete && deleteMutation.mutate(permissionToDelete.id)}
        onCancel={() => setPermissionToDelete(undefined)}
      />
    </section>
  )
}
