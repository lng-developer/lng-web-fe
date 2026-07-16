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
      className={`flex h-[calc(100dvh-80px)] flex-col gap-3 overflow-hidden bg-surface p-4 md:h-[calc(100dvh-96px)] ${className}`}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      {tabs ? <div className="shrink-0">{tabs}</div> : null}
      {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {pagination ? <div className="shrink-0">{pagination}</div> : null}
    </div>
  )
}
