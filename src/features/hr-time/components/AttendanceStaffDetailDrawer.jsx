import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import { Avatar, Drawer, IconButton, Tooltip, Typography } from '@mui/material'

import dayjs from '@/lib/dayjs'

import { compactTime, primaryState, stateClasses } from './attendanceDayCellUtils.js'

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export default function AttendanceStaffDetailDrawer({ row, onClose, onCellOpen }) {
  if (!row) return null

  // Ensure cells are sorted by date
  const cells = [...(row.cells || [])].sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  // Calculate summary for this drawer
  let present = 0,
    absent = 0,
    leave = 0,
    exceptions = 0
  cells.forEach((cell) => {
    const state = primaryState(cell)
    if (state === 'PRESENT') present++
    else if (state === 'ABSENT' || state === 'HALF_DAY') absent++
    else if (state.includes('LEAVE')) leave++

    if (state === 'ABSENT' || state === 'HALF_DAY' || cell.isException) exceptions++
  })

  return (
    <Drawer anchor="right" open={Boolean(row)} onClose={onClose}>
      <div className="flex h-full w-[800px] max-w-[100vw] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-4">
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              {getInitials(row.profile?.fullName)}
            </Avatar>
            <div>
              <Typography variant="h6" className="font-bold text-ink-strong">
                {row.profile?.fullName || 'Unknown employee'}
              </Typography>
              <Typography variant="body2" className="text-ink-muted">
                {row.profile?.employeeCode || 'No Code'} • {row.department?.name || 'No Department'}
              </Typography>
            </div>
          </div>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Summary Stats */}
        <div className="flex justify-between border-b border-border bg-surface-subtle p-6">
          <div className="text-center">
            <Typography variant="caption" className="font-bold uppercase text-ink-muted">
              Present
            </Typography>
            <Typography variant="h6" className="font-bold text-emerald-600">
              {present}
            </Typography>
          </div>
          <div className="text-center">
            <Typography variant="caption" className="font-bold uppercase text-ink-muted">
              Absent
            </Typography>
            <Typography variant="h6" className="font-bold text-rose-600">
              {absent}
            </Typography>
          </div>
          <div className="text-center">
            <Typography variant="caption" className="font-bold uppercase text-ink-muted">
              Leave
            </Typography>
            <Typography variant="h6" className="font-bold text-blue-600">
              {leave}
            </Typography>
          </div>
          <div className="text-center">
            <Typography variant="caption" className="font-bold uppercase text-ink-muted">
              Exceptions
            </Typography>
            <Typography variant="h6" className="font-bold text-amber-600">
              {exceptions}
            </Typography>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto bg-surface">
          <table className="w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-bg">
              <tr>
                <th className="border-b border-border px-6 py-3 font-semibold text-ink-muted">
                  Ngày
                </th>
                <th className="border-b border-border px-4 py-3 font-semibold text-ink-muted">
                  Ca làm việc
                </th>
                <th className="border-b border-border px-4 py-3 text-center font-semibold text-ink-muted">
                  Vào
                </th>
                <th className="border-b border-border px-4 py-3 text-center font-semibold text-ink-muted">
                  Ra
                </th>
                <th className="border-b border-border px-4 py-3 text-center font-semibold text-ink-muted">
                  OT (h)
                </th>
                <th className="border-b border-border px-4 py-3 font-semibold text-ink-muted">
                  Trạng thái
                </th>
                <th className="border-b border-border px-6 py-3 text-right font-semibold text-ink-muted"></th>
              </tr>
            </thead>
            <tbody>
              {cells.map((cell) => {
                const state = primaryState(cell)
                const dateObj = dayjs(cell.dateKey)
                const isWeekend = dateObj.day() === 0 || dateObj.day() === 6

                return (
                  <tr
                    key={cell.dateKey}
                    className={`hover:bg-surface-subtle transition-colors ${isWeekend ? 'bg-neutral-50/50' : 'bg-surface'}`}
                  >
                    <td className="border-b border-border px-6 py-3">
                      <Typography
                        variant="body2"
                        className={`font-semibold ${isWeekend ? 'text-ink-muted' : 'text-ink-strong'}`}
                      >
                        {dateObj.format('DD/MM/YYYY')}
                      </Typography>
                    </td>
                    <td className="border-b border-border px-4 py-3">
                      <Typography variant="body2" className="text-ink-secondary">
                        {cell.shift?.name || cell.plannedShift?.name || cell.shiftLabel || '--'}
                      </Typography>
                    </td>
                    <td className="border-b border-border px-4 py-3 text-center font-mono text-sm text-ink-strong">
                      {compactTime(cell.checkInAt) || '--:--'}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-center font-mono text-sm text-ink-strong">
                      {compactTime(cell.checkOutAt) || '--:--'}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-center text-ink-secondary">
                      {cell.overtimeMinutes ? (cell.overtimeMinutes / 60).toFixed(1) : '--'}
                    </td>
                    <td className="border-b border-border px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${stateClasses[state] || stateClasses.NO_RECORD}`}
                      >
                        {state.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td className="border-b border-border px-6 py-3 text-right">
                      <Tooltip title="Chỉnh sửa chấm công">
                        <IconButton
                          size="small"
                          onClick={() => onCellOpen?.(cell)}
                          className="text-primary hover:bg-primary/10"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  )
}
