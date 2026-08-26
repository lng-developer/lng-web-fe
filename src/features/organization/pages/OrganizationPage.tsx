import { memo, type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
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
  StatusTag,
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
              {team.code} · {team.memberCount} {t('organization.members', 'members').toLowerCase()}
            </small>
          </span>
          <StatusTag status={team.status === 'active' ? 'operational' : 'draft'}>
            {team.status}
          </StatusTag>
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

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)

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

  const deptItems = departments.data?.items ?? []
  const activeDept = deptItems.find((d) => d.id === selectedDeptId) || deptItems[0]
  const activeDeptTeams = activeDept
    ? (teams.data?.items ?? []).filter((team) => team.departmentId === activeDept.id)
    : []
  const totalMembers = (teams.data?.items ?? []).reduce((sum, t) => sum + (t.memberCount || 0), 0)

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
        <MetricCard
          icon={<UserOutlined aria-hidden />}
          label={t('organization.memberCount', 'Total Members')}
          value={String(totalMembers)}
        />
      </div>

      <div className={styles.splitLayout}>
        <div className={styles.leftPanel}>
          <div className={styles.leftPanelHeader}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t('organization.departments', 'Departments')}
            </Typography.Title>
          </div>
          <div className={styles.deptList}>
            {deptItems.map((dept) => {
              const isActive = activeDept?.id === dept.id
              const count = (teams.data?.items ?? []).filter(
                (team) => team.departmentId === dept.id,
              ).length
              return (
                <div
                  key={dept.id}
                  className={`${styles.deptCard} ${isActive ? styles.deptCardActive : ''}`}
                  onClick={() => setSelectedDeptId(dept.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedDeptId(dept.id)}
                >
                  <div className={styles.deptCardHeader}>
                    <Space size="small">
                      <ApartmentOutlined className={styles.deptIcon} />
                      <Typography.Text strong>{dept.name}</Typography.Text>
                    </Space>
                    <Tag>{dept.code}</Tag>
                  </div>
                  <div className={styles.deptCardFooter}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {count} {t('organization.teams', 'Teams').toLowerCase()}
                    </Typography.Text>
                    <Tag
                      color={dept.status === 'active' ? 'success' : 'default'}
                      style={{ fontSize: 10 }}
                    >
                      {dept.status}
                    </Tag>
                  </div>
                </div>
              )
            })}
            {deptItems.length === 0 && !departments.isLoading && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </div>

        <div className={styles.rightPanel}>
          {activeDept ? (
            <SectionCard>
              <div
                className={styles.rightPanelTitleBar}
                style={{
                  borderBottom: '1px solid var(--ant-color-border-secondary)',
                  paddingBottom: 16,
                  marginBottom: 16,
                }}
              >
                <Space size="middle">
                  <ApartmentOutlined className={styles.activeDeptIcon} />
                  <div>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {activeDept.name}
                    </Typography.Title>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {activeDept.code}
                    </Typography.Text>
                  </div>
                </Space>
                <Space>
                  {canManageOrganization && (
                    <Button
                      type="primary"
                      ghost
                      icon={<PlusOutlined />}
                      onClick={() => openEditor({ kind: 'team', departmentId: activeDept.id })}
                    >
                      {t('organization.addTeam')}
                    </Button>
                  )}
                  {resourceActions(activeDept, 'department')}
                </Space>
              </div>
              <div className={styles.teamList}>
                {activeDeptTeams.map((team) => (
                  <OrganizationTeamNode
                    actions={resourceActions(team, 'team')}
                    canManageMembers={canManageMembers}
                    team={team}
                    key={team.id}
                  />
                ))}
                {activeDeptTeams.length === 0 && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('organization.noTeams')}
                  />
                )}
              </div>
            </SectionCard>
          ) : (
            <div className={styles.emptyDetail}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t(
                  'organization.selectDepartment',
                  'Select a department to view details',
                )}
              />
            </div>
          )}
        </div>
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
