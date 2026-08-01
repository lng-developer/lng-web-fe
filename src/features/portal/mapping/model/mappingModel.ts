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
  candidates: VendorCandidate[]
  autoMatch: VendorCandidate | null
  impactLabel: 'SAMPLED'
}

export const getRuleTypeForStage = (stage: MappingPipelineStage) => ruleTypes[stage]
export const getStageForFixType = (fixType?: string) =>
  fixType ? recommendationStages[fixType] : undefined

export function toMappingTraceView(preview: MappingPreview): MappingTraceView {
  return {
    ready: preview.ready,
    originalSku: preview.skuNormalization?.originalSku ?? '—',
    canonicalSku: preview.skuNormalization?.canonicalSku ?? '—',
    configCode: preview.skuMapping?.configCode ?? '—',
    blockingReasons: preview.blockingReasons ?? [],
    normalizedInputs: preview.normalizedInputs ?? [],
    candidates: preview.costCenterCandidates ?? preview.vendorProductCandidates ?? [],
    autoMatch: preview.autoMatch ?? null,
    impactLabel: 'SAMPLED',
  }
}
