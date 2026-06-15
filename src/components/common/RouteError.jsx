import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button, Stack, Typography } from '@mui/material'

import { ROUTES } from '@/constants/routes'

function getErrorMessage(error, t) {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? t('errors.notFound.description')
      : error.statusText || t('errors.route.description')
  }

  if (error instanceof Error) {
    return error.message
  }

  return t('errors.route.description')
}

export default function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()

  return (
    <Stack spacing={2} alignItems="flex-start">
      <Typography variant="h4" component="h1">
        {t('errors.route.title')}
      </Typography>
      <Typography color="text.secondary">{getErrorMessage(error, t)}</Typography>
      <Button component={Link} to={ROUTES.HOME} variant="contained">
        {t('errors.backHome')}
      </Button>
    </Stack>
  )
}
