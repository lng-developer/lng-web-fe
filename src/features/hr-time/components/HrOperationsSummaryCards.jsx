import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { Button, Typography } from '@mui/material'

function count(summary, ...statuses) {
  return statuses.reduce((total, status) => total + (summary?.statusCounts?.[status] || 0), 0)
}

export default function HrOperationsSummaryCards({ summary = {}, onFilterChange }) {
  const cards = [
    {
      label: 'Missing check-in/out',
      value: count(summary, 'ERROR', 'HALF_DAY'),
      icon: <WarningAmberOutlinedIcon fontSize="small" />,
      exception: true,
      colorClass: 'text-amber-600 dark:text-amber-400',
      borderClass: '!border-amber-300',
      footer: 'Requires attention',
    },
    {
      label: 'Attendance errors',
      value: count(summary, 'ERROR'),
      icon: <ReportProblemOutlinedIcon fontSize="small" />,
      exception: true,
      colorClass: 'text-rose-600 dark:text-rose-400',
      borderClass: '!border-rose-300',
      footer: 'Requires correction',
    },
    {
      label: 'Late arrivals',
      value: summary.lateCount || 0,
      icon: <AccessTimeOutlinedIcon fontSize="small" />,
      filter: { lateOnly: true, exceptionsOnly: false },
      colorClass: 'text-amber-600 dark:text-amber-400',
      borderClass: '!border-amber-300',
      footer: 'Late check-in',
    },
    {
      label: 'Approved leave',
      value: count(summary, 'PAID_LEAVE', 'UNPAID_LEAVE', 'MIXED_LEAVE'),
      icon: <CalendarTodayOutlinedIcon fontSize="small" />,
      colorClass: 'text-ink-secondary',
      footer: 'This month',
    },
    {
      label: 'Approved OT',
      value: summary.approvedOvertimeCount || 0,
      icon: <AccessTimeOutlinedIcon fontSize="small" />,
      colorClass: 'text-ink-secondary',
      footer: 'This month',
    },
    {
      label: 'Manual adjustments',
      value: summary.manualAdjustmentCount || 0,
      icon: <EditOutlinedIcon fontSize="small" />,
      colorClass: 'text-ink-secondary',
      footer: 'This month',
    },
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Button
          key={card.label}
          variant="outlined"
          disabled={!card.exception && !card.filter}
          onClick={() => onFilterChange?.(card.filter || { exceptionsOnly: true })}
          className={`!block !min-h-[106px] !rounded-lg !border-border !p-3 !text-left disabled:!opacity-100 !bg-surface hover:!bg-black/5 dark:hover:!bg-white/5 !transition-colors !normal-case ${card.borderClass || ''}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle ${card.colorClass}`}
            >
              {card.icon}
            </div>
            <Typography
              variant="caption"
              className="text-[15px] font-medium leading-tight text-ink-muted"
            >
              {card.label}
            </Typography>
          </div>
          <div className="ml-11 mt-1">
            <Typography
              variant="h5"
              className={`text-3xl font-bold tracking-tight ${card.exception ? card.colorClass : 'text-ink-strong'}`}
            >
              {card.value}
            </Typography>
          </div>
          <div
            className={`ml-11 mt-1 flex items-center gap-2 text-[13px] ${card.exception ? card.colorClass : 'text-ink-muted'}`}
          >
            <span>{card.footer}</span>
            <span>→</span>
          </div>
        </Button>
      ))}
    </div>
  )
}
