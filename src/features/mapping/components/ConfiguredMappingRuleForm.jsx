import { useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Box, MenuItem, Typography } from '@mui/material'

import FormTextField from '@/components/form/FormTextField'

import { MAPPING_RULE_FORM_CONFIG, STATIC_OPTIONS } from '../data/mappingUxConfig'

function fieldText(t, type, field, key) {
  return t(`mapping.fields.${type}.${field.payloadKey}.${key}`, {
    defaultValue: field[key],
  })
}

function optionLabel(t, option) {
  return t(`mapping.options.${option.value}`, { defaultValue: option.label })
}

export default function ConfiguredMappingRuleForm({ control, optionsBySource = {}, type }) {
  const { t } = useTranslation()
  const config = MAPPING_RULE_FORM_CONFIG[type]
  const fields = config?.fields || []
  const outputAction = useWatch({ control, name: 'outputAction' })
  const renderField = (field) => {
    const options = field.optionsKey
      ? STATIC_OPTIONS[field.optionsKey] || []
      : optionsBySource[field.optionSource] || []
    const select = field.type === 'select'

    return (
      <FormTextField
        key={field.payloadKey}
        control={control}
        helperText={fieldText(t, type, field, 'helperText')}
        label={fieldText(t, type, field, 'label')}
        name={field.payloadKey}
        required={Boolean(field.required)}
        select={select}
        size="small"
        type={field.type === 'number' ? 'number' : 'text'}
        slotProps={field.type === 'number' ? { htmlInput: { min: 0, step: 1 } } : undefined}
      >
        {select
          ? [
              <MenuItem key="empty" value="">
                {field.required
                  ? t('mapping.options.selectOption')
                  : t('mapping.options.allNotSet')}
              </MenuItem>,
              ...options.map((option) => {
                const value = option.value ?? option.id
                return (
                  <MenuItem key={value} value={value}>
                    {option.value ? optionLabel(t, option) : option.label}
                  </MenuItem>
                )
              }),
            ]
          : null}
      </FormTextField>
    )
  }
  const visibleFields = fields.filter(
    (field) => field.payloadKey !== 'replacementValue' || outputAction === 'REPLACE_SEGMENT',
  )
  const mainFields = visibleFields.filter(
    (field) => !field.advanced || field.payloadKey === 'replacementValue',
  )
  const advancedFields = visibleFields.filter(
    (field) => field.advanced && field.payloadKey !== 'replacementValue',
  )

  return (
    <Box className="grid gap-4">
      <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">{mainFields.map(renderField)}</Box>
      {advancedFields.length ? (
        <Box component="details" className="rounded-lg border border-default p-4">
          <Typography component="summary" variant="subtitle2" className="cursor-pointer">
            {t('mapping.ruleDialog.advanced')}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-2">
            {t('mapping.ruleDialog.advancedDescription')}
          </Typography>
          <Box className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {advancedFields.map(renderField)}
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}
