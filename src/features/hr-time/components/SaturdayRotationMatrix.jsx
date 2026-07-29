import { Button, Typography } from '@mui/material'

function formatSaturday(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function SaturdayRotationMatrix({
  matrix,
  employees = [],
  onSelectCell,
  canWriteCell,
}) {
  const dates = matrix?.dates || []
  const teams = matrix?.teams || []
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]))

  return (
    <section className="overflow-x-auto rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-flow-col auto-cols-[minmax(300px,1fr)] gap-4">
        {dates.map((dateKey) => (
          <div key={dateKey} className="rounded-xl bg-surface-subtle p-3">
            <div className="mb-3 border-b border-border pb-3">
              <Typography variant="subtitle1" className="font-semibold text-ink-strong">
                Saturday rotation
              </Typography>
              <Typography variant="body2" className="text-ink-muted">
                {formatSaturday(dateKey)}
              </Typography>
            </div>
            <div className="space-y-3">
              {teams.map((team) => {
                const cell = team.cells.find((item) => item.dateKey === dateKey) || {
                  dateKey,
                  employeeProfileIds: [],
                  offCount: 0,
                  presentCount: team.memberCount,
                  minPresent: null,
                }
                const selectedEmployees = (cell.employeeProfileIds || [])
                  .map((id) => employeesById.get(id))
                  .filter(Boolean)
                const canWrite = canWriteCell?.(team)

                return (
                  <article key={team.id} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Typography variant="body2" className="font-semibold text-ink-strong">
                          {team.name}
                        </Typography>
                        <Typography variant="caption" className="text-ink-muted">
                          {team.memberCount} active staff · Minimum {cell.minPresent ?? 'not set'}
                        </Typography>
                      </div>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!canWrite}
                        onClick={() => onSelectCell?.(team, cell)}
                      >
                        Manage Saturday
                      </Button>
                    </div>

                    <Typography
                      variant="caption"
                      className="mt-3 block font-semibold uppercase tracking-wide text-ink-muted"
                    >
                      Selected off · {cell.offCount}
                    </Typography>
                    <div className="mt-2 space-y-2">
                      {selectedEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="rounded-lg border border-warning/50 bg-warning-light px-3 py-2"
                        >
                          <div className="text-sm font-semibold text-ink-strong">
                            {employee.fullName || employee.employeeCode}
                          </div>
                          <div className="text-xs text-ink-muted">
                            {employee.employeeCode || 'Employee'}
                          </div>
                        </div>
                      ))}
                      {selectedEmployees.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-ink-muted">
                          No staff selected off
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-ink-muted">
                      <span>Present {cell.presentCount}</span>
                      <span
                        className={
                          cell.minPresent !== null && cell.presentCount < cell.minPresent
                            ? 'font-semibold text-error'
                            : 'font-semibold text-success-dark'
                        }
                      >
                        {cell.minPresent === null
                          ? 'Manual rotation needed'
                          : cell.presentCount < cell.minPresent
                            ? 'Below minimum'
                            : 'Coverage met'}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
