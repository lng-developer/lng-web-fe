import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import {
  listShifts,
  listWorkLocations,
  type Shift,
  type WorkLocation,
} from '../../api/hrOperationsApi'
import type { ScheduleEditorState } from '../ScheduleEditor/useScheduleEditor'

type UseLocationsShiftsParams = {
  canScheduleWrite: boolean
  openEditor: (editor: ScheduleEditorState) => void
}

export function useLocationsShifts({ canScheduleWrite, openEditor }: UseLocationsShiftsParams) {
  const { t } = useTranslation()

  const locations = useQuery({
    queryKey: ['hr-operations', 'locations'],
    queryFn: () => listWorkLocations({ limit: 100 }),
  })

  const shifts = useQuery({
    queryKey: ['hr-operations', 'shifts'],
    queryFn: () => listShifts({ limit: 100 }),
  })

  const statusLabel = (value: string) =>
    t(`hrOperations.schedule.statuses.${value}`, { defaultValue: value })

  return {
    locations,
    shifts,
    canScheduleWrite,
    locationCount: locations.data?.items.length ?? 0,
    shiftCount: shifts.data?.items.length ?? 0,
    statusLabel,
    addLocation: () => openEditor({ kind: 'location' }),
    editLocation: (item: WorkLocation) => openEditor({ kind: 'location', item }),
    addShift: () => openEditor({ kind: 'shift' }),
    editShift: (item: Shift) => openEditor({ kind: 'shift', item }),
  }
}

export type LocationsShiftsModel = ReturnType<typeof useLocationsShifts>
