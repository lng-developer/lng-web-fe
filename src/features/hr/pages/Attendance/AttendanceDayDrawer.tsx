import { useTranslation } from 'react-i18next'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Button, Descriptions, Divider, Drawer, Space, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import type { Attendance } from '../../api/hrTimeApi'
import type { CalendarDayItem } from './AttendanceCalendarGrid'
import styles from './AttendancePage.module.scss'

interface AttendanceDayDrawerProps {
  open: boolean
  onClose: () => void
  day: CalendarDayItem | null
  onAdjust?: (record: Attendance) => void
  canAdjust?: boolean
}

export const AttendanceDayDrawer = ({
  open,
  onClose,
  day,
  onAdjust,
  canAdjust = true,
}: AttendanceDayDrawerProps) => {
  const { t } = useTranslation()

  if (!day) return null

  const rec = day.record
  const dateFormatted = day.date.format('dddd, DD/MM/YYYY')
  const inTime = rec?.checkInAt ? dayjs(rec.checkInAt).format('HH:mm:ss') : null
  const outTime = rec?.checkOutAt ? dayjs(rec.checkOutAt).format('HH:mm:ss') : null

  const workedHours = rec?.workedMinutes
    ? `${(rec.workedMinutes / 60).toFixed(1)} ${t('hrOperations.attendance.workedHours', 'giờ')}`
    : '--'

  const sourceLabel = rec?.source
    ? t(`hrOperations.attendance.sources.${rec.source}`, rec.source)
    : t('hrOperations.attendance.sources.SELF_SERVICE', 'Web portal')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={420}
      title={
        <Space>
          <CalendarOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <span>{dateFormatted}</span>
        </Space>
      }
      extra={
        rec && canAdjust && onAdjust ? (
          <Button
            size="small"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              onClose()
              onAdjust(rec)
            }}
          >
            {t('hrOperations.attendance.adjust', 'Điều chỉnh')}
          </Button>
        ) : null
      }
    >
      <div className={styles.drawerBody}>
        {/* Top Summary Banner */}
        <div className={styles.drawerSummaryCard}>
          <div className={styles.drawerSummaryTitle}>
            <span>{t('hrOperations.attendance.workDayValue', 'Giá trị ngày công')}</span>
            <Tag
              color={rec?.workDayValue ? 'success' : 'default'}
              style={{ fontSize: 14, padding: '2px 10px' }}
            >
              {rec?.workDayValue ?? 0} {t('hrOperations.attendance.workDayUnit', 'công')}
            </Tag>
          </div>

          <div className={styles.drawerStatusBadge}>
            {rec?.status === 'PRESENT' && (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                {t('hrOperations.attendance.statuses.PRESENT', 'Có mặt')}
              </Tag>
            )}
            {rec?.status === 'HALF_DAY' && (
              <Tag color="warning" icon={<ClockCircleOutlined />}>
                {t('hrOperations.attendance.statuses.HALF_DAY', 'Nửa ngày công')}
              </Tag>
            )}
            {rec?.status === 'ABSENT' && (
              <Tag color="error" icon={<ExclamationCircleOutlined />}>
                {t('hrOperations.attendance.statuses.ABSENT', 'Vắng mặt')}
              </Tag>
            )}
            {(rec?.lateMinutes ?? 0) > 0 && (
              <Tag color="error">
                {t('hrOperations.attendance.lateTag', { count: rec?.lateMinutes })}
              </Tag>
            )}
            {(rec?.earlyLeaveMinutes ?? 0) > 0 && (
              <Tag color="blue">
                {t('hrOperations.attendance.earlyTag', { count: rec?.earlyLeaveMinutes })}
              </Tag>
            )}
            {!rec && (
              <Tag color="default">
                {day.isWeekend
                  ? t('hrOperations.attendance.legendWeekend', 'Nghỉ cuối tuần')
                  : t('hrOperations.attendance.statuses.ABSENT', 'Chưa có bản ghi')}
              </Tag>
            )}
          </div>
        </div>

        {/* Swipe Times Block */}
        <div className={styles.drawerTimeBoxes}>
          <div className={styles.timeBox}>
            <span className={styles.timeBoxLabel}>
              {t('hrOperations.attendance.in', 'Giờ vào')}
            </span>
            <span className={inTime ? styles.timeBoxValueIn : styles.timeBoxMuted}>
              {inTime || '--:--:--'}
            </span>
          </div>
          <div className={styles.timeBox}>
            <span className={styles.timeBoxLabel}>
              {t('hrOperations.attendance.out', 'Giờ ra')}
            </span>
            <span className={outTime ? styles.timeBoxValueOut : styles.timeBoxMuted}>
              {outTime || '--:--:--'}
            </span>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Detailed Descriptions */}
        <Descriptions column={1} size="small" bordered className={styles.drawerDescriptions}>
          <Descriptions.Item label={t('hrOperations.attendance.standardShift', 'Ca quy định')}>
            {rec?.shift?.name || t('hrOperations.attendance.standardShiftName', 'Ca hành chính')}{' '}
            (08:30 - 17:30)
          </Descriptions.Item>
          <Descriptions.Item label={t('hrOperations.attendance.workedHours', 'Tổng giờ làm')}>
            <span style={{ fontWeight: 600 }}>{workedHours}</span>
          </Descriptions.Item>
          <Descriptions.Item label={t('hrOperations.attendance.lateMinutes', 'Đi muộn')}>
            {(rec?.lateMinutes ?? 0) > 0 ? (
              <span style={{ color: 'var(--ant-color-error)', fontWeight: 600 }}>
                {rec?.lateMinutes}{' '}
                {t('hrOperations.attendance.minutes', { count: rec?.lateMinutes })}
              </span>
            ) : (
              <span style={{ color: 'var(--ant-color-success)' }}>
                {t('hrOperations.attendance.punctualTag', 'Đúng giờ')}
              </span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('hrOperations.attendance.earlyLeaveMinutes', 'Về sớm')}>
            {(rec?.earlyLeaveMinutes ?? 0) > 0 ? (
              <span style={{ color: 'var(--ant-color-primary)', fontWeight: 600 }}>
                {rec?.earlyLeaveMinutes}{' '}
                {t('hrOperations.attendance.minutes', { count: rec?.earlyLeaveMinutes })}
              </span>
            ) : (
              'Không'
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('hrOperations.attendance.source', 'Nguồn chấm công')}>
            <Tag color="cyan">{sourceLabel}</Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* Hint footer */}
        <div className={styles.drawerHintBox}>
          <InfoCircleOutlined style={{ color: 'var(--ant-color-info)', marginTop: 2 }} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t(
              'hrOperations.attendance.drawerExplanationHint',
              'Nếu có sai lệch về giờ quẹt thẻ do máy chấm công hoặc công tác bên ngoài, vui lòng bấm "Điều chỉnh" để gửi yêu cầu giải trình tới quản lý.',
            )}
          </Typography.Text>
        </div>
      </div>
    </Drawer>
  )
}
