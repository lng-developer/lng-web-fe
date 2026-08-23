import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'

import { type Holiday, listCalendarOverrides, listHolidays } from '../../api/hrOperationsApi'
import type { ScheduleEditorState } from '../ScheduleEditor/useScheduleEditor'

type UseHolidaysOverridesParams = {
  month: Dayjs
  canCalendarWrite: boolean
  canScheduleWrite: boolean
  openEditor: (editor: ScheduleEditorState) => void
}

export function useHolidaysOverrides({
  month,
  canCalendarWrite,
  canScheduleWrite,
  openEditor,
}: UseHolidaysOverridesParams) {
  const { t } = useTranslation()

  const range = {
    dateFrom: month.startOf('month').format('YYYY-MM-DD'),
    dateTo: month.endOf('month').format('YYYY-MM-DD'),
    limit: 100,
  }

  const overrides = useQuery({
    queryKey: ['hr-operations', 'overrides', range.dateFrom],
    queryFn: () =>
      listCalendarOverrides({
        effectiveFrom: range.dateFrom,
        effectiveTo: range.dateTo,
        limit: 100,
      }),
  })

  const holidays = useQuery({
    queryKey: ['hr-operations', 'holidays', range.dateFrom],
    queryFn: () => listHolidays(range),
  })

  const overrideKindLabel = (value: string) =>
    t(`hrOperations.schedule.overrideKinds.${value}`, { defaultValue: value })

  const scopeTypeLabel = (value: string) =>
    t(`hrOperations.schedule.scopeTypes.${value}`, { defaultValue: value })

  const holidayTypeLabel = (value: string) =>
    t(`hrOperations.schedule.holidayTypes.${value}`, { defaultValue: value })

  return {
    holidays,
    overrides,
    canCalendarWrite,
    canScheduleWrite,
    holidayCount: (holidays.data?.items.length ?? 0) + (overrides.data?.items.length ?? 0),
    overrideKindLabel,
    scopeTypeLabel,
    holidayTypeLabel,
    addHoliday: () => openEditor({ kind: 'holiday' }),
    editHoliday: (item: Holiday) => openEditor({ kind: 'holiday', item }),
    addOverride: () => openEditor({ kind: 'override' }),
  }
}

export type HolidaysOverridesModel = ReturnType<typeof useHolidaysOverrides>
