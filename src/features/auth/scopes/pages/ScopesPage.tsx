import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Form, Input, Modal, Select, Space, Tag } from 'antd'

import {
  ConfirmDangerModal,
  DataTable,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  useFeedbackToast,
} from '@/shared/ui'

import {
  createScope,
  deactivateScope,
  loadScopes,
  type ScopeInput,
  updateScope,
} from '../api/scopesApi'
import styles from './ScopesPage.module.scss'

type Scope = Awaited<ReturnType<typeof loadScopes>>['items'][number]
const scopeTypes: ScopeInput['scopeType'][] = ['department', 'team', 'shop', 'vendor']

export function ScopesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [form] = Form.useForm<ScopeInput>()
  const [editingScope, setEditingScope] = useState<Scope>()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [scopeToDeactivate, setScopeToDeactivate] = useState<Scope>()
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['auth-scopes'],
    queryFn: loadScopes,
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['auth-scopes'] })
  const saveMutation = useMutation({
    mutationFn: (values: ScopeInput) =>
      editingScope ? updateScope(editingScope.id, { name: values.name }) : createScope(values),
    onSuccess: async () => {
      setEditingScope(undefined)
      setIsEditorOpen(false)
      form.resetFields()
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const deactivateMutation = useMutation({
    mutationFn: (scopeId: string) => deactivateScope(scopeId),
    onSuccess: async () => {
      setScopeToDeactivate(undefined)
      showFeedbackToast('success', t('actionFeedback.deactivated'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const columns: TableColumnsType<Scope> = [
    { title: t('auth.scopes.name'), dataIndex: 'name' },
    { title: t('auth.scopes.type'), dataIndex: 'scopeType' },
    { title: t('auth.scopes.scopeId'), dataIndex: 'scopeId' },
    {
      title: t('auth.accessExplorer.status'),
      render: (_, scope) => {
        const scopeStatus = String(scope.status).toLowerCase()
        return <Tag color={scopeStatus === 'active' ? 'green' : undefined}>{scope.status}</Tag>
      },
    },
    {
      title: t('auth.accessEditor.actions'),
      align: 'right',
      render: (_, scope) => (
        <Space>
          <Button type="link" icon={<EditOutlined aria-hidden />} onClick={() => openEditor(scope)}>
            {t('auth.accessEditor.edit')}
          </Button>
          {String(scope.status).toLowerCase() === 'active' && (
            <Button
              danger
              type="link"
              icon={<DeleteOutlined aria-hidden />}
              onClick={() => setScopeToDeactivate(scope)}
            >
              {t('auth.scopes.deactivate')}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  function openEditor(scope?: Scope) {
    setEditingScope(scope)
    setIsEditorOpen(true)
    form.setFieldsValue(
      scope
        ? {
            name: scope.name,
            scopeId: scope.scopeId,
            scopeType: scope.scopeType.toLowerCase() as ScopeInput['scopeType'],
          }
        : { name: '', scopeId: '', scopeType: 'department' },
    )
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('auth.scopes.title')}
        description={t('auth.scopes.description')}
        actions={
          <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => openEditor()}>
            {t('auth.scopes.create')}
          </Button>
        }
      />
      {error ? (
        <FeedbackAlert
          type="error"
          title={t('auth.scopes.unavailable')}
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
      <SectionCard title={t('auth.scopes.catalog')}>
        <DataTable
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          rowKey="id"
        />
      </SectionCard>
      <Modal
        open={isEditorOpen}
        title={editingScope ? t('auth.scopes.editTitle') : t('auth.scopes.createTitle')}
        footer={null}
        transitionName=""
        maskTransitionName=""
        onCancel={() => setIsEditorOpen(false)}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item label={t('auth.scopes.name')} name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('auth.scopes.type')} name="scopeType" rules={[{ required: true }]}>
            <Select
              disabled={Boolean(editingScope)}
              options={scopeTypes.map((scopeType) => ({ label: scopeType, value: scopeType }))}
            />
          </Form.Item>
          <Form.Item label={t('auth.scopes.scopeId')} name="scopeId" rules={[{ required: true }]}>
            <Input disabled={Boolean(editingScope)} />
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
        open={Boolean(scopeToDeactivate)}
        title={t('auth.scopes.deactivateTitle')}
        description={t('auth.scopes.deactivateDescription')}
        confirmLabel={t('auth.scopes.deactivate')}
        cancelLabel={t('auth.accessEditor.cancel')}
        loading={deactivateMutation.isPending}
        onConfirm={() => scopeToDeactivate && deactivateMutation.mutate(scopeToDeactivate.id)}
        onCancel={() => setScopeToDeactivate(undefined)}
      />
    </section>
  )
}
