import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  RestOutlined,
  SearchOutlined,
  SyncOutlined,
  TeamOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Divider, Form, Input, Modal, Popconfirm, Segmented, Space, Tag } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { useRoles } from '@/shared/auth/useAuthStore'
import {
  CompactStatBar,
  DateTimePicker,
  FeedbackAlert,
  FormActions,
  MonthPicker,
  PageHeader,
  SectionCard,
} from '@/shared/ui'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'

import { deleteAttendance, listLeaveBalances } from '../../api/hrTimeApi'
import { useEmployeeProfilesQuery } from '../../hooks'
import { AdminAttendanceAdjustmentModal } from './AdminAttendanceAdjustmentModal'
import { AttendanceCalendarGrid, type CalendarDayItem } from './AttendanceCalendarGrid'
import { AttendanceDayDrawer } from './AttendanceDayDrawer'
import { AttendanceSummaryTable, type EmployeeAttendanceSummary } from './AttendanceSummaryTable'
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
      syncMachine,
      items,
      present,
      late,
      missing,
      totalWorkdays,
      totalWorkedHours,
      columns,
      pagination,
    },
    { records, canRead, canWrite, canSyncMachine },
  ] = useAttendance(workspace, teamId)

  const showTeamAttendance = workspace === 'operations' || workspace === 'team'
  const profilesQuery = useEmployeeProfilesQuery(false, { enabled: showTeamAttendance })
  const balancesQuery = useQuery({
    queryKey: ['hr-time', 'all-leave-balances', month.year()],
    queryFn: () => listLeaveBalances({ year: month.year() }),
    enabled: showTeamAttendance,
  })

  const [currentTime, setCurrentTime] = useState(() => dayjs().format('HH:mm:ss'))
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'summary'>(
    showTeamAttendance ? 'summary' : 'calendar',
  )
  const [selectedDayItem, setSelectedDayItem] = useState<CalendarDayItem | null>(null)
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [showErrorsOnly, setShowErrorsOnly] = useState(false)

  const toast = useFeedbackToast()
  const roles = useRoles().map((r) => r.toUpperCase())
  const isSuperAdminOrAdmin = roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r))
  const [selectedAdjustmentProfile, setSelectedAdjustmentProfile] =
    useState<EmployeeAttendanceSummary | null>(null)
  const [selectedAdjustmentProfiles, setSelectedAdjustmentProfiles] = useState<
    EmployeeAttendanceSummary[]
  >([])
  const [selectedSummaryKeys, setSelectedSummaryKeys] = useState<React.Key[]>([])
  const [selectedTableKeys, setSelectedTableKeys] = useState<React.Key[]>([])
  const [isAdminAdjustmentOpen, setIsAdminAdjustmentOpen] = useState(false)

  const deleteBatchMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return Promise.all(ids.map((id) => deleteAttendance(id)))
    },
    onSuccess: (_res, ids) => {
      toast(
        'success',
        t(
          'hrOperations.messages.attendanceBatchDeleted',
          'Đã xóa {{count}} bản ghi chấm công thành công',
          {
            count: ids.length,
          },
        ),
      )
      setSelectedTableKeys([])
      void records.refetch()
    },
    onError: (err: Error) => {
      toast(
        'error',
        t('hrOperations.messages.attendanceDeleteFailed', 'Xóa bản ghi thất bại'),
        err.message,
      )
    },
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('HH:mm:ss'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const punctualityRate = useMemo(() => {
    if (records.isError) return '—'
    if (records.isLoading) return '...'
    if (items.length === 0) return '—'
    return `${Math.round(((items.length - late) / items.length) * 100)}%`
  }, [items.length, late, records.isError, records.isLoading])

  const tableError = records.isError ? (
    <FeedbackAlert
      type="error"
      title={t('hrOperations.messages.loadFailed')}
      description={records.error instanceof Error ? records.error.message : undefined}
      action={
        <Button type="link" onClick={() => void records.refetch()}>
          {t('hrOperations.retry')}
        </Button>
      }
    />
  ) : undefined

  const totalLateMinutes = useMemo(() => {
    return items.reduce((acc, cur) => acc + (cur.lateMinutes || 0), 0)
  }, [items])

  const totalEmployees = profilesQuery.data?.items?.length ?? 0
  const activeEmployees = useMemo(() => {
    return (profilesQuery.data?.items ?? []).filter((p) => p.status === 'ACTIVE').length
  }, [profilesQuery.data?.items])

  const companyMonthLeaves = useMemo(() => {
    return items.filter(
      (it) =>
        it.status === 'PAID_LEAVE' ||
        it.status === 'ANNUAL_LEAVE' ||
        it.status === 'UNPAID_LEAVE' ||
        it.status === 'ABSENT',
    ).length
  }, [items])

  const companyPaidLeaves = useMemo(() => {
    return items.filter((it) => it.status === 'PAID_LEAVE' || it.status === 'ANNUAL_LEAVE').length
  }, [items])

  const companyAbsents = useMemo(() => {
    return items.filter((it) => it.status === 'ABSENT').length
  }, [items])

  const exceptionCount = useMemo(() => {
    return items.filter(
      (it) =>
        it.status === 'ERROR' ||
        it.status === 'ABSENT' ||
        (it.lateMinutes ?? 0) > 0 ||
        (it.checkInAt && !it.checkOutAt),
    ).length
  }, [items])

  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      if (showErrorsOnly) {
        const hasError =
          item.status === 'ERROR' ||
          item.status === 'ABSENT' ||
          (item.lateMinutes ?? 0) > 0 ||
          (item.checkInAt && !item.checkOutAt)
        if (!hasError) return false
      }
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase()
        const matchName = item.employee?.fullName?.toLowerCase().includes(q)
        const matchCode = item.employee?.employeeCode?.toLowerCase().includes(q)
        const matchDate = item.workDateKey?.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchDate) return false
      }
      return true
    })
  }, [items, showErrorsOnly, searchText])

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
        actions={
          <Space>
            {canSyncMachine && (
              <Button
                icon={<SyncOutlined spin={syncMachine.isPending} />}
                loading={syncMachine.isPending}
                onClick={() => syncMachine.mutate()}
              >
                {t('hrOperations.attendance.syncSqlAttendance')}
              </Button>
            )}
            <MonthPicker value={month} onChange={(value) => value && setMonth(value)} />
          </Space>
        }
      />

      <CompactStatBar
        items={
          showTeamAttendance
            ? [
                {
                  key: 'staff',
                  icon: <TeamOutlined />,
                  variant: 'primary',
                  label: t('hrOperations.attendance.metrics.totalStaff', 'Tổng nhân sự'),
                  value: `${totalEmployees} ${t('hrOperations.attendance.metrics.staffUnit', 'nhân sự')}`,
                  subDetail: t('hrOperations.attendance.metrics.activeStaff', {
                    count: activeEmployees,
                  }),
                  loading: profilesQuery.isLoading,
                },
                {
                  key: 'punctuality',
                  icon: <CheckCircleOutlined />,
                  variant: 'success',
                  label: t('hrOperations.attendance.metrics.punctualityRate', 'Tỷ lệ đúng giờ'),
                  value: punctualityRate,
                  subDetail:
                    items.length > 0
                      ? t('hrOperations.attendance.metrics.punctualitySummary', {
                          punctual: items.length - late,
                          total: items.length,
                        })
                      : t('hrOperations.attendance.metrics.noRecords', 'Chưa có bản ghi'),
                  loading: records.isLoading,
                },
                {
                  key: 'late',
                  icon: <ClockCircleOutlined />,
                  variant: late > 0 ? 'warning' : 'neutral',
                  valueVariant: late > 0 ? 'warning' : undefined,
                  label: t('hrOperations.attendance.late', 'Đi muộn'),
                  value: `${late} ${t('hrOperations.attendance.timesUnit', 'lần')}`,
                  subDetail: totalLateMinutes > 0 ? `${totalLateMinutes}p` : undefined,
                  loading: records.isLoading,
                },
                {
                  key: 'leaves',
                  icon: <RestOutlined />,
                  variant: 'neutral',
                  label: t('hrOperations.attendance.metrics.monthLeaves', 'Nghỉ trong tháng'),
                  value: `${companyMonthLeaves} ${t('hrOperations.attendance.daysUnit', 'ngày')}`,
                  subDetail:
                    companyMonthLeaves > 0
                      ? t('hrOperations.attendance.metrics.leavesSummary', {
                          paid: companyPaidLeaves,
                          absent: companyAbsents,
                        })
                      : t('hrOperations.attendance.metrics.allPresent', 'Đi làm đầy đủ'),
                  loading: records.isLoading,
                },
                {
                  key: 'issues',
                  icon: <WarningOutlined />,
                  variant: exceptionCount > 0 ? 'danger' : 'neutral',
                  valueVariant: exceptionCount > 0 ? 'danger' : undefined,
                  label: t('hrOperations.attendance.metrics.issues', 'Cần xử lý'),
                  value: `${exceptionCount} ${t('hrOperations.attendance.turnsUnit', 'lượt')}`,
                  subDetail:
                    missing > 0
                      ? t('hrOperations.attendance.metrics.missingCheckoutSummary', {
                          count: missing,
                        })
                      : exceptionCount > 0
                        ? t(
                            'hrOperations.attendance.metrics.attendanceAbnormal',
                            'Bất thường chấm công',
                          )
                        : t('hrOperations.attendance.metrics.allGood', 'Dữ liệu chuẩn'),
                  loading: records.isLoading,
                },
              ]
            : [
                {
                  key: 'workdays',
                  icon: <CalendarOutlined />,
                  variant: 'primary',
                  label: t('hrOperations.attendance.totalWorkdays'),
                  value: t('hrOperations.attendance.workDayCount', { count: totalWorkdays }),
                  loading: records.isLoading,
                },
                {
                  key: 'hours',
                  icon: <ClockCircleOutlined />,
                  variant: 'neutral',
                  label: t('hrOperations.attendance.totalWorkedHours'),
                  value: `${totalWorkedHours}h`,
                  loading: records.isLoading,
                },
                {
                  key: 'present',
                  icon: <CheckCircleOutlined />,
                  variant: 'success',
                  label: t('hrOperations.attendance.present'),
                  value: `${present} ${t('hrOperations.attendance.daysUnit', 'ngày')}`,
                  loading: records.isLoading,
                },
                {
                  key: 'late',
                  icon: <WarningOutlined />,
                  variant: late > 0 ? 'danger' : 'neutral',
                  valueVariant: late > 0 ? 'danger' : undefined,
                  label: t('hrOperations.attendance.late'),
                  value: `${late} ${t('hrOperations.attendance.timesUnit', 'lần')}`,
                  subDetail: totalLateMinutes > 0 ? `(${totalLateMinutes}p)` : undefined,
                  loading: records.isLoading,
                },
                {
                  key: 'missing',
                  icon: <ClockCircleOutlined />,
                  variant: missing > 0 ? 'warning' : 'neutral',
                  valueVariant: missing > 0 ? 'warning' : undefined,
                  label: t('hrOperations.attendance.missingCheckout'),
                  value: `${missing} ${t('hrOperations.attendance.turnsUnit', 'lượt')}`,
                  loading: records.isLoading,
                },
              ]
        }
      />

      {!canRead ? (
        <div className={styles.workbench}>
          <div className={styles.mainPanel}>
            <SectionCard
              title={t('hrOperations.attendance.myTable')}
              extra={
                <div className={styles.cardHeaderControls}>
                  <Segmented
                    value={viewMode}
                    onChange={(val) => setViewMode(val as 'calendar' | 'table')}
                    options={[
                      {
                        value: 'calendar',
                        icon: <CalendarOutlined />,
                        label: t('hrOperations.attendance.viewCalendar', 'Lịch tháng'),
                      },
                      {
                        value: 'table',
                        icon: <UnorderedListOutlined />,
                        label: t('hrOperations.attendance.viewTable', 'Bảng dòng'),
                      },
                    ]}
                  />
                  {attendanceActions}
                </div>
              }
            >
              {tableError}
              {!tableError && viewMode === 'calendar' ? (
                <AttendanceCalendarGrid
                  month={month}
                  records={items}
                  loading={records.isLoading}
                  selectedDateKey={selectedDayItem?.dateKey}
                  onSelectDay={(day) => {
                    setSelectedDayItem(day)
                    setIsDayDrawerOpen(true)
                  }}
                />
              ) : !tableError ? (
                <CoreDataTable
                  size="small"
                  rowKey="id"
                  loading={records.isLoading}
                  dataSource={items}
                  pagination={pagination}
                  columns={columns}
                />
              ) : null}
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
                  <span>{t('hrOperations.attendance.totalWorkdays')}</span>
                  <strong style={{ color: 'var(--ant-color-primary)' }}>
                    {t('hrOperations.attendance.workDayCount', { count: totalWorkdays })}
                  </strong>
                </div>
                <div className={styles.statItem}>
                  <span>{t('hrOperations.attendance.totalWorkedHours')}</span>
                  <strong>{totalWorkedHours}h</strong>
                </div>
                <div className={styles.statItem}>
                  <span>{t('hrOperations.attendance.records')}</span>
                  <strong>{items.length}</strong>
                </div>
                <div className={styles.statItem}>
                  <span>{t('hrOperations.attendance.punctualityRate')}</span>
                  <strong
                    style={{
                      color:
                        records.isSuccess && items.length > 0
                          ? late > 0
                            ? 'var(--ant-color-error)'
                            : 'var(--ant-color-success)'
                          : undefined,
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
        <SectionCard
          title={t('hrOperations.attendance.teamTable')}
          extra={
            <div className={styles.cardHeaderControls}>
              <Segmented
                value={viewMode}
                onChange={(val) => {
                  setViewMode(val as 'calendar' | 'table' | 'summary')
                  setSelectedSummaryKeys([])
                  setSelectedAdjustmentProfiles([])
                  setSelectedTableKeys([])
                }}
                options={[
                  {
                    value: 'summary',
                    icon: <BarChartOutlined />,
                    label: t('hrOperations.attendance.viewSummary', 'Tổng hợp công - phép'),
                  },
                  {
                    value: 'calendar',
                    icon: <CalendarOutlined />,
                    label: t('hrOperations.attendance.viewCalendar', 'Lịch tháng'),
                  },
                  {
                    value: 'table',
                    icon: <UnorderedListOutlined />,
                    label: t('hrOperations.attendance.viewTable', 'Bảng dòng'),
                  },
                ]}
              />
              {attendanceActions}
            </div>
          }
        >
          {tableError}
          {!tableError && (
            <>
              <div className={styles.adminFilterBar}>
                <div className={styles.adminFilterControls}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder={t(
                      'hrOperations.attendance.searchPlaceholder',
                      'Tìm tên, mã nhân viên...',
                    )}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 240 }}
                  />
                  {viewMode !== 'summary' && (
                    <Button
                      type={showErrorsOnly ? 'primary' : 'default'}
                      danger={showErrorsOnly}
                      icon={<ExclamationCircleOutlined />}
                      onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                    >
                      {showErrorsOnly
                        ? t('hrOperations.attendance.showingErrorsOnly', 'Đang lọc bất thường')
                        : t('hrOperations.attendance.filterErrorsOnly', 'Lọc bất thường / Lỗi')}
                    </Button>
                  )}
                </div>

                <div className={styles.adminFilterActions}>
                  {viewMode === 'summary' && selectedSummaryKeys.length > 0 ? (
                    <Space size={8}>
                      <div className={styles.selectedCountBadge}>
                        <CheckCircleOutlined style={{ color: 'var(--ant-color-primary)' }} />
                        <span>
                          {t(
                            'hrOperations.attendance.selectedStaffCount',
                            'Đã chọn {{count}} nhân sự',
                            {
                              count: selectedSummaryKeys.length,
                            },
                          )}
                        </span>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedSummaryKeys([])
                          setSelectedAdjustmentProfiles([])
                        }}
                      >
                        {t('hrOperations.common.deselectAll', 'Bỏ chọn')}
                      </Button>
                      {isSuperAdminOrAdmin && (
                        <Button
                          type="primary"
                          icon={<ToolOutlined />}
                          onClick={() => {
                            if (selectedAdjustmentProfiles.length > 0) {
                              setSelectedAdjustmentProfile(selectedAdjustmentProfiles[0])
                              setIsAdminAdjustmentOpen(true)
                            }
                          }}
                        >
                          {t(
                            'hrOperations.attendance.bulkAdjustBtn',
                            'Hiệu chỉnh hàng loạt ({{count}})',
                            {
                              count: selectedSummaryKeys.length,
                            },
                          )}
                        </Button>
                      )}
                    </Space>
                  ) : viewMode === 'table' && selectedTableKeys.length > 0 ? (
                    <Space size={8}>
                      <div className={styles.selectedCountBadge}>
                        <CheckCircleOutlined style={{ color: 'var(--ant-color-primary)' }} />
                        <span>
                          {t(
                            'hrOperations.attendance.selectedRecordsCount',
                            'Đã chọn {{count}} bản ghi',
                            {
                              count: selectedTableKeys.length,
                            },
                          )}
                        </span>
                      </div>
                      <Button onClick={() => setSelectedTableKeys([])}>
                        {t('hrOperations.common.deselectAll', 'Bỏ chọn')}
                      </Button>
                      {isSuperAdminOrAdmin && (
                        <>
                          <Button
                            type="primary"
                            icon={<ToolOutlined />}
                            onClick={() => {
                              const selectedRecords = items.filter((it) =>
                                selectedTableKeys.includes(it.id),
                              )
                              const uniqueProfileIds = Array.from(
                                new Set(selectedRecords.map((r) => r.profileId)),
                              )
                              const targetProfiles: EmployeeAttendanceSummary[] =
                                uniqueProfileIds.map((pId) => {
                                  const p = profilesQuery.data?.items.find(
                                    (item) => item.id === pId,
                                  )
                                  return {
                                    profileId: pId,
                                    employeeCode: p?.employeeCode || '',
                                    fullName: p?.fullName || '',
                                    avatarUrl: p?.avatarUrl || null,
                                    jobTitle: p?.jobTitle || null,
                                    departmentName: p?.department?.name || null,
                                    teamName: p?.team?.name || null,
                                    status: p?.employmentType || 'ACTIVE',
                                    totalWorkDays: 0,
                                    totalWorkedMinutes: 0,
                                    paidLeaveDays: 0,
                                    unpaidLeaveDays: 0,
                                    absentDays: 0,
                                    lateCount: 0,
                                    lateMinutes: 0,
                                    earlyLeaveMinutes: 0,
                                    entitledLeaveDays: 0,
                                    usedLeaveDays: 0,
                                    availableLeaveDays: 0,
                                  }
                                })
                              setSelectedAdjustmentProfiles(targetProfiles)
                              if (targetProfiles.length > 0) {
                                setSelectedAdjustmentProfile(targetProfiles[0])
                              }
                              setIsAdminAdjustmentOpen(true)
                            }}
                          >
                            {selectedTableKeys.length === 1
                              ? t('hrOperations.attendance.adjust', 'Hiệu chỉnh')
                              : t(
                                  'hrOperations.attendance.bulkAdjustBtn',
                                  'Hiệu chỉnh hàng loạt ({{count}})',
                                  {
                                    count: selectedTableKeys.length,
                                  },
                                )}
                          </Button>
                          <Popconfirm
                            title={t(
                              'hrOperations.attendance.confirmDeleteBatchTitle',
                              'Xác nhận xóa {{count}} bản ghi đã chọn?',
                              { count: selectedTableKeys.length },
                            )}
                            description={t(
                              'hrOperations.attendance.confirmDeleteBatchDesc',
                              'Dữ liệu chấm công của các ngày đã chọn sẽ bị xóa và tự động tính lại công.',
                            )}
                            onConfirm={() =>
                              deleteBatchMutation.mutate(selectedTableKeys.map(String))
                            }
                            okText={t('hrOperations.common.delete', 'Xóa')}
                            cancelText={t('hrOperations.common.cancel', 'Hủy')}
                            okButtonProps={{ danger: true, loading: deleteBatchMutation.isPending }}
                          >
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              loading={deleteBatchMutation.isPending}
                            >
                              {t('hrOperations.common.deleteBatch', 'Xóa đã chọn ({{count}})', {
                                count: selectedTableKeys.length,
                              })}
                            </Button>
                          </Popconfirm>
                        </>
                      )}
                    </Space>
                  ) : (
                    isSuperAdminOrAdmin && (
                      <Button
                        type="primary"
                        icon={<ToolOutlined />}
                        onClick={() => {
                          setSelectedAdjustmentProfile(null)
                          setSelectedAdjustmentProfiles([])
                          setIsAdminAdjustmentOpen(true)
                        }}
                      >
                        {t('hrOperations.attendance.adminAdjustBtn', 'Hiệu chỉnh Công - Phép')}
                      </Button>
                    )
                  )}
                </div>

                {viewMode !== 'summary' && exceptionCount > 0 && (
                  <div className={styles.errorBanner}>
                    <ExclamationCircleFilled />
                    <span>
                      {t('hrOperations.attendance.errorSummaryCount', {
                        count: exceptionCount,
                        defaultValue: `Phát hiện ${exceptionCount} bản ghi đi muộn hoặc bất thường chấm công`,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {viewMode === 'summary' ? (
                <AttendanceSummaryTable
                  month={month}
                  records={items}
                  profiles={profilesQuery.data?.items ?? []}
                  balances={balancesQuery.data ?? []}
                  loading={records.isLoading || profilesQuery.isLoading || balancesQuery.isLoading}
                  searchText={searchText}
                  canAdminEdit={isSuperAdminOrAdmin}
                  selectedRowKeys={selectedSummaryKeys}
                  onSelectedRowKeysChange={setSelectedSummaryKeys}
                  onSelectedRowsChange={setSelectedAdjustmentProfiles}
                  onViewEmployeeSchedule={(code) => {
                    setSearchText(code)
                    setViewMode('table')
                  }}
                  onOpenAdminAdjustment={(item) => {
                    setSelectedAdjustmentProfile(item)
                    setSelectedAdjustmentProfiles([item])
                    setIsAdminAdjustmentOpen(true)
                  }}
                />
              ) : viewMode === 'calendar' ? (
                <AttendanceCalendarGrid
                  month={month}
                  records={displayedItems}
                  loading={records.isLoading}
                  selectedDateKey={selectedDayItem?.dateKey}
                  onSelectDay={(day) => {
                    setSelectedDayItem(day)
                    setIsDayDrawerOpen(true)
                  }}
                />
              ) : (
                <CoreDataTable
                  size="small"
                  rowKey="id"
                  loading={records.isLoading}
                  error={tableError}
                  dataSource={displayedItems}
                  pagination={pagination}
                  columns={columns}
                  rowSelection={{
                    selectedRowKeys: selectedTableKeys,
                    onChange: setSelectedTableKeys,
                    preserveSelectedRowKeys: true,
                  }}
                  onRow={(record) => ({
                    onClick: (e) => {
                      const target = e.target as HTMLElement
                      if (
                        target.closest('button') ||
                        target.closest('.ant-btn') ||
                        target.closest('.ant-checkbox-wrapper') ||
                        target.closest('.ant-table-selection-column')
                      ) {
                        return
                      }
                      setSelectedDayItem({
                        date: dayjs(record.workDateKey),
                        dateKey: record.workDateKey,
                        dayNumber: dayjs(record.workDateKey).date(),
                        isCurrentMonth: true,
                        isToday: record.workDateKey === dayjs().format('YYYY-MM-DD'),
                        isWeekend:
                          dayjs(record.workDateKey).day() === 0 ||
                          dayjs(record.workDateKey).day() === 6,
                        record,
                      })
                      setIsDayDrawerOpen(true)
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              )}
            </>
          )}
        </SectionCard>
      )}

      {/* Slide-over Detail Drawer */}
      <AttendanceDayDrawer
        open={isDayDrawerOpen}
        onClose={() => setIsDayDrawerOpen(false)}
        day={selectedDayItem}
      />

      {/* Admin Attendance & Leave Adjustment Modal */}
      {isSuperAdminOrAdmin && (
        <AdminAttendanceAdjustmentModal
          open={isAdminAdjustmentOpen}
          onClose={() => {
            setIsAdminAdjustmentOpen(false)
            setSelectedAdjustmentProfile(null)
            setSelectedAdjustmentProfiles([])
          }}
          currentMonth={month}
          profiles={profilesQuery.data?.items ?? []}
          selectedProfileId={selectedAdjustmentProfile?.profileId}
          initialData={selectedAdjustmentProfile}
          selectedProfiles={selectedAdjustmentProfiles}
          existingAttendanceRecords={items}
          balances={balancesQuery.data ?? []}
          onSuccess={() => {
            setSelectedSummaryKeys([])
            setSelectedAdjustmentProfiles([])
            void records.refetch()
            void balancesQuery.refetch()
          }}
        />
      )}

      {/* Adjust Modal */}
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
