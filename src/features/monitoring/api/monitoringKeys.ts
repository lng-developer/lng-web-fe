import { SystemLogProcess, SystemLogStream } from './monitoringApi'

export const monitoringKeys = {
  all: ['monitoring'] as const,
  health: () => [...monitoringKeys.all, 'health'] as const,
  logs: (params: { process: SystemLogProcess; stream: SystemLogStream; lines: number }) =>
    [...monitoringKeys.all, 'logs', params] as const,
  indexSnapshots: (limit = 30) => [...monitoringKeys.all, 'index-snapshots', limit] as const,
}
