import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function SemanticRuleForm({ control, onPreviewChange, optionsBySource }) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'semanticRules' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      optionsBySource={optionsBySource}
      type="semanticRules"
    />
  )
}
