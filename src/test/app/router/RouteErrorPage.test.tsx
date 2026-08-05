import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { RouteErrorPage } from '@/app/router/RouteErrorPage'
import i18n from '@/shared/i18n/i18n'

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  revalidate: vi.fn(),
  error: Object.assign(new Error('Could not load finance data'), {
    name: 'ApiError',
    code: 'FINANCE_LOAD_FAILED',
    requestId: 'request-123',
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => router.navigate,
  useRevalidator: () => ({ revalidate: router.revalidate, state: 'idle' }),
  useRouteError: () => router.error,
}))

describe('RouteErrorPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
  })

  it('explains the failure and lets users retry or go back', () => {
    render(
      <AppProviders>
        <RouteErrorPage />
      </AppProviders>,
    )

    expect(screen.getByText('Could not load finance data')).toBeInTheDocument()
    expect(screen.getByText(/request-123/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(router.revalidate).toHaveBeenCalledOnce()
    expect(router.navigate).toHaveBeenCalledWith(-1)
  })
})
