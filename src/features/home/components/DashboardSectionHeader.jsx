import { Typography } from '@mui/material'

export default function DashboardSectionHeader({ description, title }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
      <div>
        <Typography className="text-base font-semibold text-ink-strong">{title}</Typography>
        {description ? (
          <Typography className="mt-0.5 text-xs text-ink-muted">{description}</Typography>
        ) : null}
      </div>
    </div>
  )
}
