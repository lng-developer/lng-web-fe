import { Tooltip } from '@mui/material'

import { primaryState, secondaryLabel, stateClasses } from './attendanceDayCellUtils.js'

export default function AttendanceDayCell({ cell, onCellOpen }) {
  const state = primaryState(cell)
  const secondary = secondaryLabel(cell)
  const label = `${cell?.dateKey || ''}: ${state.replaceAll('_', ' ')}${secondary ? `, ${secondary}` : ''}`

  return (
    <Tooltip title={label}>
      <button
        type="button"
        onClick={() => onCellOpen?.(cell)}
        aria-label={label}
        className={`flex min-h-[52px] w-full min-w-[72px] flex-col items-center justify-center rounded-md px-1.5 text-[11px] font-bold border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all ${
          stateClasses[state] || stateClasses.NO_RECORD
        }`}
      >
        <span className="max-w-full truncate">{state.replaceAll('_', ' ')}</span>
        {secondary ? (
          <span className="max-w-full truncate text-[10px] font-normal">{secondary}</span>
        ) : null}
      </button>
    </Tooltip>
  )
}
