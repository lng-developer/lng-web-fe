import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { useFeedbackToast } from '@/shared/ui'

import {
  createShop,
  type CreateShopInput,
  listShops,
  type Shop,
  type ShopListParams,
  type ShopStatus,
  updateShopStatus,
} from '../api/shopApi'
import { shopKeys } from '../api/shopKeys'

export const SHOP_STATUSES: ShopStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED']

function readParams(searchParams: URLSearchParams): ShopListParams {
  const pageValue = Number(searchParams.get('page'))
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const search = searchParams.get('search')?.trim().slice(0, 120) || undefined
  const rawStatus = searchParams.get('status')
  const status = SHOP_STATUSES.find((item) => item === rawStatus)
  return {
    page,
    limit: DEFAULT_PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  }
}

export function canWriteShop(account: CurrentAccount, shopId: string) {
  if (account.permissions.includes('SHOPS:WRITE')) return true
  return account.scopes.some(
    (scope) =>
      scope.scopeType === 'shop' &&
      (scope.scopeId === shopId || scope.resourceId === shopId) &&
      scope.permissions.includes('SHOPS:WRITE'),
  )
}

export function useShopWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const showFeedbackToast = useFeedbackToast()
  const [editingShop, setEditingShop] = useState<Shop>()
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const deferredSearch = useDeferredValue(search)

  const params = useMemo(() => {
    const current = readParams(searchParams)
    return { ...current, search: deferredSearch.trim().slice(0, 120) || undefined }
  }, [searchParams, deferredSearch])

  const canCreate = account.permissions.includes('SHOPS:WRITE')
  const canWriteAnyShop =
    canCreate ||
    account.scopes.some(
      (scope) => scope.scopeType === 'shop' && scope.permissions.includes('SHOPS:WRITE'),
    )

  const shops = useQuery({
    queryKey: shopKeys.list(params),
    queryFn: () => listShops(params),
    retry: false,
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: shopKeys.all }),
    [queryClient],
  )

  const createMutation = useMutation({
    mutationFn: (input: CreateShopInput) => createShop(input),
    onSuccess: async () => {
      setCreating(false)
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const statusMutation = useMutation({
    mutationFn: ({ shopId, status }: { shopId: string; status: ShopStatus }) =>
      updateShopStatus(shopId, status),
    onSuccess: async () => {
      setEditingShop(undefined)
      showFeedbackToast('success', t('actionFeedback.saved'))
      await invalidate()
    },
    onError: (error) => showFeedbackToast('error', t('actionFeedback.failed'), error.message),
  })

  const updateParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const updated = new URLSearchParams(searchParams)
      Object.entries(next).forEach(([key, value]) => {
        if (value) updated.set(key, value)
        else updated.delete(key)
      })
      setSearchParams(updated)
    },
    [searchParams, setSearchParams],
  )

  const activeCount = useMemo(
    () => (shops.data?.items ?? []).filter((shop) => shop.status === 'ACTIVE').length,
    [shops.data?.items],
  )
  const inactiveCount = useMemo(
    () => (shops.data?.items ?? []).filter((shop) => shop.status !== 'ACTIVE').length,
    [shops.data?.items],
  )

  const handleCreateOpen = useCallback(() => setCreating(true), [])
  const handleEditorClose = useCallback(() => {
    setCreating(false)
    setEditingShop(undefined)
  }, [])
  const handleRetry = useCallback(() => void shops.refetch(), [shops])
  const handleClearFilters = useCallback(() => setSearchParams({ page: '1' }), [setSearchParams])
  const handlePageChange = useCallback(
    (page: number) => updateParams({ page: String(page) }),
    [updateParams],
  )
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      updateParams({ search: value || undefined, page: '1' })
    },
    [updateParams],
  )
  const handleStatusChange = useCallback(
    (status?: ShopStatus) => updateParams({ status, page: '1' }),
    [updateParams],
  )
  const handleCreate = useCallback(
    (input: CreateShopInput) => canCreate && createMutation.mutate(input),
    [canCreate, createMutation],
  )
  const handleUpdateStatus = useCallback(
    (status: ShopStatus) => {
      if (editingShop && canWriteShop(account, editingShop.id)) {
        statusMutation.mutate({ shopId: editingShop.id, status })
      }
    },
    [account, editingShop, statusMutation],
  )

  return {
    value: {
      account,
      params,
      search,
      shops,
      editingShop,
      canCreate,
      canWriteAnyShop,
      totalShops: shops.data?.pagination.total ?? 0,
      activeCount,
      inactiveCount,
      modalOpen: creating || Boolean(editingShop),
      modalSaving: createMutation.isPending || statusMutation.isPending,
      canWriteEditingShop: Boolean(editingShop && canWriteShop(account, editingShop.id)),
    },
    handle: {
      createOpen: handleCreateOpen,
      editorClose: handleEditorClose,
      retry: handleRetry,
      clearFilters: handleClearFilters,
      pageChange: handlePageChange,
      searchChange: handleSearchChange,
      statusChange: handleStatusChange,
      editShop: setEditingShop,
      create: handleCreate,
      updateStatus: handleUpdateStatus,
    },
  }
}
