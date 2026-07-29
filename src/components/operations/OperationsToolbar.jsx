export default function OperationsToolbar({ children, className = '' }) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}
