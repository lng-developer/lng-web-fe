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

export function useCreateProductTypeGroupMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => post(ENDPOINTS.CATALOG.PRODUCT_TYPE_GROUPS, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useUpdateProductTypeGroupMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupId, payload }) =>
      patch(ENDPOINTS.CATALOG.PRODUCT_TYPE_GROUP(groupId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useCreateInternalTemplateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => post(ENDPOINTS.CATALOG.INTERNAL_TEMPLATES, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useUpdateInternalTemplateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, payload }) =>
      patch(ENDPOINTS.CATALOG.INTERNAL_TEMPLATE(templateId), payload),
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

export function useCreateListingPsdTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listingId) => post(ENDPOINTS.DESIGN.FROM_LISTING_PSD_TEMPLATE(listingId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['design-tasks'] })
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
