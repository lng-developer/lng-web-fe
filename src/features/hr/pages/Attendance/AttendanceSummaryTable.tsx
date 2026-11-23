import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  RestOutlined,
} from '@ant-design/icons'
import {
  Button,
  Space,
  type TableColumnsType,
  type TableProps,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/shared/constants/enum'
import { EmployeeAvatar } from '@/shared/ui'

import type { EmployeeProfile } from '../../api/hrApi'
import type { Attendance, LeaveBalance } from '../../api/hrTimeApi'

export interface EmployeeAttendanceSummary {
  profileId: string
  employeeCode: string
  fullName: string
  avatarUrl?: string | null
  jobTitle?: string | null
  departmentName?: string | null
  teamName?: string | null
  status: string | null
  // Tháng hiện tại
  totalWorkDays: number
  totalWorkedMinutes: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  absentDays: number
  lateCount: number
  lateMinutes: number
  earlyLeaveMinutes: number
  // Quỹ phép năm
  entitledLeaveDays: number
  usedLeaveDays: number
  availableLeaveDays: number
}

export interface AttendanceSummaryTableProps {
  month: dayjs.Dayjs
  records: Attendance[]
  profiles: EmployeeProfile[]
  balances: LeaveBalance[]
  loading?: boolean
  searchText?: string
  canAdminEdit?: boolean
  selectedRowKeys?: React.Key[]
  onSelectedRowKeysChange?: (keys: React.Key[]) => void
  onSelectedRowsChange?: (items: EmployeeAttendanceSummary[]) => void
  onViewEmployeeSchedule?: (employeeCode: string) => void
  onOpenAdminAdjustment?: (item: EmployeeAttendanceSummary) => void
}

export const AttendanceSummaryTable = memo(function AttendanceSummaryTable({
  month,
  records,
  profiles,
  balances,
  loading = false,
  searchText = '',
  canAdminEdit = false,
  selectedRowKeys,
  onSelectedRowKeysChange,
  onSelectedRowsChange,
  onViewEmployeeSchedule,
  onOpenAdminAdjustment,
}: AttendanceSummaryTableProps) {
  const { t } = useTranslation()

  const [internalSelectedKeys, setInternalSelectedKeys] = useState<React.Key[]>([])
  const selectedKeys = selectedRowKeys ?? internalSelectedKeys
  const setSelectedKeys = onSelectedRowKeysChange ?? setInternalSelectedKeys

  // Tạo map balances theo profileId
  const balancesByProfile = useMemo(() => {
    const map = new Map<string, LeaveBalance>()
    balances.forEach((bal) => {
      if (bal.profileId && bal.leaveType === 'ANNUAL') {
        map.set(bal.profileId, bal)
      }
    })
    return map
  }, [balances])

  // Nhóm records theo profileId
  const recordsByProfile = useMemo(() => {
    const map = new Map<string, Attendance[]>()
    records.forEach((rec) => {
      const pid = rec.profileId
      if (pid) {
        if (!map.has(pid)) map.set(pid, [])
        map.get(pid)!.push(rec)
      }
    })
    return map
  }, [records])

  // Tổng hợp dữ liệu từng nhân sự
  const summaryData = useMemo<EmployeeAttendanceSummary[]>(() => {
    return profiles.map((p) => {
      const userRecords = recordsByProfile.get(p.id) || []
      const bal = balancesByProfile.get(p.id)

      let totalWorkDays = 0
      let totalWorkedMinutes = 0
      let paidLeaveDays = 0
      let unpaidLeaveDays = 0
      let absentDays = 0
      let lateCount = 0
      let lateMinutes = 0
      let earlyLeaveMinutes = 0

      userRecords.forEach((rec) => {
        totalWorkDays += rec.workDayValue ?? 0
        totalWorkedMinutes += rec.workedMinutes ?? 0

        if (rec.status === 'PAID_LEAVE' || rec.status === 'ANNUAL_LEAVE') {
          paidLeaveDays += rec.workDayValue || 1
        } else if (rec.status === 'UNPAID_LEAVE') {
          unpaidLeaveDays += 1
        } else if (rec.status === 'ABSENT') {
          absentDays += 1
        }

        if ((rec.lateMinutes ?? 0) > 0) {
          lateCount += 1
          lateMinutes += rec.lateMinutes
        }
        if ((rec.earlyLeaveMinutes ?? 0) > 0) {
          earlyLeaveMinutes += rec.earlyLeaveMinutes
        }
      })

      // Backend 2 units = 1 ngày phép
      const entitledLeaveDays = Math.round(((bal?.entitledUnits ?? 0) / 2) * 10) / 10
      const usedLeaveDays = Math.round(((bal?.usedUnits ?? 0) / 2) * 10) / 10
      const availableLeaveDays = Math.round(((bal?.availableUnits ?? 0) / 2) * 10) / 10

      return {
        profileId: p.id,
        employeeCode: p.employeeCode || '',
        fullName: p.fullName || p.employeeCode || '',
        avatarUrl: p.avatarUrl,
        jobTitle: p.jobTitle,
        departmentName: p.department?.name,
        teamName: p.team?.name,
        status: p.status,
        totalWorkDays: Math.round(totalWorkDays * 100) / 100,
        totalWorkedMinutes,
        paidLeaveDays: Math.round(paidLeaveDays * 10) / 10,
        unpaidLeaveDays,
        absentDays,
        lateCount,
        lateMinutes,
        earlyLeaveMinutes,
        entitledLeaveDays,
        usedLeaveDays,
        availableLeaveDays,
      }
    })
  }, [profiles, recordsByProfile, balancesByProfile])

  // Lọc theo tìm kiếm
  const filteredData = useMemo(() => {
    if (!searchText.trim()) return summaryData
    const q = searchText.trim().toLowerCase()
    return summaryData.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.employeeCode.toLowerCase().includes(q) ||
        (item.departmentName && item.departmentName.toLowerCase().includes(q)) ||
        (item.teamName && item.teamName.toLowerCase().includes(q)),
    )
  }, [summaryData, searchText])

  const columns: TableColumnsType<EmployeeAttendanceSummary> = [
    {
      title: t('hrOperations.common.employee', 'Nhân viên'),
      key: 'employee',
      width: 260,
      fixed: 'left',
      align: 'left',
      render: (_, item) => (
        <Space size="middle" align="center" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <EmployeeAvatar name={item.fullName} avatarUrl={item.avatarUrl} />
          <div style={{ textAlign: 'left' }}>
            <Typography.Text strong style={{ display: 'block' }}>
              {item.fullName}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {item.employeeCode}
              {item.departmentName ? ` · ${item.departmentName}` : ''}
              {item.teamName ? ` / ${item.teamName}` : ''}
            </Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title={`Tổng công thực tế ghi nhận trong tháng ${month.format('MM/YYYY')}`}>
          <span>
            <CheckCircleOutlined style={{ marginRight: 4, color: 'var(--ant-color-primary)' }} />
            {t('hrOperations.attendance.totalWorkdays', 'Tổng công')} (T{month.format('MM/YYYY')})
          </span>
        </Tooltip>
      ),
      dataIndex: 'totalWorkDays',
      key: 'totalWorkDays',
      width: 150,
      sorter: (a, b) => a.totalWorkDays - b.totalWorkDays,
      render: (val: number) => (
        <Tag color={val > 0 ? 'blue' : 'default'} style={{ fontWeight: 600, fontSize: 13 }}>
          {val} {t('hrOperations.attendance.workDayUnit', 'công')}
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title="Số ngày nghỉ phép có lương và nghỉ không lương đã ghi nhận trong tháng">
          <span>
            <RestOutlined style={{ marginRight: 4, color: 'var(--ant-color-warning)' }} />
            {t('hrOperations.attendance.monthLeaves', 'Nghỉ trong tháng')}
          </span>
        </Tooltip>
      ),
      key: 'monthLeaves',
      width: 170,
      sorter: (a, b) => a.paidLeaveDays + a.unpaidLeaveDays - (b.paidLeaveDays + b.unpaidLeaveDays),
      render: (_, item) => {
        const hasLeave = item.paidLeaveDays > 0 || item.unpaidLeaveDays > 0 || item.absentDays > 0
        if (!hasLeave) {
          return <span style={{ color: 'var(--ant-color-text-quaternary)' }}>0 ngày</span>
        }
        return (
          <Space size={4} wrap>
            {item.paidLeaveDays > 0 && (
              <Tag color="purple">
                {item.paidLeaveDays} {t('hrOperations.attendance.paidLeaveShort', 'phép')}
              </Tag>
            )}
            {item.unpaidLeaveDays > 0 && (
              <Tag color="orange">
                {item.unpaidLeaveDays} {t('hrOperations.attendance.unpaidLeaveShort', 'KL')}
              </Tag>
            )}
            {item.absentDays > 0 && (
              <Tag color="red">
                {item.absentDays} {t('hrOperations.attendance.absentShort', 'vắng')}
              </Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: (
        <span>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {t('hrOperations.attendance.late', 'Đi muộn')}
        </span>
      ),
      key: 'late',
      width: 140,
      sorter: (a, b) => a.lateMinutes - b.lateMinutes,
      render: (_, item) =>
        item.lateCount > 0 ? (
          <Tag color="error">
            {item.lateCount} lần ({item.lateMinutes}p)
          </Tag>
        ) : (
          <span style={{ color: 'var(--ant-color-text-quaternary)' }}>-</span>
        ),
    },
    {
      title: (
        <Tooltip title="Tổng số ngày phép năm 2026 được cấp">
          <span>{t('hrOperations.requests.entitledLeave', 'Phép năm cấp')}</span>
        </Tooltip>
      ),
      dataIndex: 'entitledLeaveDays',
      key: 'entitledLeaveDays',
      width: 120,
      render: (val: number) => (
        <span>
          {val} {t('hrOperations.requests.daysUnit', 'ngày')}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Số ngày phép năm đã sử dụng trong năm 2026">
          <span>{t('hrOperations.requests.usedLeave', 'Phép đã dùng')}</span>
        </Tooltip>
      ),
      dataIndex: 'usedLeaveDays',
      key: 'usedLeaveDays',
      width: 120,
      render: (val: number) => (
        <span style={{ color: val > 0 ? 'var(--ant-color-warning)' : undefined }}>
          {val} {t('hrOperations.requests.daysUnit', 'ngày')}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Số ngày phép năm còn lại khả dụng tính tới hiện tại">
          <span style={{ fontWeight: 600 }}>
            {t('hrOperations.requests.remainingLeave', 'Phép còn lại')}
          </span>
        </Tooltip>
      ),
      dataIndex: 'availableLeaveDays',
      key: 'availableLeaveDays',
      width: 140,
      sorter: (a, b) => a.availableLeaveDays - b.availableLeaveDays,
      render: (val: number) => (
        <Tag
          color={val > 0 ? 'green' : 'default'}
          style={{ fontWeight: 600, fontSize: 13, padding: '2px 8px' }}
        >
          {val} {t('hrOperations.requests.daysUnit', 'ngày')}
        </Tag>
      ),
    },
    {
      title: t('hrOperations.common.action', 'Thao tác'),
      key: 'action',
      width: canAdminEdit ? 180 : 110,
      align: 'center',
      render: (_, item) => (
        <Space size={4}>
          <Tooltip title={`Xem chi tiết chấm công của ${item.fullName}`}>
            <Button
              type="link"
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => onViewEmployeeSchedule?.(item.employeeCode)}
            >
              {t('hrOperations.common.details', 'Chi tiết')}
            </Button>
          </Tooltip>
          {canAdminEdit && onOpenAdminAdjustment && (
            <Tooltip title={`Hiệu chỉnh công, nghỉ, phép của ${item.fullName} (Admin)`}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                style={{ color: 'var(--ant-color-primary)', fontWeight: 500 }}
                onClick={() => onOpenAdminAdjustment(item)}
              >
                {t('hrOperations.attendance.adjustAction', 'Hiệu chỉnh')}
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  const rowSelection: TableProps<EmployeeAttendanceSummary>['rowSelection'] = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => {
      setSelectedKeys(keys)
      if (onSelectedRowsChange) {
        const items = summaryData.filter((item) => keys.includes(item.profileId))
        onSelectedRowsChange(items)
      }
    },
    preserveSelectedRowKeys: true,
  }

  return (
    <CoreDataTable
      fitContainer
      size="small"
      rowKey="profileId"
      rowSelection={rowSelection}
      loading={loading}
      dataSource={filteredData}
      columns={columns}
      pagination={{
        defaultPageSize: DEFAULT_PAGE_SIZE,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} nhân sự`,
      }}
    />
  )
})
