import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildCatalogSetupQuery,
  buildListingListQuery,
  mapPaginatedInternalTemplateResponse,
  mapPaginatedListingResponse,
  mapPaginatedProductTypeGroupResponse,
  mapProductTypeOptions,
  mapShopOptions,
  unwrapApiData,
} from '../utils/listingsApi'
import { listingsKeys } from './listings.keys'

function get(path, query) {
  return apiClient.get(path, { params: query }).then(unwrapApiData)
}

export function useListingSummaryQuery(filters = {}, options = {}) {
  const params = buildListingListQuery(filters)

  return useQuery({
    queryKey: listingsKeys.summary(params),
    queryFn: () => get(ENDPOINTS.CATALOG.LISTING_SUMMARY, params),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useListingsQuery(filters = {}, options = {}) {
  const params = buildListingListQuery(filters)
  const { mapperOptions, ...queryOptions } = options

  return useQuery({
    queryKey: listingsKeys.list(params),
    queryFn: () =>
      get(ENDPOINTS.CATALOG.LISTINGS, params).then((response) =>
        mapPaginatedListingResponse(response, mapperOptions),
      ),
    placeholderData: keepPreviousData,
    ...queryOptions,
  })
}

export function useListingShopsQuery(query = {}, options = {}) {
  const params = buildListingListQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: listingsKeys.shops(params),
    queryFn: () =>
      get(ENDPOINTS.SHOPS.LIST, params).then((response) => mapShopOptions(response?.items || [])),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useListingProductTypesQuery(query = {}, options = {}) {
  const params = buildListingListQuery({ limit: 100, ...query })

  return useQuery({
    queryKey: listingsKeys.productTypes(params),
    queryFn: () =>
      get(ENDPOINTS.CATALOG.PRODUCT_TYPE_GROUPS, params).then((response) =>
        mapProductTypeOptions(response?.items || []),
      ),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useCatalogProductTypeGroupsQuery(query = {}, options = {}) {
  const params = buildCatalogSetupQuery({ limit: 10, ...query })

  return useQuery({
    queryKey: listingsKeys.productTypeGroups(params),
    queryFn: () =>
      get(ENDPOINTS.CATALOG.PRODUCT_TYPE_GROUPS, params).then(mapPaginatedProductTypeGroupResponse),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useCatalogInternalTemplatesQuery(query = {}, options = {}) {
  const params = buildCatalogSetupQuery({ limit: 10, ...query }, { searchParam: 'q' })

  return useQuery({
    queryKey: listingsKeys.internalTemplates(params),
    queryFn: () =>
      get(ENDPOINTS.CATALOG.INTERNAL_TEMPLATES, params).then(mapPaginatedInternalTemplateResponse),
    placeholderData: keepPreviousData,
    ...options,
  })
}
