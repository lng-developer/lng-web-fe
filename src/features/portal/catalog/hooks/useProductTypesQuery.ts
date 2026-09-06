import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useDebouncedValue, useFeedbackToast } from '@/shared/ui'

import {
  createProductTypeGroup,
  listProductTypeGroups,
  type ProductTypeGroup,
  type ProductTypeGroupInput,
  updateProductTypeGroup,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

export interface UseProductTypesParams {
  page: number
  pageSize: number
  search: string
  onSaveSuccess?: () => void
}

export function useProductTypesQuery({
  page,
  pageSize,
  search,
  onSaveSuccess,
}: UseProductTypesParams) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const debouncedSearch = useDebouncedValue(search, 250)

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
    }),
    [page, pageSize, debouncedSearch],
  )

  const groups = useQuery({
    queryKey: catalogKeys.productTypes(params),
    queryFn: () => listProductTypeGroups(params),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const save = useMutation({
    mutationFn: ({
      input,
      editing,
    }: {
      input: ProductTypeGroupInput
      editing?: ProductTypeGroup | null
    }) => {
      if (!editing) return createProductTypeGroup(input)
      const patch: Partial<ProductTypeGroupInput> = { ...input }
      delete patch.code
      return updateProductTypeGroup(editing.id, patch)
    },
    onSuccess: async () => {
      onSaveSuccess?.()
      await queryClient.invalidateQueries({ queryKey: catalogKeys.productTypesRoot() })
      toast('success', t('portal.catalog.master.saved'))
    },
    onError: (error) =>
      toast('error', error instanceof Error ? error.message : 'Could not save product type'),
  })

  return {
    debouncedSearch,
    params,
    groups,
    save,
  }
}
