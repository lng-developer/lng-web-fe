export default function InlineDetailValue({
  children,
  className = '',
  label,
  value,
  valueClassName = 'text-ink-secondary',
}) {
  const content = children ?? value ?? '-'
  const normalizedLabel = String(label ?? '').replace(/:\s*$/, '')

  return (
    <div className={`flex min-w-0 flex-wrap items-baseline gap-x-1 leading-[1.45] ${className}`}>
      <span className="shrink-0 whitespace-nowrap text-sm font-bold text-ink-detail">
        {normalizedLabel}:
      </span>
      <span className={`min-w-0 break-words text-sm ${valueClassName}`}>{content}</span>
    </div>
  )
}
