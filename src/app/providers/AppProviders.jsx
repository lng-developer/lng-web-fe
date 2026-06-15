import '@/i18n'

import { useEffect, useMemo } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SnackbarProvider } from 'notistack'

import { ErrorToast, InfoToast, SuccessToast, WarningToast } from '@/components/common/Toast'
import { HTML_CLASSES, SNACKBAR_VARIANTS, THEME_MODES } from '@/constants/app'
import { env } from '@/constants/env'
import { queryClient } from '@/lib/queryClient'
import { useUIStore } from '@/store/useUIStore'
import { createAppTheme } from '@/theme'

const SNACKBAR_COMPONENTS = {
  [SNACKBAR_VARIANTS.SUCCESS]: SuccessToast,
  [SNACKBAR_VARIANTS.ERROR]: ErrorToast,
  [SNACKBAR_VARIANTS.WARNING]: WarningToast,
  [SNACKBAR_VARIANTS.INFO]: InfoToast,
}

export default function AppProviders({ children }) {
  const themeMode = useUIStore((state) => state.themeMode)
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  useEffect(() => {
    document.documentElement.classList.toggle(HTML_CLASSES.DARK, themeMode === THEME_MODES.DARK)
  }, [themeMode])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={3000}
          Components={SNACKBAR_COMPONENTS}
        >
          {children}
        </SnackbarProvider>
      </ThemeProvider>
      {env.isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
