import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function SkuConfigRuleForm({ control, onPreviewChange, optionsBySource }) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'skuConfig' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      optionsBySource={optionsBySource}
      type="skuConfig"
    />
  )
}
