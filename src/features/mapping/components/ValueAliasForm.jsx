import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function ValueAliasForm({ control, editing, onPreviewChange, optionsBySource }) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'valueAliases' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      editing={editing}
      optionsBySource={optionsBySource}
      type="valueAliases"
    />
  )
}
