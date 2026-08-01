import { useTranslation } from 'react-i18next'
import { EyeOutlined } from '@ant-design/icons'
import { Button, Select } from 'antd'

import { SearchInput } from '@/shared/ui'

import type { AuthorableShopResult } from '../api/mappingApi'

export type MappingContextValue = {
  shopId?: string
  marketplaceCode?: string
  search?: string
}

export function MappingContextBar({
  loading,
  shops,
  value,
  onChange,
  onPreview,
}: {
  readonly loading?: boolean
  readonly shops?: AuthorableShopResult
  readonly value: MappingContextValue
  readonly onChange: (value: MappingContextValue) => void
  readonly onPreview: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-[minmax(12rem,0.7fr)_minmax(12rem,0.7fr)_minmax(20rem,1.6fr)_auto] gap-2">
      <Select
        allowClear
        aria-label={t('mapping.context.shop')}
        loading={loading}
        placeholder={t('mapping.context.allShops')}
        value={value.shopId}
        options={(shops?.items ?? []).map((shop) => ({
          value: shop.id,
          label: shop.name || shop.code || t('mapping.states.unavailable'),
        }))}
        onChange={(shopId) => onChange({ ...value, shopId })}
      />
      <Select
        allowClear
        aria-label={t('mapping.context.marketplace')}
        placeholder={t('mapping.context.allMarketplaces')}
        value={value.marketplaceCode}
        options={['AMAZON_US', 'ETSY_US'].map((marketplace) => ({
          value: marketplace,
          label: marketplace,
        }))}
        onChange={(marketplaceCode) => onChange({ ...value, marketplaceCode })}
      />
      <SearchInput
        aria-label={t('mapping.context.orderItem')}
        placeholder={t('mapping.context.orderItem')}
        value={value.search}
        onSearchChange={(search) => onChange({ ...value, search })}
      />
      <Button type="primary" icon={<EyeOutlined />} loading={loading} onClick={onPreview}>
        {t('mapping.actions.preview')}
      </Button>
    </div>
  )
}
