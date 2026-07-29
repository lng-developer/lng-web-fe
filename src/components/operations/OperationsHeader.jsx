import { Typography } from '@mui/material'

export default function OperationsHeader({ title, subtitle, actions }) {
  return (
    <header className="bg-surface pt-4 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Typography
            variant="h4"
            className="font-extrabold text-ink-strong tracking-tight"
            style={{ fontSize: '1.5rem' }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" className="mt-1 font-medium text-ink-muted">
              {subtitle}
            </Typography>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  )
}
