import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Stack } from '@mui/material'
import { useSnackbar } from 'notistack'

import FormTextField from '@/components/form/FormTextField'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  getOriginalDestination,
  getOriginalDestinationPath,
  resolveSetupRoute,
  ROUTES,
} from '@/constants/routes'
import { useAuthStore } from '@/store/useAuthStore'
import {
  changeInitialPasswordDefaultValues,
  changeInitialPasswordSchema,
} from '@/validations/authSchema'

import { useChangeOwnPasswordMutation } from '../api/auth.mutations'

export default function ChangeInitialPasswordForm() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const changePasswordMutation = useChangeOwnPasswordMutation()
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(changeInitialPasswordSchema),
    defaultValues: changeInitialPasswordDefaultValues,
  })

  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      const account = await changePasswordMutation.mutateAsync({ currentPassword, newPassword })
      enqueueSnackbar(t('auth.changeInitialPassword.success'), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      const setupRoute = resolveSetupRoute({
        mustChangePassword: account.mustChangePassword,
        profileSetupRequired: currentUser?.profileSetupRequired,
      })
      navigate(setupRoute ?? getOriginalDestinationPath(location) ?? ROUTES.HOME, {
        replace: true,
        state: { from: getOriginalDestination(location) },
      })
    } catch (error) {
      enqueueSnackbar(t(error.message || 'errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5} className="w-full">
      <FormTextField
        name="currentPassword"
        control={control}
        label={t('auth.changeInitialPassword.currentPassword')}
        type="password"
        autoComplete="current-password"
      />
      <FormTextField
        name="newPassword"
        control={control}
        label={t('auth.changeInitialPassword.newPassword')}
        type="password"
        autoComplete="new-password"
      />
      <FormTextField
        name="confirmPassword"
        control={control}
        label={t('auth.fields.confirmPassword')}
        type="password"
        autoComplete="new-password"
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={changePasswordMutation.isPending}
      >
        {t('auth.changeInitialPassword.submit')}
      </Button>
    </Stack>
  )
}
