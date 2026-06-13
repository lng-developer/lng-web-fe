import '@/lib/i18n'

import { useEffect, useMemo } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SnackbarProvider } from 'notistack'

import { ErrorToast, InfoToast, SuccessToast, WarningToast } from '@/components/common/Toast'
import { env } from '@/constants/env'
import { queryClient } from '@/lib/queryClient'
import { createAppTheme } from '@/lib/theme'
import { useUIStore } from '@/store/useUIStore'

const SNACKBAR_COMPONENTS = {
  success: SuccessToast,
  error: ErrorToast,
  warning: WarningToast,
  info: InfoToast,
}

export default function AppProviders({ children }) {
  const themeMode = useUIStore((state) => state.themeMode)
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark')
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
