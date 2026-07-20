import { useTranslation } from 'react-i18next'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Stack, Typography } from '@mui/material'

import { IconActionButton, OperationsTable, StatusBadge } from '@/components/operations'

const requestColumns = [
  { key: 'employee', width: '200px' },
  { key: 'date', width: '190px' },
  { key: 'kind', width: '150px' },
  { key: 'amount', width: '130px', align: 'right' },
  { key: 'status', width: '130px' },
  { key: 'reason', width: '260px' },
  { key: 'actions', width: '150px', align: 'center' },
]

const attendanceColumns = [
  { key: 'date', width: '150px' },
  { key: 'shift', width: '180px' },
  { key: 'checkIn', width: '150px' },
  { key: 'checkOut', width: '150px' },
  { key: 'worked', width: '130px', align: 'right' },
  { key: 'status', width: '150px' },
  { key: 'actions', width: '100px', align: 'center' },
]

function enumDefault(value) {
  if (!value) return '-'
  const text = String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .toLowerCase()
  return `${text[0].toUpperCase()}${text.slice(1)}`
}

function statusTone(status) {
  if (status === 'APPROVED' || status === 'PRESENT') return 'success'
  if (status === 'REJECTED' || status === 'ABSENT') return 'danger'
  if (status === 'PENDING' || status === 'HALF_DAY') return 'warning'
  if (status === 'CANCELLED') return 'neutral'
  return 'info'
}

function formatDateKey(value, language) {
  if (!value) return '-'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value, language) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatMinutes(value, t) {
  const minutes = Number(value || 0)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return t('hrTime.units.minutes', { count: remainder, defaultValue: '{{count}} min' })
  if (!remainder) return t('hrTime.units.hours', { count: hours, defaultValue: '{{count}} hr' })
  return t('hrTime.units.hoursMinutes', {
    hours,
    minutes: remainder,
    defaultValue: '{{hours}} hr {{minutes}} min',
  })
}

export default function TimeRequestTable({
  type,
  rows,
  loading = false,
  showEmployee = false,
  allowedActions,
  error,
  onReview,
}) {
  const { t, i18n } = useTranslation()
  const columns = (type === 'attendance' ? attendanceColumns : requestColumns)
    .filter((column) => showEmployee || column.key !== 'employee')
    .map((column) => ({
      ...column,
      label: t(`hrTime.table.${column.key}`, { defaultValue: enumDefault(column.key) }),
    }))

  function translateEnum(group, value) {
    return t(`hrTime.enums.${group}.${value}`, { defaultValue: enumDefault(value) })
  }

  function renderActions(row) {
    const capabilities = row.capabilities || {}
    const permits = (action) => !allowedActions || allowedActions.includes(action)
    const actions = [
      capabilities.view &&
        permits('view') && {
          key: 'view',
          label: t('common.view', { defaultValue: 'View' }),
          icon: <VisibilityOutlinedIcon fontSize="small" />,
          tone: 'neutral',
        },
      capabilities.approve &&
        permits('approve') && {
          key: 'approve',
          label: t('hrTime.actions.approve', { defaultValue: 'Approve' }),
          icon: <CheckCircleOutlineOutlinedIcon fontSize="small" />,
          tone: 'success',
        },
      capabilities.reject &&
        permits('reject') && {
          key: 'reject',
          label: t('hrTime.actions.reject', { defaultValue: 'Reject' }),
          icon: <CloseOutlinedIcon fontSize="small" />,
          tone: 'danger',
        },
      capabilities.cancel &&
        permits('cancel') && {
          key: 'cancel',
          label: t('hrTime.actions.cancel', { defaultValue: 'Cancel' }),
          icon: <CancelOutlinedIcon fontSize="small" />,
          tone: 'danger',
        },
    ].filter(Boolean)

    if (!actions.length) {
      return (
        <Typography variant="caption" className="text-ink-muted">
          {t('hrTime.actions.none', { defaultValue: 'No actions' })}
        </Typography>
      )
    }

    return (
      <Stack direction="row" spacing={0.25} justifyContent="center">
        {actions.map((action) => (
          <IconActionButton
            key={action.key}
            label={action.label}
            tone={action.tone}
            onClick={() => onReview(row, action.key)}
          >
            {action.icon}
          </IconActionButton>
        ))}
      </Stack>
    )
  }

  function renderRequestCell(row, column) {
    if (column.key === 'employee') {
      return (
        <div className="min-w-0">
          <Typography variant="body2" className="truncate font-semibold text-ink-strong">
            {row.employeeName ||
              row.employee?.fullName ||
              t('hrTime.labels.unknownEmployee', { defaultValue: 'Unknown employee' })}
          </Typography>
          {row.employee?.employeeCode ? (
            <Typography variant="caption" className="text-ink-muted">
              {row.employee.employeeCode}
            </Typography>
          ) : null}
        </div>
      )
    }
    if (column.key === 'date') {
      const start = type === 'leave' ? row.startDateKey : row.workDateKey
      const end = type === 'leave' ? row.endDateKey : null
      const startLabel = formatDateKey(start, i18n.language)
      const endLabel = end && end !== start ? formatDateKey(end, i18n.language) : null
      return endLabel ? `${startLabel} - ${endLabel}` : startLabel
    }
    if (column.key === 'kind') {
      return type === 'leave'
        ? translateEnum('leaveType', row.leaveType)
        : `${row.plannedStartTime || '-'} - ${row.plannedEndTime || '-'}`
    }
    if (column.key === 'amount') {
      if (type === 'leave') {
        return t('hrTime.units.days', {
          count: Number(row.requestedUnits || 0) / 2,
          defaultValue: '{{count}} days',
        })
      }
      return formatMinutes(row.approvedMinutes ?? row.requestedMinutes, t)
    }
    if (column.key === 'status') {
      return (
        <StatusBadge tone={statusTone(row.status)}>
          {translateEnum('status', row.status)}
        </StatusBadge>
      )
    }
    if (column.key === 'reason') {
      return (
        <Typography variant="body2" className="line-clamp-2 text-ink-secondary">
          {row.reason || '-'}
        </Typography>
      )
    }
    if (column.key === 'actions') return renderActions(row)
    return row[column.key] ?? '-'
  }

  function renderAttendanceCell(row, column) {
    if (column.key === 'date') return formatDateKey(row.workDateKey, i18n.language)
    if (column.key === 'shift') return row.shift?.name || row.shiftName || '-'
    if (column.key === 'checkIn') return formatDateTime(row.checkInAt, i18n.language)
    if (column.key === 'checkOut') return formatDateTime(row.checkOutAt, i18n.language)
    if (column.key === 'worked') return formatMinutes(row.workedMinutes, t)
    if (column.key === 'status') {
      return (
        <StatusBadge tone={statusTone(row.status)}>
          {translateEnum('attendanceStatus', row.status)}
        </StatusBadge>
      )
    }
    if (column.key === 'actions') return renderActions(row)
    return row[column.key] ?? '-'
  }

  return (
    <OperationsTable
      columns={columns}
      rows={rows}
      loading={loading}
      getRowKey={(row) => row.id}
      renderCell={type === 'attendance' ? renderAttendanceCell : renderRequestCell}
      minWidth={type === 'attendance' ? '1000px' : showEmployee ? '1210px' : '1010px'}
      emptyTitle={
        error
          ? t('hrTime.errors.loadFailed', { defaultValue: 'Could not load records' })
          : t('hrTime.empty.title', { defaultValue: 'No records found' })
      }
      emptyDescription={
        error
          ? error
          : t('hrTime.empty.description', {
              defaultValue: 'Try another tab or adjust the active filters.',
            })
      }
    />
  )
}
