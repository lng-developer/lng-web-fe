import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('./', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('payroll administration uses the operations desk and server capabilities', async () => {
  const [page, drawer, resultDrawer, dialog, mutations] = await Promise.all([
    source('pages/PayrollRunsPage.jsx'),
    source('components/PayrollReviewDrawer.jsx'),
    source('components/PayrollResultDrawer.jsx'),
    source('components/PayrollActionDialog.jsx'),
    source('api/hrPayroll.mutations.js'),
  ])

  assert.match(page, /OperationsPageShell/)
  assert.match(page, /OperationsTable/)
  assert.match(page, /useSearchParams/)
  assert.match(page, /row\.capabilities\?\.finalize/)
  assert.match(drawer, /result\.capabilities\?\.markPaid/)
  assert.match(
    resultDrawer,
    /const canWrite = hasAnyPermission\(currentUser, \['HR_PAYROLL:WRITE'\]\)/,
  )
  assert.match(resultDrawer, /result\.status === 'DRAFT' && canWrite/)
  assert.match(resultDrawer, /canWrite \? \(/)
  assert.match(dialog, /results/)
  assert.match(dialog, /result\.success/)
  assert.match(dialog, /result\.code/)
  assert.match(mutations, /retry:\s*false/)
  assert.doesNotMatch(`${page}${drawer}${dialog}${mutations}`, /roleName|roles\.includes|\.role\b/)
})

test('payroll actions require preview, explicit confirmation, and pending state', async () => {
  const [page, drawer, dialog, mutations] = await Promise.all([
    source('pages/PayrollRunsPage.jsx'),
    source('components/PayrollReviewDrawer.jsx'),
    source('components/PayrollActionDialog.jsx'),
    source('api/hrPayroll.mutations.js'),
  ])

  assert.match(page, /PayrollActionDialog/)
  assert.match(page, /PayrollRunDialog/)
  assert.match(page, /useRunPayrollMutation/)
  assert.match(page, /useEmailPayrollMutation/)
  assert.match(page, /row\.capabilities\?\.email/)
  assert.match(drawer, /PayrollActionDialog/)
  assert.match(dialog, /preview/i)
  assert.match(dialog, /Confirm/)
  assert.match(dialog, /loading/)
  assert.match(mutations, /mapPayrollEmailOutcome/)
  assert.match(dialog, /queued/)
  assert.match(dialog, /reused/)
  assert.match(dialog, /skipped/)
  assert.match(dialog, /outcome\?\.jobs/)
  assert.match(dialog, /job\.payrollResultId/)
  assert.match(dialog, /job\.status/)
})

test('payroll preview renders calculation evidence and clears it after closing', async () => {
  const dialog = await source('components/PayrollRunDialog.jsx')

  assert.doesNotMatch(dialog, /useEffect/)
  assert.match(dialog, /function close\(\)[\s\S]*setPreview\(null\)[\s\S]*onClose\(\)/)
  assert.match(dialog, /onPreview\(buildRunPayrollPayload\(\{ \.\.\.values, shadow: true \}\)\)/)
  assert.match(dialog, /if \(result\) \{\s*setPreview\(result\)\s*setActiveStep\(1\)/)
  assert.match(dialog, /payrollResultIdentity\(result, index\)/)
  assert.doesNotMatch(dialog, /result\.employeeName|result\.employeeCode/)
  assert.match(dialog, /result\.grossIncome/)
  assert.match(dialog, /result\.adjustmentEarnings/)
  assert.match(dialog, /result\.adjustmentDeductions/)
  assert.match(dialog, /result\.netIncome/)
})

test('routes mount auth-only payslips and permission-gated payroll administration', async () => {
  const [routes, navigation] = await Promise.all([
    source('../../routes/index.jsx'),
    source('../../layouts/sidebarNavigation.js'),
  ])

  assert.match(routes, /MyPayslipsPage/)
  assert.match(routes, /PayrollRunsPage/)
  assert.match(routes, /HR_MY_PAYSLIPS[\s\S]*element:\s*<MyPayslipsPage\s*\/>/)
  assert.match(routes, /HR_PAYROLL_RUNS[\s\S]*HR_PAYROLL:READ/)
  assert.match(navigation, /MOUNTED_ROUTE_PATHS[\s\S]*ROUTES\.HR_MY_PAYSLIPS/)
  assert.match(navigation, /MOUNTED_ROUTE_PATHS[\s\S]*ROUTES\.HR_PAYROLL_RUNS/)
})

test('primary payroll route opens the payroll register instead of the legacy run list', async () => {
  const [routes, register] = await Promise.all([
    source('../../routes/index.jsx'),
    source('pages/PayrollRegisterPage.jsx'),
  ])

  assert.match(
    routes,
    /HR_PAYROLL_RUNS[\s\S]*element:\s*requirePermissions\(\['HR_PAYROLL:READ'\], <PayrollRegisterPage\s*\/>\)/,
  )
  assert.match(
    routes,
    /HR_PAYROLL_RUN_HISTORY[\s\S]*element:\s*requirePermissions\(\['HR_PAYROLL:READ'\], <PayrollRunsPage\s*\/>\)/,
  )
  assert.match(register, /Payroll overview/)
  assert.match(register, /Manage payroll runs/)
})

test('payroll screens keep the register, detail drawer, and run history visual hierarchy', async () => {
  const [register, details, runs] = await Promise.all([
    source('pages/PayrollRegisterPage.jsx'),
    source('components/PayrollResultDrawer.jsx'),
    source('pages/PayrollRunsPage.jsx'),
  ])

  assert.match(register, /Payroll overview/)
  assert.match(register, /PayrollMetric/)
  assert.match(register, /Base salary/)
  assert.match(register, /Team/)
  assert.match(register, /query\.data\?\.summary/)
  assert.match(register, /summary\?\.amounts\?\.netIncome/)
  assert.match(register, /Awaiting payment/)
  assert.doesNotMatch(
    register,
    /rows\.reduce\(\(total, row\) => total \+ \(row\.netIncome \|\| 0\), 0\)/,
  )
  assert.match(details, /Attendance inputs/)
  assert.match(details, /Calculation note/)
  assert.match(details, /Add adjustment/)
  assert.match(runs, /Draft runs/)
  assert.match(runs, /Ready to finalize/)
  assert.match(runs, /Paid runs/)
})

test('self-service payslips are read-only and render complete money evidence', async () => {
  const page = await source('pages/MyPayslipsPage.jsx')

  assert.match(page, /OperationsPageShell/)
  assert.match(page, /grossIncome/)
  assert.match(page, /totalDeductions/)
  assert.match(page, /netIncome/)
  assert.doesNotMatch(page, /useFinalizePayroll|useMarkPayrollPaid|roleName|roles\.includes/)
})

test('payroll adjustment administration keeps versioned writes and operational outcomes visible', async () => {
  const [page, panel, dialog, mutations, queries] = await Promise.all([
    source('pages/PayrollRunsPage.jsx'),
    source('components/PayrollAdjustmentsPanel.jsx'),
    source('components/PayrollAdjustmentDialog.jsx'),
    source('api/hrPayroll.mutations.js'),
    source('api/hrPayroll.queries.js'),
  ])

  assert.match(page, /PayrollAdjustmentsPanel/)
  assert.match(panel, /profileId/)
  assert.match(panel, /month/)
  assert.match(panel, /year/)
  assert.match(panel, /status/)
  assert.match(panel, /type/)
  assert.match(panel, /Create adjustment/)
  assert.match(panel, /Edit adjustment/)
  assert.match(panel, /Cancel adjustment/)
  assert.match(panel, /useSearchParams/)
  assert.match(dialog, /expectedVersion/)
  assert.match(dialog, /amount/)
  assert.match(dialog, /VND/)
  assert.match(
    dialog,
    /This adjustment changed on the server\. Review the refreshed row before retrying\./,
  )
  assert.match(panel, /requiresReview/)
  assert.match(panel, /draftPayrollRefreshed/)
  assert.match(mutations, /useCreatePayrollAdjustmentMutation/)
  assert.match(mutations, /useUpdatePayrollAdjustmentMutation/)
  assert.match(mutations, /useCancelPayrollAdjustmentMutation/)
  assert.match(mutations, /retry:\s*false/)
  assert.match(mutations, /draftPayrollRefreshed/)
  assert.equal((panel.match(/error\?\.status === 409/g) || []).length, 2)
  assert.doesNotMatch(panel, /error\?\.response\?\.status === 409/)
  assert.match(
    queries,
    /adjustments:\s*\(query\)\s*=>\s*\[\.\.\.hrPayrollKeys\.all, 'adjustments', query\]/,
  )
})
