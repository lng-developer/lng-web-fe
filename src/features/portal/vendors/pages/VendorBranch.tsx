import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Empty, Space, Tooltip } from 'antd'

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

export const VendorBranch = memo(function VendorBranch({ onEdit, vendor }: VendorBranchProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const params = { limit: 20, page: 1, q: search, vendorId: vendor.id }
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
          <span className={styles.nodeIdentity}>
            <strong>{vendor.name}</strong>
            <small>
              {[vendor.code, vendor.providerKey, vendor.fulfillmentType]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </span>
          <VendorStatus status={vendor.status} />
        </button>
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
