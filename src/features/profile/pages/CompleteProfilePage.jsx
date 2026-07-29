import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Box, Paper, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import Loader from '@/components/common/Loader'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { getOriginalDestinationPath, ROUTES } from '@/constants/routes'

import { useCompleteMyProfileMutation } from '../api/profile.mutations'
import { useMyEmployeeProfileQuery } from '../api/profile.queries'
import PersonalProfileForm from '../components/PersonalProfileForm'

export default function CompleteProfilePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const profileQuery = useMyEmployeeProfileQuery()
  const completionMutation = useCompleteMyProfileMutation()

  const submitProfile = async (payload) => {
    try {
      await completionMutation.mutateAsync(payload)
      enqueueSnackbar(t('profile.messages.completed'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      navigate(getOriginalDestinationPath(location) ?? ROUTES.HOME, { replace: true })
    } catch (error) {
      enqueueSnackbar(t(error.message || 'errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  if (profileQuery.isPending) return <Loader />

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Box className="w-full max-w-3xl px-6">
        <Alert severity="error">{t('profile.messages.loadError')}</Alert>
      </Box>
    )
  }

  return (
    <Box className="w-full max-w-4xl px-6 py-10">
      <Paper elevation={0} className="border border-default bg-surface p-6 md:p-8">
        <Typography variant="h4" className="font-semibold">
          {t('profile.completion.title')}
        </Typography>
        <Typography color="text.secondary" className="mt-2">
          {t('profile.completion.description')}
        </Typography>
        <Box className="mt-8">
          <PersonalProfileForm
            profile={profileQuery.data}
            isPending={completionMutation.isPending}
            onSubmit={submitProfile}
            submitLabel={t('profile.completion.submit')}
          />
        </Box>
      </Paper>
    </Box>
  )
}
