import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getImportJobProgress, type ImportJobStatus } from '../api/integrationApi'
import { integrationKeys } from '../api/integrationKeys'

const ACTIVE_STATUSES = new Set<ImportJobStatus>(['PENDING', 'PARSING', 'IMPORTING'])

function isActive(status: ImportJobStatus | undefined) {
  return Boolean(status && ACTIVE_STATUSES.has(status))
}

export function useImportJobPolling(jobId?: string, status?: ImportJobStatus) {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    if (!jobId) return
    const handleVisibility = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [jobId])

  return useQuery({
    queryKey: integrationKeys.jobProgress(jobId ?? ''),
    queryFn: () => getImportJobProgress(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      if (!jobId || !visible) return false
      const currentStatus = query.state.data?.job.status ?? status
      return isActive(currentStatus) ? 5_000 : false
    },
    retry: false,
  })
}
