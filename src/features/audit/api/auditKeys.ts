import { AuditFilters } from './auditApi'

export const auditKeys = {
  all: ['audit'] as const,
  events: {
    all: () => ['audit-events'] as const,
    list: (filters?: AuditFilters) => ['audit-events', filters] as const,
    detail: (eventId: string) => ['audit-event', eventId] as const,
  },
}
