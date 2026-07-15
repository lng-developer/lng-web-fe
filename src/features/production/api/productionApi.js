export function normalizeBulkPushResult(result = {}) {
  const sent = Array.isArray(result.sent) ? result.sent : []
  const failedItems = Array.isArray(result.failed) ? result.failed : []

  return {
    succeeded: sent.length,
    failed: failedItems.length,
    sent,
    failedItems,
  }
}
