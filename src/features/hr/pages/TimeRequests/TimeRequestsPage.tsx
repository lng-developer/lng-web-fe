import {
  CalendarOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  RestOutlined,
} from '@ant-design/icons'
import { Button, Descriptions, Modal, Space, Tabs, Typography } from 'antd'

import { EmployeeAvatar, MetricCard, PageHeader } from '@/shared/ui'

import { type LeaveRequest, type OvertimeRequest } from '../../api/hrTimeApi'
import styles from '../HrOperationsPage.module.scss'
import { TimeRequestEditorModal } from '../TimeRequestEditorModal'
import { useTimeRequest } from './useTimeRequest'

export function TimeRequestsPage() {
  const [
    {
      t,
      editor,
      detail,
      closeEditor,
      closeDetail,
      openCreateEditor,
      pendingLeaves,
      pendingOvertime,
      availableLeaveUnits,
      totalRequests,
      date,
      leaveType,
      tabItems,
      renderStatus,
    },
    { balances, leaves, overtime, canLeaveWrite, canOvertimeWrite },
  ] = useTimeRequest()

  return (
    <section className={styles.page}>
      <PageHeader
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
          value={String(pendingOvertime)}
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

      <TimeRequestEditorModal kind={editor?.kind} request={editor?.request} onClose={closeEditor} />

      <Modal
        destroyOnClose
        width="min(960px, 85vw)"
        style={{ top: 40 }}
        open={Boolean(detail?.request)}
        title={t('hrOperations.requests.detail')}
        onCancel={closeDetail}
        footer={null}
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
      </Modal>
    </section>
  )
}

export default TimeRequestsPage
