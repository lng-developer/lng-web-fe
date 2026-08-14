export const PRINT_METHOD_OPTIONS = ['DTG', 'DTF', 'SUBLIMATION', 'EMBROIDERY', 'OTHER'] as const

export type PrintMethod = (typeof PRINT_METHOD_OPTIONS)[number]

export const printMethodSelectOptions = PRINT_METHOD_OPTIONS.map((value) => ({
  label: value,
  value,
}))
