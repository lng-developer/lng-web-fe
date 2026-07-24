import { Tooltip } from '@mui/material'

import { operationsTextCaptionClass } from './operationsLayout'

const toneClasses = {
  neutral: 'bg-neutral-bg text-ink-secondary',
  success: 'bg-success-bg text-success-strong',
  warning: 'bg-warning-bg text-warning-strong',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info-strong',
}

const textToneClasses = {
  neutral: 'text-ink-secondary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

const toneBorderClasses = {
  neutral: 'border-border',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
  info: 'border-info',
}

export default function StatusBadge({
  children,
  tone = 'neutral',
  bordered = true,
  className = '',
  tooltip = '',
  variant = 'badge',
}) {
  const resolvedTone = toneClasses[tone] ? tone : 'neutral'
  const isText = variant === 'text'
  const badge = (
    <span
      className={`${
        isText
          ? 'inline-flex max-w-full items-center'
          : `inline-flex min-h-5 max-w-full items-center rounded-full px-2 py-0.5 ${
              bordered ? `border ${toneBorderClasses[resolvedTone]}` : 'border-0'
            } ${toneClasses[resolvedTone]}`
      } ${operationsTextCaptionClass} ${isText ? textToneClasses[resolvedTone] : ''} ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  )

  if (!tooltip) return badge

  return (
    <Tooltip title={tooltip}>
      <span className="inline-flex min-w-0 max-w-full">{badge}</span>
    </Tooltip>
  )
}
