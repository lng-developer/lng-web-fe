import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  LoginOutlined,
  LogoutOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Divider, Form, Input, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import {
  DateTimePicker,
  FormActions,
  MetricCard,
  MonthPicker,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  adjustAttendance,
  type Attendance,
  checkIn,
  checkOut,
  listAttendance,
  listAttendanceMatrix,
  listMyAttendance,
} from '../api/hrTimeApi'
import { PAGE_SIZE_OPTIONS } from './enum'
import styles from './HrOperationsPage.module.scss'

export function AttendancePage() {
  const { t } = useTranslation()
  const permissions = new Set(getPermissions())
  const canRead = permissions.has('HR_ATTENDANCE:READ') || permissions.has('HR_ATTENDANCE:MANAGE')
  const canWrite = permissions.has('HR_ATTENDANCE:WRITE')
  const canManage = permissions.has('HR_ATTENDANCE:MANAGE')
  const [month, setMonth] = useState(dayjs())
  const [adjusting, setAdjusting] = useState<Attendance>()
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const params = { month: month.month() + 1, year: month.year() }
  const range = {
    dateFrom: month.startOf('month').format('YYYY-MM-DD'),
    dateTo: month.endOf('month').format('YYYY-MM-DD'),
    limit: 100,
  }

  useQuery({
    queryKey: ['hr-time', 'attendance-matrix', params],
    queryFn: () => listAttendanceMatrix(params),
    enabled: canRead,
  })

  const records = useQuery({
    queryKey: ['hr-time', 'attendance', canRead ? 'all' : 'me', range.dateFrom],
    queryFn: () => (canRead ? listAttendance(range) : listMyAttendance(range)),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hr-time', 'attendance'] })

  const action = useMutation({
    mutationFn: (kind: 'in' | 'out') =>
      kind === 'in'
        ? checkIn({ occurredAt: new Date().toISOString() })
        : checkOut({ occurredAt: new Date().toISOString() }),
    onSuccess: () => {
      toast('success', t('hrOperations.messages.recorded'))
      void refresh()
    },
    onError: (error) => toast('error', t('hrOperations.messages.attendanceFailed'), error.message),
  })

  const adjust = useMutation({
    mutationFn: (values: object) => adjustAttendance(adjusting!.id, values),
    onSuccess: () => {
      setAdjusting(undefined)
      form.resetFields()
      toast('success', t('hrOperations.messages.adjusted'))
      void refresh()
    },
    onError: (error) => toast('error', t('hrOperations.messages.adjustFailed'), error.message),
  })

  const items = records.data?.items ?? []
  const present = items.filter((item) => item.status === 'PRESENT').length
  const late = items.filter((item) => item.lateMinutes > 0).length
  const missing = items.filter((item) => item.checkInAt && !item.checkOutAt).length

  return (
    <section className={styles.page}>
      <PageHeader
        title={t(canRead ? 'hrOperations.attendance.teamTitle' : 'hrOperations.attendance.myTitle')}
        description={t('hrOperations.attendance.description')}
        actions={
          <Space>
            <MonthPicker value={month} onChange={(value) => value && setMonth(value)} />
            {canWrite && (
              <Space>
                <Button
                  icon={<LoginOutlined />}
                  loading={action.isPending}
                  onClick={() => action.mutate('in')}
                >
                  {t('hrOperations.attendance.checkIn')}
                </Button>
                <Button
                  type="primary"
                  icon={<LogoutOutlined />}
                  loading={action.isPending}
                  onClick={() => action.mutate('out')}
                >
                  {t('hrOperations.attendance.checkOut')}
                </Button>
              </Space>
            )}
          </Space>
        }
      />

      {/* Metric Cards */}
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

      {/* Main Table */}
      <SectionCard
        title={t(canRead ? 'hrOperations.attendance.teamTable' : 'hrOperations.attendance.myTable')}
      >
        <Table
          size="small"
          rowKey="id"
          loading={records.isLoading}
          dataSource={items}
          pagination={{ defaultPageSize: 10, pageSizeOptions: PAGE_SIZE_OPTIONS }}
          columns={[
            {
              title: t('hrOperations.common.date'),
              dataIndex: 'workDateKey',
              render: (v) => (
                <Typography.Text strong>{dayjs(v).format('DD/MM/YYYY')}</Typography.Text>
              ),
            },
            ...(canRead
              ? [
                  {
                    title: t('hrOperations.common.employee'),
                    render: (_: unknown, item: Attendance) =>
                      item.employee?.fullName ||
                      item.employee?.employeeCode ||
                      item.profileId ||
                      item.id,
                  },
                ]
              : []),
            {
              title: t('hrOperations.attendance.checkInTime'),
              dataIndex: 'checkInAt',
              render: (v) => (v ? dayjs(v).format('HH:mm:ss') : '--:--:--'),
            },
            {
              title: t('hrOperations.attendance.checkOutTime'),
              dataIndex: 'checkOutAt',
              render: (v) => (v ? dayjs(v).format('HH:mm:ss') : '--:--:--'),
            },
            {
              title: t('hrOperations.attendance.lateMinutes'),
              dataIndex: 'lateMinutes',
              render: (v) =>
                v > 0 ? (
                  <Tag color="red">{t('hrOperations.attendance.minutes', { count: v })}</Tag>
                ) : (
                  <Tag color="green">{t('hrOperations.attendance.minutes', { count: 0 })}</Tag>
                ),
            },
            {
              title: t('hrOperations.common.status'),
              dataIndex: 'status',
              render: (v) => (
                <StatusTag
                  status={v === 'PRESENT' ? 'approved' : v === 'ABSENT' ? 'rejected' : 'pending'}
                >
                  {t(`hrOperations.attendance.statuses.${v}`, { defaultValue: v })}
                </StatusTag>
              ),
            },
            ...(canManage
              ? [
                  {
                    title: '',
                    width: 44,
                    render: (_: unknown, item: Attendance) => (
                      <Tooltip title={t('hrOperations.attendance.adjust')}>
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setAdjusting(item)
                            form.setFieldsValue({
                              checkInAt: item.checkInAt,
                              checkOutAt: item.checkOutAt,
                              reason: '',
                            })
                          }}
                        />
                      </Tooltip>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </SectionCard>

      {/* Adjust Modal */}
      <Modal
        centered
        destroyOnHidden
        open={Boolean(adjusting)}
        title={t('hrOperations.attendance.adjustTitle')}
        footer={null}
        width={500}
        onCancel={() => setAdjusting(undefined)}
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
                onCancel={() => setAdjusting(undefined)}
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

export default AttendancePage
