import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Flex, Pagination, Select, Typography } from 'antd'

import {
  getMappingVendorProductOptions,
  type MappingCostCenterOption,
  type MappingVendorProduct,
  searchMappingProducts,
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
  const [selectedProduct, setSelectedProduct] = useState<MappingVendorProduct | undefined>(
    item.mapping?.vendorProduct?.id
      ? {
          id: item.mapping.vendorProduct.id,
          name: item.mapping.vendorProduct.name,
          vendor: item.mapping.vendor?.id
            ? { id: item.mapping.vendor.id, name: item.mapping.vendor.name }
            : undefined,
        }
      : undefined,
  )
  const [productId, setProductId] = useState(item.mapping?.vendorProduct?.id ?? undefined)
  const [selectedSize, setSize] = useState(item.mapping?.vendorCostCenter?.size ?? undefined)
  const [selectedColor, setColor] = useState(item.mapping?.vendorCostCenter?.color ?? undefined)
  const [costCenterId, setCostCenterId] = useState<string>()
  const [productSearchDraft, setProductSearchDraft] = useState('')
  const productSearch = useDebouncedValue(productSearchDraft, 200)
  const [page, setPage] = useState(1)
  const products = useQuery({
    queryKey: mappingKeys.productSearch(productSearch, page),
    queryFn: () => searchMappingProducts({ q: productSearch, page, limit: 20 }),
    enabled: active && canWrite,
    ...modalQueryOptions,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const productOptions = useQuery({
    queryKey: mappingKeys.vendorProductOptions(productId ?? ''),
    queryFn: () => getMappingVendorProductOptions(productId!),
    enabled: active && canWrite && Boolean(productId),
    ...modalQueryOptions,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const dimensions = productOptions.data?.dimensions
  const allCandidates = productOptions.data?.allCandidates ?? productOptions.data?.candidates ?? []
  const size =
    selectedSize ??
    (productOptions.data?.options.sizes.length === 1
      ? productOptions.data.options.sizes[0]
      : undefined)
  const color =
    selectedColor ??
    (productOptions.data?.options.colors.length === 1
      ? productOptions.data.options.colors[0]
      : undefined)
  const candidates = allCandidates.filter(
    (candidate) => (!size || candidate.size === size) && (!color || candidate.color === color),
  )
  const sizeOptions = allCandidates.filter((candidate) => !color || candidate.color === color)
  const colorOptions = allCandidates.filter((candidate) => !size || candidate.size === size)
  const selectionComplete =
    Boolean(productId) &&
    (!dimensions?.hasSize || Boolean(size)) &&
    (!dimensions?.hasColor || Boolean(color))
  const selectedCandidate = selectionComplete
    ? (candidates.find((candidate) => candidate.id === costCenterId) ??
      (candidates.length === 1 ? candidates[0] : undefined))
    : undefined
  const hasProductSelected = Boolean(productId)
  const canApply =
    hasProductSelected &&
    Boolean(selectedCandidate) &&
    !productOptions.isFetching &&
    !productOptions.isError

  const save = useMutation({
    mutationFn: (candidate: MappingCostCenterOption) =>
      selectFulfillmentCandidate(item.item.id, {
        vendorProductId: productId!,
        vendorCostCenterId: candidate.id,
      }),
    onSuccess: async () => {
      toast('success', t('orders.messages.fulfillmentUpdated'))
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
  const error = products.error || productOptions.error
  const productSelectOptions = unique(
    [...(selectedProduct ? [selectedProduct] : []), ...(products.data?.items ?? [])].map(
      (product) => ({
        value: product.id,
        label: `${product.name || product.code || '—'} · ${product.vendor?.name || product.vendor?.code || '—'}`,
      }),
    ),
  )

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
            children: selectedProduct?.vendor?.name || notSet,
          },
          {
            key: 'product',
            label: t('orders.fields.product'),
            children: (
              <Select
                {...common}
                showSearch
                filterOption={false}
                onSearch={(value) => {
                  setProductSearchDraft(value)
                  setPage(1)
                }}
                aria-label={t('orders.fields.product')}
                disabled={save.isPending}
                placeholder={item.mapping?.vendorProduct?.name || notSet}
                options={productSelectOptions}
                value={productId}
                loading={products.isFetching}
                popupRender={(menu) => (
                  <>
                    {menu}
                    <Pagination
                      size="small"
                      simple
                      current={page}
                      pageSize={20}
                      total={products.data?.pagination.total ?? 0}
                      hideOnSinglePage
                      showSizeChanger={false}
                      onChange={setPage}
                    />
                  </>
                )}
                onChange={(nextProductId) => {
                  setSelectedProduct(
                    products.data?.items.find((product) => product.id === nextProductId) ??
                      selectedProduct,
                  )
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
                allowClear
                disabled={!productId || !dimensions?.hasSize}
                placeholder={dimensions?.hasSize === false ? t('orders.fields.notApplicable') : notSet}
                options={unique(
                  sizeOptions.map((candidate) => ({
                    value: candidate.size ?? '',
                    label: candidate.size ?? '',
                  })),
                ).filter((option) => option.value)}
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
                allowClear
                disabled={!productId || !dimensions?.hasColor}
                placeholder={dimensions?.hasColor === false ? t('orders.fields.notApplicable') : notSet}
                options={unique(
                  colorOptions.map((candidate) => ({
                    value: candidate.color ?? '',
                    label: candidate.color ?? '',
                  })),
                ).filter((option) => option.value)}
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
            {t('orders.fields.baseCost')}:{' '}
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
