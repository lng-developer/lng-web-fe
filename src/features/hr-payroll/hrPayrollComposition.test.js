import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('./', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('payroll administration uses the operations desk and server capabilities', async () => {
  const [page, drawer, dialog, mutations] = await Promise.all([
    source('pages/PayrollRunsPage.jsx'),
    source('components/PayrollReviewDrawer.jsx'),
    source('components/PayrollActionDialog.jsx'),
    source('api/hrPayroll.mutations.js'),
  ])

  assert.match(page, /OperationsPageShell/)
  assert.match(page, /OperationsTable/)
  assert.match(page, /useSearchParams/)
  assert.match(page, /row\.capabilities\?\.finalize/)
  assert.match(drawer, /result\.capabilities\?\.markPaid/)
  assert.match(dialog, /results/)
  assert.match(dialog, /result\.success/)
  assert.match(dialog, /result\.code/)
  assert.match(mutations, /retry:\s*false/)
  assert.doesNotMatch(`${page}${drawer}${dialog}${mutations}`, /roleName|roles\.includes|\.role\b/)
})

test('payroll actions require preview, explicit confirmation, and pending state', async () => {
  const [page, drawer, dialog] = await Promise.all([
    source('pages/PayrollRunsPage.jsx'),
    source('components/PayrollReviewDrawer.jsx'),
    source('components/PayrollActionDialog.jsx'),
  ])

  assert.match(page, /PayrollActionDialog/)
  assert.match(drawer, /PayrollActionDialog/)
  assert.match(dialog, /preview/i)
  assert.match(dialog, /Confirm/)
  assert.match(dialog, /loading/)
})

test('routes mount auth-only payslips and permission-gated payroll administration', async () => {
  const [routes, navigation] = await Promise.all([
    source('../../routes/index.jsx'),
    source('../../layouts/sidebarNavigation.js'),
  ])

  assert.match(routes, /MyPayslipsPage/)
  assert.match(routes, /PayrollRunsPage/)
  assert.match(
    routes,
    /HR_MY_PAYSLIPS[\s\S]*element:\s*<MyPayslipsPage\s*\/>/,
  )
  assert.match(routes, /HR_PAYROLL_RUNS[\s\S]*HR_PAYROLL:READ/)
  assert.match(navigation, /MOUNTED_ROUTE_PATHS[\s\S]*ROUTES\.HR_MY_PAYSLIPS/)
  assert.match(navigation, /MOUNTED_ROUTE_PATHS[\s\S]*ROUTES\.HR_PAYROLL_RUNS/)
})

test('self-service payslips are read-only and render complete money evidence', async () => {
  const page = await source('pages/MyPayslipsPage.jsx')

  assert.match(page, /OperationsPageShell/)
  assert.match(page, /grossIncome/)
  assert.match(page, /totalDeductions/)
  assert.match(page, /netIncome/)
  assert.doesNotMatch(page, /useFinalizePayroll|useMarkPayrollPaid|roleName|roles\.includes/)
})
