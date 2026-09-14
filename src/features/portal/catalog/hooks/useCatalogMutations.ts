import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useFeedbackToast } from '@/shared/ui'

import {
  type CatalogListParams,
  createListing,
  type CreateListingInput,
  exportListingsCsv,
  type Listing,
  type PsdPriority,
  requestListingPsd,
  updateListing,
  type UpdateListingInput,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

export function useCatalogMutations({
  params,
  editing,
  onSaveSuccess,
}: {
  params: CatalogListParams
  editing?: Listing | 'create'
  onSaveSuccess?: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()

  const refreshListings = async (listingId?: string) => {
    const promises: Promise<unknown>[] = [
      queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: catalogKeys.summaries() }),
    ]
    if (listingId) {
      promises.push(queryClient.invalidateQueries({ queryKey: catalogKeys.detail(listingId) }))
    }
    await Promise.all(promises)
  }

  const save = useMutation({
    mutationFn: (input: CreateListingInput | UpdateListingInput) =>
      editing === 'create'
        ? createListing(input as CreateListingInput)
        : updateListing((editing as Listing).id, input as UpdateListingInput),
    onSuccess: async () => {
      onSaveSuccess?.()
      const listingId = editing && editing !== 'create' ? editing.id : undefined
      await refreshListings(listingId)
      toast('success', t('portal.catalog.saved'))
    },
    onError: (err) =>
      toast('error', err instanceof Error ? err.message : t('portal.catalog.saveFailed')),
  })

  const requestDefaultPsd = useMutation({
    mutationFn: ({ listingId, priority }: { listingId: string; priority: PsdPriority }) =>
      requestListingPsd(listingId, priority),
    onSuccess: async (_, { listingId }) => {
      await refreshListings(listingId)
      toast('success', t('portal.catalog.psd.taskRequested'))
    },
    onError: (err) =>
      toast('error', err instanceof Error ? err.message : t('portal.catalog.psd.requestFailed')),
  })

  const exportCsv = useMutation({
    mutationFn: () => exportListingsCsv(params),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'catalog-listings.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) =>
      toast('error', err instanceof Error ? err.message : t('portal.catalog.unavailable')),
  })

  return {
    save,
    requestDefaultPsd,
    exportCsv,
    refreshListings,
  }
}
