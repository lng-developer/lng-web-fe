const moneyFields = [
  'salaryFromWork',
  'overtimePay',
  'totalAllowances',
  'adjustmentEarnings',
  'grossIncome',
  'personalIncomeTax',
  'adjustmentDeductions',
  'totalDeductions',
  'netIncome',
]

export function normalizePayrollQuery(params = {}) {
  return Object.keys(params)
    .sort()
    .reduce((query, key) => {
      const value = params[key]
      if (value !== '' && value !== null && value !== undefined) query[key] = value
      return query
    }, {})
}

export function unwrapPayrollResponse(response) {
  return response?.data ?? response
}

export function mapPayrollResult(result) {
  if (!result) return null
  const mapped = {
    ...result,
    employeeName: result.employee?.fullName || 'Unknown employee',
    employeeCode: result.employee?.employeeCode || '-',
    insurance: {
      ...(result.insurance && typeof result.insurance === 'object' ? result.insurance : {}),
      social: Number.isSafeInteger(result.insurance?.social) ? result.insurance.social : 0,
      health: Number.isSafeInteger(result.insurance?.health) ? result.insurance.health : 0,
      unemployment: Number.isSafeInteger(result.insurance?.unemployment)
        ? result.insurance.unemployment
        : 0,
      total: Number.isSafeInteger(result.insurance?.total) ? result.insurance.total : 0,
    },
    period: result.inputSnapshot?.period || null,
  }
  for (const field of moneyFields) mapped[field] = Number.isSafeInteger(result[field]) ? result[field] : 0
  return mapped
}

export function mapPayrollRun(run) {
  if (!run) return null
  return {
    ...run,
    actions: {
      finalize: Boolean(run.capabilities?.finalize),
      markPaid: Boolean(run.capabilities?.markPaid),
    },
    ...(run.results ? { results: run.results.map(mapPayrollResult) } : {}),
  }
}

export function buildMarkPaidPayload(payrollResultIds, expectedVersion) {
  return { payrollResultIds, expectedVersion }
}

export function formatVnd(value) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0)} ₫`
}
