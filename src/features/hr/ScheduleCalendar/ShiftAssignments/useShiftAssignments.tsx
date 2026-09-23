import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  listShiftAssignments,
  type ShiftAssignment,
  updateShiftAssignment,
} from '../../api/hrOperationsApi'
import { useFeedbackToast } from '@/shared/ui'
import type { ScheduleEditorState } from '../ScheduleEditor/useScheduleEditor'

type UseShiftAssignmentsParams = {
  canScheduleWrite: boolean
  openEditor: (editor: ScheduleEditorState) => void
}

export function useShiftAssignments({ canScheduleWrite, openEditor }: UseShiftAssignmentsParams) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const assignments = useQuery({
    queryKey: ['hr-operations', 'assignments'],
    queryFn: () => listShiftAssignments({ limit: 100 }),
  })

  const statusLabel = (value: string) =>
    t(`hrOperations.schedule.statuses.${value}`, { defaultValue: value })

  const deactivate = useMutation({
    mutationFn: (assignment: ShiftAssignment) =>
      updateShiftAssignment(assignment.id, { status: 'INACTIVE' }),
    onSuccess: () => {
      toast('success', t('hrOperations.messages.saved'))
      void queryClient.invalidateQueries({ queryKey: ['hr-operations', 'assignments'] })
    },
    onError: (error) => toast('error', t('hrOperations.messages.saveFailed'), error.message),
  })

  return {
    assignments,
    canScheduleWrite,
    assignmentCount: assignments.data?.items.length ?? 0,
    statusLabel,
    addAssignment: () => openEditor({ kind: 'assignment' }),
    editAssignment: (assignment: ShiftAssignment) =>
      openEditor({ kind: 'assignment', item: assignment }),
    deactivateAssignment: (assignment: ShiftAssignment) => deactivate.mutate(assignment),
    deactivatingAssignmentId: deactivate.isPending ? deactivate.variables?.id : undefined,
  }
}

export type ShiftAssignmentsModel = ReturnType<typeof useShiftAssignments>
