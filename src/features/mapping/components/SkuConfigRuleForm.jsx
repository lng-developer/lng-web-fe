import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function SkuConfigRuleForm({ control, editing, onPreviewChange, optionsBySource }) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'skuConfig' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      editing={editing}
      optionsBySource={optionsBySource}
      type="skuConfig"
    />
  )
}
