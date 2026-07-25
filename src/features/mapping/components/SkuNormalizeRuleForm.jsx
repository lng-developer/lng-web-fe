import { useMappingRulePreviewChange } from '../hooks/useMappingRuleForm'
import ConfiguredMappingRuleForm from './ConfiguredMappingRuleForm'

export default function SkuNormalizeRuleForm({
  control,
  editing,
  onPreviewChange,
  optionsBySource,
}) {
  useMappingRulePreviewChange({ control, onPreviewChange, type: 'skuNormalize' })

  return (
    <ConfiguredMappingRuleForm
      control={control}
      editing={editing}
      optionsBySource={optionsBySource}
      type="skuNormalize"
    />
  )
}
