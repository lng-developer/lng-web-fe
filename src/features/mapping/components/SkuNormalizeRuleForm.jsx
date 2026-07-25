import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function SkuNormalizeRuleForm({ control, onPreviewChange, optionsBySource }) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'skuNormalize' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      optionsBySource={optionsBySource}
      type="skuNormalize"
    />
  )
}
