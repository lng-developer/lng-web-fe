import { memo } from 'react'
import { Pagination, Typography } from '@mui/material'

import { buildMonthColumns } from '../utils/monthMatrix.js'
import AttendanceDayCell from './AttendanceDayCell.jsx'

function exceptionCount(cells = []) {
  return cells.filter(
    (cell) => ['ABSENT', 'ERROR', 'HALF_DAY'].includes(cell.status) || cell.isException,
  ).length
}

function MonthlyStaffMatrix({
  year,
  month,
  rows = [],
  onCellOpen,
  onRowOpen,
  page = 1,
  pageSize = 8,
  total = 0,
  onPageChange,
}) {
  const columns = buildMonthColumns(year, month)
  const pageCount = Math.max(Math.ceil(total / pageSize), 1)
  const start = total ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, total)

  return (
    <section className="flex flex-none flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="shrink-0 overflow-x-auto overflow-y-hidden">
        <table
          className="w-full border-separate border-spacing-0 text-left"
          style={{ minWidth: `${160 + columns.length * 34}px` }}
        >
          <thead className="sticky top-0 z-20 bg-neutral-bg">
            <tr>
              <th
                rowSpan="2"
                className="sticky left-0 z-30 min-w-[124px] border-b border-r border-border bg-neutral-bg px-2 py-2"
              >
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Employee
                </Typography>
              </th>
              {columns.map((column) => (
                <th
                  key={column.dateKey}
                  className={`min-w-[34px] border-r border-border px-0.5 py-1 text-center text-[8px] font-semibold uppercase ${
                    column.isWeekend ? 'bg-surface-subtle text-ink-muted' : 'text-ink-secondary'
                  }`}
                >
                  {column.weekday}
                </th>
              ))}
              <th
                rowSpan="2"
                className="min-w-[36px] border-b border-border bg-neutral-bg px-2 py-3 text-center"
              >
                <Typography variant="caption" className="font-bold uppercase text-ink-muted">
                  Ex
                </Typography>
              </th>
            </tr>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.dateKey}
                  className={`min-w-[34px] border-b border-r border-border px-0.5 py-1 text-center text-[10px] font-bold ${
                    column.isWeekend ? 'bg-surface-subtle text-ink-muted' : 'text-ink-strong'
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
              const exceptions = exceptionCount(row.cells)

              return (
                <tr
                  key={row.profile?.id || row.profile?._id}
                  className="[content-visibility:auto] bg-surface hover:bg-surface-subtle"
                >
                  <td className="sticky left-0 z-10 border-b border-r border-border bg-inherit p-0">
                    <button
                      type="button"
                      className="w-full appearance-none !border-0 bg-transparent px-2 py-2 text-left hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      onClick={() => onRowOpen?.(row)}
                    >
                      <Typography
                        variant="caption"
                        className="block truncate font-semibold text-ink-strong"
                      >
                        {row.profile?.fullName || 'Unknown employee'}
                      </Typography>
                      <Typography variant="caption" className="block text-[10px] text-ink-muted">
                        {row.profile?.employeeCode || '-'}
                      </Typography>
                    </button>
                  </td>
                  {columns.map((column) => (
                    <td key={column.dateKey} className="border-b border-r border-border p-0.5">
                      <AttendanceDayCell
                        cell={
                          cellsByDate.get(column.dateKey) || {
                            dateKey: column.dateKey,
                            emptyReason: 'NO_RECORD',
                          }
                        }
                        onCellOpen={(cell) => onCellOpen?.(cell, row)}
                      />
                    </td>
                  ))}
                  <td className="border-b border-border px-2 text-center">
                    <Typography
                      variant="caption"
                      className={`font-bold ${exceptions ? 'text-amber-600' : 'text-ink-muted'}`}
                    >
                      {exceptions}
                    </Typography>
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
      {rows.length ? (
        <footer className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-ink-muted">
            <span className="mr-1 font-semibold text-ink-secondary">Legend</span>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
              P Present
            </span>
            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-blue-700">
              L Leave
            </span>
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">
              M Missing
            </span>
            <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-700">
              E Error
            </span>
            <span className="rounded border border-border bg-surface-subtle px-1.5 py-0.5 text-ink-secondary">
              R Rest
            </span>
          </div>
          <Typography variant="caption" className="text-center text-[10px] text-ink-muted">
            Showing {start}–{end} of {total} employees
          </Typography>
          <div className="flex justify-end">
            <Pagination
              color="primary"
              count={pageCount}
              page={Math.min(page, pageCount)}
              size="small"
              siblingCount={1}
              boundaryCount={1}
              onChange={(_event, value) => {
                if (value !== page) onPageChange?.(value)
              }}
            />
          </div>
        </footer>
      ) : null}
    </section>
  )
}

export default memo(MonthlyStaffMatrix)
