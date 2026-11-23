import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarOutlined,
  DeleteOutlined,
  RestOutlined,
  SaveOutlined,
  ToolOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Tabs,
  Tag,
  TimePicker,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { EmployeeAvatar } from '@/shared/ui'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'

import type { EmployeeProfile } from '../../api/hrApi'
import {
  type Attendance,
  adjustLeaveBalance,
  createOrAdjustManualAttendance,
  deleteAttendance,
  type LeaveBalance,
  upsertLeaveBalance,
} from '../../api/hrTimeApi'
import type { EmployeeAttendanceSummary } from './AttendanceSummaryTable'
import styles from './AdminAttendanceAdjustmentModal.module.scss'

const { Text } = Typography

interface AdminAttendanceAdjustmentModalProps {
  open: boolean
  onClose: () => void
  currentMonth: dayjs.Dayjs
  profiles: EmployeeProfile[]
  selectedProfileId?: string
  initialData?: EmployeeAttendanceSummary | null
  selectedProfiles?: EmployeeAttendanceSummary[]
  existingAttendanceRecords?: Attendance[]
  balances?: LeaveBalance[]
  onSuccess?: () => void
}

export const AdminAttendanceAdjustmentModal = ({
  open,
  onClose,
  currentMonth,
  profiles,
  selectedProfileId,
  initialData,
  selectedProfiles = [],
  existingAttendanceRecords = [],
  balances = [],
  onSuccess,
}: AdminAttendanceAdjustmentModalProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const isBulkMode = selectedProfiles.length > 1
  const defaultProfileId = selectedProfileId || initialData?.profileId || profiles[0]?.id || ''
  const [internalProfileId, setInternalProfileId] = useState<string | null>(null)
  const activeProfileId = internalProfileId ?? defaultProfileId
  const [activeTab, setActiveTab] = useState<'leave' | 'attendance'>('leave')

  // Leave Form
  const [leaveForm] = Form.useForm()
  const [leaveAdjustMode, setLeaveAdjustMode] = useState<'ADJUST' | 'OVERRIDE'>('ADJUST')

  // Attendance Form
  const [attendanceForm] = Form.useForm()
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(() => {
    const today = dayjs()
    return today.isSame(currentMonth, 'month') ? today : currentMonth.startOf('month')
  })

  const checkInWatch = Form.useWatch('checkInTime', attendanceForm)
  const checkOutWatch = Form.useWatch('checkOutTime', attendanceForm)
  const statusWatch = Form.useWatch('status', attendanceForm)

  const handleClose = () => {
    setInternalProfileId(null)
    leaveForm.resetFields()
    attendanceForm.resetFields()
    onClose()
  }

  const selectedProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0]
  }, [profiles, activeProfileId])

  // Lấy LeaveBalance tương ứng của nhân viên đang chọn
  const currentBalance = useMemo(() => {
    return balances.find((b) => b.profileId === activeProfileId && b.leaveType === 'ANNUAL')
  }, [balances, activeProfileId])

  const entitledLeaveDays = currentBalance
    ? Math.round(((currentBalance.entitledUnits ?? 0) / 2) * 10) / 10
    : (initialData?.entitledLeaveDays ?? 0)
  const usedLeaveDays = currentBalance
    ? Math.round(((currentBalance.usedUnits ?? 0) / 2) * 10) / 10
    : (initialData?.usedLeaveDays ?? 0)
  const availableLeaveDays = currentBalance
    ? Math.round(((currentBalance.availableUnits ?? 0) / 2) * 10) / 10
    : (initialData?.availableLeaveDays ?? 0)

  // Tìm bản ghi công của ngày đang chọn
  const selectedDateKey = selectedDate.format('YYYY-MM-DD')
  const recordForSelectedDate = useMemo(() => {
    return existingAttendanceRecords.find(
      (r) => r.profileId === activeProfileId && r.workDateKey === selectedDateKey,
    )
  }, [existingAttendanceRecords, activeProfileId, selectedDateKey])

  const shiftStart = recordForSelectedDate?.shift?.startTime || '08:30'
  const shiftEnd = recordForSelectedDate?.shift?.endTime || '17:30'

  const metricsPreview = useMemo(() => {
    if (statusWatch !== 'PRESENT' && statusWatch !== 'HALF_DAY') {
      return null
    }
    if (!checkInWatch || !checkOutWatch) {
      return null
    }

    const [startHour, startMin] = shiftStart.split(':').map(Number)
    const [endHour, endMin] = shiftEnd.split(':').map(Number)

    const plannedStartMinutes = (startHour || 8) * 60 + (startMin || 30)
    const plannedEndMinutes = (endHour || 17) * 60 + (endMin || 30)

    const inMinutes = checkInWatch.hour() * 60 + checkInWatch.minute()
    const outMinutes = checkOutWatch.hour() * 60 + checkOutWatch.minute()

    const lateMinutes = Math.max(0, inMinutes - plannedStartMinutes)
    const earlyLeaveMinutes = Math.max(0, plannedEndMinutes - outMinutes)

    let totalMinutes = Math.max(0, outMinutes - inMinutes)
    // Trừ 60 phút nghỉ trưa nếu ca làm việc xuyên qua khoảng 12:00 - 13:00
    if (inMinutes <= 12 * 60 && outMinutes >= 13 * 60) {
      totalMinutes = Math.max(0, totalMinutes - 60)
    }
    const workedHours = Math.floor(totalMinutes / 60)
    const workedMins = totalMinutes % 60

    return {
      lateMinutes,
      earlyLeaveMinutes,
      workedHours,
      workedMins,
      shiftStart,
      shiftEnd,
    }
  }, [statusWatch, checkInWatch, checkOutWatch, shiftStart, shiftEnd])

  // Guard tránh re-render nền (như đồng hồ nhảy giây ở parent) ghi đè form khi user đang chỉnh
  const lastInitializedRef = useRef<string>('')

  // Cập nhật giá trị ban đầu cho form Attendance khi đổi ngày hoặc đổi nhân viên
  useEffect(() => {
    if (!open) {
      lastInitializedRef.current = ''
      return
    }

    const initKey = `${activeProfileId}_${selectedDateKey}`
    if (lastInitializedRef.current === initKey) {
      return
    }
    lastInitializedRef.current = initKey

    if (recordForSelectedDate) {
      attendanceForm.setFieldsValue({
        status: recordForSelectedDate.status || 'PRESENT',
        workDayValue: recordForSelectedDate.workDayValue ?? 1,
        checkInTime: recordForSelectedDate.checkInAt
          ? dayjs(recordForSelectedDate.checkInAt)
          : null,
        checkOutTime: recordForSelectedDate.checkOutAt
          ? dayjs(recordForSelectedDate.checkOutAt)
          : null,
        reason: '',
      })
    } else {
      attendanceForm.setFieldsValue({
        status: 'PRESENT',
        workDayValue: 1,
        checkInTime: dayjs('08:30', 'HH:mm'),
        checkOutTime: dayjs('17:30', 'HH:mm'),
        reason: '',
      })
    }
  }, [open, recordForSelectedDate, selectedDateKey, activeProfileId, attendanceForm])

  // Mutation: Điều chỉnh phép
  const adjustLeaveMutation = useMutation({
    mutationFn: async (values: { amount: number; reason: string }) => {
      const year = currentMonth.year()
      const targetIds = isBulkMode ? selectedProfiles.map((p) => p.profileId) : [activeProfileId]

      if (leaveAdjustMode === 'ADJUST') {
        const units = Math.round(values.amount * 2)
        return Promise.all(
          targetIds.map((pId) =>
            adjustLeaveBalance(pId, year, 'ANNUAL', {
              units,
              reason: values.reason,
            }),
          ),
        )
      } else {
        const entitledUnits = Math.round(values.amount * 2)
        return Promise.all(
          targetIds.map((pId) =>
            upsertLeaveBalance(pId, year, 'ANNUAL', {
              entitledUnits,
              adjustmentUnits: 0,
              reason: values.reason,
            }),
          ),
        )
      }
    },
    onSuccess: () => {
      const count = isBulkMode ? selectedProfiles.length : 1
      toast(
        'success',
        isBulkMode
          ? t(
              'hrOperations.messages.bulkLeaveAdjusted',
              'Đã cập nhật quỹ phép cho {{count}} nhân sự thành công',
              { count },
            )
          : t('hrOperations.messages.leaveAdjusted', 'Đã cập nhật quỹ phép thành công'),
      )
      void queryClient.invalidateQueries({ queryKey: ['hr-time', 'all-leave-balances'] })
      onSuccess?.()
      handleClose()
    },
    onError: (err: Error) => {
      toast(
        'error',
        t('hrOperations.messages.leaveAdjustFailed', 'Cập nhật quỹ phép thất bại'),
        err.message,
      )
    },
  })

  // Mutation: Điều chỉnh / Thêm ngày công
  const attendanceMutation = useMutation({
    mutationFn: async (values: {
      status: string
      workDayValue?: number
      checkInTime?: dayjs.Dayjs | null
      checkOutTime?: dayjs.Dayjs | null
      reason: string
    }) => {
      let checkInAt: string | null = null
      let checkOutAt: string | null = null

      if (values.checkInTime) {
        checkInAt = selectedDate
          .hour(values.checkInTime.hour())
          .minute(values.checkInTime.minute())
          .second(0)
          .toISOString()
      }
      if (values.checkOutTime) {
        checkOutAt = selectedDate
          .hour(values.checkOutTime.hour())
          .minute(values.checkOutTime.minute())
          .second(0)
          .toISOString()
      }

      const targetIds = isBulkMode ? selectedProfiles.map((p) => p.profileId) : [activeProfileId]

      return Promise.all(
        targetIds.map((pId) =>
          createOrAdjustManualAttendance({
            profileId: pId,
            workDateKey: selectedDateKey,
            status: values.status,
            workDayValue: values.workDayValue,
            checkInAt,
            checkOutAt,
            reason: values.reason,
          }),
        ),
      )
    },
    onSuccess: () => {
      lastInitializedRef.current = ''
      const count = isBulkMode ? selectedProfiles.length : 1
      toast(
        'success',
        isBulkMode
          ? t(
              'hrOperations.messages.bulkAttendanceSaved',
              'Đã lưu ngày công cho {{count}} nhân sự thành công',
              { count },
            )
          : t('hrOperations.messages.attendanceSaved', 'Đã lưu dữ liệu ngày công thành công'),
      )
      void queryClient.invalidateQueries({ queryKey: ['hr-time', 'attendance'] })
      onSuccess?.()
      handleClose()
    },
    onError: (err: Error) => {
      toast(
        'error',
        t('hrOperations.messages.attendanceSaveFailed', 'Lưu ngày công thất bại'),
        err.message,
      )
    },
  })

  // Mutation: Xóa bản ghi ngày công
  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: string) => deleteAttendance(id),
    onSuccess: () => {
      lastInitializedRef.current = ''
      toast('success', t('hrOperations.messages.attendanceDeleted', 'Đã xóa bản ghi ngày công'))
      void queryClient.invalidateQueries({ queryKey: ['hr-time', 'attendance'] })
      onSuccess?.()
    },
    onError: (err: Error) => {
      toast(
        'error',
        t('hrOperations.messages.attendanceDeleteFailed', 'Xóa bản ghi thất bại'),
        err.message,
      )
    },
  })

  return (
    <Modal
      destroyOnHidden
      open={open}
      onCancel={handleClose}
      footer={null}
      width={580}
      centered
      styles={{
        body: {
          maxHeight: 'calc(85vh - 100px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 6,
        },
      }}
      title={
        <div className={styles.modalHeader}>
          <ToolOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <span>
            {t('hrOperations.attendance.adminAdjustModalTitle', 'Hiệu chỉnh Dữ liệu Công & Phép')}
          </span>
          <span className={styles.adminBadge}>ADMIN ONLY</span>
          {isBulkMode && (
            <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>
              HÀNG LOẠT ({selectedProfiles.length})
            </Tag>
          )}
        </div>
      }
    >
      <div style={{ marginTop: 8 }}>
        {/* Chọn nhân viên nếu chưa chọn cố định hoặc hiển thị hàng loạt */}
        {isBulkMode ? (
          <div
            className={styles.profileCard}
            style={{
              background: 'var(--ant-color-primary-bg)',
              borderColor: 'var(--ant-color-primary-border)',
            }}
          >
            <UsergroupAddOutlined
              style={{ fontSize: 24, color: 'var(--ant-color-primary)', marginLeft: 4 }}
            />
            <div className={styles.profileMeta}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ant-color-primary)' }}>
                {t(
                  'hrOperations.attendance.bulkAdjustTitle',
                  'Hiệu chỉnh hàng loạt cho {{count}} nhân sự',
                  {
                    count: selectedProfiles.length,
                  },
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', marginTop: 2 }}>
                {selectedProfiles
                  .map((p) => p.fullName || p.employeeCode)
                  .slice(0, 6)
                  .join(', ')}
                {selectedProfiles.length > 6 ? ` (+${selectedProfiles.length - 6} người khác)` : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.profileCard}>
            <EmployeeAvatar
              name={selectedProfile?.fullName || 'NV'}
              avatarUrl={selectedProfile?.avatarUrl}
              size={40}
            />
            <div className={styles.profileMeta}>
              {profiles.length > 1 ? (
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={activeProfileId}
                  onChange={setInternalProfileId}
                  optionFilterProp="label"
                  options={profiles.map((p) => ({
                    value: p.id,
                    label: `${p.fullName || p.employeeCode} (${p.employeeCode || 'N/A'})${
                      p.department?.name ? ` - ${p.department.name}` : ''
                    }`,
                  }))}
                />
              ) : (
                <div>
                  <div className={styles.profileName}>{selectedProfile?.fullName || '--'}</div>
                  <div className={styles.profileSub}>
                    {selectedProfile?.employeeCode} •{' '}
                    {selectedProfile?.department?.name || 'Chưa phân ban'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'leave' | 'attendance')}
          items={[
            {
              key: 'leave',
              label: (
                <span>
                  <RestOutlined style={{ marginRight: 6 }} />
                  {t('hrOperations.attendance.tabLeaveBalance', 'Quỹ Phép Năm')}
                </span>
              ),
              children: (
                <div>
                  {isBulkMode ? (
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 14 }}
                      message={`Thao tác dưới đây sẽ áp dụng đồng loạt cho toàn bộ ${selectedProfiles.length} nhân sự đã chọn.`}
                    />
                  ) : (
                    <div className={styles.statsOverview}>
                      <div className={styles.statBox}>
                        <div className={styles.statBoxLabel}>
                          {t('hrOperations.attendance.entitledLeave', 'Phép năm cấp')}
                        </div>
                        <div className={styles.statBoxValue}>{entitledLeaveDays} ngày</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statBoxLabel}>
                          {t('hrOperations.attendance.usedLeave', 'Đã sử dụng')}
                        </div>
                        <div
                          className={styles.statBoxValue}
                          style={{ color: 'var(--ant-color-warning)' }}
                        >
                          {usedLeaveDays} ngày
                        </div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statBoxLabel}>
                          {t('hrOperations.attendance.remainingLeave', 'Khả dụng')}
                        </div>
                        <div
                          className={styles.statBoxValue}
                          style={{ color: 'var(--ant-color-success)' }}
                        >
                          {availableLeaveDays} ngày
                        </div>
                      </div>
                    </div>
                  )}

                  <Form
                    form={leaveForm}
                    layout="vertical"
                    onFinish={(vals) => adjustLeaveMutation.mutate(vals)}
                    initialValues={{ reason: '' }}
                  >
                    <Form.Item
                      label={t('hrOperations.attendance.adjustModeLabel', 'Hình thức điều chỉnh')}
                    >
                      <Segmented
                        block
                        value={leaveAdjustMode}
                        onChange={(val) => setLeaveAdjustMode(val as 'ADJUST' | 'OVERRIDE')}
                        options={[
                          {
                            value: 'ADJUST',
                            label: t(
                              'hrOperations.attendance.modeAdjust',
                              'Cộng / Trừ ngày phép (Adjust)',
                            ),
                          },
                          {
                            value: 'OVERRIDE',
                            label: t(
                              'hrOperations.attendance.modeOverride',
                              'Sửa hạn mức phép năm (Override)',
                            ),
                          },
                        ]}
                      />
                    </Form.Item>

                    <Form.Item
                      name="amount"
                      label={
                        leaveAdjustMode === 'ADJUST'
                          ? t(
                              'hrOperations.attendance.adjustAmountLabel',
                              'Số ngày điều chỉnh (Dương: cộng thêm, Âm: trừ đi)',
                            )
                          : t(
                              'hrOperations.attendance.overrideAmountLabel',
                              'Tổng ngày phép năm tiêu chuẩn mới',
                            )
                      }
                      rules={[
                        { required: true, message: t('hrOperations.common.required', 'Bắt buộc') },
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        step={0.5}
                        placeholder={
                          leaveAdjustMode === 'ADJUST' ? 'VD: 1 hoặc -0.5' : 'VD: 12 hoặc 14'
                        }
                      />
                    </Form.Item>

                    <Form.Item
                      name="reason"
                      label={t('hrOperations.attendance.reasonLabel', 'Lý do hiệu chỉnh')}
                      rules={[
                        {
                          required: true,
                          message: t('hrOperations.common.required', 'Bắt buộc nhập lý do'),
                        },
                      ]}
                    >
                      <Input.TextArea
                        rows={2}
                        placeholder={t(
                          'hrOperations.attendance.leaveReasonPlaceholder',
                          'VD: Bù ngày phép theo thỏa thuận, Thưởng thâm niên, Sửa sai lệch quỹ phép...',
                        )}
                      />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button onClick={handleClose}>
                        {t('hrOperations.common.cancel', 'Hủy')}
                      </Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={adjustLeaveMutation.isPending}
                      >
                        {t('hrOperations.attendance.confirmSaveLeave', 'Lưu điều chỉnh phép')}
                        {isBulkMode ? ` (${selectedProfiles.length} người)` : ''}
                      </Button>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: 'attendance',
              label: (
                <span>
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  {t('hrOperations.attendance.tabAttendanceEdit', 'Ngày Công & Ngày Nghỉ')}
                </span>
              ),
              children: (
                <div style={{ paddingTop: 4 }}>
                  {/* Hàng chọn ngày & trạng thái bản ghi hiện tại */}
                  <div className={styles.daySelectionRow}>
                    <div className={styles.dayPickerWrap}>
                      <DatePicker
                        style={{ width: '100%' }}
                        value={selectedDate}
                        onChange={(d) => d && setSelectedDate(d)}
                        format="DD/MM/YYYY (dddd)"
                        disabledDate={(d) => !d.isSame(currentMonth, 'month')}
                      />
                    </div>
                    <div className={styles.dayStatusWrap}>
                      {isBulkMode ? (
                        <Tag color="purple" style={{ margin: 0 }}>
                          Áp dụng cho {selectedProfiles.length} nhân sự
                        </Tag>
                      ) : recordForSelectedDate ? (
                        <>
                          <Tag color="blue" style={{ margin: 0 }}>
                            {recordForSelectedDate.status}
                          </Tag>
                          <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
                            ({recordForSelectedDate.workDayValue ?? 0} công)
                          </span>
                          <Popconfirm
                            title={t(
                              'hrOperations.attendance.confirmDeleteTitle',
                              'Xác nhận xóa bản ghi?',
                            )}
                            description={t(
                              'hrOperations.attendance.confirmDeleteDesc',
                              'Xóa bản ghi chấm công ngày này của nhân viên. Dữ liệu công tháng sẽ tự động tính lại.',
                            )}
                            onConfirm={() =>
                              deleteAttendanceMutation.mutate(recordForSelectedDate.id)
                            }
                            okText={t('hrOperations.common.delete', 'Xóa')}
                            cancelText={t('hrOperations.common.cancel', 'Hủy')}
                            okButtonProps={{
                              danger: true,
                              loading: deleteAttendanceMutation.isPending,
                            }}
                          >
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              style={{ padding: '0 4px', height: 22 }}
                            />
                          </Popconfirm>
                        </>
                      ) : (
                        <Tag color="default" style={{ margin: 0 }}>
                          {t('hrOperations.attendance.noRecordYet', 'Chưa có bản ghi')}
                        </Tag>
                      )}
                    </div>
                  </div>

                  <Form
                    form={attendanceForm}
                    layout="vertical"
                    onFinish={(vals) => attendanceMutation.mutate(vals)}
                  >
                    <Row gutter={12}>
                      <Col span={14}>
                        <Form.Item
                          name="status"
                          label={t('hrOperations.attendance.targetStatusLabel', 'Trạng thái ngày')}
                          rules={[{ required: true }]}
                          style={{ marginBottom: 8 }}
                        >
                          <Select
                            onChange={(val) => {
                              if (val === 'PRESENT') attendanceForm.setFieldValue('workDayValue', 1)
                              else if (val === 'HALF_DAY')
                                attendanceForm.setFieldValue('workDayValue', 0.5)
                              else if (val === 'PAID_LEAVE' || val === 'HOLIDAY')
                                attendanceForm.setFieldValue('workDayValue', 1)
                              else attendanceForm.setFieldValue('workDayValue', 0)
                            }}
                            options={[
                              { value: 'PRESENT', label: 'PRESENT - Có mặt (Đủ công)' },
                              { value: 'HALF_DAY', label: 'HALF_DAY - Nửa ngày công (0.5 công)' },
                              {
                                value: 'PAID_LEAVE',
                                label: 'PAID_LEAVE - Nghỉ phép có lương (1.0 công)',
                              },
                              {
                                value: 'UNPAID_LEAVE',
                                label: 'UNPAID_LEAVE - Nghỉ không lương (0 công)',
                              },
                              { value: 'ABSENT', label: 'ABSENT - Vắng mặt (0 công)' },
                              {
                                value: 'HOLIDAY',
                                label: 'HOLIDAY - Nghỉ lễ hưởng lương (1.0 công)',
                              },
                              {
                                value: 'REST_DAY',
                                label: 'REST_DAY - Nghỉ luân phiên / cuối tuần',
                              },
                            ]}
                          />
                        </Form.Item>
                      </Col>

                      <Col span={10}>
                        <Form.Item
                          name="workDayValue"
                          label={t(
                            'hrOperations.attendance.workDayValueLabel',
                            'Số công tính (0 - 1.0)',
                          )}
                          rules={[
                            {
                              required: true,
                              message: t('hrOperations.common.required', 'Bắt buộc'),
                            },
                          ]}
                          style={{ marginBottom: 8 }}
                        >
                          <InputNumber
                            min={0}
                            max={1}
                            step={0.05}
                            precision={2}
                            style={{ width: '100%' }}
                            placeholder="1.0"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Phím chọn nhanh số công */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}
                    >
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('hrOperations.attendance.workDayPresetsLabel', 'Chọn nhanh:')}
                      </Text>
                      <Space size={4} wrap>
                        <Button
                          size="small"
                          onClick={() => attendanceForm.setFieldValue('workDayValue', 1)}
                        >
                          1.0
                        </Button>
                        <Button
                          size="small"
                          onClick={() => attendanceForm.setFieldValue('workDayValue', 0.8)}
                        >
                          0.8
                        </Button>
                        <Button
                          size="small"
                          onClick={() => attendanceForm.setFieldValue('workDayValue', 0.75)}
                        >
                          0.75
                        </Button>
                        <Button
                          size="small"
                          onClick={() => attendanceForm.setFieldValue('workDayValue', 0.5)}
                        >
                          0.5
                        </Button>
                        <Button
                          size="small"
                          onClick={() => attendanceForm.setFieldValue('workDayValue', 0)}
                        >
                          0
                        </Button>
                      </Space>
                    </div>

                    <Form.Item shouldUpdate noStyle>
                      {() => {
                        const currentStatus = attendanceForm.getFieldValue('status')
                        const isWorking =
                          currentStatus === 'PRESENT' || currentStatus === 'HALF_DAY'
                        if (!isWorking) return null

                        return (
                          <>
                            <Row gutter={12}>
                              <Col span={12}>
                                <Form.Item
                                  name="checkInTime"
                                  label={t('hrOperations.attendance.checkInTime', 'Giờ vào')}
                                  style={{ marginBottom: 8 }}
                                >
                                  <TimePicker
                                    needConfirm={false}
                                    changeOnBlur
                                    format="HH:mm"
                                    minuteStep={1}
                                    style={{ width: '100%' }}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item
                                  name="checkOutTime"
                                  label={t('hrOperations.attendance.checkOutTime', 'Giờ ra')}
                                  style={{ marginBottom: 8 }}
                                >
                                  <TimePicker
                                    needConfirm={false}
                                    changeOnBlur
                                    format="HH:mm"
                                    minuteStep={1}
                                    style={{ width: '100%' }}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>

                            {metricsPreview && (
                              <div className={styles.metricsPreviewBar}>
                                <span className={styles.metricsShiftInfo}>
                                  Ca {metricsPreview.shiftStart}-{metricsPreview.shiftEnd}:
                                </span>
                                {metricsPreview.lateMinutes > 0 ? (
                                  <Tag color="warning" style={{ margin: 0 }}>
                                    ⚠️ Đi muộn: {metricsPreview.lateMinutes}p
                                  </Tag>
                                ) : (
                                  <Tag color="success" style={{ margin: 0 }}>
                                    ✓ Vào đúng giờ
                                  </Tag>
                                )}

                                {metricsPreview.earlyLeaveMinutes > 0 ? (
                                  <Tag color="warning" style={{ margin: 0 }}>
                                    ⚠️ Về sớm: {metricsPreview.earlyLeaveMinutes}p
                                  </Tag>
                                ) : (
                                  <Tag color="success" style={{ margin: 0 }}>
                                    ✓ Ra đúng giờ
                                  </Tag>
                                )}

                                <Tag color="blue" style={{ margin: 0 }}>
                                  ⏱ Tổng làm: {metricsPreview.workedHours}h
                                  {metricsPreview.workedMins ? `${metricsPreview.workedMins}p` : ''}
                                </Tag>
                              </div>
                            )}
                          </>
                        )
                      }}
                    </Form.Item>

                    <Form.Item
                      name="reason"
                      label={t('hrOperations.attendance.reasonLabel', 'Lý do hiệu chỉnh')}
                      rules={[
                        {
                          required: true,
                          message: t('hrOperations.common.required', 'Bắt buộc nhập lý do'),
                        },
                      ]}
                      style={{ marginBottom: 14 }}
                    >
                      <Input.TextArea
                        rows={2}
                        placeholder={t(
                          'hrOperations.attendance.attendanceReasonPlaceholder',
                          'VD: Máy chấm công lỗi, Quên chấm công, Bổ sung công đi sự kiện...',
                        )}
                      />
                    </Form.Item>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        paddingTop: 10,
                        borderTop: '1px solid var(--ant-color-border-secondary)',
                      }}
                    >
                      <Button onClick={handleClose}>
                        {t('hrOperations.common.cancel', 'Hủy')}
                      </Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={attendanceMutation.isPending}
                      >
                        {t('hrOperations.attendance.saveDayAttendance', 'Lưu dữ liệu ngày công')}
                        {isBulkMode ? ` (${selectedProfiles.length} người)` : ''}
                      </Button>
                    </div>
                  </Form>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  )
}
