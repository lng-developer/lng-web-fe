import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Alert, Box, Button, InputAdornment, Link, Stack, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import FormTextField from '@/components/form/FormTextField'
import { ROUTES } from '@/constants/routes'
import { resetPasswordDefaultValues, resetPasswordSchema } from '@/validations/authSchema'

import { useResetPasswordMutation } from '../api/auth.mutations'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token') ?? ''
  const mutation = useResetPasswordMutation()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: resetPasswordDefaultValues,
  })

  const onSubmit = async (values) => {
    try {
      await mutation.mutateAsync({
        token: resetToken,
        password: values.password,
      })
      enqueueSnackbar(t('auth.reset.success'), { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(t(error.message || 'auth.errors.generic'), { variant: 'error' })
    }
  }

  return (
    <Box className="flex w-full max-w-sm flex-col gap-5 px-6">
      <Stack spacing={1}>
        <Typography variant="h1" component="h1">
          {t('auth.reset.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.reset.description')}
        </Typography>
      </Stack>

      {!resetToken ? (
        <Alert severity="warning" variant="outlined">
          {t('auth.reset.missingToken')}
        </Alert>
      ) : null}

      <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)}>
        <FormTextField
          name="password"
          control={control}
          type="password"
          label={t('auth.fields.password')}
          placeholder={t('auth.placeholders.password')}
          autoComplete="new-password"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormTextField
          name="confirmPassword"
          control={control}
          type="password"
          label={t('auth.fields.confirmPassword')}
          placeholder={t('auth.placeholders.confirmPassword')}
          autoComplete="new-password"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!resetToken || isSubmitting || mutation.isPending}
          fullWidth
        >
          {t('auth.reset.submit')}
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
