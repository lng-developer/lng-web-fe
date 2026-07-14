import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { unwrapApiData } from '../utils/listingsApi'
import { listingsKeys } from './listings.keys'

function patch(path, payload) {
  return apiClient.patch(path, payload).then(unwrapApiData)
}

function post(path, payload, config) {
  return apiClient.post(path, payload, config).then(unwrapApiData)
}

export function useCreateListingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => post(ENDPOINTS.CATALOG.LISTINGS, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useUpdateListingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listingId, payload }) => patch(ENDPOINTS.CATALOG.LISTING(listingId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useUploadListingPsdMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listingId, file }) => {
      const formData = new FormData()
      formData.append('file', file)

      return post(ENDPOINTS.CATALOG.LISTING_PSD_TEMPLATE(listingId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useDownloadListingAssetMutation() {
  return useMutation({
    mutationFn: (assetId) =>
      apiClient.get(ENDPOINTS.MEDIA.ASSET_DOWNLOAD(assetId), { responseType: 'blob' }),
  })
}

export function useApproveListingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listingId) => post(ENDPOINTS.CATALOG.LISTING_APPROVE(listingId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useRejectListingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listingId, rejectionReason }) =>
      post(ENDPOINTS.CATALOG.LISTING_REJECT(listingId), { rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}
