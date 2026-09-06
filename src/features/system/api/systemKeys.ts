export const systemKeys = {
  all: ['system'] as const,
  dashboard: () => [...systemKeys.all, 'dashboard'] as const,
}
