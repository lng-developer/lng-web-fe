import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Divider, Form, Input, Modal, Space, Tag } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import {
  DateTimePicker,
  FormActions,
  MetricCard,
  MonthPicker,
  PageHeader,
  SectionCard,
} from '@/shared/ui'

import styles from '../HrOperationsPage.module.scss'
import { useAttendance } from './useAttendance'

export const AttendancePage = () => {
  const [
    {
      t,
      form,
      month,
      setMonth,
      adjusting,
      closeAdjusting,
      attendanceCapabilities,
      completedCheckIn,
      completedCheckOut,
      hasCompletedAttendance,
      action,
      adjust,
      items,
      present,
      late,
      missing,
      columns,
      pagination,
    },
    { records, canRead, canWrite },
  ] = useAttendance()
  const attendanceActions = canWrite ? (
    hasCompletedAttendance ? (
      <Tag color="success" icon={<CheckCircleOutlined />}>
        {t('hrOperations.attendance.completedToday', {
          checkIn: completedCheckIn,
          checkOut: completedCheckOut,
        })}
      </Tag>
    ) : (
      <Space>
        <Button
          icon={<LoginOutlined />}
          loading={action.isPending}
          disabled={!attendanceCapabilities?.checkIn}
          onClick={() => action.mutate('in')}
        >
          {t('hrOperations.attendance.checkIn')}
        </Button>

        <Button
          type="primary"
          icon={<LogoutOutlined />}
          loading={action.isPending}
          disabled={!attendanceCapabilities?.checkOut}
          onClick={() => action.mutate('out')}
        >
          {t('hrOperations.attendance.checkOut')}
        </Button>
      </Space>
    )
  ) : null

  return (
    <section className={styles.page}>
      <PageHeader
        title={
          canRead ? t('hrOperations.attendance.teamTitle') : t('hrOperations.attendance.myTitle')
        }
        description={t('hrOperations.attendance.description')}
        actions={<MonthPicker value={month} onChange={(value) => value && setMonth(value)} />}
      />

      <div className={styles.metrics}>
        <MetricCard
          icon={<ClockCircleOutlined />}
          variant="neutral"
          label={t('hrOperations.attendance.records')}
          value={String(items.length)}
          loading={records.isLoading}
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          variant="success"
          label={t('hrOperations.attendance.present')}
          value={String(present)}
          loading={records.isLoading}
        />
        <MetricCard
          icon={<WarningOutlined />}
          variant="danger"
          label={t('hrOperations.attendance.late')}
          value={String(late)}
          loading={records.isLoading}
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          variant="warning"
          label={t('hrOperations.attendance.missingCheckout')}
          value={String(missing)}
          loading={records.isLoading}
        />
      </div>

      <SectionCard
        title={
          canRead ? t('hrOperations.attendance.teamTable') : t('hrOperations.attendance.myTable')
        }
        extra={attendanceActions}
      >
        <CoreDataTable
          size="small"
          rowKey="id"
          loading={records.isLoading}
          dataSource={items}
          pagination={pagination}
          columns={columns}
        />
      </SectionCard>

      <Modal
        centered
        destroyOnHidden
        open={Boolean(adjusting)}
        title={t('hrOperations.attendance.adjustTitle')}
        footer={null}
        width={500}
        onCancel={closeAdjusting}
      >
        <Form
          className={styles.modalForm}
          form={form}
          layout="vertical"
          onFinish={(values) => adjust.mutate(values)}
        >
          <Divider plain className={styles.modalSection}>
            {t('hrOperations.attendance.adjustTitle')}
          </Divider>

          <Form.Item name="checkInAt" label={t('hrOperations.attendance.checkInTime')}>
            <DateTimePicker mode="datetime" />
          </Form.Item>

          <Form.Item name="checkOutAt" label={t('hrOperations.attendance.checkOutTime')}>
            <DateTimePicker mode="datetime" />
          </Form.Item>

          <Form.Item
            name="reason"
            label={t('hrOperations.attendance.adjustReason')}
            rules={[{ required: true, message: t('hrOperations.common.required') }]}
          >
            <Input.TextArea
              rows={3}
              placeholder={t('hrOperations.attendance.adjustReasonPlaceholder')}
            />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {() => (
              <FormActions
                cancelLabel={t('hrOperations.common.cancel')}
                dirty={form.isFieldsTouched()}
                onCancel={closeAdjusting}
                saving={adjust.isPending}
                submitLabel={t('hrOperations.common.save')}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
