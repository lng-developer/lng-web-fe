import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { Button, Typography } from '@mui/material'

function count(summary, ...statuses) {
  return statuses.reduce((total, status) => total + (summary?.statusCounts?.[status] || 0), 0)
}

export default function HrOperationsSummaryCards({ summary = {}, onFilterChange }) {
  const cards = [
    {
      label: 'Total Records',
      value: summary.totalRecords || 0,
      icon: <AssessmentOutlinedIcon fontSize="small" />,
      colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Present',
      value: count(summary, 'PRESENT'),
      icon: <CheckCircleOutlineOutlinedIcon fontSize="small" />,
      colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      label: 'Late / Missing',
      value: count(summary, 'ERROR', 'HALF_DAY'),
      icon: <WarningAmberOutlinedIcon fontSize="small" />,
      colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',
    },
    {
      label: 'Absent',
      value: count(summary, 'ABSENT'),
      icon: <ErrorOutlineOutlinedIcon fontSize="small" />,
      colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30',
    },
    {
      label: 'On Leave',
      value: count(summary, 'PAID_LEAVE', 'UNPAID_LEAVE', 'MIXED_LEAVE'),
      icon: <BeachAccessOutlinedIcon fontSize="small" />,
      colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30',
    },
    {
      label: 'Exceptions',
      value: count(summary, 'ABSENT', 'ERROR', 'HALF_DAY'),
      exception: true,
      icon: <ReportProblemOutlinedIcon fontSize="small" />,
      colorClass: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Button
          key={card.label}
          variant="outlined"
          disabled={!card.exception}
          onClick={() => onFilterChange?.({ exceptionsOnly: true })}
          className={`!block !rounded-xl !border-border !p-4 !text-left disabled:!opacity-100 !bg-surface hover:!bg-black/5 dark:hover:!bg-white/5 !transition-colors !normal-case`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.colorClass}`}
            >
              {card.icon}
            </div>
            <Typography
              variant="caption"
              className="font-semibold text-ink-muted leading-tight tracking-wide uppercase text-[10px]"
            >
              {card.label}
            </Typography>
          </div>
          <div className="flex items-baseline gap-1.5">
            <Typography variant="h5" className="font-bold text-ink-strong tracking-tight">
              {card.value}
            </Typography>
            {card.exception && (
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold ml-auto bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded uppercase">
                Filter
              </span>
            )}
          </div>
        </Button>
      ))}
    </div>
  )
}
