import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'

import { ROUTES } from '@/constants/routes'

export default function ResetPasswordPage() {
  const { t } = useTranslation()

  return (
    <Box className="flex w-full max-w-sm flex-col gap-5 px-6">
      <Stack spacing={1}>
        <Typography variant="h1" component="h1">
          {t('auth.resetPassword.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('auth.resetPassword.description')}
        </Typography>
      </Stack>

      <Alert severity="warning" variant="outlined">
        {t('auth.resetPassword.unavailable')}
      </Alert>

      <Button
        component={RouterLink}
        to={ROUTES.LOGIN}
        variant="outlined"
        size="large"
        startIcon={<KeyboardBackspaceIcon fontSize="small" />}
        fullWidth
      >
        {t('auth.resetPassword.backLogin')}
      </Button>

      <Typography variant="body2" color="text.disabled" align="center">
        {t('auth.footer')}
      </Typography>
    </Box>
  )
}
