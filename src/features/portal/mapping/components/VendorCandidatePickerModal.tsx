import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Descriptions, Modal, Select } from 'antd'

import { SearchInput } from '@/shared/ui'

import type { VendorCandidateSearchRow } from '../api/mappingApi'

const uniqueOptions = (values: Array<{ value: string; label: string }>) => [
  ...new Map(values.map((item) => [item.value, item])).values(),
]

export function VendorCandidatePickerModal({
  applying,
  items,
  loading,
  open,
  onApply,
  onClose,
  onSearch,
}: {
  readonly applying?: boolean
  readonly items: VendorCandidateSearchRow[]
  readonly loading?: boolean
  readonly open: boolean
  readonly onApply: (candidate: VendorCandidateSearchRow) => void
  readonly onClose: () => void
  readonly onSearch: (value: string) => void
}) {
  const { t } = useTranslation()
  const [vendorId, setVendorId] = useState<string>()
  const [productId, setProductId] = useState<string>()
  const [size, setSize] = useState<string>()
  const [color, setColor] = useState<string>()
  const vendorRows = items.filter((item) => !vendorId || item.vendor.id === vendorId)
  const productRows = vendorRows.filter((item) => !productId || item.vendorProduct.id === productId)
  const sizeRows = productRows.filter(
    (item) => !size || (item.vendorCostCenter.standardSize ?? '') === size,
  )
  const selected = sizeRows.find(
    (item) => !color || (item.vendorCostCenter.standardColor ?? '') === color,
  )
  const options = useMemo(
    () => ({
      vendors: uniqueOptions(
        items.map((item) => ({
          value: item.vendor.id,
          label: item.vendor.name || item.vendor.code || t('mapping.states.unavailable'),
        })),
      ),
      products: uniqueOptions(
        vendorRows.map((item) => ({
          value: item.vendorProduct.id,
          label:
            item.vendorProduct.name || item.vendorProduct.code || t('mapping.states.unavailable'),
        })),
      ),
      sizes: uniqueOptions(
        productRows
          .filter((item) => item.vendorCostCenter.standardSize)
          .map((item) => ({
            value: item.vendorCostCenter.standardSize!,
            label: item.vendorCostCenter.standardSize!,
          })),
      ),
      colors: uniqueOptions(
        sizeRows
          .filter((item) => item.vendorCostCenter.standardColor)
          .map((item) => ({
            value: item.vendorCostCenter.standardColor!,
            label: item.vendorCostCenter.standardColor!,
          })),
      ),
    }),
    [items, productRows, sizeRows, t, vendorRows],
  )

  const reset = () => {
    setVendorId(undefined)
    setProductId(undefined)
    setSize(undefined)
    setColor(undefined)
  }

  return (
    <Modal
      centered
      destroyOnHidden
      open={open}
      title={t('mapping.actions.findCandidate')}
      okText={t('mapping.actions.applyCandidate')}
      okButtonProps={{ disabled: !vendorId || !productId || !selected }}
      confirmLoading={applying}
      onCancel={() => {
        reset()
        onClose()
      }}
      onOk={() => selected && onApply(selected)}
    >
      <div className="grid grid-cols-2 gap-3 py-2">
        <SearchInput
          className="col-span-2"
          aria-label={t('mapping.filters.searchCandidates')}
          placeholder={t('mapping.filters.searchCandidates')}
          onSearchChange={onSearch}
        />
        <Select
          showSearch
          optionFilterProp="label"
          aria-label={t('mapping.fields.vendorId')}
          loading={loading}
          placeholder={t('mapping.fields.vendorId')}
          options={options.vendors}
          value={vendorId}
          onChange={(value) => {
            setVendorId(value)
            setProductId(undefined)
            setSize(undefined)
            setColor(undefined)
          }}
        />
        <Select
          showSearch
          optionFilterProp="label"
          aria-label={t('mapping.fields.vendorProduct')}
          disabled={!vendorId}
          placeholder={t('mapping.fields.vendorProduct')}
          options={options.products}
          value={productId}
          onChange={(value) => {
            setProductId(value)
            setSize(undefined)
            setColor(undefined)
          }}
        />
        <Select
          aria-label={t('mapping.fields.normalizedSize')}
          disabled={!productId}
          placeholder={t('mapping.fields.normalizedSize')}
          options={options.sizes}
          value={size}
          onChange={(value) => {
            setSize(value)
            setColor(undefined)
          }}
        />
        <Select
          aria-label={t('mapping.fields.normalizedColor')}
          disabled={!productId}
          placeholder={t('mapping.fields.normalizedColor')}
          options={options.colors}
          value={color}
          onChange={setColor}
        />
      </div>
      {selected ? (
        <Descriptions
          size="small"
          column={2}
          items={[
            {
              key: 'cost-center',
              label: t('mapping.fields.costCenter'),
              children: selected.vendorCostCenter.name || selected.vendorCostCenter.code,
            },
            {
              key: 'score',
              label: t('mapping.fields.matchScore'),
              children: selected.match.score ?? t('mapping.states.unavailable'),
            },
          ]}
        />
      ) : null}
    </Modal>
  )
}
