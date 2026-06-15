import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'

import LoginForm from '../components/LoginForm'

export default function LoginPage() {
  const { t } = useTranslation()

  return (
    <Box className="flex w-full max-w-sm flex-col gap-5 px-6">
      <Typography variant="h1" component="h1">
        {t('auth.login.title')}
      </Typography>
      <LoginForm />
      <Typography variant="body2" color="text.disabled" align="center">
        {t('auth.footer')}
      </Typography>
    </Box>
  )
}
