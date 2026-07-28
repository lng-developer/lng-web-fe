import { Button, Typography } from '@mui/material'

function count(summary, ...statuses) {
  return statuses.reduce((total, status) => total + (summary?.statusCounts?.[status] || 0), 0)
}

export default function HrOperationsSummaryCards({ summary = {}, onFilterChange }) {
  const cards = [
    { label: 'Records', value: summary.totalRecords || 0 },
    { label: 'Present', value: count(summary, 'PRESENT') },
    { label: 'Late / missing', value: count(summary, 'ERROR', 'HALF_DAY') },
    { label: 'Absent', value: count(summary, 'ABSENT') },
    { label: 'Leave', value: count(summary, 'PAID_LEAVE', 'UNPAID_LEAVE', 'MIXED_LEAVE') },
    { label: 'Exceptions', value: count(summary, 'ABSENT', 'ERROR', 'HALF_DAY'), exception: true },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <Button
          key={card.label}
          variant="outlined"
          disabled={!card.exception}
          onClick={() => onFilterChange?.({ exceptionsOnly: true })}
          className="!block !rounded-xl !border-border !p-3 !text-left disabled:!opacity-100"
        >
          <Typography variant="caption" className="block text-ink-muted">
            {card.label}
          </Typography>
          <Typography variant="h6" className="mt-1 font-bold text-ink-strong">
            {card.value}
          </Typography>
        </Button>
      ))}
    </div>
  )
}
