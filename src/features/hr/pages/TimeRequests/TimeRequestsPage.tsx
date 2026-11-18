import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  RestOutlined,
} from '@ant-design/icons'
import { Button, Descriptions, Modal, Space, Tabs, Typography } from 'antd'

import { EmployeeAvatar, FeedbackAlert, CompactStatBar, PageHeader } from '@/shared/ui'

import { type LeaveRequest, type OvertimeRequest } from '../../api/hrTimeApi'
import { RequestDecisionModal } from '../../components/RequestDecisionModal'
import styles from '../HrOperationsPage.module.scss'
import { TimeRequestEditorModal } from '../TimeRequestEditorModal'
import { type TimeRequestWorkspace } from './timeRequestAccess'
import { useTimeRequest } from './useTimeRequest'

export function TimeRequestsPage({
  workspace,
  teamId,
}: {
  workspace?: TimeRequestWorkspace
  teamId?: string
}) {
  const [
    {
      t,
      target,
      targetId,
      editor,
      detail,
      decision,
      closeEditor,
      closeDetail,
      closeDecision,
      openCreateEditor,
      submitDecision,
      pendingLeaves,
      pendingOvertime,
      totalApproved,
      availableLeaveUnits,
      totalRequests,
      date,
      leaveType,
      tabItems,
      renderStatus,
      renderRequestActions,
    },
    { balances, leaves, overtime, canLeaveWrite, canOvertimeWrite, decisionPending },
  ] = useTimeRequest(workspace, teamId)

  return (
    <section className={styles.page}>
      {targetId && !target.isPending && !target.data?.items.length ? (
        <FeedbackAlert type="error" title={t('notifications.resourceUnavailable')} />
      ) : null}
      <PageHeader
        title={t('hrOperations.requests.title')}
        description={t('hrOperations.requests.description')}
        actions={
          <Space>
            {canLeaveWrite && (
              <Button icon={<PlusOutlined />} onClick={() => openCreateEditor('leave')}>
                {t('hrOperations.requests.requestLeave')}
              </Button>
            )}

            {canOvertimeWrite && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreateEditor('overtime')}
              >
                {t('hrOperations.requests.requestOvertime')}
              </Button>
            )}
          </Space>
        }
      />

      <CompactStatBar
        items={
          workspace !== 'personal'
            ? [
                {
                  key: 'pendingLeaves',
                  icon: <ClockCircleOutlined />,
                  variant: pendingLeaves > 0 ? 'warning' : 'neutral',
                  valueVariant: pendingLeaves > 0 ? 'warning' : undefined,
                  label: t('hrOperations.requests.pendingLeave', 'Đơn nghỉ chờ duyệt'),
                  value: `${pendingLeaves} ${t('hrOperations.requests.requestsUnit', 'đơn')}`,
                  loading: leaves.isLoading,
                },
                {
                  key: 'pendingOvertime',
                  icon: <FieldTimeOutlined />,
                  variant: pendingOvertime > 0 ? 'warning' : 'neutral',
                  valueVariant: pendingOvertime > 0 ? 'warning' : undefined,
                  label: t('hrOperations.requests.pendingOvertime', 'OT chờ duyệt'),
                  value: `${pendingOvertime} ${t('hrOperations.requests.requestsUnit', 'đơn')}`,
                  loading: overtime.isLoading,
                },
                {
                  key: 'approved',
                  icon: <CheckCircleOutlined />,
                  variant: 'success',
                  label: t('hrOperations.requests.approvedCount', 'Đã phê duyệt'),
                  value: `${totalApproved} ${t('hrOperations.requests.requestsUnit', 'đơn')}`,
                  loading: leaves.isLoading || overtime.isLoading,
                },
                {
                  key: 'total',
                  icon: <CalendarOutlined />,
                  variant: 'neutral',
                  label: t('hrOperations.requests.total', 'Tổng yêu cầu'),
                  value: `${totalRequests} ${t('hrOperations.requests.requestsUnit', 'đơn')}`,
                  loading: leaves.isLoading || overtime.isLoading,
                },
              ]
            : [
                {
                  key: 'balances',
                  icon: <RestOutlined />,
                  variant: 'success',
                  label: t('hrOperations.requests.remainingLeave'),
                  value: `${availableLeaveUnits / 2} ${t('hrOperations.requests.daysUnit', 'ngày')}`,
                  loading: balances.isLoading,
                },
                {
                  key: 'pendingLeaves',
                  icon: <ClockCircleOutlined />,
                  variant: pendingLeaves > 0 ? 'warning' : 'neutral',
                  valueVariant: pendingLeaves > 0 ? 'warning' : undefined,
                  label: t('hrOperations.requests.pendingLeave'),
                  value: `${pendingLeaves} ${t('hrOperations.requests.requestsUnit', 'đơn')}`,
                  loading: leaves.isLoading,
                },
                {
                  key: 'pendingOvertime',
                  icon: <FieldTimeOutlined />,
                  variant: pendingOvertime > 0 ? 'info' : 'neutral',
                  valueVariant: pendingOvertime > 0 ? 'info' : undefined,
                  label: t('hrOperations.requests.pendingOvertime'),
                  value: `${pendingOvertime} ${t('hrOperations.requests.requestsUnit', 'đơn')}`,
                  loading: overtime.isLoading,
                },
                {
                  key: 'total',
                  icon: <CalendarOutlined />,
                  variant: 'neutral',
                  label: t('hrOperations.requests.total'),
                  value: `${totalRequests} ${t('hrOperations.requests.requestsUnit', 'đơn')}`,
                  loading: leaves.isLoading || overtime.isLoading,
                },
              ]
        }
      />

      <Tabs items={tabItems} defaultActiveKey="leave-requests" />

      <TimeRequestEditorModal kind={editor?.kind} request={editor?.request} onClose={closeEditor} />

      <RequestDecisionModal
        decision={
          decision && {
            action: decision.action,
            employeeName:
              decision.request.employee?.fullName || decision.request.employee?.employeeCode,
            requestKind: decision.kind,
          }
        }
        pending={decisionPending}
        onClose={closeDecision}
        onSubmit={submitDecision}
      />

      <Modal
        destroyOnClose
        width="min(960px, 85vw)"
        style={{ top: 40 }}
        open={Boolean(detail?.request)}
        title={t('hrOperations.requests.detail')}
        onCancel={closeDetail}
        footer={detail?.request ? renderRequestActions(detail.kind, detail.request) : null}
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
                {renderStatus(detail.request.status)}
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
                  ? `${(detail.request as LeaveRequest).requestedUnits / 2} ${t('hrOperations.requests.daysUnit', 'ngày')}`
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
      </Modal>
    </section>
  )
}

export default TimeRequestsPage
