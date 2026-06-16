import { useId } from 'react'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Box, TextField, Typography } from '@mui/material'

// Field dùng chung cho form react-hook-form + MUI. Message lỗi từ zod schema
// được khai báo dưới dạng i18n key (xem @/validations/feedbackSchema.js)
// và được dịch ở đây bằng useTranslation().
export default function FormTextField({ name, control, label, ...textFieldProps }) {
  const { t } = useTranslation()
  const generatedId = useId()
  const fieldId = textFieldProps.id ?? `${name}-${generatedId}`

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Box>
          {label && (
            <Typography
              component="label"
              htmlFor={fieldId}
              variant="caption"
              color="text.secondary"
              className="mb-[3px] block"
            >
              {label}
            </Typography>
          )}
          <TextField
            {...field}
            {...textFieldProps}
            id={fieldId}
            fullWidth
            error={!!fieldState.error}
            helperText={fieldState.error ? t(fieldState.error.message) : textFieldProps.helperText}
            slotProps={{
              ...textFieldProps.slotProps,
              htmlInput: {
                'aria-label': label,
                ...textFieldProps.slotProps?.htmlInput,
              },
            }}
          />
        </Box>
      )}
    />
  )
}
