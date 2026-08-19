import { useTranslation } from 'react-i18next'

import { EmployeeAvatar, StatusTag } from '@/shared/ui'

import type { PayrollResult } from '../api/hrTimeApi'
import styles from './PayslipStatement.module.scss'

type Props = {
  result: PayrollResult
  periodLabel: string
  formatMoney: (value: number) => string
}

export function PayslipStatement({ result, periodLabel, formatMoney }: Props) {
  const { t } = useTranslation()
  const employee = result.employee
  const company = result.company
  const currency = company?.currency || '—'
  const insurance = result.insurance || { social: 0, health: 0, unemployment: 0, total: 0 }
  const value = (input?: null | number | string) =>
    input === null || input === undefined || input === '' ? '—' : String(input)
  const money = (amount: number) => `${formatMoney(amount)} ${currency}`
  const payrollStatus = (status: string) =>
    t(`hrOperations.payroll.statuses.${status}`, { defaultValue: status })
  const moneyRow = (label: string, amount: number, detail?: string) => (
    <div className={styles.moneyRow} key={`${label}-${detail || ''}`}>
      <div>
        <span>{label}</span>
        {detail && <small>{detail}</small>}
      </div>
      <strong>{money(amount)}</strong>
    </div>
  )
  const metadata = [
    [t('hrOperations.common.employee'), value(employee?.fullName)],
    [t('hrOperations.payroll.employeeCode'), value(employee?.employeeCode)],
    [t('hrOperations.payroll.department'), value(employee?.departmentName)],
    [t('hrOperations.common.team'), value(employee?.teamName)],
    [t('hrOperations.payroll.jobTitle'), value(employee?.jobTitle)],
    [t('hrOperations.payroll.employmentType'), value(employee?.employmentType)],
    [t('hrOperations.payroll.startDate'), value(employee?.startDate)],
    [t('hrOperations.payroll.workdays'), value(result.workDays)],
    [t('hrOperations.payroll.baseSalary'), money(result.baseSalary)],
    [t('hrOperations.payroll.currency'), currency],
  ]

  return (
    <article className={styles.payslip}>
      <header className={styles.header}>
        <div className={styles.company}>
          {company?.logoUrl && (
            <img src={company.logoUrl} alt={company.name || t('hrOperations.payroll.company')} />
          )}
          <div>
            <h2>{value(company?.name)}</h2>
            <p>{value(company?.address)}</p>
            {company?.taxCode && (
              <small>
                {t('hrOperations.payroll.taxCode')}: {company.taxCode}
              </small>
            )}
            {company?.payrollEmail && <small>{company.payrollEmail}</small>}
            {company?.payrollPhone && <small>{company.payrollPhone}</small>}
          </div>
        </div>
        <div className={styles.period}>
          <span>{t('hrOperations.payroll.payslip')}</span>
          <strong>{periodLabel}</strong>
          <StatusTag
            status={
              result.status === 'PAID'
                ? 'paid'
                : result.status === 'FINALIZED'
                  ? 'finalized'
                  : 'pending'
            }
          >
            {payrollStatus(result.status)}
          </StatusTag>
        </div>
      </header>

      <section data-testid="payslip-employee" className={styles.employeePanel}>
        <div className={styles.identity}>
          <EmployeeAvatar name={employee?.fullName} avatarUrl={employee?.avatarUrl} size={52} />
          <div>
            <span>{t('hrOperations.common.employee')}</span>
            <strong>{value(employee?.fullName)}</strong>
            <small>{value(employee?.employeeCode)}</small>
          </div>
        </div>
        <dl className={styles.metadata}>
          {metadata.slice(1).map(([label, content]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{content}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={styles.breakdown}>
        <section data-testid="payslip-income" className={styles.income}>
          <h3>{t('hrOperations.payroll.earnings')}</h3>
          {moneyRow(t('hrOperations.payroll.baseSalary'), result.baseSalary)}
          {moneyRow(t('hrOperations.payroll.salaryFromWork'), result.salaryFromWork || 0)}
          {(result.overtimePay || 0) > 0 && (
            <div className={styles.group}>
              {moneyRow(t('hrOperations.payroll.overtime'), result.overtimePay || 0)}
              {(result.overtimeBreakdown || []).map((item) =>
                moneyRow(
                  t(`hrOperations.payroll.otRate.${item.rateClass}`),
                  item.amount,
                  t('hrOperations.payroll.approvedMinutes', { count: item.approvedMinutes }),
                ),
              )}
            </div>
          )}
          {(result.totalAllowances || 0) > 0 && (
            <div className={styles.group}>
              {moneyRow(t('hrOperations.payroll.allowances'), result.totalAllowances || 0)}
              {Object.entries(result.allowanceBreakdown || {}).map(([key, amount]) =>
                moneyRow(t(`hrOperations.payroll.allowance.${key}`), amount),
              )}
            </div>
          )}
          {(result.adjustmentEarnings || 0) > 0 &&
            moneyRow(t('hrOperations.payroll.adjustmentEarnings'), result.adjustmentEarnings || 0)}
          <div className={styles.subtotal}>
            {moneyRow(t('hrOperations.payroll.gross'), result.grossIncome)}
          </div>
        </section>

        <section data-testid="payslip-deductions" className={styles.deductions}>
          <h3>{t('hrOperations.payroll.deductionBreakdown')}</h3>
          {moneyRow(t('hrOperations.payroll.insurance.social'), insurance.social)}
          {moneyRow(t('hrOperations.payroll.insurance.health'), insurance.health)}
          {moneyRow(t('hrOperations.payroll.insurance.unemployment'), insurance.unemployment)}
          {moneyRow(t('hrOperations.payroll.personalIncomeTax'), result.personalIncomeTax || 0)}
          {(result.adjustmentDeductions || 0) > 0 &&
            moneyRow(
              t('hrOperations.payroll.adjustmentDeductions'),
              result.adjustmentDeductions || 0,
            )}
          <div className={styles.subtotal}>
            {moneyRow(t('hrOperations.payroll.deductions'), result.totalDeductions)}
          </div>
        </section>
      </div>

      <footer data-testid="payslip-net" className={styles.totals}>
        <div>
          <span>{t('hrOperations.payroll.gross')}</span>
          <strong>{money(result.grossIncome)}</strong>
        </div>
        <div>
          <span>{t('hrOperations.payroll.deductions')}</span>
          <strong>{money(result.totalDeductions)}</strong>
        </div>
        <div className={styles.net}>
          <span>{t('hrOperations.payroll.netPayable')}</span>
          <strong>{money(result.netIncome)}</strong>
        </div>
      </footer>
    </article>
  )
}
