import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildVendorSubmissionListQuery,
  mapVendorSubmissionDetail,
  mapVendorSubmissionsResponse,
  unwrapApiData,
} from '../utils/vendorSubmissionsApi'
import { vendorSubmissionsKeys } from './vendorSubmissions.keys'

export function useVendorSubmissionsQuery(query = {}, options = {}) {
  const params = buildVendorSubmissionListQuery(query)

  return useQuery({
    queryKey: vendorSubmissionsKeys.list(params),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.VENDOR_SUBMISSIONS.LIST, { params })
        .then(unwrapApiData)
        .then(mapVendorSubmissionsResponse),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useVendorSubmissionDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: vendorSubmissionsKeys.detail(id),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.VENDOR_SUBMISSIONS.DETAIL(id))
        .then(unwrapApiData)
        .then(mapVendorSubmissionDetail),
    enabled: Boolean(id),
    ...options,
  })
}

export function useVendorSubmissionPayloadPreviewQuery(id, options = {}) {
  return useQuery({
    queryKey: vendorSubmissionsKeys.payloadPreview(id),
    queryFn: () =>
      apiClient.get(ENDPOINTS.VENDOR_SUBMISSIONS.PAYLOAD_PREVIEW(id)).then(unwrapApiData),
    enabled: Boolean(id),
    ...options,
  })
}
