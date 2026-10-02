import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

export function renderWithTestProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return {
    queryClient,
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </MemoryRouter>,
    ),
  }
}
