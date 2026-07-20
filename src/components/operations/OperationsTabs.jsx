import { Tab, Tabs } from '@mui/material'

import { operationsTextCaptionClass, operationsTextStrongClass } from './operationsLayout'

export default function OperationsTabs({
  items,
  value,
  onChange,
  getHref,
  variant = 'pill',
  className = '',
}) {
  const isNav = variant === 'nav'
  const isUnderline = variant === 'underline'

  if (isNav || isUnderline) {
    return (
      <div className={`${isUnderline ? 'border-b border-border' : ''} bg-surface ${className}`}>
        <Tabs
          value={value}
          variant="scrollable"
          scrollButtons="auto"
          onChange={(_event, nextValue) => {
            if (nextValue !== value) onChange?.(nextValue)
          }}
          TabIndicatorProps={{ className: 'h-0.5 bg-primary' }}
          className={isUnderline ? '!min-h-10' : '!min-h-12'}
        >
          {items.map((item) => {
            const active = value === item.value
            return (
              <Tab
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                disableRipple
                label={
                  <span className="inline-flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.count !== undefined ? (
                      <span
                        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 ${operationsTextCaptionClass} ${
                          active ? 'bg-primary-light text-primary' : 'bg-neutral-bg text-ink-muted'
                        }`}
                      >
                        {Number(item.count || 0)}
                      </span>
                    ) : null}
                  </span>
                }
                className={`${isUnderline ? '!min-h-10' : '!min-h-12'} !px-4 !normal-case transition-colors ${operationsTextStrongClass} ${
                  active ? '!text-primary' : '!font-medium !text-ink-secondary hover:!text-primary'
                }`}
              />
            )
          })}
        </Tabs>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 bg-surface-subtle p-1.5 ${className}`}>
      {items.map((item) => {
        const active = value === item.value
        const href = getHref?.(item)
        const content = (
          <>
            <span>{item.label}</span>
            {item.count !== undefined ? (
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 ${operationsTextCaptionClass} ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-bg text-ink-muted group-hover:bg-primary-light group-hover:text-primary'
                }`}
              >
                {Number(item.count || 0)}
              </span>
            ) : null}
          </>
        )
        const itemClassName = `group inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-4 transition duration-150 active:translate-y-px ${operationsTextStrongClass} ${
          active
            ? 'border-primary bg-primary text-white shadow-sm hover:bg-danger hover:shadow-md'
            : 'border-transparent text-ink-muted hover:border-border hover:bg-surface hover:text-ink-strong hover:shadow-sm'
        } ${item.disabled ? 'pointer-events-none opacity-50' : ''}`

        if (href) {
          return (
            <a
              key={item.value}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={itemClassName}
              onClick={(event) => {
                event.preventDefault()
                if (active || item.disabled) return
                onChange?.(item.value)
              }}
            >
              {content}
            </a>
          )
        }

        return (
          <button
            key={item.value}
            type="button"
            disabled={item.disabled}
            aria-pressed={active}
            className={itemClassName}
            onClick={() => {
              if (!active) onChange?.(item.value)
            }}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
