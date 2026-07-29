import { Button, Typography } from '@mui/material'

function getRowSummary(cells = []) {
  let present = 0
  let absent = 0
  let leave = 0
  let exceptions = 0

  cells.forEach((cell) => {
    const state = cell.status || cell.emptyReason || 'NO_RECORD'
    if (state === 'PRESENT') present++
    else if (state === 'ABSENT' || state === 'HALF_DAY') absent++
    else if (state.includes('LEAVE')) leave++

    if (state === 'ABSENT' || state === 'HALF_DAY' || cell.isException) {
      exceptions++
    }
  })

  return { present, absent, leave, exceptions }
}

export default function AttendanceStaffList({ rows = [], onViewDetail }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left">
          <thead className="bg-neutral-bg">
            <tr>
              <th className="border-b border-border px-4 py-3">
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Employee
                </Typography>
              </th>
              <th className="border-b border-border px-4 py-3 text-center">
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Present
                </Typography>
              </th>
              <th className="border-b border-border px-4 py-3 text-center">
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Absent / Half Day
                </Typography>
              </th>
              <th className="border-b border-border px-4 py-3 text-center">
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Leave
                </Typography>
              </th>
              <th className="border-b border-border px-4 py-3 text-center">
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Exceptions
                </Typography>
              </th>
              <th className="border-b border-border px-4 py-3 text-right">
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Action
                </Typography>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const summary = getRowSummary(row.cells)
              return (
                <tr
                  key={row.profile?.id || row.profile?._id}
                  className="bg-surface hover:bg-surface-subtle"
                >
                  <td className="border-b border-border px-4 py-3">
                    <Typography variant="body2" className="font-semibold text-ink-strong">
                      {row.profile?.fullName || 'Unknown employee'}
                    </Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      {row.profile?.employeeCode || '—'}
                    </Typography>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-center">
                    <Typography variant="body2" className="font-medium text-emerald-600">
                      {summary.present}
                    </Typography>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-center">
                    <Typography
                      variant="body2"
                      className={`font-medium ${summary.absent > 0 ? 'text-rose-600' : 'text-ink-muted'}`}
                    >
                      {summary.absent}
                    </Typography>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-center">
                    <Typography variant="body2" className="font-medium text-blue-600">
                      {summary.leave}
                    </Typography>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-center">
                    <Typography
                      variant="body2"
                      className={`font-medium ${summary.exceptions > 0 ? 'text-amber-600' : 'text-ink-muted'}`}
                    >
                      {summary.exceptions}
                    </Typography>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-right">
                    <Button variant="outlined" size="small" onClick={() => onViewDetail(row)}>
                      View Detail
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <Typography className="px-4 py-10 text-center text-ink-muted">
          No staff records found.
        </Typography>
      ) : null}
    </section>
  )
}
