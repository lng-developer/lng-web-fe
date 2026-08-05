import { memo, type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import { getPermissions } from '@/shared/auth/session'
import {
  ConfirmDangerModal,
  FeedbackAlert,
  MetricCard,
  PageHeader,
  SectionCard,
  useFeedbackToast,
} from '@/shared/ui'

import {
  createDepartment,
  createTeam,
  deactivateDepartment,
  deactivateTeam,
  type Department,
  type DepartmentInput,
  loadDepartments,
  loadTeams,
  type Team,
  updateDepartment,
  updateTeam,
} from '../api/organizationApi'
import styles from './OrganizationPage.module.scss'
import { TeamStaffBranch } from './TeamStaffBranch'

type Editor =
  | { kind: 'department'; item?: Department }
  | { kind: 'team'; item?: Team; departmentId?: string }
type EditorValues = DepartmentInput & { departmentId?: string }

const OrganizationTeamNode = memo(function OrganizationTeamNode({
  actions,
  canManageMembers,
  team,
}: {
  actions: ReactNode
  canManageMembers: boolean
  team: Team
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className={`${styles.teamNode} ${isOpen ? styles.teamNodeOpen : ''}`}
      role="treeitem"
      aria-expanded={isOpen}
      aria-selected={isOpen}
    >
      <div className={styles.teamHeader}>
        <button
          type="button"
          className={styles.teamButton}
          aria-label={t('organization.openResource', { name: team.name })}
          onClick={() => setIsOpen((open) => !open)}
        >
          <TeamOutlined />
          <span className={styles.teamIdentity}>
            <strong>{team.name}</strong>
            <small>
              {team.code} Â· {team.memberCount} {t('organization.members').toLowerCase()}
            </small>
          </span>
          <Tag color={team.status === 'active' ? 'success' : 'default'}>{team.status}</Tag>
        </button>
        {actions}
      </div>
      <Collapse
        className={styles.teamPanel}
        bordered={false}
        activeKey={isOpen ? ['staff'] : []}
        destroyOnHidden
        items={[
          {
            key: 'staff',
            showArrow: false,
            collapsible: 'disabled',
            label: null,
            children: <TeamStaffBranch canManageMembers={canManageMembers} team={team} />,
          },
        ]}
      />
    </div>
  )
})

export function OrganizationPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [form] = Form.useForm<EditorValues>()
  const [editor, setEditor] = useState<Editor>()
  const [deactivateTarget, setDeactivateTarget] = useState<Department | Team>()
  const permissions = getPermissions()
  const canManageOrganization = permissions.includes('AUTH:WRITE')
  const canManageMembers = canManageOrganization || permissions.includes('TEAMS:WRITE')

  const departments = useQuery({
    queryKey: ['organization', 'departments'],
    queryFn: loadDepartments,
  })
  const teams = useQuery({ queryKey: ['organization', 'teams'], queryFn: loadTeams })

  const refreshOrganization = () => queryClient.invalidateQueries({ queryKey: ['organization'] })
  const saveMutation = useMutation<Department | Team, Error, EditorValues>({
    mutationFn: async (values) => {
      if (!editor) throw new Error('Editor is closed')
      if (editor.kind === 'department') {
        const input = { code: values.code, name: values.name }
        return editor.item ? updateDepartment(editor.item.id, input) : createDepartment(input)
      }
      const input = { code: values.code, departmentId: values.departmentId!, name: values.name }
      return editor.item ? updateTeam(editor.item.id, input) : createTeam(input)
    },
    onSuccess: () => {
      setEditor(undefined)
      form.resetFields()
      showFeedbackToast('success', t('actionFeedback.saved'))
      void refreshOrganization()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })
  const deactivateMutation = useMutation<Department | Team, Error, void>({
    mutationFn: async () => {
      if (!deactivateTarget) throw new Error('No resource selected')
      return 'departmentId' in deactivateTarget
        ? deactivateTeam(deactivateTarget.id)
        : deactivateDepartment(deactivateTarget.id)
    },
    onSuccess: () => {
      setDeactivateTarget(undefined)
      showFeedbackToast('success', t('actionFeedback.deactivated'))
      void refreshOrganization()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const openEditor = (nextEditor: Editor) => {
    form.resetFields()
    form.setFieldsValue(
      nextEditor.item ??
        ('departmentId' in nextEditor ? { departmentId: nextEditor.departmentId } : {}),
    )
    setEditor(nextEditor)
  }
  const hasError = departments.error || teams.error

  const resourceActions = (item: Department | Team, kind: Editor['kind']) =>
    canManageOrganization && (
      <Space size={4} onClick={(event) => event.stopPropagation()}>
        <Tooltip title={t('organization.editResource', { name: item.name })}>
          <Button
            type="text"
            aria-label={t('organization.editResource', { name: item.name })}
            icon={<EditOutlined />}
            onClick={() =>
              openEditor(
                kind === 'department'
                  ? { kind, item: item as Department }
                  : { kind, item: item as Team },
              )
            }
          />
        </Tooltip>
        <Tooltip title={t('organization.deactivateResource', { name: item.name })}>
          <Button
            type="text"
            danger
            aria-label={t('organization.deactivateResource', { name: item.name })}
            icon={<DeleteOutlined />}
            onClick={() => setDeactivateTarget(item)}
          />
        </Tooltip>
      </Space>
    )

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <PageHeader
          title={t('organization.title')}
          description={t('organization.description')}
          actions={
            canManageOrganization && (
              <Button
                type="primary"
                aria-label={t('organization.addDepartment')}
                icon={<PlusOutlined />}
                onClick={() => openEditor({ kind: 'department' })}
              >
                {t('organization.addDepartment')}
              </Button>
            )
          }
        />
      </div>
      {hasError && (
        <FeedbackAlert
          type="error"
          title={t('organization.unavailable')}
          action={
            <Button
              type="link"
              onClick={() => {
                void departments.refetch()
                void teams.refetch()
              }}
            >
              {t('organization.retry')}
            </Button>
          }
        />
      )}
      <div className={styles.metrics}>
        <MetricCard
          icon={<ApartmentOutlined aria-hidden />}
          label={t('organization.departmentCount')}
          value={String(departments.data?.pagination?.total ?? departments.data?.items.length ?? 0)}
        />
        <MetricCard
          icon={<TeamOutlined aria-hidden />}
          label={t('organization.teamCount')}
          value={String(teams.data?.pagination?.total ?? teams.data?.items.length ?? 0)}
        />
      </div>

      <div className={styles.directory}>
        <SectionCard title={t('organization.directory')}>
          <div className={styles.tree} role="tree" aria-label={t('organization.directory')}>
            {(departments.data?.items ?? []).map((department) => {
              const departmentTeams = (teams.data?.items ?? []).filter(
                (team) => team.departmentId === department.id,
              )
              return (
                <section
                  className={styles.departmentNode}
                  role="treeitem"
                  aria-expanded
                  aria-selected={false}
                  key={department.id}
                >
                  <div className={styles.departmentHeader}>
                    <div className={styles.nodeIdentity}>
                      <ApartmentOutlined />
                      <div>
                        <Typography.Text strong>{department.name}</Typography.Text>
                        <Typography.Text type="secondary">
                          {department.code} · {departmentTeams.length}{' '}
                          {t('organization.teams').toLowerCase()}
                        </Typography.Text>
                      </div>
                    </div>
                    <Space>
                      {canManageOrganization && (
                        <Tooltip title={t('organization.addTeam')}>
                          <Button
                            type="text"
                            aria-label={`${t('organization.addTeam')} ${department.name}`}
                            icon={<PlusOutlined />}
                            onClick={() =>
                              openEditor({ kind: 'team', departmentId: department.id })
                            }
                          />
                        </Tooltip>
                      )}
                      {resourceActions(department, 'department')}
                    </Space>
                  </div>
                  <div className={styles.teamGroup} role="group">
                    {departmentTeams.length === 0 && (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t('organization.noTeams')}
                      />
                    )}
                    {departmentTeams.map((team) => (
                      <OrganizationTeamNode
                        actions={resourceActions(team, 'team')}
                        canManageMembers={canManageMembers}
                        team={team}
                        key={team.id}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </SectionCard>
      </div>

      <Modal
        open={Boolean(editor)}
        title={
          editor &&
          t(
            editor.item
              ? `organization.edit${editor.kind === 'department' ? 'Department' : 'Team'}`
              : `organization.create${editor.kind === 'department' ? 'Department' : 'Team'}`,
          )
        }
        footer={null}
        transitionName=""
        maskTransitionName=""
        onCancel={() => {
          setEditor(undefined)
          form.resetFields()
        }}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item
            name="name"
            label={t('organization.name')}
            rules={[{ required: true, message: t('organization.required') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="code"
            label={t('organization.columns.code')}
            rules={[{ required: true, message: t('organization.required') }]}
          >
            <Input />
          </Form.Item>
          {editor?.kind === 'team' && (
            <Form.Item
              name="departmentId"
              label={t('organization.columns.department')}
              rules={[{ required: true, message: t('organization.required') }]}
            >
              <Radio.Group
                className={styles.departmentChoices}
                options={(departments.data?.items ?? []).map(({ id, name }) => ({
                  label: name,
                  value: id,
                }))}
              />
            </Form.Item>
          )}
          <Space className={styles.formActions}>
            <Button onClick={() => setEditor(undefined)}>{t('organization.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              {t('organization.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
      <ConfirmDangerModal
        open={Boolean(deactivateTarget)}
        title={t('organization.deactivateTitle')}
        description={t('organization.deactivateDescription', { name: deactivateTarget?.name })}
        confirmLabel={t('organization.deactivate')}
        cancelLabel={t('organization.cancel')}
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate()}
        onCancel={() => setDeactivateTarget(undefined)}
      />
    </section>
  )
}
