import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMarkPaidPayload,
  buildRunPayrollPayload,
  mapPayrollEmailOutcome,
  mapPayrollResult,
  mapPayrollRun,
  normalizePayrollQuery,
  unwrapPayrollResponse,
} from './utils/hrPayrollApi.js'

test('payroll adapters preserve backend integer VND values without decimal conversion', () => {
  const result = mapPayrollResult({
    id: 'result-1',
    employee: { fullName: 'Nguyen An', employeeCode: 'EMP-01' },
    salaryFromWork: 12_345_679,
    overtimePay: 456_789,
    totalAllowances: 1_000_000,
    adjustmentEarnings: 200_000,
    grossIncome: 14_002_468,
    insurance: { social: 650_000, health: 300_000, unemployment: 100_185, total: 1_050_185 },
    inputSnapshot: { period: { month: 7, year: 2026 } },
    personalIncomeTax: 210_047,
    adjustmentDeductions: 50_000,
    totalDeductions: 1_310_232,
    netIncome: 12_692_236,
  })

  for (const field of [
    'salaryFromWork',
    'overtimePay',
    'totalAllowances',
    'adjustmentEarnings',
    'grossIncome',
    'personalIncomeTax',
    'adjustmentDeductions',
    'totalDeductions',
    'netIncome',
  ]) {
    assert.equal(Number.isInteger(result[field]), true)
  }
  assert.equal(result.netIncome, 12_692_236)
  assert.deepEqual(result.insurance, {
    social: 650_000,
    health: 300_000,
    unemployment: 100_185,
    total: 1_050_185,
  })
  assert.deepEqual(result.period, { month: 7, year: 2026 })
  assert.equal(result.employeeName, 'Nguyen An')
})

test('payroll run actions come only from server-computed capabilities', () => {
  assert.deepEqual(
    mapPayrollRun({
      id: 'run-1',
      status: 'DRAFT',
      capabilities: { finalize: true, markPaid: false },
    }).actions,
    { finalize: true, markPaid: false },
  )
  assert.deepEqual(mapPayrollRun({ id: 'run-2', status: 'DRAFT' }).actions, {
    finalize: false,
    markPaid: false,
  })
})

test('payroll execution and email adapters preserve the API contract', () => {
  assert.deepEqual(
    buildRunPayrollPayload({ month: '7', year: '2026', profileIds: ['p1'], shadow: true }),
    {
      month: 7,
      year: 2026,
      profileIds: ['p1'],
      shadow: true,
    },
  )
  assert.deepEqual(mapPayrollEmailOutcome({ queued: 2, reused: 1, skipped: 3 }), {
    queued: 2,
    reused: 1,
    skipped: 3,
    jobs: [],
  })
  assert.equal(mapPayrollRun({ capabilities: { email: true } }).capabilities.email, true)
})

test('mark-paid payload contains explicit result ids and optimistic version only', () => {
  assert.deepEqual(buildMarkPaidPayload(['result-1', 'result-2'], 3), {
    payrollResultIds: ['result-1', 'result-2'],
    expectedVersion: 3,
  })
})

test('payroll query and response helpers match the HTTP envelopes', () => {
  assert.deepEqual(normalizePayrollQuery({ month: 7, year: 2026, status: '', page: 1 }), {
    month: 7,
    page: 1,
    year: 2026,
  })
  assert.deepEqual(unwrapPayrollResponse({ success: true, data: { items: [] } }), { items: [] })
  assert.deepEqual(unwrapPayrollResponse({ data: { status: 'SUCCESS' } }), { status: 'SUCCESS' })
})
