import { useState } from 'react'
import dayjs from 'dayjs'

import { getPermissions } from '@/shared/auth/session'

import { useHolidaysOverrides } from './HolidaysOverrides/useHolidaysOverrides'
import { useLocationsShifts } from './LocationsShifts/useLocationsShifts'
import { useSaturdayRotation } from './SaturdayRotation/useSaturdayRotation'
import { useScheduleEditor } from './ScheduleEditor/useScheduleEditor'
import { useShiftAssignments } from './ShiftAssignments/useShiftAssignments'

export function useScheduleCalendar() {
  const permissions = new Set(getPermissions())
  const canScheduleWrite = permissions.has('HR_SCHEDULE:WRITE')
  const canCalendarWrite = permissions.has('HR_CALENDAR:WRITE')
  const canCalendarRead = permissions.has('HR_CALENDAR:READ') || canCalendarWrite
  const canManageRotation = canScheduleWrite || canCalendarWrite
  const canRotationRead = canCalendarRead || canScheduleWrite

  const [month, setMonth] = useState(dayjs())

  const editor = useScheduleEditor({
    month,
    canScheduleWrite,
    canCalendarWrite,
    canRotationRead,
  })

  const assignments = useShiftAssignments({
    canScheduleWrite,
    openEditor: editor.openEditor,
  })

  const locationsShifts = useLocationsShifts({
    canScheduleWrite,
    openEditor: editor.openEditor,
  })

  const holidaysOverrides = useHolidaysOverrides({
    month,
    canCalendarWrite,
    canScheduleWrite,
    openEditor: editor.openEditor,
  })

  const saturdayRotation = useSaturdayRotation({
    month,
    canRotationRead,
    canManageRotation,
    openEditor: editor.openEditor,
  })

  const metrics = {
    locationCount: locationsShifts.locationCount,
    shiftCount: locationsShifts.shiftCount,
    assignmentCount: assignments.assignmentCount,
    holidayCount: holidaysOverrides.holidayCount,
    loading: {
      locations: locationsShifts.locations.isLoading,
      shifts: locationsShifts.shifts.isLoading,
      assignments: assignments.assignments.isLoading,
      holidays: holidaysOverrides.holidays.isLoading || holidaysOverrides.overrides.isLoading,
    },
  }

  const values = {
    month,
    editor,
    assignments,
    locationsShifts,
    holidaysOverrides,
    saturdayRotation,
    metrics,
  }

  const handles = {
    setMonth,
  }

  return [values, handles] as const
}
