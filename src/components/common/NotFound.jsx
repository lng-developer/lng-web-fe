import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Stack, Typography } from '@mui/material'

import { ROUTES } from '@/constants/routes'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <Stack spacing={2} alignItems="flex-start">
      <Typography variant="h4" component="h1">
        {t('errors.notFound.title')}
      </Typography>
      <Typography color="text.secondary">{t('errors.notFound.description')}</Typography>
      <Button component={Link} to={ROUTES.HOME} variant="contained">
        {t('errors.backHome')}
      </Button>
    </Stack>
  )
}
