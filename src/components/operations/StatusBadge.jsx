export default function StatusBadge({ children, tone = 'neutral' }) {
  const classes = {
    neutral: 'border-border bg-surface-subtle text-ink-secondary',
    success: 'border-success bg-success-bg text-success',
    warning: 'border-warning bg-warning-bg text-warning-deep',
    danger: 'border-danger bg-danger-bg text-danger',
    info: 'border-info bg-info-bg text-info-strong',
  }

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[tone] || classes.neutral}`}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
