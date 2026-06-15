import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'

import { ROUTES } from '@/constants/routes'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()

  return (
    <Box className="flex w-full max-w-sm flex-col gap-5 px-6">
      <Typography variant="h1" component="h1">
        {t('auth.forgotPassword.title')}
      </Typography>
      <Typography color="text.secondary">{t('auth.forgotPassword.description')}</Typography>
      <Button component={RouterLink} to={ROUTES.LOGIN} variant="contained" fullWidth>
        {t('auth.forgotPassword.backLogin')}
      </Button>
    </Box>
  )
}
