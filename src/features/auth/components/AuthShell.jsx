import { useTranslation } from 'react-i18next'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'

import logoLng from '@/assets/images/logo-lng.png'
import { THEME_MODES } from '@/constants/app'
import { useUIStore } from '@/store/useUIStore'

export default function AuthShell({ children }) {
  const { t } = useTranslation()
  const themeMode = useUIStore((state) => state.themeMode)
  const toggleThemeMode = useUIStore((state) => state.toggleThemeMode)

  return (
    <Box className="min-h-screen bg-page p-4 text-ink md:p-8">
      <Paper
        elevation={0}
        className="relative grid min-h-[calc(100vh-4rem)] overflow-hidden border border-border bg-surface md:grid-cols-[minmax(18rem,25rem)_1fr]"
        sx={{ borderRadius: 0 }}
      >
        <Box className="relative hidden bg-surface md:flex md:flex-col md:items-center md:justify-center">
          <Box className="absolute left-7 top-7 h-1 w-12 rounded-full bg-primary" />
          <Stack spacing={6} alignItems="center">
            <Box component="img" src={logoLng} alt={t('auth.brandAlt')} className="h-auto w-52" />
            <Typography variant="body2" color="text.secondary">
              {t('auth.tagline')}
            </Typography>
          </Stack>
          <Box className="absolute bottom-7 right-7 h-12 w-1 rounded-full bg-primary" />
        </Box>

        <Box className="relative flex min-h-[calc(100vh-6rem)] flex-col bg-page px-4 py-6 md:min-h-0 md:px-10">
          <Tooltip title={t('theme.toggleMode')}>
            <IconButton
              className="absolute right-4 top-4 bg-surface"
              onClick={toggleThemeMode}
              aria-label={t('theme.toggleMode')}
              size="small"
              sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                color: 'primary.main',
              }}
            >
              {themeMode === THEME_MODES.DARK ? (
                <LightModeIcon fontSize="small" />
              ) : (
                <DarkModeIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Box className="flex flex-1 items-center justify-center">
            <Box className="w-full max-w-sm">{children}</Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
