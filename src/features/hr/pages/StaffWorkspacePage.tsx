import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Empty, Modal, Space, Typography } from 'antd'
import dayjs from 'dayjs'

import {
  FeedbackAlert,
  MetricCard,
  MonthPicker,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import { hrKeys } from '../api/hrKeys'
import { checkIn, checkOut, type WorkContext } from '../api/hrTimeApi'
import { useStaffWorkspaceQuery } from '../hooks'
import styles from './HrOperationsPage.module.scss'
import { MonthlyScheduleCalendar } from './MonthlyScheduleCalendar'

export function StaffWorkspacePage({ view = 'dashboard' }: { view?: 'dashboard' | 'schedule' }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('resourceId')
  const [month, setMonth] = useState(dayjs())
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const params = useMemo(
    () => ({
      dateKey: dayjs().format('YYYY-MM-DD'),
      announcementId: targetId || undefined,
      month: month.month() + 1,
      year: month.year(),
    }),
    [month, targetId],
  )

  const workspace = useStaffWorkspaceQuery(params)

  const attendance = useMutation({
    mutationFn: (action: 'in' | 'out') =>
      action === 'in'
        ? checkIn({ occurredAt: new Date().toISOString() })
        : checkOut({ occurredAt: new Date().toISOString() }),
    onSuccess: () => {
      toast('success', t('hrOperations.messages.recorded'))
      void queryClient.invalidateQueries({ queryKey: hrKeys.workspaceSelfRoot })
    },
    onError: (error) =>
      toast(
        'error',
        t('hrOperations.messages.attendanceFailed'),
        error instanceof Error ? error.message : String(error),
      ),
  })

  const data = workspace.data

  const pending = [...(data?.leave.requests ?? []), ...(data?.overtime.requests ?? [])].filter(
    (item) => item.status === 'PENDING',
  ).length

  const money = useCallback(
    (value?: number) =>
      new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US').format(value ?? 0),
    [i18n.language],
  )

  const shift = data?.today.schedule?.shift

  const presentCount = useMemo(
    () => data?.calendar?.filter((d) => d.attendance?.status === 'PRESENT').length || 0,
    [data?.calendar],
  )

  const lateCount = useMemo(
    () => data?.calendar?.filter((d) => (d.attendance?.lateMinutes ?? 0) > 0).length || 0,
    [data?.calendar],
  )

  const leaveCount = useMemo(
    () => data?.calendar?.filter((d) => d.leave?.some((l) => l.status === 'APPROVED')).length || 0,
    [data?.calendar],
  )

  const overtimeCount = useMemo(
    () =>
      data?.calendar?.filter((d) => d.overtime?.some((o) => o.status === 'APPROVED')).length || 0,
    [data?.calendar],
  )

  const handleCheckIn = useCallback(() => {
    attendance.mutate('in')
  }, [attendance])

  const handleCheckOut = useCallback(() => {
    attendance.mutate('out')
  }, [attendance])

  const handleNavigateRequests = useCallback(() => {
    navigate('/hr/me/requests')
  }, [navigate])

  const handleNavigateSchedule = useCallback(() => {
    navigate('/hr/me/schedule')
  }, [navigate])

  const handleMonthChange = useCallback((value: dayjs.Dayjs | null) => {
    if (value) setMonth(value)
  }, [])

  return (
    <section className={styles.page}>
      <Modal
        open={Boolean(targetId)}
        title={
          data?.announcements.find((item) => item.id === targetId)?.title ||
          t('notifications.openResource')
        }
        footer={null}
        loading={workspace.isFetching}
        onCancel={() => {
          const next = new URLSearchParams(searchParams)
          next.delete('resourceId')
          setSearchParams(next, { replace: true })
        }}
      >
        {data?.announcements.find((item) => item.id === targetId) ? (
          <Typography.Paragraph>
            {data.announcements.find((item) => item.id === targetId)?.content}
          </Typography.Paragraph>
        ) : (
          <FeedbackAlert type="warning" title={t('notifications.resourceUnavailable')} />
        )}
      </Modal>
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
            <MonthPicker value={month} onChange={handleMonthChange} />
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
                    onClick={handleCheckIn}
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
                    onClick={handleCheckOut}
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
                    <Space key={item.id} className={styles.surfaceRowDivider}>
                      <StatusTag
                        status={
                          item.status === 'APPROVED'
                            ? 'approved'
                            : item.status === 'REJECTED'
                              ? 'rejected'
                              : 'pending'
                        }
                      >
                        {t(`hrOperations.requests.statuses.${item.status}`, {
                          defaultValue: item.status,
                        })}
                      </StatusTag>
                      <Typography.Text>
                        {'leaveType' in item
                          ? t(`hrOperations.requests.leaveTypes.${item.leaveType}`, {
                              defaultValue: item.leaveType,
                            })
                          : dayjs(item.workDateKey).format('DD/MM/YYYY')}
                      </Typography.Text>
                    </Space>
                  ))}
                <Button type="link" onClick={handleNavigateRequests}>
                  {t('hrOperations.navigation.open')}
                </Button>
              </div>
            </SectionCard>
          </div>

          <div className={styles.split}>
            <SectionCard title={t('hrOperations.self.mySchedule')}>
              <div className={styles.stackList}>
                {(data?.schedule ?? [])
                  .filter((item) => item.isWorkingDay)
                  .slice(0, 5)
                  .map((item: WorkContext) => (
                    <div key={item.workDateKey} className={styles.surfaceRow}>
                      <Space size="middle">
                        <Avatar icon={<CalendarOutlined />} className={styles.surfaceAvatar} />
                        <div>
                          <Typography.Text strong>
                            {dayjs(item.workDateKey).format('DD/MM/YYYY')}
                          </Typography.Text>
                          <br />
                          <Typography.Text type="secondary">
                            {item.shift?.name ?? '-'} · {item.workLocation?.name ?? '-'}
                          </Typography.Text>
                        </div>
                      </Space>
                    </div>
                  ))}
              </div>
              <Button type="link" onClick={handleNavigateSchedule}>
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
          <div className={styles.metrics}>
            <MetricCard
              icon={<CheckCircleOutlined />}
              variant="success"
              label={t('hrOperations.overview.presentToday')}
              value={t('hrOperations.overview.days', { count: presentCount })}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<WarningOutlined />}
              variant="danger"
              label={t('hrOperations.attendance.late')}
              value={t('hrOperations.overview.times', { count: lateCount })}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<RestOutlined />}
              variant="warning"
              label={t('hrOperations.overview.onLeave')}
              value={t('hrOperations.overview.days', { count: leaveCount })}
              loading={workspace.isLoading}
            />
            <MetricCard
              icon={<FieldTimeOutlined />}
              variant="info"
              label={t('hrOperations.overview.approvedOt')}
              value={t('hrOperations.overview.days', { count: overtimeCount })}
              loading={workspace.isLoading}
            />
          </div>

          <SectionCard>
            <MonthlyScheduleCalendar
              key={month.format('YYYY-MM')}
              month={month}
              days={data?.calendar ?? []}
              loading={workspace.isLoading}
              onMonthChange={setMonth}
            />
          </SectionCard>
        </>
      )}
    </section>
  )
}

export default StaffWorkspacePage
