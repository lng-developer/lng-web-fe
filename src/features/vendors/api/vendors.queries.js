import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildVendorListQuery,
  mapPaginatedResponse,
  mapProductTypeOptions,
  mapVendorCostCenterResponse,
  mapVendorProductResponse,
  mapVendorResponse,
  unwrapApiData,
} from '../utils/vendorsApi'
import { vendorsKeys } from './vendors.keys'

function get(path, query) {
  return apiClient.get(path, { params: query }).then(unwrapApiData)
}

export function useVendorsQuery(query = {}, options = {}) {
  const params = buildVendorListQuery(query)

  return useQuery({
    queryKey: vendorsKeys.list(params),
    queryFn: () =>
      get(ENDPOINTS.VENDORS.LIST, params).then((response) =>
        mapPaginatedResponse(response, mapVendorResponse),
      ),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useVendorProductsQuery(query = {}, options = {}) {
  const params = buildVendorListQuery(query)

  return useQuery({
    queryKey: vendorsKeys.productList(params),
    queryFn: () =>
      get(ENDPOINTS.VENDORS.PRODUCTS, params).then((response) =>
        mapPaginatedResponse(response, mapVendorProductResponse),
      ),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useProductTypeGroupsQuery(query = {}, options = {}) {
  const params = buildVendorListQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: vendorsKeys.productTypes(params),
    queryFn: () =>
      get(ENDPOINTS.CATALOG.PRODUCT_TYPE_GROUPS, params).then((response) =>
        mapProductTypeOptions(response?.items || []),
      ),
    placeholderData: keepPreviousData,
    retry: false,
    ...options,
  })
}

export function useVendorCostCentersQuery(productId, query = {}, options = {}) {
  const params = buildVendorListQuery(query)

  return useQuery({
    queryKey: vendorsKeys.costCenterList(productId, params),
    queryFn: () =>
      get(ENDPOINTS.VENDORS.COST_CENTERS(productId), params).then((response) =>
        mapPaginatedResponse(response, mapVendorCostCenterResponse),
      ),
    enabled: Boolean(productId),
    placeholderData: keepPreviousData,
    ...options,
  })
}
