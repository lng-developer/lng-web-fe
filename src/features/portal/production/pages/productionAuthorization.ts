import type { ProductionTask } from '../api/productionApi'

export function isOwnProductionOutput(task: ProductionTask, accountId?: string) {
  if (!accountId) return false
  const outputs = [...(task.fileChecks ?? []), ...(task.qcPreviewFileChecks ?? [])].filter(
    (check) => check.outputAssetId || check.outputAssetDownloadUrl,
  )
  return (
    outputs.some((check) => check.outputWorkerId === accountId) ||
    (outputs.some((check) => !check.outputWorkerId) &&
      [task.assignedDesignUserId, task.csAssigneeId].includes(accountId))
  )
}

export function isForbiddenProductionError(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status === 403
}
