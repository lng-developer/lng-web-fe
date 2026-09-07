import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useDebouncedValue, useFeedbackToast } from '@/shared/ui'

import {
  createInternalTemplate,
  type InternalTemplate,
  type InternalTemplateInput,
  listInternalTemplates,
  listProductTypeGroups,
  updateInternalTemplate,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

export interface UseInternalTemplatesParams {
  page: number
  pageSize: number
  search: string
  onSaveSuccess?: () => void
}

export function useInternalTemplatesQuery({
  page,
  pageSize,
  search,
  onSaveSuccess,
}: UseInternalTemplatesParams) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const debouncedSearch = useDebouncedValue(search, 250)

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      q: debouncedSearch || undefined,
    }),
    [page, pageSize, debouncedSearch],
  )

  const templates = useQuery({
    queryKey: catalogKeys.templates(params),
    queryFn: () => listInternalTemplates(params),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const productTypeGroups = useQuery({
    queryKey: catalogKeys.productTypes({ all: true }),
    queryFn: () => listProductTypeGroups({ page: 1, limit: 100, status: 'ACTIVE' }),
    retry: false,
  })

  const save = useMutation({
    mutationFn: ({
      input,
      editing,
    }: {
      input: InternalTemplateInput & { code?: string }
      editing?: InternalTemplate | null
    }) => {
      if (!editing) {
        return createInternalTemplate(input as InternalTemplateInput & { code: string })
      }
      const patch = { ...input }
      delete patch.code
      return updateInternalTemplate(editing.id, patch)
    },
    onSuccess: async () => {
      onSaveSuccess?.()
      await queryClient.invalidateQueries({ queryKey: catalogKeys.templatesRoot() })
      toast('success', t('portal.catalog.master.templateSaved'))
    },
    onError: (error) =>
      toast(
        'error',
        error instanceof Error
          ? error.message
          : t('portal.catalog.master.templateEditor.saveFailed'),
      ),
  })

  return {
    debouncedSearch,
    params,
    templates,
    productTypeGroups,
    save,
  }
}
