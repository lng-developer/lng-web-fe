export const extensionKeys = {
  all: ['portal', 'extensions'] as const,
  agents: () => [...extensionKeys.all, 'agents'] as const,
  managementAgents: () => [...extensionKeys.all, 'management-agents'] as const,
  commands: (params?: { page?: number; limit?: number }) =>
    [...extensionKeys.all, 'commands', params ?? {}] as const,
  orderSchedules: () => [...extensionKeys.all, 'order-schedules'] as const,
  financeSchedules: () => [...extensionKeys.all, 'finance-schedules'] as const,
}
