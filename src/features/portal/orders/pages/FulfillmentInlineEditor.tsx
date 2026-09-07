import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Flex, Select, Typography } from 'antd'

import {
  getMappingVendorProductOptions,
  listMappingVendorProducts,
  type MappingCostCenterOption,
  searchMappingVendors,
  selectFulfillmentCandidate,
} from '@/features/portal/mapping/api/mappingApi'
import { mappingKeys } from '@/features/portal/mapping/api/mappingKeys'
import { normalizeApiError } from '@/shared/api'
import { modalQueryOptions } from '@/shared/query/modalQuery'
import { useDebouncedValue, useFeedbackToast } from '@/shared/ui'

import type { OrderWorkbenchItem } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import { formatMinorMoney } from './orderPresentation'

const unique = (rows: Array<{ value: string; label: string }>) => [
  ...new Map(rows.map((row) => [row.value, row])).values(),
]

export function FulfillmentInlineEditor({
  canWrite,
  item,
}: {
  readonly canWrite: boolean
  readonly item: OrderWorkbenchItem
}) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const queryClient = useQueryClient()
  const [active, setActive] = useState(false)
  const [vendorId, setVendorId] = useState(item.mapping?.vendor?.id ?? undefined)
  const [productId, setProductId] = useState(item.mapping?.vendorProduct?.id ?? undefined)
  const [size, setSize] = useState(item.mapping?.vendorCostCenter?.size ?? undefined)
  const [color, setColor] = useState(item.mapping?.vendorCostCenter?.color ?? undefined)
  const [costCenterId, setCostCenterId] = useState<string>()
  const [vendorSearchDraft, setVendorSearchDraft] = useState('')
  const vendorSearch = useDebouncedValue(vendorSearchDraft, 200)
  const productTypeGroupId = item.mapping?.listingVariant?.productTypeGroup?.id ?? undefined

  const vendors = useQuery({
    queryKey: mappingKeys.vendors(vendorSearch),
    queryFn: () => searchMappingVendors({ q: vendorSearch, limit: 20 }),
    enabled: active && canWrite,
    ...modalQueryOptions,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const products = useQuery({
    queryKey: mappingKeys.vendorProducts(vendorId ?? '', productTypeGroupId ?? '', true),
    queryFn: () =>
      listMappingVendorProducts(vendorId!, {
        productTypeGroupId,
        includeDifferentProductType: true,
      }),
    enabled: active && canWrite && Boolean(vendorId),
    ...modalQueryOptions,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const productOptions = useQuery({
    queryKey: mappingKeys.vendorProductOptions(productId ?? '', size, color),
    queryFn: () => getMappingVendorProductOptions(productId!, { size, color }),
    enabled: active && canWrite && Boolean(productId),
    ...modalQueryOptions,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  })

  const dimensions = productOptions.data?.dimensions
  const candidates = productOptions.data?.candidates ?? []
  const selectionComplete =
    Boolean(productId) &&
    (!dimensions?.hasSize || Boolean(size)) &&
    (!dimensions?.hasColor || Boolean(color))
  const selectedCandidate = selectionComplete
    ? (candidates.find((candidate) => candidate.id === costCenterId) ??
      (candidates.length === 1 ? candidates[0] : undefined))
    : undefined
  const hasProductSelected = Boolean(productId)
  const canApply = hasProductSelected && Boolean(selectedCandidate)

  const save = useMutation({
    mutationFn: (candidate: MappingCostCenterOption) =>
      selectFulfillmentCandidate(item.item.id, {
        vendorProductId: productId!,
        vendorCostCenterId: candidate.id,
      }),
    onSuccess: async () => {
      toast('success', t('orders.messages.updated'))
      await queryClient.invalidateQueries({ queryKey: [...orderKeys.all, 'workbench'] })
      await queryClient.invalidateQueries({ queryKey: [...orderKeys.all, 'summary'] })
    },
    onError: (error) => toast('error', normalizeApiError(error).message),
  })
  const common = {
    style: { minWidth: 0, width: '100%' },
    size: 'small' as const,
    variant: 'borderless' as const,
    popupMatchSelectWidth: 300,
    onOpenChange: (open: boolean) => open && setActive(true),
  }
  const notSet = t('orders.fields.notSet')
  const error = vendors.error || products.error || productOptions.error
  const vendorOptions = unique([
    ...(item.mapping?.vendor?.id
      ? [{ value: item.mapping.vendor.id, label: item.mapping.vendor.name || '-' }]
      : []),
    ...(vendors.data?.items ?? []).map((vendor) => ({
      value: vendor.id,
      label: vendor.name || vendor.code || '—',
    })),
  ])
  const productSelectOptions = unique([
    ...(item.mapping?.vendorProduct?.id
      ? [{ value: item.mapping.vendorProduct.id, label: item.mapping.vendorProduct.name || '-' }]
      : []),
    ...(products.data ?? []).map((product) => ({
      value: product.id,
      label: product.name || product.code || '—',
    })),
  ])

  if (!canWrite) {
    return (
      <Descriptions
        size="small"
        column={1}
        colon={false}
        items={[
          {
            key: 'vendor',
            label: t('orders.fields.vendor'),
            children: item.mapping?.vendor?.name || '—',
          },
          {
            key: 'product',
            label: t('orders.fields.product'),
            children: item.mapping?.vendorProduct?.name || '—',
          },
          {
            key: 'size',
            label: t('orders.fields.size'),
            children: item.mapping?.vendorCostCenter?.size || '—',
          },
          {
            key: 'color',
            label: t('orders.fields.color'),
            children: item.mapping?.vendorCostCenter?.color || '—',
          },
        ]}
      />
    )
  }

  return (
    <Flex vertical gap={6}>
      <Descriptions
        size="small"
        column={1}
        colon={false}
        items={[
          {
            key: 'vendor',
            label: t('orders.fields.vendor'),
            children: (
              <Select
                {...common}
                showSearch
                filterOption={false}
                aria-label={t('orders.fields.vendor')}
                placeholder={item.mapping?.vendor?.name || notSet}
                options={vendorOptions}
                value={vendorId}
                loading={vendors.isFetching}
                notFoundContent={
                  vendors.isError ? normalizeApiError(vendors.error).message : undefined
                }
                onSearch={setVendorSearchDraft}
                onChange={(nextVendorId) => {
                  setVendorId(nextVendorId)
                  setProductId(undefined)
                  setSize(undefined)
                  setColor(undefined)
                  setCostCenterId(undefined)
                }}
              />
            ),
          },
          {
            key: 'product',
            label: t('orders.fields.product'),
            children: (
              <Select
                {...common}
                showSearch
                optionFilterProp="label"
                aria-label={t('orders.fields.product')}
                disabled={!vendorId}
                placeholder={item.mapping?.vendorProduct?.name || notSet}
                options={productSelectOptions}
                value={productId}
                loading={products.isFetching}
                onChange={(nextProductId) => {
                  setProductId(nextProductId)
                  setSize(undefined)
                  setColor(undefined)
                  setCostCenterId(undefined)
                }}
              />
            ),
          },
          {
            key: 'size',
            label: t('orders.fields.size'),
            children: (
              <Select
                {...common}
                aria-label={t('orders.fields.size')}
                disabled={!productId || !dimensions?.hasSize}
                placeholder={item.mapping?.vendorCostCenter?.size || notSet}
                options={(productOptions.data?.options.sizes ?? []).map((value) => ({
                  value,
                  label: value,
                }))}
                value={size}
                loading={productOptions.isFetching}
                onChange={(value) => {
                  setSize(value)
                  setCostCenterId(undefined)
                }}
              />
            ),
          },
          {
            key: 'color',
            label: t('orders.fields.color'),
            children: (
              <Select
                {...common}
                aria-label={t('orders.fields.color')}
                disabled={!productId || !dimensions?.hasColor}
                placeholder={item.mapping?.vendorCostCenter?.color || notSet}
                options={(productOptions.data?.options.colors ?? []).map((value) => ({
                  value,
                  label: value,
                }))}
                value={color}
                loading={productOptions.isFetching}
                onChange={(value) => {
                  setColor(value)
                  setCostCenterId(undefined)
                }}
              />
            ),
          },
          ...(selectionComplete && candidates.length > 1
            ? [
                {
                  key: 'costCenter',
                  label: t('orders.fields.costCenter'),
                  children: (
                    <Select
                      {...common}
                      aria-label={t('orders.fields.costCenter')}
                      placeholder={notSet}
                      value={costCenterId}
                      options={candidates.map((candidate) => ({
                        value: candidate.id,
                        label: candidate.sku || candidate.code || '—',
                      }))}
                      onChange={setCostCenterId}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
      {error ? (
        <Typography.Text type="danger">{normalizeApiError(error).message}</Typography.Text>
      ) : null}
      {canApply && selectedCandidate ? (
        <Flex align="center" justify="space-between" gap={8}>
          <Typography.Text type="secondary">
            {t('orders.fields.totalCost')}:{' '}
            <Typography.Text strong>
              {formatMinorMoney(
                selectedCandidate.totalCostAmount ?? selectedCandidate.baseCostAmount ?? 0,
                selectedCandidate.currency || 'USD',
              )}
            </Typography.Text>
          </Typography.Text>
          <Button
            type="primary"
            size="small"
            loading={save.isPending}
            onClick={() => save.mutate(selectedCandidate)}
          >
            {t('orders.actions.apply')}
          </Button>
        </Flex>
      ) : null}
    </Flex>
  )
}
