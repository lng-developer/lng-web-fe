import CloseIcon from '@mui/icons-material/Close'
import { Alert, Drawer, IconButton, Skeleton, Typography } from '@mui/material'

import { useHolidayDetailQuery } from '../api/hrTime.queries.js'

function errorMessage(error) {
  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.message ||
    'Could not load holiday'
  )
}

export default function HolidayDetailDrawer({ open, holidayId, onClose }) {
  const holidayQuery = useHolidayDetailQuery(holidayId, { enabled: open && Boolean(holidayId) })
  const holiday = holidayQuery.data

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: 'w-full sm:w-[440px]' }}
    >
      <div className="flex h-full flex-col bg-surface">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <Typography variant="h6">Holiday details</Typography>
            <Typography variant="body2" className="text-ink-muted">
              {holiday?.dateKey || '-'}
            </Typography>
          </div>
          <IconButton aria-label="Close holiday details" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="space-y-4 px-5 py-4">
          {holidayQuery.isPending ? <Skeleton height={180} /> : null}
          {holidayQuery.isError ? (
            <Alert severity="error">{errorMessage(holidayQuery.error)}</Alert>
          ) : null}
          {holiday ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['Name', holiday.name],
                ['Type', holiday.holidayType?.replaceAll('_', ' ')],
                ['Working day', holiday.isWorkDay ? 'Yes' : 'No'],
                ['Paid day', holiday.isPaid ? 'Yes' : 'No'],
                ['Departments', holiday.appliedDepartmentIds?.length || 'Global'],
                ['Teams', holiday.appliedTeamIds?.length || 'Global'],
                ['Note', holiday.note || '-'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="mt-1 break-words text-sm text-ink-strong">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </Drawer>
  )
}
