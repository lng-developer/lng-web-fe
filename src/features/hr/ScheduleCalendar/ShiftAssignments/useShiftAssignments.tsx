import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import { listShiftAssignments } from '../../api/hrOperationsApi'
import type { ScheduleEditorState } from '../ScheduleEditor/useScheduleEditor'

type UseShiftAssignmentsParams = {
  canScheduleWrite: boolean
  openEditor: (editor: ScheduleEditorState) => void
}

export function useShiftAssignments({ canScheduleWrite, openEditor }: UseShiftAssignmentsParams) {
  const { t } = useTranslation()

  const assignments = useQuery({
    queryKey: ['hr-operations', 'assignments'],
    queryFn: () => listShiftAssignments({ limit: 100 }),
  })

  const statusLabel = (value: string) =>
    t(`hrOperations.schedule.statuses.${value}`, { defaultValue: value })

  return {
    assignments,
    canScheduleWrite,
    assignmentCount: assignments.data?.items.length ?? 0,
    statusLabel,
    addAssignment: () => openEditor({ kind: 'assignment' }),
  }
}

export type ShiftAssignmentsModel = ReturnType<typeof useShiftAssignments>
