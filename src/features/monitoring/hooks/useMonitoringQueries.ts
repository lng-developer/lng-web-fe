import { useQuery } from '@tanstack/react-query'

import {
  getMongoIndexUsageSnapshots,
  getSystemHealth,
  getSystemLogs,
  SystemLogProcess,
  SystemLogStream,
} from '../api/monitoringApi'
import { monitoringKeys } from '../api/monitoringKeys'

export function useSystemHealthQuery(enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.health(),
    queryFn: async () => {
      const start = performance.now()
      const data = await getSystemHealth()
      const latencyMs = Math.round(performance.now() - start)
      return { data, latencyMs }
    },
    enabled,
    refetchInterval: 60_000,
    retry: false,
  })
}

export function useSystemLogsQuery(
  params: {
    process: SystemLogProcess
    stream: SystemLogStream
    lines: number
  },
  enabled = true,
) {
  return useQuery({
    queryKey: monitoringKeys.logs(params),
    queryFn: () => getSystemLogs(params),
    enabled,
    retry: false,
  })
}

export function useMongoIndexSnapshotsQuery(limit = 30, enabled = true) {
  return useQuery({
    queryKey: monitoringKeys.indexSnapshots(limit),
    queryFn: () => getMongoIndexUsageSnapshots(limit),
    enabled,
    retry: false,
  })
}
