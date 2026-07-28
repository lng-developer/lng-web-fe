import { Typography } from '@mui/material'

import { buildMonthColumns } from '../utils/monthMatrix.js'
import AttendanceDayCell from './AttendanceDayCell.jsx'

export default function MonthlyStaffMatrix({ year, month, rows = [], onCellOpen }) {
  const columns = buildMonthColumns(year, month)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="max-h-[calc(100vh-19rem)] overflow-auto">
        <table
          className="border-separate border-spacing-0 text-left"
          style={{ minWidth: `${260 + columns.length * 76}px` }}
        >
          <thead className="sticky top-0 z-20 bg-neutral-bg">
            <tr>
              <th className="sticky left-0 z-30 min-w-[260px] border-b border-r border-border bg-neutral-bg px-4 py-3">
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Employee
                </Typography>
              </th>
              {columns.map((column) => (
                <th
                  key={column.dateKey}
                  className={`min-w-[76px] border-b border-r border-border px-1 py-2 text-center text-xs font-bold ${
                    column.isWeekend ? 'bg-surface-subtle text-ink-muted' : 'text-ink-secondary'
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cellsByDate = new Map(row.cells.map((cell) => [cell.dateKey, cell]))
              return (
                <tr
                  key={row.profile?.id || row.profile?._id}
                  className="bg-surface hover:bg-surface-subtle"
                >
                  <td className="sticky left-0 z-10 border-b border-r border-border bg-inherit px-4 py-2">
                    <Typography variant="body2" className="font-semibold text-ink-strong">
                      {row.profile?.fullName || 'Unknown employee'}
                    </Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      {row.profile?.employeeCode || '—'}
                    </Typography>
                  </td>
                  {columns.map((column) => (
                    <td key={column.dateKey} className="border-b border-r border-border p-1">
                      <AttendanceDayCell
                        cell={
                          cellsByDate.get(column.dateKey) || {
                            dateKey: column.dateKey,
                            emptyReason: 'NO_RECORD',
                          }
                        }
                        onCellOpen={onCellOpen}
                      />
                    </td>
                  ))}
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
