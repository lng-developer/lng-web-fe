import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Descriptions, Select } from 'antd'

import {
  searchVendorCandidates,
  selectFulfillmentCandidate,
  type VendorCandidateSearchRow,
} from '@/features/portal/mapping/api/mappingApi'
import { mappingKeys } from '@/features/portal/mapping/api/mappingKeys'
import { normalizeApiError } from '@/shared/api'
import { useFeedbackToast } from '@/shared/ui'

import type { OrderWorkbenchItem } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'

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
  const candidates = useQuery({
    queryKey: mappingKeys.candidates(item.item.id, ''),
    queryFn: () => searchVendorCandidates(item.item.id, { limit: 100 }),
    enabled: active && canWrite,
    retry: false,
  })
  const rows = candidates.data?.items ?? []
  const vendorRows = rows.filter((row) => !vendorId || row.vendor.id === vendorId)
  const productRows = vendorRows.filter((row) => !productId || row.vendorProduct.id === productId)
  const sizeRows = productRows.filter((row) => !size || row.vendorCostCenter.standardSize === size)
  const options = {
    vendors: unique([
      ...(item.mapping?.vendor?.id
        ? [{ value: item.mapping.vendor.id, label: item.mapping.vendor.name || '-' }]
        : []),
      ...rows.map((row) => ({
        value: row.vendor.id,
        label: row.vendor.name || row.vendor.code || '—',
      })),
    ]),
    products: unique([
      ...(item.mapping?.vendorProduct?.id
        ? [{ value: item.mapping.vendorProduct.id, label: item.mapping.vendorProduct.name || '-' }]
        : []),
      ...vendorRows.map((row) => ({
        value: row.vendorProduct.id,
        label: row.vendorProduct.name || row.vendorProduct.code || '—',
      })),
    ]),
    sizes: unique(
      productRows
        .filter((row) => row.vendorCostCenter.standardSize)
        .map((row) => ({
          value: row.vendorCostCenter.standardSize!,
          label: row.vendorCostCenter.standardSize!,
        })),
    ),
    colors: unique(
      sizeRows
        .filter((row) => row.vendorCostCenter.standardColor)
        .map((row) => ({
          value: row.vendorCostCenter.standardColor!,
          label: row.vendorCostCenter.standardColor!,
        })),
    ),
  }
  const save = useMutation({
    mutationFn: (candidate: VendorCandidateSearchRow) =>
      selectFulfillmentCandidate(item.item.id, {
        vendorProductId: candidate.vendorProduct.id,
        vendorCostCenterId: candidate.vendorCostCenter.id,
      }),
    onSuccess: () => {
      toast('success', t('orders.messages.updated'))
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
    onError: (error) => toast('error', normalizeApiError(error).message),
  })
  const selectColor = (nextColor: string) => {
    setColor(nextColor)
    const candidate = sizeRows.find((row) => row.vendorCostCenter.standardColor === nextColor)
    if (candidate) save.mutate(candidate)
  }
  const common = {
    className: 'w-full min-w-40',
    size: 'small' as const,
    variant: 'borderless' as const,
    loading: candidates.isFetching || save.isPending,
    onOpenChange: (open: boolean) => open && setActive(true),
  }

  const controls = canWrite
    ? [
        <Select
          key="vendor"
          {...common}
          showSearch
          optionFilterProp="label"
          aria-label={t('orders.fields.vendor')}
          placeholder={item.mapping?.vendor?.name || t('orders.fields.vendor')}
          options={options.vendors}
          value={vendorId}
          onChange={(nextVendorId) => {
            const products = unique(
              rows
                .filter((row) => row.vendor.id === nextVendorId)
                .map((row) => ({
                  value: row.vendorProduct.id,
                  label: row.vendorProduct.name || '—',
                })),
            )
            setVendorId(nextVendorId)
            setProductId(products.length === 1 ? products[0].value : undefined)
            setSize(undefined)
            setColor(undefined)
          }}
        />,
        options.products.length > 1 ? (
          <Select
            key="product"
            {...common}
            showSearch
            optionFilterProp="label"
            aria-label={t('orders.fields.product')}
            disabled={!vendorId}
            placeholder={item.mapping?.vendorProduct?.name || t('orders.fields.product')}
            options={options.products}
            value={productId}
            onChange={(nextProductId) => {
              setProductId(nextProductId)
              setSize(undefined)
              setColor(undefined)
            }}
          />
        ) : null,
        <Select
          key="size"
          {...common}
          aria-label={t('orders.fields.size')}
          disabled={!productId}
          placeholder={item.mapping?.vendorCostCenter?.size || t('orders.fields.size')}
          options={options.sizes}
          value={size}
          onChange={(nextSize) => {
            setSize(nextSize)
            setColor(undefined)
          }}
        />,
        <Select
          key="color"
          {...common}
          aria-label={t('orders.fields.color')}
          disabled={!productId || !size}
          placeholder={item.mapping?.vendorCostCenter?.color || t('orders.fields.color')}
          options={options.colors}
          value={color}
          onChange={selectColor}
        />,
      ]
    : [
        item.mapping?.vendor?.name || '—',
        item.mapping?.vendorProduct?.name || '—',
        item.mapping?.vendorCostCenter?.size || '—',
        item.mapping?.vendorCostCenter?.color || '—',
      ]

  const descriptionItems = [
    { key: 'vendor', label: t('orders.fields.vendor'), children: controls[0] },
    ...(controls[1]
      ? [{ key: 'product', label: t('orders.fields.product'), children: controls[1] }]
      : []),
    { key: 'size', label: t('orders.fields.size'), children: controls[2] },
    { key: 'color', label: t('orders.fields.color'), children: controls[3] },
  ]

  return <Descriptions size="small" column={1} colon={false} items={descriptionItems} />
}
