import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClockCircleOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Modal, Select, Space, Table, Tag } from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import { DateTimePicker, MetricCard, MonthPicker, SectionCard, useFeedbackToast } from '@/shared/ui'

import {
  adjustAttendance,
  type Attendance,
  checkIn,
  checkOut,
  listAttendance,
  listAttendanceMatrix,
  listMyAttendance,
} from '../api/hrTimeApi'
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
      <div className={styles.toolbar}>
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
      </div>
      <div className={styles.metrics}>
        <MetricCard
          icon={<ClockCircleOutlined />}
          label={t('hrOperations.attendance.records')}
          value={String(items.length)}
        />
        <MetricCard label={t('hrOperations.attendance.present')} value={String(present)} />
        <MetricCard label={t('hrOperations.attendance.late')} value={String(late)} />
        <MetricCard label={t('hrOperations.attendance.missingCheckout')} value={String(missing)} />
      </div>
      <SectionCard
        title={t(canRead ? 'hrOperations.attendance.teamTable' : 'hrOperations.attendance.myTable')}
      >
        <Table
          size="small"
          rowKey="id"
          loading={records.isLoading}
          dataSource={items}
          pagination={{ pageSize: 15 }}
          onRow={(item) => ({ onClick: () => canManage && setAdjusting(item) })}
          columns={[
            {
              title: t('hrOperations.common.employee'),
              render: (_, item) =>
                item.employee?.fullName ||
                item.employee?.employeeCode ||
                t('hrOperations.common.me'),
            },
            { title: t('hrOperations.common.date'), dataIndex: 'workDateKey' },
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
            {
              title: t('hrOperations.attendance.late'),
              dataIndex: 'lateMinutes',
              render: (value) => `${value}m`,
            },
            { title: t('hrOperations.attendance.workday'), dataIndex: 'workDayValue' },
          ]}
        />
      </SectionCard>
      <Modal
        centered
        open={Boolean(adjusting)}
        title={t('hrOperations.attendance.adjust')}
        footer={null}
        onCancel={() => setAdjusting(undefined)}
      >
        <Form form={form} layout="vertical" onFinish={(values) => adjust.mutate(values)}>
          <Form.Item name="status" label={t('hrOperations.common.status')}>
            <Select
              options={[
                'PRESENT',
                'ABSENT',
                'PAID_LEAVE',
                'UNPAID_LEAVE',
                'HALF_DAY',
                'HOLIDAY',
                'REST_DAY',
              ].map((value) => ({ value }))}
            />
          </Form.Item>
          <Form.Item name="checkInAt" label={t('hrOperations.attendance.checkInTime')}>
            <DateTimePicker />
          </Form.Item>
          <Form.Item name="checkOutAt" label={t('hrOperations.attendance.checkOutTime')}>
            <DateTimePicker />
          </Form.Item>
          <Form.Item
            name="reason"
            label={t('hrOperations.common.reason')}
            rules={[{ required: true, message: t('hrOperations.common.required') }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space className={styles.actions}>
            <Button onClick={() => setAdjusting(undefined)}>
              {t('hrOperations.common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={adjust.isPending}>
              {t('hrOperations.common.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </section>
  )
}
