import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function SemanticRuleForm({ control, editing, onPreviewChange, optionsBySource }) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'semanticRules' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      editing={editing}
      optionsBySource={optionsBySource}
      type="semanticRules"
    />
  )
}
