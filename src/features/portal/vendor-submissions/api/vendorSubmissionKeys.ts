import type { VendorSubmissionParams } from './vendorSubmissionApi'

export const vendorSubmissionKeys = {
  all: ['vendor-submissions'] as const,
  list: (params: VendorSubmissionParams) => [...vendorSubmissionKeys.all, 'list', params] as const,
  detail: (id: string) => [...vendorSubmissionKeys.all, 'detail', id] as const,
}
