import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'

import {
  type AuditFilters,
  exportAuditEventsCsv,
  getAuditEvent,
  listAuditEvents,
} from '../api/auditApi'
import { auditKeys } from '../api/auditKeys'

export function useAuditEventsInfiniteQuery(filters: AuditFilters) {
  return useInfiniteQuery({
    queryKey: auditKeys.events.list(filters),
    queryFn: ({ pageParam }) => listAuditEvents(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

export function useAuditEventDetailQuery(eventId?: string) {
  return useQuery({
    queryKey: auditKeys.events.detail(eventId ?? ''),
    queryFn: () => getAuditEvent(eventId!),
    enabled: Boolean(eventId),
    retry: false,
  })
}

export function useExportAuditCsvMutation(filters: AuditFilters) {
  return useMutation({
    mutationFn: () => exportAuditEventsCsv(filters),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'audit-events.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
  })
}
