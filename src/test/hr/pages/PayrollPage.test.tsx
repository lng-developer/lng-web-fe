import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

test('opens an older personal payslip by ID and labels its actual period', async () => {
  vi.mocked(listMyPayrolls).mockImplementation(async (params) => ({
    items: params?.resultId
      ? [
          {
            id: 'old-slip',
            payrollRunId: 'run-1',
            profileId: 'profile-1',
            inputSnapshot: { period: { month: 3, year: 2025 } },
            baseSalary: 100,
            workDays: 20,
            overtimePay: 0,
            grossIncome: 100,
            totalDeductions: 0,
            netIncome: 100,
            status: 'PAID',
          },
        ]
      : [],
    pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
  }))
  render(
    <MemoryRouter initialEntries={['/hr/me/payroll?resourceId=old-slip']}>
      <AppProviders>
        <PayrollPage />
      </AppProviders>
    </MemoryRouter>,
  )
  await waitFor(() =>
    expect(listMyPayrolls).toHaveBeenCalledWith({ resultId: 'old-slip', limit: 1 }),
  )
  expect(await screen.findByText('3/2025', { exact: false })).toBeVisible()
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
    <MemoryRouter>
      <AppProviders>
        <PayrollPage />
      </AppProviders>
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'My payslips' })).toBeVisible()
})
