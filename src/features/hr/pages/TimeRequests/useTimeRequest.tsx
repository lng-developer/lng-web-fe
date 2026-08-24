import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FieldTimeOutlined,
  RestOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Space, type TabsProps, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { getPermissions } from '@/shared/auth/session'
import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import { SectionCard, StatusTag } from '@/shared/ui'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'

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
} from '../../api/hrTimeApi'
import { type TimeRequestKind } from '../TimeRequestEditorModal'

type Editor = {
  kind: TimeRequestKind
  request?: LeaveRequest | OvertimeRequest
}

type DecisionAction = 'approve' | 'reject' | 'cancel'

const statusTone = (status: string): 'approved' | 'rejected' | 'cancelled' | 'pending' =>
  status === 'APPROVED'
    ? 'approved'
    : status === 'REJECTED'
      ? 'rejected'
      : status === 'CANCELLED'
        ? 'cancelled'
        : 'pending'

export const useTimeRequest = () => {
  const { t } = useTranslation()
  const permissions = new Set(getPermissions())
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const [editor, setEditor] = useState<Editor>()
  const [detail, setDetail] = useState<Editor>()

  const canLeaveWrite = permissions.has('hr:leave:write')
  const canOvertimeWrite = permissions.has('hr:overtime:write')
  const canLeaveApprove = permissions.has('hr:leave:approve')
  const canOvertimeApprove = permissions.has('hr:overtime:approve')

  const managerLeave = permissions.has('hr:leave:read') || canLeaveApprove
  const managerOvertime = permissions.has('hr:overtime:read') || canOvertimeApprove

  const year = dayjs().year()

  const balances = useQuery({
    queryKey: ['hr-time', 'leave-balances', year],
    queryFn: listMyLeaveBalances,
  })

  const leaves = useQuery({
    queryKey: ['hr-time', 'leave-requests', year],
    queryFn: () =>
      managerLeave ? listLeaveRequests({ limit: 100 }) : listMyLeaveRequests({ limit: 100 }),
  })

  const overtime = useQuery({
    queryKey: ['hr-time', 'overtime-requests', year],
    queryFn: () =>
      managerOvertime
        ? listOvertimeRequests({ limit: 100 })
        : listMyOvertimeRequests({ limit: 100 }),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hr-time'] })

  const decide = useMutation<
    unknown,
    Error,
    { kind: TimeRequestKind; action: DecisionAction; id: string }
  >({
    mutationFn: ({ kind, action, id }) => {
      if (action === 'cancel') {
        return kind === 'leave' ? cancelLeaveRequest(id) : cancelOvertimeRequest(id)
      }

      const reason =
        action === 'approve'
          ? t('hrOperations.requests.decisionReasons.approve')
          : t('hrOperations.requests.decisionReasons.reject')

      if (kind === 'leave') {
        return action === 'approve'
          ? approveLeaveRequest(id, { reason })
          : rejectLeaveRequest(id, { reason })
      }

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

  const pendingLeaves = (leaves.data?.items ?? []).filter(
    (item) => item.status === 'PENDING',
  ).length

  const pendingOvertime = (overtime.data?.items ?? []).filter(
    (item) => item.status === 'PENDING',
  ).length

  const availableLeaveUnits = (balances.data ?? []).reduce(
    (sum, item) => sum + (item.availableUnits ?? 0),
    0,
  )

  const totalRequests = (leaves.data?.items.length ?? 0) + (overtime.data?.items.length ?? 0)

  const date = (value: string) => dayjs(value).format('DD/MM/YYYY')

  const requestStatus = (value: string) =>
    t(`hrOperations.requests.statuses.${value}`, { defaultValue: value })

  const leaveType = (value: string) =>
    t(`hrOperations.requests.leaveTypes.${value}`, { defaultValue: value })

  const handleDecision = (kind: TimeRequestKind, action: DecisionAction, id: string) => {
    decide.mutate({ kind, action, id })
  }

  const openCreateEditor = (kind: TimeRequestKind) => setEditor({ kind })

  const openEditEditor = (kind: TimeRequestKind, request: LeaveRequest | OvertimeRequest) =>
    setEditor({ kind, request })

  const openDetail = (kind: TimeRequestKind, request: LeaveRequest | OvertimeRequest) =>
    setDetail({ kind, request })

  const closeEditor = () => setEditor(undefined)

  const closeDetail = () => setDetail(undefined)

  const renderStatus = (value: string) => (
    <StatusTag status={statusTone(value)}>{requestStatus(value)}</StatusTag>
  )

  const renderAction = (label: string, icon: ReactNode, onClick: () => void, danger = false) => (
    <Tooltip title={label}>
      <Button type="text" danger={danger} aria-label={label} icon={icon} onClick={onClick} />
    </Tooltip>
  )

  const renderRequestActions = (kind: TimeRequestKind, item: LeaveRequest | OvertimeRequest) => (
    <Space size={2}>
      {item.capabilities?.edit &&
        renderAction(t('hrOperations.common.edit'), <EditOutlined />, () =>
          openEditEditor(kind, item),
        )}

      {item.capabilities?.approve &&
        renderAction(t('hrOperations.team.approve'), <CheckOutlined />, () =>
          handleDecision(kind, 'approve', item.id),
        )}

      {item.capabilities?.reject &&
        renderAction(
          t('hrOperations.team.reject'),
          <CloseOutlined />,
          () => handleDecision(kind, 'reject', item.id),
          true,
        )}

      {item.capabilities?.cancel &&
        renderAction(
          t('hrOperations.common.cancel'),
          <StopOutlined />,
          () => handleDecision(kind, 'cancel', item.id),
          true,
        )}
    </Space>
  )

  const tabItems: TabsProps['items'] = [
    {
      key: 'leave-requests',
      label: (
        <span>
          <RestOutlined style={{ marginRight: 6 }} />
          {t('hrOperations.requests.tabs.leave', {
            count: leaves.data?.items.length ?? 0,
          })}
        </span>
      ),
      children: (
        <SectionCard title={t('hrOperations.requests.leave')}>
          <CoreDataTable
            size="small"
            rowKey="id"
            loading={leaves.isLoading}
            dataSource={leaves.data?.items}
            onRow={(item) => ({
              onClick: () => openDetail('leave', item),
            })}
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
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
                render: (value: string) => <Tag color="purple">{leaveType(value)}</Tag>,
              },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: renderStatus,
              },
              {
                title: '',
                align: 'right',
                render: (_, item: LeaveRequest) => renderRequestActions('leave', item),
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
          {t('hrOperations.requests.tabs.overtime', {
            count: overtime.data?.items.length ?? 0,
          })}
        </span>
      ),
      children: (
        <SectionCard title={t('hrOperations.requests.overtime')}>
          <CoreDataTable
            size="small"
            rowKey="id"
            loading={overtime.isLoading}
            dataSource={overtime.data?.items}
            onRow={(item) => ({
              onClick: () => openDetail('overtime', item),
            })}
            scroll={{ y: 'calc(100vh - 360px)' }}
            pagination={DEFAULT_TABLE_PAGINATION}
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
                render: (value: string) => <Tag color="blue">{date(value)}</Tag>,
              },
              {
                title: t('hrOperations.requests.time'),
                render: (_, item: OvertimeRequest) =>
                  `${item.plannedStartTime} - ${item.plannedEndTime}`,
              },
              {
                title: t('hrOperations.common.status'),
                dataIndex: 'status',
                render: renderStatus,
              },
              {
                title: '',
                align: 'right',
                render: (_, item: OvertimeRequest) => renderRequestActions('overtime', item),
              },
            ]}
          />
        </SectionCard>
      ),
    },
  ]

  return [
    {
      t,
      toast,
      editor,
      setEditor,
      detail,
      closeEditor,
      closeDetail,
      openEditEditor,
      openDetail,
      openCreateEditor,
      handleDecision,
      pendingLeaves,
      pendingOvertime,
      availableLeaveUnits,
      totalRequests,
      date,
      requestStatus,
      leaveType,
      tabItems,
      renderStatus,
    },
    {
      setDetail,
      queryClient,
      balances,
      decide,
      leaves,
      overtime,
      canLeaveWrite,
      canOvertimeWrite,
      canLeaveApprove,
      canOvertimeApprove,
      managerLeave,
      managerOvertime,
    },
  ] as const
}
