import { Typography } from '@mui/material'

export default function OperationsHeader({ title, subtitle, actions }) {
  return (
    <header className="bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography variant="h5" className="font-bold text-ink-strong">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" className="mt-1 text-ink-muted">
              {subtitle}
            </Typography>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
