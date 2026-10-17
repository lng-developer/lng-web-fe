import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Divider, Form, Input, Modal, Space, Tag } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import {
  DateTimePicker,
  FormActions,
  MetricCard,
  MonthPicker,
  PageHeader,
  SectionCard,
} from '@/shared/ui'

import styles from './AttendancePage.module.scss'
import { type AttendanceWorkspace, useAttendance } from './useAttendance'

export const AttendancePage = ({
  workspace,
  teamId,
}: {
  workspace?: AttendanceWorkspace
  teamId?: string
}) => {
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
      todayAttendance,
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
  ] = useAttendance(workspace, teamId)

  const [currentTime, setCurrentTime] = useState(() => dayjs().format('HH:mm:ss'))
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('HH:mm:ss'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const punctualityRate = useMemo(() => {
    if (items.length === 0) return '100%'
    return `${Math.round(((items.length - late) / items.length) * 100)}%`
  }, [items.length, late])

  const totalLateMinutes = useMemo(() => {
    return items.reduce((acc, cur) => acc + (cur.lateMinutes || 0), 0)
  }, [items])

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

      {!canRead ? (
        <div className={styles.workbench}>
          <div className={styles.mainPanel}>
            <SectionCard title={t('hrOperations.attendance.myTable')} extra={attendanceActions}>
              <CoreDataTable
                size="small"
                rowKey="id"
                loading={records.isLoading}
                dataSource={items}
                pagination={pagination}
                columns={columns}
              />
            </SectionCard>
          </div>

          <aside className={styles.sideStack}>
            <div className={styles.punchCard}>
              <div className={styles.punchHeader}>
                <span className={styles.punchTitle}>{t('hrOperations.attendance.todayPunch')}</span>
                {todayAttendance?.status === 'PRESENT' ? (
                  <Tag color="success">{t('hrOperations.attendance.statuses.PRESENT')}</Tag>
                ) : (todayAttendance?.lateMinutes ?? 0) > 0 ? (
                  <Tag color="error">{t('hrOperations.attendance.statuses.LATE')}</Tag>
                ) : todayAttendance?.checkInAt ? (
                  <Tag color="processing">{t('hrOperations.attendance.in')}</Tag>
                ) : (
                  <Tag>{t('hrOperations.attendance.notCheckedIn')}</Tag>
                )}
              </div>

              <div className={styles.liveClock}>{currentTime}</div>
              <div className={styles.currentDate}>{dayjs().format('dddd, DD/MM/YYYY')}</div>

              {canWrite && !hasCompletedAttendance && (
                <div className={styles.punchActions}>
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
                </div>
              )}

              <div className={styles.punchStatusBox}>
                <InfoCircleOutlined />
                <span>
                  {hasCompletedAttendance
                    ? t('hrOperations.attendance.completedToday', {
                        checkIn: completedCheckIn,
                        checkOut: completedCheckOut,
                      })
                    : todayAttendance?.checkInAt
                      ? `${t('hrOperations.attendance.workingNow', { time: completedCheckIn })}${
                          (todayAttendance.lateMinutes ?? 0) > 0
                            ? ` (${t('hrOperations.attendance.lateWarning', { minutes: todayAttendance.lateMinutes })})`
                            : ''
                        }`
                      : t('hrOperations.attendance.notCheckedIn')}
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <h3 className={styles.statCardTitle}>
                {t('hrOperations.attendance.monthlySummary')}
              </h3>
              <div className={styles.statList}>
                <div className={styles.statItem}>
                  <span>{t('hrOperations.attendance.standardShift')}</span>
                  <strong>08:30 - 17:30</strong>
                </div>
                <div className={styles.statItem}>
                  <span>{t('hrOperations.attendance.workday')}</span>
                  <strong>{items.length}</strong>
                </div>
                <div className={styles.statItem}>
                  <span>{t('hrOperations.attendance.punctualityRate')}</span>
                  <strong
                    style={{
                      color: late > 0 ? 'var(--ant-color-error)' : 'var(--ant-color-success)',
                    }}
                  >
                    {punctualityRate}
                  </strong>
                </div>
                <div className={styles.statItem}>
                  <span>{t('hrOperations.attendance.totalLate')}</span>
                  <strong
                    style={{ color: totalLateMinutes > 0 ? 'var(--ant-color-error)' : undefined }}
                  >
                    {totalLateMinutes}{' '}
                    {t('hrOperations.attendance.minutes', { count: totalLateMinutes })}
                  </strong>
                </div>
              </div>
            </div>

            <div className={styles.rulesCard}>
              <h3 className={styles.rulesTitle}>{t('hrOperations.attendance.rulesTitle')}</h3>
              <div className={styles.rulesList}>
                <p>• {t('hrOperations.attendance.ruleHintLate')}</p>
                <p>• {t('hrOperations.attendance.ruleHintCheckout')}</p>
              </div>
              <Link to="/hr/me/requests" className={styles.rulesLink}>
                ➔ {t('hrOperations.attendance.requestAdjustmentLink')}
              </Link>
            </div>
          </aside>
        </div>
      ) : (
        <SectionCard title={t('hrOperations.attendance.teamTable')} extra={attendanceActions}>
          <CoreDataTable
            size="small"
            rowKey="id"
            loading={records.isLoading}
            dataSource={items}
            pagination={pagination}
            columns={columns}
          />
        </SectionCard>
      )}

      <Modal
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
