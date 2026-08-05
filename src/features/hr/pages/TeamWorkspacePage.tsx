import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckOutlined, CloseOutlined, TeamOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Space, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { FeedbackAlert, MetricCard, SectionCard, useFeedbackToast } from '@/shared/ui'

import {
  approveLeaveRequest,
  approveOvertimeRequest,
  getTeamHrWorkspace,
  type LeaveRequest,
  type OvertimeRequest,
  rejectLeaveRequest,
  rejectOvertimeRequest,
} from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'

type Approval =
  | ({ requestKind: 'leave' } & LeaveRequest)
  | ({ requestKind: 'overtime' } & OvertimeRequest)

export function TeamWorkspacePage({
  view = 'dashboard',
}: {
  view?: 'dashboard' | 'approvals' | 'members'
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const params = {
    dateKey: dayjs().format('YYYY-MM-DD'),
    month: dayjs().month() + 1,
    year: dayjs().year(),
  }
  const workspace = useQuery({
    queryKey: ['hr-workspace', 'team', params.dateKey],
    queryFn: () => getTeamHrWorkspace(params),
  })
  const decide = useMutation<
    LeaveRequest | OvertimeRequest,
    Error,
    { item: Approval; approve: boolean }
  >({
    mutationFn: ({ item, approve }: { item: Approval; approve: boolean }) =>
      item.requestKind === 'leave'
        ? approve
          ? approveLeaveRequest(item.id, { reason: 'Approved by manager' })
          : rejectLeaveRequest(item.id, { reason: 'Rejected by manager' })
        : approve
          ? approveOvertimeRequest(item.id, { reason: 'Approved by manager' })
          : rejectOvertimeRequest(item.id, { reason: 'Rejected by manager' }),
    onSuccess: () => {
      toast('success', t('hrOperations.messages.updated'))
      void queryClient.invalidateQueries({ queryKey: ['hr-workspace', 'team'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.requestFailed'), error.message),
  })
  const data = workspace.data
  const attendance = data?.attendance.items ?? []
  const approvals: Approval[] = [
    ...(data?.pendingLeaves.items ?? []).map((item) => ({
      ...item,
      requestKind: 'leave' as const,
    })),
    ...(data?.pendingOvertime.items ?? []).map((item) => ({
      ...item,
      requestKind: 'overtime' as const,
    })),
  ]
  const present = attendance.filter((item) => item.status === 'PRESENT').length
  const exceptions = attendance.filter(
    (item) =>
      item.status !== 'PRESENT' || item.lateMinutes > 0 || (item.checkInAt && !item.checkOutAt),
  ).length

  return (
    <section className={styles.page}>
      {workspace.isError && (
        <FeedbackAlert
          type="error"
          title={t('hrOperations.messages.loadFailed')}
          description={workspace.error.message}
          action={
            <Button type="link" onClick={() => void workspace.refetch()}>
              {t('hrOperations.retry')}
            </Button>
          }
        />
      )}
      {view === 'dashboard' && (
        <div className={styles.metrics}>
          <MetricCard
            icon={<TeamOutlined />}
            label={t('hrOperations.team.members')}
            value={String(data?.profiles.items.length ?? 0)}
          />
          <MetricCard label={t('hrOperations.team.present')} value={String(present)} />
          <MetricCard label={t('hrOperations.team.exceptions')} value={String(exceptions)} />
          <MetricCard
            label={t('hrOperations.team.pendingApproval')}
            value={String(approvals.length)}
          />
        </div>
      )}
      {view === 'dashboard' && (
        <SectionCard title={t('hrOperations.team.attendance')}>
          <Table
            size="small"
            rowKey="id"
            loading={workspace.isLoading}
            dataSource={attendance.slice(0, 8)}
            pagination={false}
            columns={[
              {
                title: t('hrOperations.common.employee'),
                render: (_, item) => item.employee?.fullName || item.employee?.employeeCode,
              },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: (value) => <Tag>{value}</Tag>,
              },
              {
                title: t('hrOperations.attendance.in'),
                dataIndex: 'checkInAt',
                render: (value) => (value ? dayjs(value).format('HH:mm') : '-'),
              },
              {
                title: t('hrOperations.attendance.out'),
                dataIndex: 'checkOutAt',
                render: (value) => (value ? dayjs(value).format('HH:mm') : '-'),
              },
            ]}
          />
          <Button type="link" onClick={() => navigate('/hr/team/attendance')}>
            {t('hrOperations.navigation.open')}
          </Button>
        </SectionCard>
      )}
      {(view === 'dashboard' || view === 'approvals') && (
        <SectionCard title={t('hrOperations.team.approvals')}>
          {approvals.length ? (
            <Table
              size="small"
              rowKey={(item) => `${item.requestKind}-${item.id}`}
              dataSource={view === 'dashboard' ? approvals.slice(0, 6) : approvals}
              pagination={view === 'approvals' ? { pageSize: 12 } : false}
              columns={[
                {
                  title: t('hrOperations.common.employee'),
                  render: (_, item) => item.employee?.fullName || item.employee?.employeeCode,
                },
                {
                  title: t('hrOperations.common.type'),
                  render: (_, item) =>
                    item.requestKind === 'leave' ? item.leaveType : t('hrOperations.team.overtime'),
                },
                { title: t('hrOperations.common.reason'), dataIndex: 'reason' },
                {
                  title: '',
                  render: (_, item) => (
                    <Space>
                      <Button
                        type="text"
                        aria-label={t('hrOperations.team.approve')}
                        icon={<CheckOutlined />}
                        onClick={() => decide.mutate({ item, approve: true })}
                      />
                      <Button
                        type="text"
                        danger
                        aria-label={t('hrOperations.team.reject')}
                        icon={<CloseOutlined />}
                        onClick={() => decide.mutate({ item, approve: false })}
                      />
                    </Space>
                  ),
                },
              ]}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('hrOperations.team.noApprovals')}
            />
          )}
          {view === 'dashboard' && (
            <Button type="link" onClick={() => navigate('/hr/team/approvals')}>
              {t('hrOperations.navigation.open')}
            </Button>
          )}
        </SectionCard>
      )}
      {(view === 'dashboard' || view === 'members') && (
        <SectionCard title={t('hrOperations.team.directory')}>
          <Table
            size="small"
            rowKey="id"
            loading={workspace.isLoading}
            dataSource={data?.profiles.items}
            pagination={{ pageSize: view === 'members' ? 15 : 8 }}
            columns={[
              {
                title: t('hrOperations.common.employee'),
                render: (_, item) => (
                  <div>
                    <Typography.Text strong>{item.fullName}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary">{item.employeeCode}</Typography.Text>
                  </div>
                ),
              },
              { title: t('hrOperations.team.jobTitle'), dataIndex: 'jobTitle' },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: (value) => <Tag>{value}</Tag>,
              },
            ]}
          />
          {view === 'dashboard' && (
            <Button type="link" onClick={() => navigate('/hr/team/members')}>
              {t('hrOperations.navigation.open')}
            </Button>
          )}
        </SectionCard>
      )}
    </section>
  )
}
