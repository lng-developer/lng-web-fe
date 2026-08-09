import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { PayrollEmployeeCell } from '@/features/hr/pages/PayrollPage'

vi.mock('@/shared/ui', () => ({
  EmployeeAvatar: ({ name, avatarUrl }: { name?: string; avatarUrl?: string }) => (
    <span data-testid="payroll-avatar" data-avatar-url={avatarUrl}>
      {name}
    </span>
  ),
}))

afterEach(cleanup)

test('renders employee avatar, name, and code in the HR payroll table cell', () => {
  render(
    <PayrollEmployeeCell
      employee={{ fullName: 'Nguyen An', employeeCode: 'E001', avatarUrl: '/avatar' }}
      fallbackLabel="Me"
    />,
  )

  expect(screen.getByTestId('payroll-avatar')).toHaveAttribute('data-avatar-url', '/avatar')
  expect(screen.getAllByText('Nguyen An')).toHaveLength(2)
  expect(screen.getByText('E001')).toBeInTheDocument()
})
