import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function ValueAliasForm({ control, onPreviewChange, optionsBySource }) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'valueAliases' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      optionsBySource={optionsBySource}
      type="valueAliases"
    />
  )
}
