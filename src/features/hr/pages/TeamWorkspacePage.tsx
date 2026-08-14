import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckOutlined, CloseOutlined, TeamOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Flex, Segmented, Space, Table, Typography } from 'antd'
import dayjs from 'dayjs'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  EmployeeAvatar,
  FeedbackAlert,
  MetricCard,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

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

const statusTone = (status: string) =>
  status === 'ACTIVE' || status === 'PRESENT'
    ? ('operational' as const)
    : status === 'APPROVED'
      ? ('approved' as const)
      : status === 'REJECTED'
        ? ('rejected' as const)
        : status === 'CANCELLED'
          ? ('cancelled' as const)
          : ('pending' as const)

export function TeamWorkspacePage({
  view = 'dashboard',
}: {
  view?: 'dashboard' | 'approvals' | 'members'
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(7)
  const params = {
    dateKey: dayjs().format('YYYY-MM-DD'),
    month: dayjs().month() + 1,
    year: dayjs().year(),
    days: rangeDays,
  }
  const workspace = useQuery({
    queryKey: ['hr-workspace', 'team', params.dateKey, rangeDays],
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
  const todayAttendance = attendance.filter((item) => item.workDateKey === params.dateKey)
  const presentCount = todayAttendance.filter((item) => item.status === 'PRESENT').length
  const exceptions = todayAttendance.filter(
    (item) => item.status !== 'PRESENT' || (item.checkInAt && !item.checkOutAt),
  ).length
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

  const chartData = Array.from({ length: rangeDays }, (_, index) => {
    const date = dayjs(params.dateKey)
      .subtract(rangeDays - index - 1, 'day')
      .format('YYYY-MM-DD')
    const records = attendance.filter((item) => item.workDateKey === date)
    return {
      date,
      present: records.filter((item) => item.status === 'PRESENT' && item.lateMinutes === 0).length,
      late: records.filter((item) => item.lateMinutes > 0).length,
      exceptions: records.filter(
        (item) => item.status !== 'PRESENT' || (item.checkInAt && !item.checkOutAt),
      ).length,
    }
  })

  const attendanceCard = (
    <SectionCard title={t('hrOperations.team.attendance')}>
      {view === 'dashboard' ? (
        <div style={{ height: 240, width: '100%', marginBottom: 16 }}>
          <Flex justify="flex-end">
            <Segmented
              value={rangeDays}
              options={[1, 7, 30].map((value) => ({
                label: t('hrOperations.overview.days', { count: value }),
                value,
              }))}
              onChange={(value) => setRangeDays(value as 1 | 7 | 30)}
            />
          </Flex>
          {attendance.length > 0 ? (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value) => dayjs(value).format('DD/MM')} />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="present"
                  stroke="#52c41a"
                  name={t('hrOperations.team.present')}
                />
                <Line
                  type="monotone"
                  dataKey="late"
                  stroke="#faad14"
                  name={t('hrOperations.attendance.late')}
                />
                <Line
                  type="monotone"
                  dataKey="exceptions"
                  stroke="#ff4d4f"
                  name={t('hrOperations.team.exceptions')}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ) : (
        <Table
          size="small"
          rowKey="id"
          loading={workspace.isLoading}
          dataSource={attendance}
          pagination={false}
          columns={[
            {
              title: t('hrOperations.common.employee'),
              render: (_, item) => item.employee?.fullName || item.employee?.employeeCode,
            },
            {
              title: t('hrOperations.common.status'),
              dataIndex: 'status',
              render: (value) => <StatusTag status={statusTone(String(value))}>{value}</StatusTag>,
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
      )}
      {view === 'dashboard' && (
        <Button type="link" onClick={() => navigate('/hr/team/attendance')}>
          {t('hrOperations.navigation.open')}
        </Button>
      )}
    </SectionCard>
  )

  const approvalsCard = (
    <SectionCard title={t('hrOperations.team.approvals')}>
      {approvals.length ? (
        view === 'dashboard' ? (
          <div className={styles.stackList}>
            {approvals.slice(0, 5).map((item) => (
              <div key={`${item.requestKind}-${item.id}`} className={styles.surfaceRow}>
                <Space size="middle">
                  <EmployeeAvatar
                    name={item.employee?.fullName}
                    avatarUrl={item.employee?.avatarUrl}
                  />
                  <div>
                    <Typography.Text strong>
                      {item.employee?.fullName || item.employee?.employeeCode}
                    </Typography.Text>
                    <br />
                    <StatusTag status={item.requestKind === 'leave' ? 'pending' : 'warning'}>
                      {item.requestKind === 'leave'
                        ? item.leaveType
                        : t('hrOperations.team.overtime')}
                    </StatusTag>
                  </div>
                </Space>
                <Space>
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<CheckOutlined />}
                    onClick={() => decide.mutate({ item, approve: true })}
                  />
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<CloseOutlined />}
                    onClick={() => decide.mutate({ item, approve: false })}
                  />
                </Space>
              </div>
            ))}
          </div>
        ) : (
          <Table
            size="small"
            rowKey={(item) => `${item.requestKind}-${item.id}`}
            dataSource={approvals}
            pagination={{ pageSize: 12 }}
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
                align: 'right',
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
        )
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
  )

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
          <MetricCard label={t('hrOperations.team.present')} value={String(presentCount)} />
          <MetricCard label={t('hrOperations.team.exceptions')} value={String(exceptions)} />
          <MetricCard
            label={t('hrOperations.team.pendingApproval')}
            value={String(approvals.length)}
          />
        </div>
      )}
      {view === 'dashboard' && (
        <div className={styles.split}>
          {attendanceCard}
          {approvalsCard}
        </div>
      )}
      {view === 'approvals' && approvalsCard}
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
                  <Space>
                    <EmployeeAvatar name={item.fullName} avatarUrl={item.avatarUrl} />
                    <div>
                      <Typography.Text strong>{item.fullName}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">{item.employeeCode}</Typography.Text>
                    </div>
                  </Space>
                ),
              },
              { title: t('hrOperations.team.jobTitle'), dataIndex: 'jobTitle' },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: (value) => (
                  <StatusTag status={statusTone(String(value))}>{value}</StatusTag>
                ),
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
