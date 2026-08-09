import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  LoginOutlined,
  LogoutOutlined,
  RestOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Empty, Space, Typography } from 'antd'
import dayjs from 'dayjs'

import {
  FeedbackAlert,
  MetricCard,
  MonthPicker,
  PageHeader,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import { checkIn, checkOut, getMyHrWorkspace, type WorkContext } from '../api/hrTimeApi'
import styles from './HrOperationsPage.module.scss'
import { MonthlyScheduleCalendar } from './MonthlyScheduleCalendar'

export function StaffWorkspacePage({ view = 'dashboard' }: { view?: 'dashboard' | 'schedule' }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [month, setMonth] = useState(dayjs())
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const params = {
    dateKey: dayjs().format('YYYY-MM-DD'),
    month: month.month() + 1,
    year: month.year(),
  }
  const workspace = useQuery({
    queryKey: ['hr-workspace', 'self', params],
    queryFn: () => getMyHrWorkspace(params),
  })
  const attendance = useMutation({
    mutationFn: (action: 'in' | 'out') =>
      action === 'in'
        ? checkIn({ occurredAt: new Date().toISOString() })
        : checkOut({ occurredAt: new Date().toISOString() }),
    onSuccess: () => {
      toast('success', t('hrOperations.messages.recorded'))
      void queryClient.invalidateQueries({ queryKey: ['hr-workspace', 'self'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.attendanceFailed'), error.message),
  })
  const data = workspace.data
  const pending = [...(data?.leave.requests ?? []), ...(data?.overtime.requests ?? [])].filter(
    (item) => item.status === 'PENDING',
  ).length
  const money = (value?: number) =>
    new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US').format(value ?? 0)
  const shift = data?.today.schedule?.shift

  const presentCount = data?.calendar?.filter((d) => d.attendance?.status === 'PRESENT').length || 0
  const lateCount = data?.calendar?.filter((d) => (d.attendance?.lateMinutes ?? 0) > 0).length || 0
  const leaveCount =
    data?.calendar?.filter((d) => d.leave?.some((l) => l.status === 'APPROVED')).length || 0
  const overtimeCount =
    data?.calendar?.filter((d) => d.overtime?.some((o) => o.status === 'APPROVED')).length || 0

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
        <>
          <div className={styles.toolbar}>
            <Space>
              <Avatar size={48} icon={<UserOutlined />} />
              <div>
                <Typography.Title level={4}>{data?.profile.fullName}</Typography.Title>
                <Typography.Text type="secondary">
                  {data?.profile.employeeCode} · {data?.profile.jobTitle || '-'}
                </Typography.Text>
              </div>
            </Space>
            <MonthPicker value={month} onChange={(value) => value && setMonth(value)} />
          </div>

          <div className={styles.metrics}>
            <MetricCard
              icon={<ClockCircleOutlined />}
              variant="info"
              label={t('hrOperations.self.shift')}
              value={shift?.name ?? t('hrOperations.self.noShift')}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<CheckCircleOutlined />}
              variant="success"
              label={t('hrOperations.self.attendance')}
              value={data?.today.attendance?.status ?? t('hrOperations.self.notCheckedIn')}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<RestOutlined />}
              variant="warning"
              label={t('hrOperations.self.leaveBalance')}
              value={String(data?.leave.availableUnits ?? 0)}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<CalendarOutlined />}
              variant="neutral"
              label={t('hrOperations.self.latestPay')}
              value={money(data?.latestPayroll?.netIncome)}
              loading={workspace.isLoading}
            />
          </div>

          <div className={styles.split}>
            <SectionCard title={t('hrOperations.self.today')}>
              <div className={styles.compactList}>
                <Typography.Text strong>
                  {shift
                    ? `${shift.startTime}-${shift.endTime} · ${data?.today.schedule?.workLocation?.name ?? '-'}`
                    : t('hrOperations.self.noShift')}
                </Typography.Text>
                <Space>
                  <Button
                    icon={<LoginOutlined />}
                    loading={attendance.isPending}
                    disabled={Boolean(data?.today.attendance?.checkInAt)}
                    onClick={() => attendance.mutate('in')}
                  >
                    {t('hrOperations.self.checkIn')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<LogoutOutlined />}
                    loading={attendance.isPending}
                    disabled={
                      !data?.today.attendance?.checkInAt ||
                      Boolean(data?.today.attendance?.checkOutAt)
                    }
                    onClick={() => attendance.mutate('out')}
                  >
                    {t('hrOperations.self.checkOut')}
                  </Button>
                </Space>
              </div>
            </SectionCard>
            <SectionCard title={t('hrOperations.self.myRequests')}>
              <div className={styles.compactList}>
                <Typography.Text>
                  {t('hrOperations.self.pending')}: <strong>{pending}</strong>
                </Typography.Text>
                {[...(data?.leave.requests ?? []), ...(data?.overtime.requests ?? [])]
                  .slice(0, 4)
                  .map((item) => (
                    <Space
                      key={item.id}
                      style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', width: '100%' }}
                    >
                      <StatusTag
                        status={
                          item.status === 'APPROVED'
                            ? 'approved'
                            : item.status === 'REJECTED'
                              ? 'rejected'
                              : 'pending'
                        }
                      >
                        {item.status}
                      </StatusTag>
                      <Typography.Text>
                        {'leaveType' in item ? item.leaveType : item.workDateKey}
                      </Typography.Text>
                    </Space>
                  ))}
                <Button type="link" onClick={() => navigate('/hr/me/requests')}>
                  {t('hrOperations.navigation.open')}
                </Button>
              </div>
            </SectionCard>
          </div>

          <div className={styles.split}>
            <SectionCard title={t('hrOperations.self.mySchedule')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {(data?.schedule ?? [])
                  .filter((item) => item.isWorkingDay)
                  .slice(0, 5)
                  .map((item: WorkContext) => (
                    <div
                      key={item.workDateKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        background: '#fafafa',
                      }}
                    >
                      <Space size="middle">
                        <Avatar
                          icon={<CalendarOutlined />}
                          style={{ backgroundColor: '#1890ff' }}
                        />
                        <div>
                          <Typography.Text strong>{item.workDateKey}</Typography.Text>
                          <br />
                          <Typography.Text type="secondary">
                            {item.shift?.name ?? '-'} · {item.workLocation?.name ?? '-'}
                          </Typography.Text>
                        </div>
                      </Space>
                    </div>
                  ))}
              </div>
              <Button type="link" onClick={() => navigate('/hr/me/schedule')}>
                {t('hrOperations.navigation.open')}
              </Button>
            </SectionCard>
            <SectionCard title={t('hrOperations.self.announcements')}>
              {data?.announcements.length ? (
                data.announcements.map((item) => (
                  <article className={styles.announcement} key={item.id}>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Typography.Paragraph ellipsis={{ rows: 2 }}>
                      {item.content}
                    </Typography.Paragraph>
                  </article>
                ))
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('hrOperations.self.noAnnouncements')}
                />
              )}
            </SectionCard>
          </div>
        </>
      )}

      {view === 'schedule' && (
        <>
          <PageHeader
            title={t('hrOperations.self.mySchedule', { defaultValue: 'My Work Schedule' })}
            description={t('hrOperations.self.scheduleDescription', {
              defaultValue:
                'View your monthly shift schedule, attendance, leaves, and overtime records.',
            })}
            actions={<MonthPicker value={month} onChange={(value) => value && setMonth(value)} />}
          />

          {/* Metric Overview Cards for My Schedule */}
          <div className={styles.metrics}>
            <MetricCard
              icon={<CheckCircleOutlined />}
              variant="success"
              label={t('hrOperations.overview.presentToday', { defaultValue: 'Present Days' })}
              value={`${presentCount} days`}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<WarningOutlined />}
              variant="danger"
              label={t('hrOperations.attendance.late', { defaultValue: 'Late Check-ins' })}
              value={`${lateCount} times`}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<RestOutlined />}
              variant="warning"
              label={t('hrOperations.overview.onLeave', { defaultValue: 'Approved Leaves' })}
              value={`${leaveCount} days`}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<FieldTimeOutlined />}
              variant="info"
              label={t('hrOperations.overview.approvedOt', { defaultValue: 'Overtime Sessions' })}
              value={`${overtimeCount} days`}
              loading={workspace.isLoading}
            />
          </div>

          <SectionCard>
            <MonthlyScheduleCalendar
              key={month.format('YYYY-MM')}
              month={month}
              days={data?.calendar ?? []}
              loading={workspace.isLoading}
            />
          </SectionCard>
        </>
      )}
    </section>
  )
}

export default StaffWorkspacePage
