import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/shared/i18n/i18n'
import { AccessDeniedResult } from '@/shared/auth/AccessDeniedResult'

function TestHarness({ backPath = '/portal/dashboard' }: { backPath?: string }) {
  const location = useLocation()
  return (
    <div>
      <div data-testid="current-location">{location.pathname}</div>
      <AccessDeniedResult backPath={backPath} />
    </div>
  )
}

describe('AccessDeniedResult', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
  })

  afterEach(cleanup)

  it('renders gracefully without crashing when outside router context', () => {
    render(<AccessDeniedResult />)
    expect(screen.getByText('403')).toBeVisible()
    expect(screen.getByText(/Không có quyền truy cập|Access Denied/i)).toBeVisible()
  })

  it('navigates via router client-side when clicking back to dashboard inside Router', () => {
    render(
      <MemoryRouter initialEntries={['/portal/orders']}>
        <TestHarness backPath="/portal/dashboard" />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('current-location')).toHaveTextContent('/portal/orders')

    const dashboardBtn =
      screen.queryByTestId('access-denied-dashboard-btn') ??
      screen.getByRole('button', { name: /Về Dashboard|Back to Dashboard/i })
    fireEvent.click(dashboardBtn)

    expect(screen.getByTestId('current-location')).toHaveTextContent('/portal/dashboard')
  })
})
