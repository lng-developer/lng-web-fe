import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Space, Table, Tooltip } from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import { MetricCard, SectionCard, StatusTag, useFeedbackToast } from '@/shared/ui'

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
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const year = dayjs().year()
  const balances = useQuery({
    queryKey: ['hr-time', 'leave-balances', year],
    queryFn: listMyLeaveBalances,
    enabled: canLeaveWrite,
  })
  const leaves = useQuery({
    queryKey: ['hr-time', 'leave', managerLeave ? 'all' : 'me'],
    queryFn: () =>
      managerLeave ? listLeaveRequests({ limit: 100 }) : listMyLeaveRequests({ limit: 100 }),
    enabled: managerLeave || canLeaveWrite,
  })
  const overtime = useQuery({
    queryKey: ['hr-time', 'overtime', managerOt ? 'all' : 'me'],
    queryFn: () =>
      managerOt ? listOvertimeRequests({ limit: 100 }) : listMyOvertimeRequests({ limit: 100 }),
    enabled: managerOt || canOvertimeWrite,
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
      const reason = action === 'approve' ? 'Approved by HR' : 'Rejected by HR'
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
  const status = (value: string) => <StatusTag status={statusTone(value)}>{value}</StatusTag>
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

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <div />
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
      </div>
      <div className={styles.metrics}>
        <MetricCard
          label={t('hrOperations.requests.remainingLeave')}
          value={String((balances.data ?? []).reduce((sum, item) => sum + item.availableUnits, 0))}
        />
        <MetricCard label={t('hrOperations.requests.pendingLeave')} value={String(pendingLeaves)} />
        <MetricCard label={t('hrOperations.requests.pendingOvertime')} value={String(pendingOt)} />
        <MetricCard
          label={t('hrOperations.requests.total')}
          value={String((leaves.data?.items.length ?? 0) + (overtime.data?.items.length ?? 0))}
        />
      </div>
      <div className={styles.split}>
        <SectionCard title={t('hrOperations.requests.leave')}>
          <Table
            size="small"
            rowKey="id"
            loading={leaves.isLoading}
            dataSource={leaves.data?.items}
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: t('hrOperations.common.employee'),
                render: (_, item: LeaveRequest) =>
                  item.employee?.fullName ||
                  item.employee?.employeeCode ||
                  t('hrOperations.common.me'),
              },
              {
                title: t('hrOperations.requests.time'),
                render: (_, item: LeaveRequest) => `${item.startDateKey} → ${item.endDateKey}`,
              },
              { title: t('hrOperations.common.type'), dataIndex: 'leaveType' },
              { title: t('hrOperations.common.status'), dataIndex: 'status', render: status },
              { title: '', render: (_, item: LeaveRequest) => requestActions('leave', item) },
            ]}
          />
        </SectionCard>
        <SectionCard title={t('hrOperations.requests.overtime')}>
          <Table
            size="small"
            rowKey="id"
            loading={overtime.isLoading}
            dataSource={overtime.data?.items}
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: t('hrOperations.common.employee'),
                render: (_, item: OvertimeRequest) =>
                  item.employee?.fullName ||
                  item.employee?.employeeCode ||
                  t('hrOperations.common.me'),
              },
              { title: t('hrOperations.common.date'), dataIndex: 'workDateKey' },
              {
                title: t('hrOperations.requests.time'),
                render: (_, item: OvertimeRequest) =>
                  `${item.plannedStartTime}-${item.plannedEndTime}`,
              },
              { title: t('hrOperations.common.status'), dataIndex: 'status', render: status },
              { title: '', render: (_, item: OvertimeRequest) => requestActions('overtime', item) },
            ]}
          />
        </SectionCard>
      </div>
      <TimeRequestEditorModal
        kind={editor?.kind}
        request={editor?.request}
        onClose={() => setEditor(undefined)}
      />
    </section>
  )
}
