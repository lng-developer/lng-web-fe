import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'

import { loadTeams } from '@/features/organization/api/organizationApi'
import { useFeedbackToast } from '@/shared/ui'

import { loadEmployeeProfiles } from '../../api/hrApi'
import {
  deleteSaturdayRotation,
  deleteTeamSaturdayRotations,
  listSaturdayRotations,
  type SaturdayRotation,
} from '../../api/hrOperationsApi'
import type { ScheduleEditorState } from '../ScheduleEditor/useScheduleEditor'

type UseSaturdayRotationParams = {
  month: Dayjs
  canRotationRead: boolean
  canManageRotation: boolean
  openEditor: (editor: ScheduleEditorState) => void
}

export function useSaturdayRotation({
  month,
  canRotationRead,
  canManageRotation,
  openEditor,
}: UseSaturdayRotationParams) {
  const { t } = useTranslation()
  const [rotationTeamId, setRotationTeamId] = useState<string>()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const monthParams = useMemo(() => ({ month: month.month() + 1, year: month.year() }), [month])

  const rotations = useQuery({
    queryKey: ['hr-operations', 'rotations', monthParams, rotationTeamId],
    queryFn: () =>
      listSaturdayRotations({
        ...monthParams,
        ...(rotationTeamId ? { teamId: rotationTeamId } : {}),
        limit: 100,
      }),
    enabled: canRotationRead,
  })

  const profiles = useQuery({
    queryKey: ['hr', 'employee-profiles', false],
    queryFn: () => loadEmployeeProfiles(false),
    enabled: canRotationRead,
  })

  const teams = useQuery({
    queryKey: ['organization', 'teams'],
    queryFn: loadTeams,
    enabled: canRotationRead,
  })

  const teamOptions = useMemo(
    () => (teams.data?.items ?? []).map((team) => ({ value: team.id, label: team.name })),
    [teams.data],
  )

  const teamById = useMemo(() => {
    const map = new Map<string, string>()
    ;(teams.data?.items ?? []).forEach((team) => map.set(team.id, team.name))
    return map
  }, [teams.data])

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(profiles.data?.items ?? []).forEach((profile) => {
      map.set(profile.id, `${profile.fullName || profile.employeeCode}`)
    })
    return map
  }, [profiles.data])

  const rotationSourceLabel = (value: string) =>
    t(`hrOperations.schedule.rotationSources.${value}`, { defaultValue: value })

  const removeRotation = useMutation({
    mutationFn: (id: string) => deleteSaturdayRotation(id),
    onSuccess: () => {
      toast('success', t('hrOperations.messages.saved'))
      void queryClient.invalidateQueries({ queryKey: ['hr-operations'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })

  const resetMonthRotation = useMutation({
    mutationFn: () => {
      if (!rotationTeamId) return Promise.resolve()
      return deleteTeamSaturdayRotations(rotationTeamId, month.month() + 1, month.year())
    },
    onSuccess: () => {
      toast('success', t('hrOperations.messages.saved'))
      void queryClient.invalidateQueries({ queryKey: ['hr-operations'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })

  return {
    rotations,
    rotationTeamId,
    setRotationTeamId,
    canRotationRead,
    canManageRotation,
    teamOptions,
    teamName: (teamId: string) => teamById.get(teamId) ?? teamId,
    employeeNameById,
    rotationSourceLabel,
    generateMonth: () => openEditor({ kind: 'rotation' }),
    addRotation: () => openEditor({ kind: 'rotationManual' }),
    editRotation: (item: SaturdayRotation) => openEditor({ kind: 'rotationManual', item }),
    removeRotation,
    resetMonthRotation,
  }
}

export type SaturdayRotationModel = ReturnType<typeof useSaturdayRotation>
