import { memo, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApiOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  RightOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Empty, Flex, Space, Tag, Tooltip } from 'antd'

import { getGlobalPermissions } from '@/shared/auth/session'
import { SearchInput } from '@/shared/ui'

import { listVendorProducts, type Vendor } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { VendorProductBranch } from './VendorProductBranch'
import { type VendorEditorCommand, VendorStatus } from './VendorTree'
import styles from './VendorWorkspacePage.module.scss'

interface VendorBranchProps {
  readonly onEdit: (command: VendorEditorCommand) => void
  readonly vendor: Vendor
}

const TYPE_COLOR_MAP: Record<string, string> = {
  POD: 'purple',
  FBM: 'blue',
  FBA: 'green',
  DROPSHIP: 'orange',
  CUSTOM: 'cyan',
}

export const VendorBranch = memo(function VendorBranch({ onEdit, vendor }: VendorBranchProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const params = useMemo(
    () => ({ limit: 20, page: 1, q: deferredSearch || undefined, vendorId: vendor.id }),
    [deferredSearch, vendor.id],
  )

  const products = useQuery({
    enabled: expanded,
    queryKey: vendorKeys.products(vendor.id, params),
    queryFn: () => listVendorProducts(params),
    retry: false,
  })

  const canWrite = getGlobalPermissions().includes('VENDORS:WRITE')
  const openLabel = expanded
    ? t('vendors.close', { name: vendor.name })
    : t('vendors.open', { name: vendor.name })

  const isIntegrated = Boolean(vendor.providerKey && vendor.providerKey !== 'CUSTOM')

  return (
    <section
      className={styles.vendorNode}
      role="treeitem"
      aria-expanded={expanded}
      aria-selected={expanded}
    >
      <div className={styles.nodeHeader}>
        <button
          type="button"
          className={styles.nodeButton}
          aria-label={openLabel}
          onClick={() => setExpanded((value) => !value)}
        >
          {/* Chevron expand indicator */}
          <span style={{ fontSize: 11, color: '#8c8c8c', width: 14 }}>
            {expanded ? <DownOutlined /> : <RightOutlined />}
          </span>

          {/* Vendor Avatar Badge */}
          <Avatar
            shape="square"
            size={36}
            style={{
              background: 'var(--ant-color-primary-bg)',
              color: 'var(--ant-color-primary)',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            {vendor.code?.slice(0, 2).toUpperCase() || <ShopOutlined />}
          </Avatar>

          {/* Identity & Tags */}
          <span className={styles.nodeIdentity}>
            <Flex align="center" gap={8}>
              <strong>{vendor.name}</strong>
              <Tag color="default" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                {vendor.code}
              </Tag>
              {vendor.fulfillmentType ? (
                <Tag
                  color={TYPE_COLOR_MAP[vendor.fulfillmentType] ?? 'default'}
                  style={{ fontSize: 11 }}
                >
                  {vendor.fulfillmentType}
                </Tag>
              ) : null}
              {isIntegrated ? (
                <Tag color="processing" icon={<ApiOutlined />} style={{ fontSize: 11 }}>
                  {vendor.providerKey}
                </Tag>
              ) : null}
            </Flex>
          </span>

          <VendorStatus status={vendor.status} />
        </button>

        {/* Inline Actions */}
        {canWrite ? (
          <Space size={2} onClick={(event) => event.stopPropagation()}>
            <Tooltip title={t('vendors.addProduct')}>
              <Button
                type="text"
                aria-label={t('vendors.addProduct')}
                icon={<PlusOutlined />}
                onClick={() => onEdit({ kind: 'product', vendorId: vendor.id })}
              />
            </Tooltip>
            <Tooltip title={t('vendors.editVendor', { name: vendor.name })}>
              <Button
                type="text"
                aria-label={t('vendors.editVendor', { name: vendor.name })}
                icon={<EditOutlined />}
                onClick={() => onEdit({ kind: 'vendor', item: vendor })}
              />
            </Tooltip>
            <Tooltip title={t('vendors.configureIntegration', { name: vendor.name })}>
              <Button
                type="text"
                aria-label={t('vendors.configureIntegration', { name: vendor.name })}
                icon={<ApiOutlined />}
                onClick={() => onEdit({ kind: 'integration', vendor })}
              />
            </Tooltip>
          </Space>
        ) : null}
      </div>

      {expanded ? (
        <div className={styles.childBranch} role="group">
          <SearchInput
            aria-label={t('vendors.searchProducts')}
            placeholder={t('vendors.searchProducts')}
            value={search}
            onSearchChange={setSearch}
          />
          {products.isLoading ? <div className={styles.branchLoading} aria-busy="true" /> : null}
          {products.isError ? (
            <div className={styles.branchError} role="alert">
              <span>{t('vendors.branchUnavailable')}</span>
              <Button type="link" onClick={() => void products.refetch()}>
                {t('vendors.retry')}
              </Button>
            </div>
          ) : null}
          {!products.isLoading && !products.isError && (products.data?.items.length ?? 0) === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('vendors.noProducts')} />
          ) : null}
          {(products.data?.items ?? []).map((product) => (
            <VendorProductBranch
              onEdit={onEdit}
              product={product}
              vendorId={vendor.id}
              key={product.id}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
})
