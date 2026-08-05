import { useTranslation } from 'react-i18next'
import { Badge, Button } from 'antd'

import { type MappingPipelineStage, PIPELINE_STAGES } from '../model/mappingModel'

const labelKeys: Record<MappingPipelineStage, string> = {
  SKU_CLEANUP: 'mapping.pipeline.skuCleanup',
  PRODUCT_MAPPING: 'mapping.pipeline.productMapping',
  INPUT_SEMANTICS: 'mapping.pipeline.inputSemantics',
  VALUE_ALIASES: 'mapping.pipeline.valueAliases',
  VENDOR_ROUTING: 'mapping.pipeline.vendorRouting',
}

export function MappingPipelineNav({
  activeStage,
  counts = {},
  compact = false,
  onChange,
}: {
  readonly activeStage: MappingPipelineStage
  readonly counts?: Partial<Record<MappingPipelineStage, number>>
  readonly compact?: boolean
  readonly onChange: (stage: MappingPipelineStage) => void
}) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('mapping.title')}
      className={compact ? 'grid grid-cols-5 gap-1' : 'flex flex-col gap-1'}
    >
      {PIPELINE_STAGES.map((stage, index) => (
        <Button
          block
          key={stage}
          type={activeStage === stage ? 'primary' : 'text'}
          aria-current={activeStage === stage ? 'step' : undefined}
          className={`!flex !h-auto !px-3 !py-3 ${compact ? '!justify-center !text-center' : '!justify-between !text-left'}`}
          onClick={() => onChange(stage)}
        >
          <span>
            {index + 1}. {t(labelKeys[stage])}
          </span>
          {counts[stage] ? <Badge count={counts[stage]} color="blue" /> : null}
        </Button>
      ))}
    </nav>
  )
}
