import type { MappingPreview, MappingRuleType, VendorCandidate } from '../api/mappingApi'

export type MappingPipelineStage =
  | 'SKU_CLEANUP'
  | 'PRODUCT_MAPPING'
  | 'INPUT_SEMANTICS'
  | 'VALUE_ALIASES'
  | 'VENDOR_ROUTING'

export const PIPELINE_STAGES: MappingPipelineStage[] = [
  'SKU_CLEANUP',
  'PRODUCT_MAPPING',
  'INPUT_SEMANTICS',
  'VALUE_ALIASES',
  'VENDOR_ROUTING',
]

const ruleTypes: Record<MappingPipelineStage, MappingRuleType> = {
  SKU_CLEANUP: 'skuNormalize',
  PRODUCT_MAPPING: 'skuConfig',
  INPUT_SEMANTICS: 'semanticRules',
  VALUE_ALIASES: 'valueAliases',
  VENDOR_ROUTING: 'vendorRouting',
}

const recommendationStages: Record<string, MappingPipelineStage> = {
  CREATE_SKU_NORMALIZE_RULE: 'SKU_CLEANUP',
  CREATE_SKU_CONFIG_RULE: 'PRODUCT_MAPPING',
  CREATE_SEMANTIC_RULE: 'INPUT_SEMANTICS',
  CREATE_VALUE_ALIAS: 'VALUE_ALIASES',
  CREATE_VENDOR_ROUTING_RULE: 'VENDOR_ROUTING',
  SELECT_VENDOR_CANDIDATE: 'VENDOR_ROUTING',
  SKU_CONFIG: 'PRODUCT_MAPPING',
  SEMANTIC_RULE: 'INPUT_SEMANTICS',
  VALUE_ALIAS: 'VALUE_ALIASES',
  VENDOR_PRODUCT: 'VENDOR_ROUTING',
  VENDOR_COST_CENTER: 'VENDOR_ROUTING',
}

export type MappingTraceView = {
  ready: boolean
  originalSku: string
  canonicalSku: string
  configCode: string
  blockingReasons: string[]
  normalizedInputs: NonNullable<MappingPreview['normalizedInputs']>
  candidates: TraceCandidate[]
  autoMatch: VendorCandidate | null
  impactLabel: 'SAMPLED'
}

type TraceCandidate = Required<Pick<VendorCandidate, 'vendorProductId' | 'vendorCostCenterId'>> &
  VendorCandidate

export const getRuleTypeForStage = (stage: MappingPipelineStage) => ruleTypes[stage]
export const getStageForFixType = (fixType?: string) =>
  fixType ? recommendationStages[fixType] : undefined

export function toMappingTraceView(preview: MappingPreview): MappingTraceView {
  const products = new Map(
    (preview.vendorProductCandidates ?? [])
      .filter((candidate) => candidate.id)
      .map((candidate) => [candidate.id as string, candidate]),
  )

  return {
    ready: preview.ready,
    originalSku: preview.skuNormalization?.originalSku ?? '—',
    canonicalSku: preview.skuNormalization?.canonicalSku ?? '—',
    configCode: preview.skuMapping?.configCode ?? '—',
    blockingReasons: preview.blockingReasons ?? [],
    normalizedInputs: (preview.normalizedInputs ?? []).map((input) => ({
      ...input,
      label: input.originalLabel ?? input.label,
      normalizedValue:
        input.value ?? input.normalizedValue ?? input.originalValue ?? input.rawValue,
    })),
    candidates: (preview.costCenterCandidates ?? []).flatMap((candidate) => {
      if (!candidate.id || !candidate.vendorProductId) return []
      const vendorProductId = candidate.vendorProductId
      const product = products.get(vendorProductId)
      return [
        {
          ...candidate,
          vendorProductId,
          vendorCostCenterId: candidate.id,
          vendorProductName: product?.name ?? candidate.name ?? candidate.code,
          vendorName: product?.vendor?.name ?? candidate.vendorName,
          size: candidate.standardSize ?? candidate.vendorSize,
          color: candidate.standardColor ?? candidate.vendorColor,
        },
      ]
    }),
    autoMatch: preview.autoMatch ?? null,
    impactLabel: 'SAMPLED',
  }
}
