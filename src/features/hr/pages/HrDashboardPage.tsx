import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  PushpinFilled,
  ReloadOutlined,
  ScheduleOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Progress, Segmented, Space, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { loadDepartments } from '@/features/organization/api/organizationApi'
import { MetricCard, SectionCard } from '@/shared/ui'

import { hrKeys } from '../api/hrKeys'
import { useEmployeeProfilesQuery, useHrAnnouncementsQuery, useHrDashboardQuery } from '../hooks'
import styles from './HrDashboardPage.module.scss'

const percent = (val?: number) => `${val ?? 0}%`

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '0 ₫'
  return `${val.toLocaleString('vi-VN')} ₫`
}

export function HrDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(7)

  const todayDateKey = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  const dashboard = useHrDashboardQuery(todayDateKey, rangeDays)
  const announcements = useHrAnnouncementsQuery()
  const departments = useQuery({
    queryKey: ['organization', 'departments'],
    queryFn: loadDepartments,
  })
  const profiles = useEmployeeProfilesQuery(false)

  const data = dashboard.data
  const isRefreshing = dashboard.isFetching

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: hrKeys.overviewDashboard(rangeDays) })
    void queryClient.invalidateQueries({ queryKey: hrKeys.overviewAnnouncements() })
  }

  // Department distribution calculation
  const departmentStats = useMemo(() => {
    const list = departments.data?.items ?? []
    const profileList = profiles.data?.items ?? []
    if (!list.length) return []

    const counts: Record<string, number> = {}
    profileList.forEach((p) => {
      if (p.departmentId) {
        counts[p.departmentId] = (counts[p.departmentId] ?? 0) + 1
      }
    })

    const totalEmployees = profileList.length || 1
    return list
      .map((dept) => {
        const count = counts[dept.id] ?? 0
        const percentage = Math.round((count / totalEmployees) * 100)
        return {
          id: dept.id,
          name: dept.name,
          count,
          percentage,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [departments.data, profiles.data])

  // Chart data from attendanceTrend
  const attendanceTrend = data?.attendanceTrend
  const chartData = useMemo(() => {
    if (!attendanceTrend?.length) return []
    return attendanceTrend.map((item) => ({
      date: dayjs(item.date).format('DD/MM'),
      present: item.present,
      late: item.late,
      absent: item.absent,
      coverageRate: item.coverageRate,
    }))
  }, [attendanceTrend])

  const totalExceptions =
    (data?.attendance.late ?? 0) +
    (data?.attendance.missingCheckOuts ?? 0) +
    (data?.attendance.absent ?? 0)

  return (
    <div className={styles.dashboard}>
      {/* 1. Header with Controls */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Typography.Title level={2} className={styles.headerTitle}>
            {t('hrOperations.dashboard.title', { defaultValue: 'HR Operations Dashboard' })}
          </Typography.Title>
          <span className={styles.headerDate}>
            <CalendarOutlined />
            {dayjs().format('dddd, DD/MM/YYYY')} ·{' '}
            {t('hrOperations.dashboard.subtitle', {
              defaultValue: 'Workforce, attendance tracking, and action queues.',
            })}
          </span>
        </div>
        <div className={styles.headerRight}>
          <Segmented
            value={rangeDays}
            options={[
              { label: t('hrOperations.dashboard.today', { defaultValue: 'Today' }), value: 1 },
              { label: t('hrOperations.dashboard.days7', { defaultValue: '7 days' }), value: 7 },
              { label: t('hrOperations.dashboard.days30', { defaultValue: '30 days' }), value: 30 },
            ]}
            onChange={(val) => setRangeDays(val as 1 | 7 | 30)}
          />
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => navigate('/hr/team/approvals')}
          >
            {t('hrOperations.dashboard.goToApprovals', { defaultValue: 'Go to Approvals' })}
            {(data?.approvals.totalPending ?? 0) > 0 && (
              <Badge
                count={data?.approvals.totalPending}
                overflowCount={99}
                style={{ marginLeft: 8, backgroundColor: '#ffffff', color: '#1677ff' }}
              />
            )}
          </Button>
          <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
            <Button icon={<ReloadOutlined spin={isRefreshing} />} onClick={handleRefresh} />
          </Tooltip>
        </div>
      </header>

      {/* 2. Top KPI Metric Cards */}
      <section className={styles.kpiGrid}>
        <MetricCard
          icon={<TeamOutlined />}
          label={t('hrOperations.dashboard.headcount', { defaultValue: 'Total Headcount' })}
          value={String(data?.employees.active ?? 0)}
          subtext={`${data?.employees.total ?? 0} ${t('hrOperations.overview.totalStaff', { defaultValue: 'total' })} · ${data?.employees.probation ?? 0} ${t('hrOperations.overview.probation', { defaultValue: 'probation' })}`}
          variant="info"
        />
        <MetricCard
          icon={<CheckCircleOutlined />}
          label={t('hrOperations.dashboard.presentToday', { defaultValue: 'Present Today' })}
          value={`${data?.attendance.present ?? 0}/${data?.attendance.expectedEmployees ?? 0}`}
          subtext={`${t('hrOperations.dashboard.attendanceRate', { defaultValue: 'Coverage' })}: ${percent(data?.attendance.coverageRate)}`}
          variant="success"
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          label={t('hrOperations.dashboard.exceptions', { defaultValue: 'Attendance Exceptions' })}
          value={String(totalExceptions)}
          subtext={`${data?.attendance.late ?? 0} ${t('hrOperations.dashboard.late', { defaultValue: 'late' })} · ${data?.attendance.missingCheckOuts ?? 0} ${t('hrOperations.dashboard.missingCheckouts', { defaultValue: 'missing out' })}`}
          variant={totalExceptions > 0 ? 'danger' : 'info'}
        />
        <MetricCard
          icon={<FileTextOutlined />}
          label={t('hrOperations.dashboard.pendingApprovals', {
            defaultValue: 'Pending Approvals',
          })}
          value={String(data?.approvals.totalPending ?? 0)}
          subtext={`${data?.approvals.pendingLeaves ?? 0} ${t('hrOperations.requests.tabs.leave', { defaultValue: 'leave' })} · ${data?.approvals.pendingOvertimes ?? 0} OT`}
          variant={(data?.approvals.totalPending ?? 0) > 0 ? 'warning' : 'primary'}
        />
        <MetricCard
          icon={<DollarOutlined />}
          label={t('hrOperations.dashboard.payrollSummary', { defaultValue: 'Payroll Period' })}
          value={
            data?.payroll?.summary?.amounts?.netIncome
              ? formatCurrency(data.payroll.summary.amounts.netIncome)
              : data?.payroll
                ? `${data.payroll.month}/${data.payroll.year}`
                : '—'
          }
          subtext={
            data?.payroll
              ? `${data.payroll.status} · ${data.payroll.resultCount} ${t('hrOperations.common.employee', { defaultValue: 'staff' })}`
              : t('hrOperations.overview.noPayroll', { defaultValue: 'No payroll run yet.' })
          }
          variant="primary"
        />
      </section>

      {/* 3. Main Dashboard Grid */}
      <section className={styles.mainGrid}>
        {/* Left Column (65% width) */}
        <div className={styles.column}>
          {/* Attendance & Punctuality Trend Chart */}
          <SectionCard
            title={t('hrOperations.dashboard.attendanceTrend', {
              defaultValue: 'Attendance & Punctuality Trend',
            })}
            extra={
              <Space>
                <Tag color="green">
                  {t('hrOperations.dashboard.present', { defaultValue: 'Present' })}
                </Tag>
                <Tag color="orange">
                  {t('hrOperations.dashboard.late', { defaultValue: 'Late' })}
                </Tag>
                <Tag color="red">
                  {t('hrOperations.dashboard.absent', { defaultValue: 'Absent' })}
                </Tag>
                <Tag color="purple">
                  {t('hrOperations.dashboard.attendanceRate', { defaultValue: 'Coverage %' })}
                </Tag>
              </Space>
            }
          >
            {chartData.length > 0 ? (
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      unit="%"
                    />
                    <RechartsTooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="present"
                      name={t('hrOperations.dashboard.present', { defaultValue: 'Present' })}
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="late"
                      name={t('hrOperations.dashboard.late', { defaultValue: 'Late' })}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="absent"
                      name={t('hrOperations.dashboard.absent', { defaultValue: 'Absent' })}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="coverageRate"
                      name={t('hrOperations.dashboard.attendanceRate', {
                        defaultValue: 'Coverage %',
                      })}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                <CalendarOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <Typography.Paragraph type="secondary">
                  {t('common.empty', { defaultValue: 'No trend data recorded for this range' })}
                </Typography.Paragraph>
              </div>
            )}
          </SectionCard>

          {/* Action Queue & Approvals */}
          <SectionCard
            title={t('hrOperations.dashboard.actionQueue', {
              defaultValue: 'Action Queue & Approvals',
            })}
            extra={
              <Link to="/hr/team/approvals">
                <Button type="link" size="small">
                  {t('hrOperations.dashboard.viewApprovals', { defaultValue: 'View all' })}
                  <ArrowRightOutlined />
                </Button>
              </Link>
            }
          >
            <div className={styles.actionQueueList}>
              <div className={styles.actionQueueItem}>
                <div className={styles.actionQueueLeft}>
                  <div
                    className={styles.actionQueueIcon}
                    style={{ background: '#e6f7ff', color: '#1677ff' }}
                  >
                    <FileTextOutlined />
                  </div>
                  <div>
                    <div className={styles.actionQueueTitle}>
                      {t('hrOperations.dashboard.pendingLeaves', {
                        defaultValue: 'Pending leave requests',
                      })}
                    </div>
                    <div className={styles.actionQueueSubtitle}>
                      {t('hrOperations.requests.approvalRequired', {
                        defaultValue: 'Awaiting manager / HR decision',
                      })}
                    </div>
                  </div>
                </div>
                <Space>
                  <Tag color={data?.approvals.pendingLeaves ? 'blue' : 'default'}>
                    {data?.approvals.pendingLeaves ?? 0}{' '}
                    {t('hrOperations.common.requests', { defaultValue: 'requests' })}
                  </Tag>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => navigate('/hr/team/approvals')}
                  >
                    {t('hrOperations.common.review', { defaultValue: 'Review' })}
                  </Button>
                </Space>
              </div>

              <div className={styles.actionQueueItem}>
                <div className={styles.actionQueueLeft}>
                  <div
                    className={styles.actionQueueIcon}
                    style={{ background: '#fff7e6', color: '#fa8c16' }}
                  >
                    <ClockCircleOutlined />
                  </div>
                  <div>
                    <div className={styles.actionQueueTitle}>
                      {t('hrOperations.dashboard.pendingOvertimes', {
                        defaultValue: 'Pending overtime requests',
                      })}
                    </div>
                    <div className={styles.actionQueueSubtitle}>
                      {t('hrOperations.requests.otRequired', {
                        defaultValue: 'Submitted OT hours awaiting sign-off',
                      })}
                    </div>
                  </div>
                </div>
                <Space>
                  <Tag color={data?.approvals.pendingOvertimes ? 'orange' : 'default'}>
                    {data?.approvals.pendingOvertimes ?? 0}{' '}
                    {t('hrOperations.common.requests', { defaultValue: 'requests' })}
                  </Tag>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => navigate('/hr/team/approvals')}
                  >
                    {t('hrOperations.common.review', { defaultValue: 'Review' })}
                  </Button>
                </Space>
              </div>

              <div className={styles.actionQueueItem}>
                <div className={styles.actionQueueLeft}>
                  <div
                    className={styles.actionQueueIcon}
                    style={{ background: '#fff1f0', color: '#f5222d' }}
                  >
                    <WarningOutlined />
                  </div>
                  <div>
                    <div className={styles.actionQueueTitle}>
                      {t('hrOperations.dashboard.exceptions', {
                        defaultValue: 'Attendance exceptions today',
                      })}
                    </div>
                    <div className={styles.actionQueueSubtitle}>
                      {t('hrOperations.attendance.reviewRequired', {
                        defaultValue: 'Late check-ins and unrecorded check-outs',
                      })}
                    </div>
                  </div>
                </div>
                <Space>
                  <Tag color={totalExceptions > 0 ? 'red' : 'green'}>
                    {totalExceptions}{' '}
                    {t('hrOperations.dashboard.exceptions', { defaultValue: 'issues' })}
                  </Tag>
                  <Button size="small" onClick={() => navigate('/hr/operations/attendance')}>
                    {t('hrOperations.dashboard.viewAttendance', { defaultValue: 'Attendance' })}
                  </Button>
                </Space>
              </div>
            </div>
          </SectionCard>

          {/* Department Distribution */}
          <SectionCard
            title={t('hrOperations.dashboard.departmentWorkforce', {
              defaultValue: 'Department Workforce',
            })}
            extra={
              <Link to="/organization">
                <Button type="link" size="small">
                  {t('hrOperations.dashboard.organizationWorkspace', {
                    defaultValue: 'Organization',
                  })}
                  <ArrowRightOutlined />
                </Button>
              </Link>
            }
          >
            {departmentStats.length > 0 ? (
              <div className={styles.departmentList}>
                {departmentStats.map((dept) => (
                  <div key={dept.id} className={styles.departmentItem}>
                    <div className={styles.departmentHead}>
                      <span>{dept.name}</span>
                      <span>
                        {dept.count} {t('hrOperations.common.employee', { defaultValue: 'staff' })}{' '}
                        ({dept.percentage}%)
                      </span>
                    </div>
                    <Progress
                      percent={dept.percentage}
                      showInfo={false}
                      size="small"
                      strokeColor="#1677ff"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">
                {t('hrOperations.dashboard.noDepartments', {
                  defaultValue: 'No department data available',
                })}
              </Typography.Text>
            )}
          </SectionCard>
        </div>

        {/* Right Column (35% width) */}
        <div className={styles.column}>
          {/* Today's Attendance Real-time Breakdown */}
          <SectionCard
            title={t('hrOperations.dashboard.todayOperations', {
              defaultValue: "Today's Operations Breakdown",
            })}
          >
            <div className={styles.breakdownList}>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>
                  <TeamOutlined />
                  {t('hrOperations.dashboard.expected', { defaultValue: 'Expected' })}
                </span>
                <span className={styles.breakdownValue}>
                  {data?.attendance.expectedEmployees ?? 0}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>
                  <CheckCircleOutlined style={{ color: '#10b981' }} />
                  {t('hrOperations.dashboard.present', { defaultValue: 'Present' })}
                </span>
                <span className={`${styles.breakdownValue} ${styles.breakdownSuccess}`}>
                  {data?.attendance.present ?? 0}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>
                  <ClockCircleOutlined style={{ color: '#f59e0b' }} />
                  {t('hrOperations.dashboard.late', { defaultValue: 'Late' })}
                </span>
                <span
                  className={`${styles.breakdownValue} ${(data?.attendance.late ?? 0) > 0 ? styles.breakdownWarning : ''}`}
                >
                  {data?.attendance.late ?? 0}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>
                  <CalendarOutlined style={{ color: '#3b82f6' }} />
                  {t('hrOperations.dashboard.onLeave', { defaultValue: 'On leave' })}
                </span>
                <span className={styles.breakdownValue}>{data?.attendance.onLeave ?? 0}</span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>
                  <WarningOutlined style={{ color: '#ef4444' }} />
                  {t('hrOperations.dashboard.absent', { defaultValue: 'Absent' })}
                </span>
                <span
                  className={`${styles.breakdownValue} ${(data?.attendance.absent ?? 0) > 0 ? styles.breakdownDanger : ''}`}
                >
                  {data?.attendance.absent ?? 0}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>
                  <FieldTimeOutlined style={{ color: '#ef4444' }} />
                  {t('hrOperations.dashboard.missingCheckouts', { defaultValue: 'Missing out' })}
                </span>
                <span
                  className={`${styles.breakdownValue} ${(data?.attendance.missingCheckOuts ?? 0) > 0 ? styles.breakdownDanger : ''}`}
                >
                  {data?.attendance.missingCheckOuts ?? 0}
                </span>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--ant-color-fill-quaternary, #f8fafc)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ant-color-text-secondary, #64748b)' }}>
                {t('hrOperations.dashboard.approvedOtToday', { defaultValue: 'Approved OT today' })}
              </span>
              <Tag color="cyan">
                {data?.approvals.approvedOvertimesToday ?? 0}{' '}
                {t('hrOperations.common.shifts', { defaultValue: 'shifts' })}
              </Tag>
            </div>
          </SectionCard>

          {/* Company Announcements */}
          <SectionCard
            title={t('hrOperations.dashboard.announcements', {
              defaultValue: 'Company Announcements',
            })}
            extra={
              <Link to="/hr/operations">
                <Button type="link" size="small">
                  {t('common.viewDetails', { defaultValue: 'View all' })}
                  <ArrowRightOutlined />
                </Button>
              </Link>
            }
          >
            <div className={styles.announcementList}>
              {(announcements.data?.items ?? []).slice(0, 3).map((item) => (
                <div key={item.id} className={styles.announcementCard}>
                  <div className={styles.announcementHeader}>
                    <div className={styles.announcementTitle}>
                      {item.isPinned && (
                        <PushpinFilled style={{ color: '#e83b4a', fontSize: 13 }} />
                      )}
                      <span>{item.title}</span>
                    </div>
                    <Tag
                      color={
                        item.priority === 'URGENT'
                          ? 'error'
                          : item.category === 'EVENT'
                            ? 'processing'
                            : 'default'
                      }
                      style={{ margin: 0 }}
                    >
                      {item.category}
                    </Tag>
                  </div>
                  <div className={styles.announcementSnippet}>{item.content}</div>
                  <div className={styles.announcementMeta}>
                    <BellOutlined />
                    {item.publishedAt
                      ? dayjs(item.publishedAt).format('DD/MM/YYYY HH:mm')
                      : dayjs().format('DD/MM/YYYY')}
                  </div>
                </div>
              ))}
              {(!announcements.data?.items || announcements.data.items.length === 0) && (
                <Typography.Text
                  type="secondary"
                  style={{ textAlign: 'center', padding: '16px 0', display: 'block' }}
                >
                  {t('hrOperations.dashboard.noAnnouncements', {
                    defaultValue: 'No announcements published yet',
                  })}
                </Typography.Text>
              )}
            </div>
          </SectionCard>

          {/* Quick Workspaces Navigation */}
          <SectionCard
            title={t('hrOperations.dashboard.quickWorkspaces', {
              defaultValue: 'Quick Workspaces',
            })}
          >
            <div className={styles.quickNavGrid}>
              <Link to="/hr/operations/schedule" className={styles.quickNavCard}>
                <div className={styles.quickNavIcon}>
                  <ScheduleOutlined />
                </div>
                <span>
                  {t('hrOperations.dashboard.scheduleWorkspace', { defaultValue: 'Work Schedule' })}
                </span>
              </Link>

              <Link to="/hr/operations/attendance" className={styles.quickNavCard}>
                <div className={styles.quickNavIcon}>
                  <CheckCircleOutlined />
                </div>
                <span>
                  {t('hrOperations.dashboard.attendanceWorkspace', { defaultValue: 'Attendance' })}
                </span>
              </Link>

              <Link to="/hr/team/approvals" className={styles.quickNavCard}>
                <div className={styles.quickNavIcon}>
                  <FileTextOutlined />
                </div>
                <span>
                  {t('hrOperations.dashboard.approvalsWorkspace', { defaultValue: 'Approvals' })}
                </span>
              </Link>

              <Link to="/hr/operations/payroll" className={styles.quickNavCard}>
                <div className={styles.quickNavIcon}>
                  <DollarOutlined />
                </div>
                <span>
                  {t('hrOperations.dashboard.payrollWorkspace', { defaultValue: 'Payroll' })}
                </span>
              </Link>

              <Link to="/hr/operations/employees" className={styles.quickNavCard}>
                <div className={styles.quickNavIcon}>
                  <UserOutlined />
                </div>
                <span>
                  {t('hrOperations.dashboard.employeesWorkspace', { defaultValue: 'Employees' })}
                </span>
              </Link>

              <Link to="/organization" className={styles.quickNavCard}>
                <div className={styles.quickNavIcon}>
                  <ApartmentOutlined />
                </div>
                <span>
                  {t('hrOperations.dashboard.organizationWorkspace', {
                    defaultValue: 'Organization',
                  })}
                </span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  )
}
