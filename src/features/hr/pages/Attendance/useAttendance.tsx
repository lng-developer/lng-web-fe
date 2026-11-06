import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Space, type TableProps, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/shared/constants/enum'
import { StatusTag } from '@/shared/ui'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'

import {
  adjustAttendance,
  type Attendance,
  checkIn,
  checkOut,
  listAttendance,
  listAttendanceMatrix,
  listMyAttendance,
  syncSqlAttendance,
} from '../../api/hrTimeApi'

const attendanceStatusTone = (status: string): 'approved' | 'rejected' | 'pending' =>
  status === 'PRESENT' ? 'approved' : status === 'ABSENT' ? 'rejected' : 'pending'

export type AttendanceWorkspace = 'personal' | 'team' | 'operations'

export const useAttendance = (workspace: AttendanceWorkspace = 'personal', teamId?: string) => {
  const { t } = useTranslation()
  const permissions = new Set(getPermissions())
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [form] = Form.useForm()

  const [month, setMonth] = useState(dayjs())
  const [adjusting, setAdjusting] = useState<Attendance>()

  const canRead = permissions.has('HR_ATTENDANCE:READ') || permissions.has('HR_ATTENDANCE:MANAGE')
  const canWrite = permissions.has('HR_ATTENDANCE:WRITE')
  const showTeamAttendance =
    workspace !== 'personal' && canRead && (workspace !== 'team' || Boolean(teamId))
  const canManage = workspace !== 'personal' && permissions.has('HR_ATTENDANCE:MANAGE')
  const canSyncMachine =
    permissions.has('HR_INTEGRATIONS:MANAGE') || permissions.has('HR_ATTENDANCE:MANAGE')

  const params = {
    month: month.month() + 1,
    year: month.year(),
    ...(workspace === 'team' && teamId ? { teamId } : {}),
  }

  const range = {
    dateFrom: month.startOf('month').format('YYYY-MM-DD'),
    dateTo: month.endOf('month').format('YYYY-MM-DD'),
    limit: 1000,
    ...(workspace === 'team' && teamId ? { teamId } : {}),
  }

  // Prefetch or cache attendance matrix for team/operations workspace
  useQuery({
    queryKey: ['hr-time', workspace, 'attendance-matrix', params],
    queryFn: () => listAttendanceMatrix(params),
    enabled: showTeamAttendance,
  })

  const records = useQuery({
    queryKey: ['hr-time', 'attendance', workspace, range],
    queryFn: () => (showTeamAttendance ? listAttendance(range) : listMyAttendance(range)),
  })

  const myAttendance = useQuery({
    queryKey: ['hr-time', 'attendance', 'me', 'capabilities'],
    queryFn: () =>
      listMyAttendance({
        dateFrom: dayjs().format('YYYY-MM-DD'),
        dateTo: dayjs().format('YYYY-MM-DD'),
        limit: 1000,
      }),
    enabled: canWrite,
  })

  const attendanceCapabilities = myAttendance.data?.capabilities
  const todayDateKey = dayjs().format('YYYY-MM-DD')

  const todayAttendance = myAttendance.data?.items.find((item) => item.workDateKey === todayDateKey)

  const completedCheckIn = todayAttendance?.checkInAt
    ? dayjs(todayAttendance.checkInAt).format('HH:mm')
    : ''

  const completedCheckOut = todayAttendance?.checkOutAt
    ? dayjs(todayAttendance.checkOutAt).format('HH:mm')
    : ''

  const hasCompletedAttendance = Boolean(completedCheckIn && completedCheckOut)

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

  const syncMachine = useMutation({
    mutationFn: () => syncSqlAttendance(true),
    onSuccess: (data) => {
      toast(
        'success',
        t('hrOperations.attendance.syncSuccess', {
          inserted: data.inserted,
          updated: data.updated,
          total: data.inserted + data.updated,
        }),
      )
      void refresh()
    },
    onError: (error: Error) =>
      toast('error', t('hrOperations.attendance.syncFailed'), error.message),
  })

  const items = useMemo(() => records.data?.items ?? [], [records.data?.items])
  const present = items.filter((item) => item.status === 'PRESENT').length
  const late = items.filter((item) => item.lateMinutes > 0).length
  const missing = items.filter((item) => item.checkInAt && !item.checkOutAt).length

  const totalWorkdays = useMemo(() => {
    return Math.round(items.reduce((acc, cur) => acc + (cur.workDayValue ?? 0), 0) * 100) / 100
  }, [items])

  const totalWorkedHours = useMemo(() => {
    const minutes = items.reduce((acc, cur) => acc + (cur.workedMinutes ?? 0), 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [items])

  const openAdjusting = (item: Attendance) => {
    setAdjusting(item)
    form.setFieldsValue({
      checkInAt: item.checkInAt,
      checkOutAt: item.checkOutAt,
      reason: '',
    })
  }

  const closeAdjusting = () => setAdjusting(undefined)

  const columns: TableProps<Attendance>['columns'] = [
    {
      title: t('hrOperations.common.date'),
      dataIndex: 'workDateKey',
      render: (value: string) => {
        const d = dayjs(value)
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{d.format('DD/MM/YYYY')}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {d.format('dddd')}
            </Typography.Text>
          </Space>
        )
      },
    },
    ...(showTeamAttendance
      ? [
          {
            title: t('hrOperations.common.employee'),
            render: (_: unknown, item: Attendance) =>
              item.employee?.fullName || item.employee?.employeeCode || item.profileId || item.id,
          },
        ]
      : []),
    {
      title: t('hrOperations.attendance.shift'),
      dataIndex: 'shift',
      render: (shift: Attendance['shift']) => (
        <Typography.Text>
          {shift?.name || t('hrOperations.attendance.standardShiftName')}
        </Typography.Text>
      ),
    },
    {
      title: t('hrOperations.attendance.checkInTime'),
      dataIndex: 'checkInAt',
      render: (value) => (value ? dayjs(value).format('HH:mm:ss') : '--:--:--'),
    },
    {
      title: t('hrOperations.attendance.checkOutTime'),
      dataIndex: 'checkOutAt',
      render: (value) => (value ? dayjs(value).format('HH:mm:ss') : '--:--:--'),
    },
    {
      title: t('hrOperations.attendance.lateMinutes'),
      dataIndex: 'lateMinutes',
      render: (value: number, item: Attendance) => (
        <Space size={4} wrap>
          {value > 0 ? (
            <Tag color="red">{t('hrOperations.attendance.lateTag', { count: value })}</Tag>
          ) : null}
          {item.earlyLeaveMinutes > 0 ? (
            <Tag color="orange">
              {t('hrOperations.attendance.earlyTag', { count: item.earlyLeaveMinutes })}
            </Tag>
          ) : null}
          {value === 0 && item.earlyLeaveMinutes === 0 ? (
            <Tag color="green">{t('hrOperations.attendance.punctualTag')}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('hrOperations.attendance.workedHours'),
      dataIndex: 'workedMinutes',
      render: (minutes: number) => {
        if (!minutes) return '--'
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}h ${m}p` : `${h}h`
      },
    },
    {
      title: t('hrOperations.attendance.workDayValue'),
      dataIndex: 'workDayValue',
      render: (value: number) => (
        <Tag
          color={value >= 1 ? 'blue' : value > 0 ? 'cyan' : 'default'}
          style={{ fontWeight: 600 }}
        >
          {t('hrOperations.attendance.workDayCount', { count: value ?? 0 })}
        </Tag>
      ),
    },
    {
      title: t('hrOperations.attendance.source'),
      dataIndex: 'source',
      render: (source: string | null | undefined) => {
        const isMachine = source === 'SQL_ATTENDANCE'
        return (
          <Tag color={isMachine ? 'purple' : 'default'}>
            {t(`hrOperations.attendance.sources.${source || 'SELF_SERVICE'}`, {
              defaultValue: source || t('hrOperations.attendance.sources.SELF_SERVICE'),
            })}
          </Tag>
        )
      },
    },
    {
      title: t('hrOperations.common.status'),
      dataIndex: 'status',
      render: (value) => (
        <StatusTag status={attendanceStatusTone(value)}>
          {t(`hrOperations.attendance.statuses.${value}`, { defaultValue: value })}
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
                <Button type="text" icon={<EditOutlined />} onClick={() => openAdjusting(item)} />
              </Tooltip>
            ),
          },
        ]
      : []),
  ]

  const pagination = {
    defaultPageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showSizeChanger: true,
    hideOnSinglePage: false,
  }

  return [
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
    {
      records,
      myAttendance,
      canRead: showTeamAttendance,
      canWrite,
      canManage,
      canSyncMachine,
    },
  ] as const
}
