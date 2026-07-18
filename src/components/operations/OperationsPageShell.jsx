import { operationsPageHeightClass } from './operationsLayout'

export default function OperationsPageShell({
  header,
  tabs,
  toolbar,
  children,
  pagination,
  className = '',
}) {
  return (
    <div
      className={`flex ${operationsPageHeightClass} flex-col gap-3 overflow-hidden bg-surface px-4 pt-0 pb-0 ${className}`}
    >
      {header || tabs || toolbar ? (
        <div className="sticky top-0 z-30 flex shrink-0 flex-col gap-3 bg-surface">
          {header ? <div>{header}</div> : null}
          {tabs ? <div>{tabs}</div> : null}
          {toolbar ? <div>{toolbar}</div> : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {pagination ? <div className="shrink-0">{pagination}</div> : null}
    </div>
  )
}
