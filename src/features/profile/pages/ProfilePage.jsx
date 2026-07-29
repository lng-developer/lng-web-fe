import { useTranslation } from 'react-i18next'
import { Alert, Avatar, Box, Card, CardContent, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import Loader from '@/components/common/Loader'
import { SNACKBAR_VARIANTS } from '@/constants/app'

import { useCompleteMyProfileMutation } from '../api/profile.mutations'
import { useMyEmployeeProfileQuery } from '../api/profile.queries'
import PersonalProfileForm from '../components/PersonalProfileForm'

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const profileQuery = useMyEmployeeProfileQuery()
  const updateMutation = useCompleteMyProfileMutation()
  const profile = profileQuery.data

  const submitProfile = async (payload) => {
    try {
      await updateMutation.mutateAsync(payload)
      enqueueSnackbar(t('profile.messages.updated'), { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      enqueueSnackbar(t(error.message || 'errors.api.network'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  if (profileQuery.isPending) return <Loader />

  if (profileQuery.isError || !profile) {
    return <Alert severity="error">{t('profile.messages.loadError')}</Alert>
  }

  return (
    <Box className="flex max-w-6xl flex-col gap-6">
      <Box>
        <Typography variant="h4" component="h1" className="font-semibold">
          {t('profile.title')}
        </Typography>
        <Typography color="text.secondary" className="mt-1">
          {t('profile.description')}
        </Typography>
      </Box>
      <Card elevation={0} className="border border-default bg-surface">
        <CardContent className="flex items-center gap-4">
          <Avatar src={profile.avatarUrl} className="!h-14 !w-14 !bg-primary-light !text-primary">
            {initials(profile.fullName)}
          </Avatar>
          <Box>
            <Typography variant="h6" className="font-semibold">
              {profile.fullName || profile.employeeCode}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.workEmail || '—'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Card elevation={0} className="border border-default bg-surface">
        <CardContent className="p-6">
          <Typography variant="subtitle1" className="font-semibold">
            {t('profile.selfCard.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            {t('profile.selfCard.description')}
          </Typography>
          <Box className="mt-6">
            <PersonalProfileForm
              profile={profile}
              isPending={updateMutation.isPending}
              onSubmit={submitProfile}
              submitLabel={t('profile.actions.update')}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
