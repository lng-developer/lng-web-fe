import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined'
import MailOutlineIcon from '@mui/icons-material/MailOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'

import { ROUTES } from '@/constants/routes'

const ADMIN_MAILTO = 'mailto:admin@example.com?subject=Yeu%20cau%20cap%20quyen'

export default function UnauthorizedPage() {
  const { t } = useTranslation()

  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        bgcolor: 'background.default',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        px: 2,
      }}
    >
      <Stack
        // alignItems="center"
        className="flex justify-center items-center"
        spacing={2.5}
        sx={{ maxWidth: 390, width: '100%' }}
      >
        <Box
          sx={(theme) => ({
            bgcolor: theme.palette.primary.light,
            borderRadius: theme.shape.borderRadiusPill,
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 78,
            width: 78,
          })}
        >
          <GppMaybeOutlinedIcon sx={{ fontSize: 48 }} />
        </Box>

        <Typography variant="h1" component="h1" textAlign="center">
          {t('errors.unauthorized.title')}
        </Typography>

        <Box
          sx={(theme) => ({
            bgcolor: theme.palette.primary.light,
            borderLeft: `3px solid ${theme.palette.primary.main}`,
            borderTopLeftRadius: theme.shape.borderRadius,
            borderBottomLeftRadius: theme.shape.borderRadius,
            px: 1.5,
            py: 2,
            width: '100%',
          })}
        >
          <Stack alignItems="center" direction="row" spacing={1} sx={{ mb: 1.25 }}>
            <Typography variant="caption" color="text.secondary">
              {t('errors.unauthorized.currentRole')}
            </Typography>
            <Chip
              label={t('errors.unauthorized.roleManager')}
              size="small"
              sx={(theme) => ({
                bgcolor: theme.palette.secondary.light,
                color: theme.palette.secondary.main,
                fontWeight: 600,
                height: 20,
              })}
            />
          </Stack>
          <Button
            component="a"
            href={ADMIN_MAILTO}
            variant="outlined"
            size="small"
            startIcon={<SendOutlinedIcon fontSize="small" />}
            sx={{ bgcolor: 'background.paper' }}
          >
            {t('errors.unauthorized.requestAccess')}
          </Button>
        </Box>

        <Stack direction="row" spacing={1.25}>
          <Button
            component="a"
            href={ADMIN_MAILTO}
            variant="outlined"
            size="medium"
            startIcon={<MailOutlineIcon fontSize="small" />}
            sx={{ bgcolor: 'background.paper', color: 'text.primary' }}
          >
            {t('errors.unauthorized.contactAdmin')}
          </Button>
          <Button component={RouterLink} to={ROUTES.HOME} variant="contained" size="medium">
            {t('errors.unauthorized.backHome')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
