import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { PayslipStatement } from '@/features/hr/pages/PayslipStatement'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/shared/ui', () => ({
  EmployeeAvatar: ({ name, avatarUrl }: { name: string; avatarUrl?: string }) => (
    <span data-testid="employee-avatar" data-avatar-url={avatarUrl}>
      {name}
    </span>
  ),
  StatusTag: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

afterEach(cleanup)

test('renders the approved employee, income, deduction, and totals sections', () => {
  render(
    <PayslipStatement
      result={{
        id: 'result-1',
        payrollRunId: 'run-1',
        profileId: 'profile-1',
        status: 'PAID',
        company: { name: 'LNG Group', address: 'Da Nang', taxCode: '0401', currency: 'VND' },
        employee: {
          fullName: 'Nguyen An',
          employeeCode: 'E001',
          jobTitle: 'Designer',
          departmentName: 'Design',
          teamName: 'Creative',
          employmentType: 'FULL_TIME',
          startDate: '2025-01-02',
          avatarUrl: '/avatar',
        },
        baseSalary: 20_000_000,
        workDays: 22,
        salaryFromWork: 20_000_000,
        overtimePay: 1_000_000,
        overtimeBreakdown: [{ rateClass: 'weekday', approvedMinutes: 120, amount: 1_000_000 }],
        totalAllowances: 500_000,
        allowanceBreakdown: { lunch: 500_000 },
        adjustmentEarnings: 200_000,
        grossIncome: 21_700_000,
        insurance: { social: 1_600_000, health: 300_000, unemployment: 200_000, total: 2_100_000 },
        personalIncomeTax: 400_000,
        adjustmentDeductions: 100_000,
        totalDeductions: 2_600_000,
        netIncome: 19_100_000,
      }}
      periodLabel="08/2026"
      formatMoney={(value) => `${value}`}
    />,
  )

  expect(screen.getByText('LNG Group')).toBeInTheDocument()
  expect(screen.getByTestId('employee-avatar')).toHaveAttribute('data-avatar-url', '/avatar')
  expect(screen.getByTestId('payslip-employee')).toHaveTextContent('Nguyen An')
  expect(screen.getByTestId('payslip-employee')).toHaveTextContent('Design')
  expect(screen.getByTestId('payslip-income')).toHaveTextContent('hrOperations.payroll.gross')
  expect(screen.getByTestId('payslip-income')).toHaveTextContent(
    'hrOperations.payroll.otRate.weekday',
  )
  expect(screen.getByTestId('payslip-income')).toHaveTextContent('1000000')
  expect(screen.getByTestId('payslip-deductions')).toHaveTextContent(
    'hrOperations.payroll.insurance.social',
  )
  expect(screen.getByTestId('payslip-deductions')).toHaveTextContent('2600000')
  expect(screen.getByTestId('payslip-net')).toHaveTextContent('19100000 VND')
})

test('renders missing optional metadata as an em dash and keeps real zeros visible', () => {
  render(
    <PayslipStatement
      result={{
        id: 'result-2',
        payrollRunId: 'run-1',
        profileId: 'profile-2',
        status: 'FINALIZED',
        company: { name: 'LNG Group', currency: 'VND' },
        employee: { fullName: 'Tran Binh', employeeCode: 'E002' },
        baseSalary: 0,
        workDays: 0,
        salaryFromWork: 0,
        grossIncome: 0,
        insurance: { social: 0, health: 0, unemployment: 0, total: 0 },
        totalDeductions: 0,
        netIncome: 0,
      }}
      periodLabel="08/2026"
      formatMoney={(value) => `${value}`}
    />,
  )

  expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  expect(screen.getByTestId('payslip-deductions')).toHaveTextContent('0')
  expect(screen.getByTestId('payslip-net')).toHaveTextContent('0 VND')
})
