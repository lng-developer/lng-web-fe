import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'

import ChangeInitialPasswordForm from '../components/ChangeInitialPasswordForm'

export default function ChangeInitialPasswordPage() {
  const { t } = useTranslation()

  return (
    <Box className="flex w-full max-w-sm flex-col gap-5 px-6">
      <Box>
        <Typography variant="h4" className="font-semibold">
          {t('auth.changeInitialPassword.title')}
        </Typography>
        <Typography color="text.secondary" className="mt-2">
          {t('auth.changeInitialPassword.description')}
        </Typography>
      </Box>
      <ChangeInitialPasswordForm />
    </Box>
  )
}
