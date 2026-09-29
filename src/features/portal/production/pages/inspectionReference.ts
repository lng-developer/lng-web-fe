import type { FileCheck, ProductionTask } from '../api/productionApi'

function linkedCustomerInputUrl(task: ProductionTask) {
  const linkedAssetIds = new Set(
    (task.customization?.customerInputs?.images ?? [])
      .map((image) => image.assetId)
      .filter((assetId): assetId is string => Boolean(assetId)),
  )
  const linkedAssets = (task.customization?.imageAssets ?? []).filter(
    (asset) => asset.assetId && linkedAssetIds.has(asset.assetId) && asset.assetDownloadUrl,
  )
  return linkedAssets.length === 1 ? linkedAssets[0].assetDownloadUrl : null
}

export function inspectionReference(task: ProductionTask, check: FileCheck) {
  if (check.inputAssetDownloadUrl) {
    return { url: check.inputAssetDownloadUrl, type: 'CUSTOMER_INPUT' as const }
  }
  if (check.sourceType !== 'CUSTOMER_IMAGE') return null

  const linkedUrl = linkedCustomerInputUrl(task)
  if (linkedUrl) return { url: linkedUrl, type: 'CUSTOMER_INPUT' as const }

  const artwork = (task.customization?.imageAssets ?? []).filter((asset) => asset.assetDownloadUrl)
  return artwork.length === 1
    ? { url: artwork[0].assetDownloadUrl!, type: 'CUSTOMIZATION_ARTWORK' as const }
    : null
}
