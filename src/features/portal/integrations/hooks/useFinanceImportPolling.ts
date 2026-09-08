import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getFinanceImportBatch, type ImportBatch } from '@/features/portal/finance/api/financeApi'

import { integrationKeys } from '../api/integrationKeys'

const ACTIVE_IMPORT_STATUSES = new Set(['QUEUED', 'PROCESSING'])
const ACTIVE_RECALCULATION_STATUSES = new Set(['PROCESSING'])

export function isFinanceImportBatchActive(batch: ImportBatch | undefined) {
  return Boolean(
    batch &&
      (ACTIVE_IMPORT_STATUSES.has(batch.status) ||
        ACTIVE_RECALCULATION_STATUSES.has(batch.recalculationStatus)),
  )
}

export function useFinanceImportPolling(batchId?: string, initialBatch?: ImportBatch) {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    if (!batchId) return
    const handleVisibility = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [batchId])

  return useQuery({
    queryKey: [...integrationKeys.all, 'finance-import-batch', batchId],
    queryFn: () => getFinanceImportBatch(batchId!),
    initialData: initialBatch,
    enabled: Boolean(batchId),
    retry: false,
    refetchInterval: (query) => {
      if (!visible || !isFinanceImportBatchActive(query.state.data)) return false
      return 5_000
    },
  })
}
