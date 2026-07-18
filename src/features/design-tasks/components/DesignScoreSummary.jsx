import { Skeleton, Typography } from '@mui/material'

function points(value) {
  return `${Number(value || 0)} pts`
}

export default function DesignScoreSummary({ summary, isLoading, hasError = false }) {
  if (isLoading) return <Skeleton variant="rectangular" height={58} className="rounded-lg" />

  if (hasError) {
    return (
      <Typography variant="body2" color="error" className="px-1">
        Unable to load score summary.
      </Typography>
    )
  }

  const topDesigners = (summary?.byDesigner || []).slice(0, 3)
  const byTaskType = summary?.byTaskType || []

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm xl:grid-cols-[160px_150px_minmax(250px,1fr)_minmax(250px,1fr)]">
      <Metric label="Total points" value={points(summary?.totalPoints)} />
      <Metric label="Total files" value={String(Number(summary?.totalFiles || 0))} />
      <Metric
        label="Top designers"
        value={
          topDesigners.length
            ? topDesigners
                .map((row) => `${row.designerName || 'Unknown'} ${points(row.totalPoints)}`)
                .join(' | ')
            : 'No scores'
        }
      />
      <Metric
        label="Points by task type"
        value={
          byTaskType.length
            ? byTaskType
                .map((row) => `${row.taskType || 'Other'} ${points(row.totalPoints)}`)
                .join(' | ')
            : 'No scores'
        }
      />
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0 xl:border-r xl:border-border xl:pr-3 last:border-0">
      <Typography variant="caption" className="block text-ink-muted">
        {label}
      </Typography>
      <Typography variant="body2" className="truncate font-semibold text-ink-strong" title={value}>
        {value}
      </Typography>
    </div>
  )
}
