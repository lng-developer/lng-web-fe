import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import { Avatar, Button, Drawer, IconButton, Typography } from '@mui/material'

import dayjs from '@/lib/dayjs'

import { compactTime, primaryState, stateClasses } from './attendanceDayCellUtils.js'

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function DetailRow({ label, value, valueClass = 'text-ink-strong' }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-medium text-right ${valueClass}`}>{value}</span>
    </div>
  )
}

export default function AttendanceStaffDetailDrawer({ row, cell, onClose, onAdjust }) {
  if (!row) return null

  const selectedCell = cell || row.cells?.[0] || {}
  const state = primaryState(selectedCell)
  const isAdjustable = Boolean(selectedCell.id && selectedCell.capabilities?.adjust)
  const dateLabel = selectedCell.dateKey
    ? dayjs(selectedCell.dateKey).format('ddd, DD MMM YYYY')
    : 'Day details'
  const adjustments = [...(selectedCell.manualAdjustments || [])].reverse()

  return (
    <Drawer anchor="right" open={Boolean(row)} onClose={onClose}>
      <aside className="flex h-full w-[360px] max-w-[100vw] flex-col bg-surface">
        <header className="flex items-start justify-between border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <Avatar className="!bg-primary !font-semibold">
              {getInitials(row.profile?.fullName)}
            </Avatar>
            <div>
              <Typography variant="subtitle1" className="font-bold text-ink-strong">
                {row.profile?.fullName || 'Unknown employee'}
              </Typography>
              <Typography variant="caption" className="text-ink-muted">
                {row.profile?.employeeCode || '-'}
              </Typography>
            </div>
          </div>
          <IconButton aria-label="Close attendance details" onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </header>

        <div className="border-b border-border px-5 py-3">
          <Typography
            variant="caption"
            className="font-semibold uppercase tracking-wide text-ink-muted"
          >
            Day details
          </Typography>
          <Typography variant="body2" className="mt-1 font-semibold text-ink-strong">
            {dateLabel}
          </Typography>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <div
            className={`mb-4 rounded-lg border px-3 py-3 ${stateClasses[state] || stateClasses.NO_RECORD}`}
          >
            <Typography variant="caption" className="font-semibold uppercase">
              Status
            </Typography>
            <Typography variant="body2" className="mt-1 font-bold">
              {state.replaceAll('_', ' ')}
            </Typography>
          </div>
          {Number(selectedCell.lateMinutes || 0) > 0 ? (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
              <Typography variant="caption" className="font-semibold uppercase">
                Late check-in
              </Typography>
              <Typography variant="body2" className="mt-1 font-bold">
                {selectedCell.lateMinutes} min late
              </Typography>
            </div>
          ) : null}
          <DetailRow
            label="Shift"
            value={
              selectedCell.shift?.name ||
              selectedCell.plannedShift?.name ||
              selectedCell.shiftLabel ||
              '-'
            }
          />
          <DetailRow
            label="Check-in"
            value={compactTime(selectedCell.checkInAt) || '-'}
            valueClass="text-emerald-600"
          />
          <DetailRow
            label="Check-out"
            value={compactTime(selectedCell.checkOutAt) || '-'}
            valueClass="text-emerald-600"
          />
          <DetailRow
            label="Working hours"
            value={
              selectedCell.workedMinutes
                ? `${Math.floor(selectedCell.workedMinutes / 60)}h ${selectedCell.workedMinutes % 60}m`
                : '-'
            }
          />
          <DetailRow
            label="Overtime"
            value={
              selectedCell.overtimeMinutes
                ? `${Math.floor(selectedCell.overtimeMinutes / 60)}h ${selectedCell.overtimeMinutes % 60}m`
                : '-'
            }
          />
          {adjustments.length ? (
            <section className="mt-6">
              <Typography
                variant="caption"
                className="font-semibold uppercase tracking-wide text-ink-muted"
              >
                History
              </Typography>
              <div className="mt-2 overflow-hidden rounded-lg border border-border">
                {adjustments.map((adjustment, index) => (
                  <div
                    key={`${adjustment.adjustedAt || index}-${adjustment.actorId || index}`}
                    className="border-b border-border px-3 py-3 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-ink-strong">
                        {adjustment.actorName || 'System'}
                      </span>
                      <span className="text-ink-muted">
                        {adjustment.adjustedAt
                          ? dayjs(adjustment.adjustedAt).format('DD MMM YYYY, HH:mm')
                          : '-'}
                      </span>
                    </div>
                    <Typography variant="caption" className="mt-1 block text-ink-secondary">
                      {adjustment.reason || '-'}
                    </Typography>
                    <Typography variant="caption" className="mt-2 block text-ink-muted">
                      Status: {adjustment.before?.status?.replaceAll('_', ' ') || '-'} →{' '}
                      {adjustment.after?.status?.replaceAll('_', ' ') || '-'}
                    </Typography>
                    <Typography variant="caption" className="block text-ink-muted">
                      Check-in: {compactTime(adjustment.before?.checkInAt) || '-'} →{' '}
                      {compactTime(adjustment.after?.checkInAt) || '-'}
                    </Typography>
                    <Typography variant="caption" className="block text-ink-muted">
                      Check-out: {compactTime(adjustment.before?.checkOutAt) || '-'} →{' '}
                      {compactTime(adjustment.after?.checkOutAt) || '-'}
                    </Typography>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-t border-border p-5">
          <Button
            fullWidth
            variant="contained"
            startIcon={<EditIcon />}
            disabled={!isAdjustable}
            onClick={() => onAdjust?.(selectedCell)}
          >
            Adjust attendance
          </Button>
        </div>
      </aside>
    </Drawer>
  )
}
