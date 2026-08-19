import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  EditOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  RestOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Drawer, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import {
  EmployeeAvatar,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  approveLeaveRequest,
  approveOvertimeRequest,
  cancelLeaveRequest,
  cancelOvertimeRequest,
  type LeaveRequest,
  listLeaveRequests,
  listMyLeaveBalances,
  listMyLeaveRequests,
  listMyOvertimeRequests,
  listOvertimeRequests,
  type OvertimeRequest,
  rejectLeaveRequest,
  rejectOvertimeRequest,
} from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'
import { TimeRequestEditorModal, type TimeRequestKind } from './TimeRequestEditorModal'

type Editor = { kind: TimeRequestKind; request?: LeaveRequest | OvertimeRequest }

const statusTone = (status: string) =>
  status === 'APPROVED'
    ? 'approved'
    : status === 'REJECTED'
      ? 'rejected'
      : status === 'CANCELLED'
        ? 'cancelled'
        : 'pending'

export function TimeRequestsPage() {
  const { t } = useTranslation()
  const permissions = new Set(getPermissions())
  const canLeaveWrite = permissions.has('HR_LEAVE:WRITE')
  const canLeaveApprove = permissions.has('HR_LEAVE:APPROVE')
  const canOvertimeWrite = permissions.has('HR_OVERTIME:WRITE')
  const canOvertimeApprove = permissions.has('HR_OVERTIME:APPROVE')
  const managerLeave = permissions.has('HR_LEAVE:READ') || canLeaveApprove
  const managerOt = permissions.has('HR_OVERTIME:READ') || canOvertimeApprove

  const [editor, setEditor] = useState<Editor>()
  const [detail, setDetail] = useState<Editor>()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const year = dayjs().year()

  const balances = useQuery({
    queryKey: ['hr-time', 'leave-balances', year],
    queryFn: listMyLeaveBalances,
  })

  const leaves = useQuery({
    queryKey: ['hr-time', 'leave', managerLeave ? 'all' : 'me'],
    queryFn: () =>
      managerLeave ? listLeaveRequests({ limit: 100 }) : listMyLeaveRequests({ limit: 100 }),
  })

  const overtime = useQuery({
    queryKey: ['hr-time', 'overtime', managerOt ? 'all' : 'me'],
    queryFn: () =>
      managerOt ? listOvertimeRequests({ limit: 100 }) : listMyOvertimeRequests({ limit: 100 }),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hr-time'] })

  const decide = useMutation<
    unknown,
    Error,
    { kind: TimeRequestKind; action: 'approve' | 'reject' | 'cancel'; id: string }
  >({
    mutationFn: ({ kind, action, id }) => {
      if (action === 'cancel')
        return kind === 'leave' ? cancelLeaveRequest(id) : cancelOvertimeRequest(id)
      const reason =
        action === 'approve'
          ? t('hrOperations.requests.decisionReasons.approve')
          : t('hrOperations.requests.decisionReasons.reject')
      if (kind === 'leave')
        return action === 'approve'
          ? approveLeaveRequest(id, { reason })
          : rejectLeaveRequest(id, { reason })
      return action === 'approve'
        ? approveOvertimeRequest(id, { reason })
        : rejectOvertimeRequest(id, { reason })
    },
    onSuccess: () => {
      toast('success', t('hrOperations.messages.updated'))
      void refresh()
    },
    onError: (error) => toast('error', t('hrOperations.messages.requestFailed'), error.message),
  })

  const status = (value: string) => (
    <StatusTag status={statusTone(value)}>{requestStatus(value)}</StatusTag>
  )

  const action = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <Tooltip title={label}>
      <Button type="text" danger={danger} aria-label={label} icon={icon} onClick={onClick} />
    </Tooltip>
  )

  const requestActions = (kind: TimeRequestKind, item: LeaveRequest | OvertimeRequest) => (
    <Space size={2}>
      {item.capabilities?.edit &&
        action(t('hrOperations.common.edit'), <EditOutlined />, () =>
          setEditor({ kind, request: item }),
        )}
      {item.capabilities?.approve &&
        action(t('hrOperations.team.approve'), <CheckOutlined />, () =>
          decide.mutate({ kind, action: 'approve', id: item.id }),
        )}
      {item.capabilities?.reject &&
        action(
          t('hrOperations.team.reject'),
          <CloseOutlined />,
          () => decide.mutate({ kind, action: 'reject', id: item.id }),
          true,
        )}
      {item.capabilities?.cancel &&
        action(
          t('hrOperations.common.cancel'),
          <StopOutlined />,
          () => decide.mutate({ kind, action: 'cancel', id: item.id }),
          true,
        )}
    </Space>
  )

  const pendingLeaves = (leaves.data?.items ?? []).filter(
    (item) => item.status === 'PENDING',
  ).length
  const pendingOt = (overtime.data?.items ?? []).filter((item) => item.status === 'PENDING').length
  const availableLeaveUnits = (balances.data ?? []).reduce(
    (sum, item) => sum + item.availableUnits,
    0,
  )
  const totalRequests = (leaves.data?.items.length ?? 0) + (overtime.data?.items.length ?? 0)
  const date = (value: string) => dayjs(value).format('DD/MM/YYYY')
  const requestStatus = (value: string) =>
    t(`hrOperations.requests.statuses.${value}`, { defaultValue: value })
  const leaveType = (value: string) =>
    t(`hrOperations.requests.leaveTypes.${value}`, { defaultValue: value })

  const tabItems = [
    {
      key: 'leave-requests',
      label: (
        <span>
          <RestOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.requests.tabs.leave', { count: leaves.data?.items.length ?? 0 })}
        </span>
      ),
      children: (
        <SectionCard title={t('hrOperations.requests.leave')}>
          <Table
            size="small"
            rowKey="id"
            loading={leaves.isLoading}
            dataSource={leaves.data?.items}
            onRow={(item) => ({ onClick: () => setDetail({ kind: 'leave', request: item }) })}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: t('hrOperations.common.employee'),
                render: (_, item: LeaveRequest) => (
                  <Typography.Text strong>
                    {item.employee?.fullName ||
                      item.employee?.employeeCode ||
                      t('hrOperations.common.me')}
                  </Typography.Text>
                ),
              },
              {
                title: t('hrOperations.requests.time'),
                render: (_, item: LeaveRequest) => (
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {t('hrOperations.requests.dateRange', {
                      from: date(item.startDateKey),
                      to: date(item.endDateKey),
                    })}
                  </Typography.Text>
                ),
              },
              {
                title: t('hrOperations.common.type'),
                dataIndex: 'leaveType',
                render: (v) => <Tag color="purple">{leaveType(v)}</Tag>,
              },
              { title: t('hrOperations.common.status'), dataIndex: 'status', render: status },
              {
                title: '',
                align: 'right',
                render: (_, item: LeaveRequest) => requestActions('leave', item),
              },
            ]}
          />
        </SectionCard>
      ),
    },
    {
      key: 'overtime-requests',
      label: (
        <span>
          <FieldTimeOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.requests.tabs.overtime', { count: overtime.data?.items.length ?? 0 })}
        </span>
      ),
      children: (
        <SectionCard title={t('hrOperations.requests.overtime')}>
          <Table
            size="small"
            rowKey="id"
            loading={overtime.isLoading}
            dataSource={overtime.data?.items}
            onRow={(item) => ({ onClick: () => setDetail({ kind: 'overtime', request: item }) })}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: t('hrOperations.common.employee'),
                render: (_, item: OvertimeRequest) => (
                  <Typography.Text strong>
                    {item.employee?.fullName ||
                      item.employee?.employeeCode ||
                      t('hrOperations.common.me')}
                  </Typography.Text>
                ),
              },
              {
                title: t('hrOperations.common.date'),
                dataIndex: 'workDateKey',
                render: (v) => <Tag color="blue">{date(v)}</Tag>,
              },
              {
                title: t('hrOperations.requests.time'),
                render: (_, item: OvertimeRequest) =>
                  `${item.plannedStartTime} - ${item.plannedEndTime}`,
              },
              { title: t('hrOperations.common.status'), dataIndex: 'status', render: status },
              {
                title: '',
                align: 'right',
                render: (_, item: OvertimeRequest) => requestActions('overtime', item),
              },
            ]}
          />
        </SectionCard>
      ),
    },
  ]

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('hrOperations.requests.title')}
        description={t('hrOperations.requests.description')}
        actions={
          <Space>
            {canLeaveWrite && (
              <Button icon={<PlusOutlined />} onClick={() => setEditor({ kind: 'leave' })}>
                {t('hrOperations.requests.requestLeave')}
              </Button>
            )}
            {canOvertimeWrite && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setEditor({ kind: 'overtime' })}
              >
                {t('hrOperations.requests.requestOvertime')}
              </Button>
            )}
          </Space>
        }
      />

      {/* Summary Metric Cards */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<RestOutlined />}
          variant="success"
          label={t('hrOperations.requests.remainingLeave')}
          value={String(availableLeaveUnits)}
          loading={balances.isLoading}
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          variant="warning"
          label={t('hrOperations.requests.pendingLeave')}
          value={String(pendingLeaves)}
          loading={leaves.isLoading}
        />
        <MetricCard
          icon={<FieldTimeOutlined />}
          variant="info"
          label={t('hrOperations.requests.pendingOvertime')}
          value={String(pendingOt)}
          loading={overtime.isLoading}
        />
        <MetricCard
          icon={<CalendarOutlined />}
          variant="neutral"
          label={t('hrOperations.requests.total')}
          value={String(totalRequests)}
          loading={leaves.isLoading || overtime.isLoading}
        />
      </div>

      <Tabs items={tabItems} defaultActiveKey="leave-requests" />

      <TimeRequestEditorModal
        kind={editor?.kind}
        request={editor?.request}
        onClose={() => setEditor(undefined)}
      />
      <Drawer
        width={520}
        open={Boolean(detail?.request)}
        title={t('hrOperations.requests.detail')}
        onClose={() => setDetail(undefined)}
      >
        {detail?.request && (
          <Space orientation="vertical" size={20} style={{ width: '100%' }}>
            <Space>
              <EmployeeAvatar
                name={detail.request.employee?.fullName}
                avatarUrl={detail.request.employee?.avatarUrl}
                size={48}
              />
              <div>
                <Typography.Text strong>
                  {detail.request.employee?.fullName || t('hrOperations.common.me')}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ display: 'block' }}>
                  {detail.request.employee?.employeeCode}
                </Typography.Text>
              </div>
            </Space>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t('hrOperations.common.status')}>
                {status(detail.request.status)}
              </Descriptions.Item>
              <Descriptions.Item label={t('hrOperations.common.type')}>
                {detail.kind === 'leave'
                  ? leaveType((detail.request as LeaveRequest).leaveType)
                  : t('hrOperations.requests.overtime')}
              </Descriptions.Item>
              <Descriptions.Item label={t('hrOperations.requests.time')}>
                {detail.kind === 'leave'
                  ? t('hrOperations.requests.dateRange', {
                      from: date((detail.request as LeaveRequest).startDateKey),
                      to: date((detail.request as LeaveRequest).endDateKey),
                    })
                  : t('hrOperations.requests.overtimeRange', {
                      date: date((detail.request as OvertimeRequest).workDateKey),
                      from: (detail.request as OvertimeRequest).plannedStartTime,
                      to: (detail.request as OvertimeRequest).plannedEndTime,
                    })}
              </Descriptions.Item>
              <Descriptions.Item label={t('hrOperations.requests.duration')}>
                {detail.kind === 'leave'
                  ? (detail.request as LeaveRequest).requestedUnits
                  : t('hrOperations.requests.minutesWithCount', {
                      count: (detail.request as OvertimeRequest).requestedMinutes,
                    })}
              </Descriptions.Item>
              <Descriptions.Item label={t('hrOperations.common.reason')}>
                {detail.request.reason || t('hrOperations.requests.noReason')}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>
    </section>
  )
}

export default TimeRequestsPage
