import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const salesTab = readFileSync(
  join(process.cwd(), 'src', 'features', 'portal', 'reports', 'components', 'ReportSalesTab.tsx'),
  'utf8',
)

const page = readFileSync(
  join(process.cwd(), 'src', 'features', 'portal', 'reports', 'pages', 'ReportWorkspacePage.tsx'),
  'utf8',
)

const styles = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'portal',
    'reports',
    'pages',
    'ReportWorkspacePage.module.scss',
  ),
  'utf8',
)

describe('Report styling and color contracts', () => {
  it('keeps non-profit metric labels without colored dots or colored text in ReportSalesTab', () => {
    expect(salesTab).not.toContain('dotColor:')
    expect(salesTab).not.toContain('styles.metricDot')
    expect(salesTab).not.toContain("textColor: 'var(--ant-color-primary)'")
    expect(salesTab).not.toContain("textColor: 'var(--ant-color-warning)'")
    expect(salesTab).not.toContain("textColor: '#7248ba'")
    expect(salesTab).not.toContain("textColor: 'var(--ant-color-error)'")
    expect(salesTab).not.toContain("textColor: 'var(--ant-color-success)'")
  })

  it('renders black text for non-profit fields and colors only profit (green for positive, red for negative)', () => {
    // Profit colors
    expect(salesTab).toContain('value > 0')
    expect(salesTab).toContain("'var(--ant-color-success)'")
    expect(salesTab).toContain('value < 0')
    expect(salesTab).toContain("'var(--ant-color-error)'")

    // Net profit is not forced to blue
    expect(salesTab).not.toContain(": 'var(--ant-color-primary)'")

    // Revenue, cost, fees, refunds, discounts have no colored text
    expect(salesTab).not.toContain('styles.dailyMoneyCost')
    expect(salesTab).not.toContain('#7248ba')
  })

  it('keeps daily table money classes clean in ReportWorkspacePage SCSS', () => {
    expect(styles).not.toContain('color: var(--ant-color-warning);')
    expect(styles).not.toContain('rgba(22, 119, 255, 0.09) !important;')
    expect(styles).not.toContain('rgba(82, 196, 26, 0.09) !important;')
    expect(styles).toContain('.dailyMoneyProfit {')
    expect(styles).toContain('color: var(--ant-color-success);')
    expect(styles).toContain('.dailyMoneyLoss {')
    expect(styles).toContain('color: var(--ant-color-error);')
  })

  it('styles profit amounts correctly in ReportWorkspacePage daily table', () => {
    expect(page).toContain(
      "row.metricKey === 'grossProfitAmount' || row.metricKey === 'netProfitAmount'",
    )
    expect(page).toContain('amount > 0')
    expect(page).toContain('styles.dailyMoneyProfit')
    expect(page).toContain('amount < 0')
    expect(page).toContain('styles.dailyMoneyLoss')
  })
})
