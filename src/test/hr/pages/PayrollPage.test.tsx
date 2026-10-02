import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getPayrollSettings,
  listMyPayrolls,
  listPayrollAdjustments,
  listPayrollResults,
  listPayrolls,
} from '@/features/hr/api/hrTimeApi'
import { PayrollEmployeeCell, PayrollPage } from '@/features/hr/pages/PayrollPage'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/shared/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  EmployeeAvatar: ({ name, avatarUrl }: { name?: string; avatarUrl?: string }) => (
    <span data-testid="payroll-avatar" data-avatar-url={avatarUrl}>
      {name}
    </span>
  ),
}))

vi.mock('@/features/hr/api/hrTimeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/hr/api/hrTimeApi')>()),
  getPayrollSettings: vi.fn(),
  listMyPayrolls: vi.fn(),
  listPayrollAdjustments: vi.fn(),
  listPayrollResults: vi.fn(),
  listPayrolls: vi.fn(),
}))

beforeEach(async () => {
  queryClient.clear()
  setPermissions(['HR_PAYROLL:READ'])
  await i18n.changeLanguage('en')

  const page = { items: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 0 } }
  vi.mocked(listMyPayrolls).mockResolvedValue(page)
  vi.mocked(listPayrollResults).mockResolvedValue(page)
  vi.mocked(listPayrolls).mockResolvedValue(page)
  vi.mocked(listPayrollAdjustments).mockResolvedValue(page)
  vi.mocked(getPayrollSettings).mockResolvedValue({
    adjustmentTypes: [],
    adjustmentCodes: [],
    version: 1,
  })
})

afterEach(() => {
  cleanup()
  setPermissions([])
})

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

test('keeps Personal payroll on the employee payslip even with payroll read permission', async () => {
  render(
    <AppProviders>
      <PayrollPage />
    </AppProviders>,
  )

  expect(await screen.findByRole('heading', { name: 'My payslips' })).toBeVisible()
})
