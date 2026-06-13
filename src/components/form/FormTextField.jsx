import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { TextField } from '@mui/material'

// Field dùng chung cho form react-hook-form + MUI. Message lỗi từ zod schema
// được khai báo dưới dạng i18n key (xem @/validations/feedbackSchema.js)
// và được dịch ở đây bằng useTranslation().
export default function FormTextField({ name, control, label, ...textFieldProps }) {
  const { t } = useTranslation()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...textFieldProps}
          label={label}
          fullWidth
          error={!!fieldState.error}
          helperText={fieldState.error ? t(fieldState.error.message) : ' '}
        />
      )}
    />
  )
}
