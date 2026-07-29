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
    employeeTeam:
      result.employee?.teamName ||
      result.employee?.departmentName ||
      result.employee?.department ||
      '-',
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
  for (const field of moneyFields)
    mapped[field] = Number.isSafeInteger(result[field]) ? result[field] : 0
  return mapped
}

export function mapPayrollRun(run) {
  if (!run) return null
  return {
    ...run,
    capabilities: {
      ...run.capabilities,
      email: Boolean(run.capabilities?.email),
    },
    actions: {
      finalize: Boolean(run.capabilities?.finalize),
      markPaid: Boolean(run.capabilities?.markPaid),
    },
    ...(run.results ? { results: run.results.map(mapPayrollResult) } : {}),
  }
}

export function payrollResultIdentity(result = {}, index = 0) {
  const profileId = typeof result.profileId === 'string' ? result.profileId : ''
  const resultId = typeof result.id === 'string' ? result.id : ''
  return {
    key: profileId || resultId || `payroll-preview-${index + 1}`,
    label:
      result.employee?.fullName ||
      result.employee?.employeeCode ||
      profileId ||
      resultId ||
      `Employee ${index + 1}`,
    reference: profileId || resultId || `#${index + 1}`,
  }
}

export function buildRunPayrollPayload(values) {
  return {
    month: Number(values.month),
    year: Number(values.year),
    profileIds: values.profileIds || [],
    shadow: Boolean(values.shadow),
  }
}

export function mapPayrollEmailOutcome(payload = {}) {
  return {
    queued: payload.queued || 0,
    reused: payload.reused || 0,
    skipped: payload.skipped || 0,
    jobs: payload.jobs || [],
  }
}

export function buildMarkPaidPayload(payrollResultIds, expectedVersion) {
  return { payrollResultIds, expectedVersion }
}

export function buildPayrollResultExportUrl(filters = {}) {
  const query = normalizePayrollQuery({
    month: filters.month,
    year: filters.year,
    status: filters.status,
    q: typeof filters.q === 'string' ? filters.q.trim() : filters.q,
  })
  const params = new URLSearchParams(query)
  return params.size ? `?${params.toString()}` : ''
}

export function mapPayrollAdjustment(adjustment) {
  if (!adjustment) return null
  return {
    ...adjustment,
    amount: Number.isSafeInteger(adjustment.amount) ? adjustment.amount : 0,
    version: Number.isSafeInteger(adjustment.version) ? adjustment.version : 0,
    requiresReview: Boolean(adjustment.requiresReview),
    draftPayrollRefreshed: Boolean(adjustment.draftPayrollRefreshed),
  }
}

export function buildPayrollAdjustmentPayload(values = {}, { update = false } = {}) {
  const payload = {
    ...(update
      ? {}
      : {
          profileId: values.profileId,
          month: Number(values.month),
          year: Number(values.year),
        }),
    ...(values.type === undefined ? {} : { type: values.type.trim().toUpperCase() }),
    ...(values.code === undefined ? {} : { code: values.code.trim().toUpperCase() }),
    ...(values.name === undefined ? {} : { name: values.name.trim() }),
    ...(values.amount === undefined ? {} : { amount: Number(values.amount) }),
    ...(values.note === undefined ? {} : { note: values.note.trim() || null }),
  }
  return update
    ? { ...payload, expectedVersion: values.expectedVersion ?? values.version }
    : payload
}

export function formatVnd(value) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0)} ₫`
}
