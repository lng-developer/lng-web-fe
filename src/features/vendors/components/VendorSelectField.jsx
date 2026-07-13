import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormControl, FormHelperText, Select, Typography } from '@mui/material'

export default function VendorSelectField({
  children,
  control,
  disabled = false,
  label,
  name,
  placeholder,
}) {
  const { t } = useTranslation()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div>
          <Typography variant="caption" className="mb-1 block font-medium text-ink-secondary">
            {label}
          </Typography>
          <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
            <Select
              {...field}
              disabled={disabled}
              displayEmpty
              className="h-10 rounded-lg bg-surface text-sm"
              renderValue={(value) => value || placeholder}
            >
              {children}
            </Select>
            {fieldState.error ? (
              <FormHelperText>{t(fieldState.error.message)}</FormHelperText>
            ) : null}
          </FormControl>
        </div>
      )}
    />
  )
}
