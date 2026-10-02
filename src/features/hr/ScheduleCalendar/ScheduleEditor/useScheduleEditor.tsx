import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import { loadTeams } from '@/features/organization/api/organizationApi'
import { useFeedbackToast } from '@/shared/ui'

import { loadEmployeeProfiles } from '../../api/hrApi'
import {
  type CalendarOverrideInput,
  createCalendarOverride,
  createHoliday,
  createSaturdayRotation,
  createShift,
  createShiftAssignment,
  type ShiftAssignment,
  createWorkLocation,
  generateSaturdayRotations,
  type Holiday,
  type HolidayInput,
  listShifts,
  listWorkLocations,
  type SaturdayRotation,
  type Shift,
  type ShiftAssignmentInput,
  type ShiftInput,
  updateHoliday,
  updateSaturdayRotation,
  updateShift,
  updateShiftAssignment,
  updateWorkLocation,
  type WorkLocation,
  type WorkLocationInput,
} from '../../api/hrOperationsApi'

export type ScheduleEditorKind =
  | 'location'
  | 'shift'
  | 'assignment'
  | 'override'
  | 'holiday'
  | 'rotation'
  | 'rotationManual'

export type ScheduleEditorState = {
  kind: ScheduleEditorKind
  item?: WorkLocation | Shift | ShiftAssignment | Holiday | SaturdayRotation
}

export type RotationOffByDate = Record<string, string[]>

export type ScheduleEditorValues = Record<
  string,
  string | number | string[] | RotationOffByDate | Dayjs | null | undefined
>

type UseScheduleEditorParams = {
  month: Dayjs
  canScheduleWrite: boolean
  canCalendarWrite: boolean
  canRotationRead: boolean
  rotationTeamId?: string
  teamProfiles?: Array<{ id: string; employeeCode: string; fullName: string }>
}

export function useScheduleEditor({
  month,
  canScheduleWrite,
  canCalendarWrite,
  canRotationRead,
  rotationTeamId,
  teamProfiles,
}: UseScheduleEditorParams) {
  const { t } = useTranslation()
  const [editor, setEditor] = useState<ScheduleEditorState>()
  const [form] = Form.useForm<ScheduleEditorValues>()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const manualTeamId = Form.useWatch('teamId', form)
  const manualMonth = Form.useWatch('month', form)

  const monthParams = useMemo(() => ({ month: month.month() + 1, year: month.year() }), [month])

  const locations = useQuery({
    queryKey: ['hr-operations', 'locations'],
    queryFn: () => listWorkLocations({ limit: 100 }),
    enabled: canScheduleWrite,
  })

  const shifts = useQuery({
    queryKey: ['hr-operations', 'shifts'],
    queryFn: () => listShifts({ limit: 100 }),
    enabled: canScheduleWrite,
  })

  const profiles = useQuery({
    queryKey: ['hr', 'employee-profiles', false],
    queryFn: () => loadEmployeeProfiles(false),
    enabled: canScheduleWrite || (canCalendarWrite && !rotationTeamId),
  })

  const teams = useQuery({
    queryKey: ['organization', 'teams'],
    queryFn: loadTeams,
    enabled: canRotationRead && !rotationTeamId,
  })

  const employeeOptions = useMemo(
    () =>
      (profiles.data?.items ?? []).map((profile) => ({
        value: profile.id,
        label: `${profile.fullName || profile.employeeCode} · ${profile.employeeCode}`,
      })),
    [profiles.data],
  )

  const teamOptions = useMemo(
    () => (teams.data?.items ?? []).map((team) => ({ value: team.id, label: team.name })),
    [teams.data],
  )

  const manualTeamEmployees = useMemo(() => {
    const members = rotationTeamId
      ? (teamProfiles ?? [])
      : (profiles.data?.items ?? []).filter((profile) => profile.teamId === manualTeamId)
    return members.map((profile) => ({
      value: profile.id,
      label: `${profile.fullName || profile.employeeCode} · ${profile.employeeCode}`,
    }))
  }, [manualTeamId, profiles.data, rotationTeamId, teamProfiles])

  const saturdaysOfMonth = useCallback(
    (monthValue: ScheduleEditorValues[string]) => {
      const monthDate = dayjs.isDayjs(monthValue) ? monthValue : month
      if (!monthDate.isValid()) return []

      const dates: string[] = []
      let current = monthDate.startOf('month')
      const endOfMonth = monthDate.endOf('month')

      while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
        if (current.day() === 6) dates.push(current.format('YYYY-MM-DD'))
        current = current.add(1, 'day')
      }

      return dates
    },
    [month],
  )

  const manualSaturdays = useMemo(
    () => saturdaysOfMonth(manualMonth || month),
    [manualMonth, month, saturdaysOfMonth],
  )

  const manualDefaultOffByDate = useMemo(
    () => Object.fromEntries(manualSaturdays.map((dateKey) => [dateKey, []])) as RotationOffByDate,
    [manualSaturdays],
  )

  const saturdayWeekLabel = (dateKey: string) =>
    `${t('hrOperations.schedule.weekLabel')} ${
      Math.floor(dayjs(dateKey).startOf('day').diff(dayjs(dateKey).startOf('month'), 'day') / 7) + 1
    } (${dayjs(dateKey).format('DD/MM/YYYY')})`

  const overrideKindLabel = (value: string) =>
    t(`hrOperations.schedule.overrideKinds.${value}`, { defaultValue: value })

  const scopeTypeLabel = (value: string) =>
    t(`hrOperations.schedule.scopeTypes.${value}`, { defaultValue: value })

  const holidayTypeLabel = (value: string) =>
    t(`hrOperations.schedule.holidayTypes.${value}`, { defaultValue: value })

  const openEditor = useCallback(
    (next: ScheduleEditorState) => {
      form.resetFields()

      if (next.item) {
        form.setFieldsValue({
          ...(next.item as ScheduleEditorValues),
          ...(next.kind === 'rotationManual'
            ? {
                dateKey: dayjs((next.item as SaturdayRotation).dateKey),
                month,
              }
            : {}),
        })
      } else if (next.kind === 'rotationManual') {
        form.setFieldsValue({
          teamId: rotationTeamId,
          month,
          employeeProfileIdsByDate: manualDefaultOffByDate,
        })
      } else if (next.kind === 'rotation') {
        form.setFieldsValue({ teamId: rotationTeamId, minPresent: 1 })
      } else if (next.kind === 'assignment') {
        form.setFieldsValue({ status: 'ACTIVE' })
      }

      setEditor(next)
    },
    [form, manualDefaultOffByDate, month, rotationTeamId],
  )

  const closeEditor = useCallback(() => setEditor(undefined), [])

  const save = useMutation({
    mutationFn: async (values: ScheduleEditorValues) => {
      if (!editor) return

      if (editor.kind === 'location') {
        return editor.item
          ? updateWorkLocation(editor.item.id, values as WorkLocationInput)
          : createWorkLocation(values as WorkLocationInput)
      }

      if (editor.kind === 'shift') {
        return editor.item
          ? updateShift(editor.item.id, values as ShiftInput)
          : createShift(values as ShiftInput)
      }

      if (editor.kind === 'assignment') {
        return editor.item
          ? updateShiftAssignment(editor.item.id, values as ShiftAssignmentInput)
          : createShiftAssignment(values as ShiftAssignmentInput)
      }

      if (editor.kind === 'override') {
        return createCalendarOverride({
          ...(values as CalendarOverrideInput),
          scopeId: values.scopeType === 'GLOBAL' ? null : String(values.scopeId),
        })
      }

      if (editor.kind === 'holiday') {
        return editor.item
          ? updateHoliday(editor.item.id, values as HolidayInput)
          : createHoliday(values as HolidayInput)
      }

      if (editor.kind === 'rotationManual') {
        if (editor.item) {
          return updateSaturdayRotation(
            editor.item.id,
            (values.employeeProfileIds as string[]) ?? [],
          )
        }

        const teamId = String(values.teamId)
        const byDate = (values.employeeProfileIdsByDate as RotationOffByDate) || {}
        const targetDates = saturdaysOfMonth(values.month)
        return Promise.all(
          targetDates.map((dateKey) => {
            const employeeProfileIds = Array.isArray(byDate[dateKey]) ? byDate[dateKey] : []

            return createSaturdayRotation({ teamId, dateKey, employeeProfileIds })
          }),
        )
      }

      return generateSaturdayRotations({
        teamId: String(values.teamId),
        ...monthParams,
        minPresent: Number(values.minPresent ?? 1),
      })
    },
    onSuccess: () => {
      closeEditor()
      form.resetFields()
      toast('success', t('hrOperations.messages.saved'))
      void queryClient.invalidateQueries({ queryKey: ['hr-operations'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })

  return {
    editor,
    form,
    manualTeamId,
    manualSaturdays,
    locations,
    shifts,
    profiles,
    teams,
    employeeOptions,
    teamOptions,
    manualTeamEmployees,
    saturdaysOfMonth,
    manualDefaultOffByDate,
    saturdayWeekLabel,
    overrideKindLabel,
    scopeTypeLabel,
    holidayTypeLabel,
    rotationTeamId,
    openEditor,
    closeEditor,
    save,
  }
}

export type ScheduleEditorModel = ReturnType<typeof useScheduleEditor>
