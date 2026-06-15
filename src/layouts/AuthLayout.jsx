import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { Box, IconButton, Typography } from '@mui/material'

import logoLng from '@/assets/images/logo-lng.png'
import Loader from '@/components/common/Loader'
import { THEME_MODES } from '@/constants/app'
import { useUIStore } from '@/store/useUIStore'

export default function AuthLayout() {
  const { t } = useTranslation()
  const themeMode = useUIStore((state) => state.themeMode)
  const setThemeMode = useUIStore((state) => state.setThemeMode)

  return (
    <Box className="flex min-h-screen">
      <Box
        component="aside"
        className="relative hidden w-96 shrink-0 flex-col items-center justify-center gap-6 bg-surface md:flex lg:w-[36rem]"
      >
        <img src={logoLng} alt={t('app.name')} className="h-auto w-80 object-contain lg:w-96" />
        <Typography variant="body1" color="text.secondary">
          {t('auth.tagline')}
        </Typography>
        <Box className="absolute top-10 left-10 h-1 w-16 rounded-full bg-primary" />
        <Box className="absolute right-10 bottom-10 h-16 w-1 rounded-full bg-primary" />
      </Box>

      <Box className="relative flex flex-1 flex-col items-center justify-center bg-page">
        <Box className="absolute top-6 right-6 flex items-center gap-1 rounded-full bg-surface p-1 shadow-sm">
          <IconButton
            size="small"
            onClick={() => setThemeMode(THEME_MODES.LIGHT)}
            aria-label={t('theme.light')}
            className={themeMode === THEME_MODES.LIGHT ? 'bg-primary-light' : ''}
            sx={{ color: themeMode === THEME_MODES.LIGHT ? 'primary.main' : 'text.secondary' }}
          >
            <LightModeIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setThemeMode(THEME_MODES.DARK)}
            aria-label={t('theme.dark')}
            className={themeMode === THEME_MODES.DARK ? 'bg-primary-light' : ''}
            sx={{ color: themeMode === THEME_MODES.DARK ? 'primary.main' : 'text.secondary' }}
          >
            <DarkModeIcon fontSize="small" />
          </IconButton>
        </Box>

        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  )
}
