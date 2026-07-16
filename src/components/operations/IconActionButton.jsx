import { CircularProgress, IconButton, Tooltip } from '@mui/material'

export default function IconActionButton({
  label,
  icon,
  children,
  disabled = false,
  loading = false,
  tone = 'neutral',
  onClick,
}) {
  const toneClasses = {
    neutral: 'text-ink-muted hover:text-ink-strong',
    primary: 'text-primary hover:text-danger',
    success: 'text-success hover:text-success',
    danger: 'text-danger hover:text-danger',
  }

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          size="small"
          disabled={disabled || loading}
          onClick={onClick}
          className={`h-8 w-8 ${toneClasses[tone] || toneClasses.neutral}`}
        >
          {loading ? <CircularProgress size={14} color="inherit" /> : children || icon}
        </IconButton>
      </span>
    </Tooltip>
  )
}
