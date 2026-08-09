import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'

import i18n from '@/shared/i18n/i18n'
import { GlobalMutationToastProvider } from '@/shared/query/GlobalMutationToastProvider'
import { queryClient } from '@/shared/query/queryClient'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            <GlobalMutationToastProvider />
            {children}
          </QueryClientProvider>
        </AntdApp>
      </ThemeProvider>
    </I18nextProvider>
  )
}
