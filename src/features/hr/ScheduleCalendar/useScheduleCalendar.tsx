import { useState } from 'react'
import { useRouteLoaderData } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission } from '@/shared/auth/permissions'
import { getPermissions } from '@/shared/auth/session'

import { useHolidaysOverrides } from './HolidaysOverrides/useHolidaysOverrides'
import { useLocationsShifts } from './LocationsShifts/useLocationsShifts'
import { useSaturdayRotation } from './SaturdayRotation/useSaturdayRotation'
import { useScheduleEditor } from './ScheduleEditor/useScheduleEditor'
import { useShiftAssignments } from './ShiftAssignments/useShiftAssignments'
import { getTeamHrWorkspace } from '../api/hrTimeApi'

export const buildTeamWorkspaceParams = (date: dayjs.Dayjs, teamId?: string) => ({
  dateKey: date.format('YYYY-MM-DD'),
  year: date.year(),
  month: date.month() + 1,
  teamId,
  days: 1 as const,
})

export function getRotationAccess(
  account: Pick<CurrentAccount, 'permissions' | 'scopes' | 'roles'>,
  selectedTeamId?: string,
) {
  const writePermissions = ['HR_CALENDAR:WRITE', 'HR_SATURDAY_ROTATION:WRITE']
  const canManageAllRotations = writePermissions.some((permission) =>
    canUseScopedPermission(account, permission),
  )
  const rotationTeamIds = [
    ...new Set(
      account.scopes
        .filter((scope) => scope.scopeType.toLowerCase() === 'team')
        .filter((scope) =>
          writePermissions.some((permission) => scope.permissions.includes(permission)),
        )
        .map((scope) => scope.scopeId)
        .filter((scopeId): scopeId is string => Boolean(scopeId)),
    ),
  ]
  const rotationTeamId =
    selectedTeamId ??
    (!canManageAllRotations && rotationTeamIds.length === 1 ? rotationTeamIds[0] : undefined)
  const canManageRotation =
    canManageAllRotations ||
    writePermissions.some((permission) =>
      canUseScopedPermission(account, permission, { scopeType: 'team', scopeId: rotationTeamId }),
    )
  return { rotationTeamId, canManageRotation }
}

export function useScheduleCalendar(selectedTeamId?: string) {
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const permissions = new Set(getPermissions())
  const canScheduleWrite = permissions.has('HR_SCHEDULE:WRITE')
  const canCalendarWrite = permissions.has('HR_CALENDAR:WRITE')
  const canCalendarRead = permissions.has('HR_CALENDAR:READ') || canCalendarWrite
  const { rotationTeamId, canManageRotation } = getRotationAccess(account, selectedTeamId)
  const canRotationRead = canCalendarRead || canScheduleWrite || canManageRotation
  const canManageGlobalCalendar = canCalendarWrite && !rotationTeamId

  const [month, setMonth] = useState(dayjs())
  const teamWorkspace = useQuery({
    queryKey: ['hr-workspace', 'team', rotationTeamId],
    queryFn: () => getTeamHrWorkspace(buildTeamWorkspaceParams(dayjs(), rotationTeamId)),
    enabled: Boolean(rotationTeamId),
  })

  const editor = useScheduleEditor({
    month,
    canScheduleWrite,
    canCalendarWrite: canManageGlobalCalendar,
    canRotationRead,
    rotationTeamId,
    teamProfiles: teamWorkspace.data?.profiles.items,
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
    canCalendarWrite: canManageGlobalCalendar,
    canScheduleWrite,
    openEditor: editor.openEditor,
  })

  const saturdayRotation = useSaturdayRotation({
    month,
    canRotationRead,
    canManageRotation,
    rotationTeamId,
    openEditor: editor.openEditor,
    teamProfiles: teamWorkspace.data?.profiles.items,
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
    rotationTeamId,
  }

  const handles = {
    setMonth,
  }

  return [values, handles] as const
}
