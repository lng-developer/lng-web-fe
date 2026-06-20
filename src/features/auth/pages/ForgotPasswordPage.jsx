import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace'
import { Alert, Box, Button, InputAdornment, Link, Stack, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import FormTextField from '@/components/form/FormTextField'
import { ROUTES } from '@/constants/routes'
import { forgotPasswordDefaultValues, forgotPasswordSchema } from '@/validations/authSchema'

import { useForgotPasswordMutation } from '../api/auth.mutations'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [sentEmail, setSentEmail] = useState('')
  const mutation = useForgotPasswordMutation()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: forgotPasswordDefaultValues,
  })

  const onSubmit = async (values) => {
    try {
      await mutation.mutateAsync(values)
      setSentEmail(values.email)
      enqueueSnackbar(t('auth.forgot.success'), { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(t(error.message || 'auth.errors.generic'), { variant: 'error' })
    }
  }

  return (
    <Box className="flex w-full max-w-sm flex-col gap-5 px-6">
      <Stack spacing={1}>
        <Typography variant="h1" component="h1">
          {t('auth.forgot.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.forgot.description')}
        </Typography>
      </Stack>

      {sentEmail ? (
        <Alert severity="success" variant="outlined">
          <Typography variant="body2" fontWeight={600}>
            {t('auth.forgot.sentTitle')}
          </Typography>
          <Typography variant="body2">
            {t('auth.forgot.sentDescription', { email: sentEmail })}
          </Typography>
        </Alert>
      ) : null}

      <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)}>
        <FormTextField
          name="email"
          control={control}
          label={t('auth.fields.email')}
          placeholder={t('auth.placeholders.email')}
          autoComplete="email"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting || mutation.isPending}
          fullWidth
        >
          {sentEmail ? t('auth.forgot.resend') : t('auth.forgot.submit')}
        </Button>

        <Link
          component={RouterLink}
          to={ROUTES.LOGIN}
          underline="none"
          className="inline-flex items-center justify-center gap-1 font-medium"
        >
          <KeyboardBackspaceIcon fontSize="small" />
          {t('auth.backToLogin')}
        </Link>
      </Stack>

      <Typography variant="body2" color="text.disabled" align="center">
        {t('auth.footer')}
      </Typography>
    </Box>
  )
}
