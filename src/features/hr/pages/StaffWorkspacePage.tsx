import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ClockCircleOutlined, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Empty, Space, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import { FeedbackAlert, MetricCard, MonthPicker, SectionCard, useFeedbackToast } from '@/shared/ui'

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
      )}
      {view === 'dashboard' && (
        <>
          <div className={styles.metrics}>
            <MetricCard
              icon={<ClockCircleOutlined />}
              label={t('hrOperations.self.shift')}
              value={shift?.name ?? t('hrOperations.self.noShift')}
            />
            <MetricCard
              label={t('hrOperations.self.attendance')}
              value={data?.today.attendance?.status ?? t('hrOperations.self.notCheckedIn')}
            />
            <MetricCard
              label={t('hrOperations.self.leaveBalance')}
              value={String(data?.leave.availableUnits ?? 0)}
            />
            <MetricCard
              label={t('hrOperations.self.latestPay')}
              value={money(data?.latestPayroll?.netIncome)}
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
                    <Space key={item.id}>
                      <Tag>{item.status}</Tag>
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
              <Table
                size="small"
                rowKey="workDateKey"
                loading={workspace.isLoading}
                dataSource={(data?.schedule ?? []).filter((item) => item.isWorkingDay).slice(0, 10)}
                pagination={false}
                columns={[
                  { title: t('hrOperations.self.workDate'), dataIndex: 'workDateKey' },
                  {
                    title: t('hrOperations.schedule.shift'),
                    render: (_, item: WorkContext) => item.shift?.name ?? '-',
                  },
                  {
                    title: t('hrOperations.self.location'),
                    render: (_, item: WorkContext) => item.workLocation?.name ?? '-',
                  },
                ]}
              />
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
        <SectionCard>
          <div className={styles.calendarToolbar}>
            <Typography.Title level={2}>{t('hrOperations.self.mySchedule')}</Typography.Title>
            <MonthPicker value={month} onChange={(value) => value && setMonth(value)} />
          </div>
          <MonthlyScheduleCalendar
            key={month.format('YYYY-MM')}
            month={month}
            days={data?.calendar ?? []}
            loading={workspace.isLoading}
          />
        </SectionCard>
      )}
    </section>
  )
}
