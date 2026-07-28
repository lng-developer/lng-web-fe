import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import MailOutlinedIcon from '@mui/icons-material/MailOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Button, IconButton, InputAdornment, Link, Stack } from '@mui/material'
import { useSnackbar } from 'notistack'

import FormTextField from '@/components/form/FormTextField'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { loginDefaultValues, loginSchema } from '@/validations/loginSchema'

import { useLoginMutation } from '../api/auth.mutations'

export default function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { enqueueSnackbar } = useSnackbar()
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLoginMutation()
  const redirectTo = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search ?? ''}`
    : ROUTES.HOME
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
  })

  const onSubmit = async (values) => {
    try {
      await loginMutation.mutateAsync(values)
      enqueueSnackbar(t('auth.login.success'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      enqueueSnackbar(t(error.message || 'errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5} className="w-full">
      <FormTextField
        name="identifier"
        control={control}
        label={t('auth.login.identifier')}
        placeholder={t('auth.login.identifierPlaceholder')}
        autoComplete="username"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />
      <FormTextField
        name="password"
        control={control}
        label={t('auth.login.password')}
        placeholder={t('auth.login.passwordPlaceholder')}
        type={showPassword ? 'text' : 'password'}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')
                  }
                >
                  {showPassword ? (
                    <VisibilityOffOutlinedIcon fontSize="small" />
                  ) : (
                    <VisibilityOutlinedIcon fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <Link
        component={RouterLink}
        to={ROUTES.FORGOT_PASSWORD}
        variant="body2"
        color="primary"
        underline="none"
        className="self-end font-medium"
      >
        {t('auth.login.forgotPassword')}
      </Link>
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={loginMutation.isPending}
      >
        {t('auth.login.submit')}
      </Button>
    </Stack>
  )
}
