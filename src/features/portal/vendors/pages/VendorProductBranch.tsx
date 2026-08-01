import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Empty, Space, Tooltip } from 'antd'

import { getGlobalPermissions } from '@/shared/auth/session'
import { SearchInput } from '@/shared/ui'

import { listVendorCostCenters, type VendorProduct } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { type VendorEditorCommand, VendorStatus } from './VendorTree'
import styles from './VendorWorkspacePage.module.scss'

interface VendorProductBranchProps {
  readonly onEdit: (command: VendorEditorCommand) => void
  readonly product: VendorProduct
  readonly vendorId: string
}

export const VendorProductBranch = memo(function VendorProductBranch({
  onEdit,
  product,
  vendorId,
}: VendorProductBranchProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const params = { limit: 20, page: 1, q: search }
  const costCenters = useQuery({
    enabled: expanded,
    queryKey: vendorKeys.costCenters(product.id, params),
    queryFn: () => listVendorCostCenters(product.id, params),
    retry: false,
  })
  const canWrite = getGlobalPermissions().includes('VENDORS:WRITE')

  return (
    <section
      className={styles.productNode}
      role="treeitem"
      aria-expanded={expanded}
      aria-selected={expanded}
    >
      <div className={styles.nodeHeader}>
        <button
          type="button"
          className={styles.nodeButton}
          aria-label={
            expanded
              ? t('vendors.close', { name: product.name })
              : t('vendors.open', { name: product.name })
          }
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={styles.nodeIdentity}>
            <strong>{product.name}</strong>
            <small>
              {[
                product.code,
                product.productTypeGroup?.name,
                product.baseCostAmount === undefined
                  ? null
                  : `${product.baseCostAmount} ${product.currency ?? ''}`.trim(),
                product.minProductionDays === null && product.maxProductionDays === null
                  ? null
                  : `${product.minProductionDays ?? 0}-${product.maxProductionDays ?? product.minProductionDays ?? 0} ${t('vendors.days')}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </span>
          <span>{product.costCenterCount}</span>
          <VendorStatus status={product.status} />
        </button>
        {canWrite ? (
          <Space size={2} onClick={(event) => event.stopPropagation()}>
            <Tooltip title={t('vendors.addCostCenter')}>
              <Button
                type="text"
                aria-label={t('vendors.addCostCenter')}
                icon={<PlusOutlined />}
                onClick={() => onEdit({ kind: 'costCenter', productId: product.id, vendorId })}
              />
            </Tooltip>
            <Tooltip title={t('vendors.editProduct', { name: product.name })}>
              <Button
                type="text"
                aria-label={t('vendors.editProduct', { name: product.name })}
                icon={<EditOutlined />}
                onClick={() => onEdit({ kind: 'product', item: product, vendorId })}
              />
            </Tooltip>
          </Space>
        ) : null}
      </div>
      {expanded ? (
        <div className={styles.costCenterBranch} role="group">
          <SearchInput
            aria-label={t('vendors.searchCostCenters')}
            placeholder={t('vendors.searchCostCenters')}
            value={search}
            onSearchChange={setSearch}
          />
          {costCenters.isLoading ? <div className={styles.branchLoading} aria-busy="true" /> : null}
          {costCenters.isError ? (
            <div className={styles.branchError} role="alert">
              <span>{t('vendors.branchUnavailable')}</span>
              <Button type="link" onClick={() => void costCenters.refetch()}>
                {t('vendors.retry')}
              </Button>
            </div>
          ) : null}
          {!costCenters.isLoading &&
          !costCenters.isError &&
          (costCenters.data?.items.length ?? 0) === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('vendors.noCostCenters')} />
          ) : null}
          {(costCenters.data?.items ?? []).map((costCenter) => (
            <div
              className={styles.costCenterNode}
              role="treeitem"
              aria-selected={false}
              key={costCenter.id}
            >
              <span className={styles.nodeIdentity}>
                <strong>{costCenter.name}</strong>
                <small>
                  {[
                    costCenter.code,
                    costCenter.sku ?? costCenter.lngCode,
                    costCenter.standardSize,
                    costCenter.standardColor,
                    costCenter.baseCostAmount === undefined
                      ? null
                      : `${costCenter.baseCostAmount} ${costCenter.currency ?? ''}`.trim(),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
              <VendorStatus status={costCenter.status} />
              {canWrite ? (
                <Tooltip title={t('vendors.editCostCenter', { name: costCenter.name })}>
                  <Button
                    type="text"
                    aria-label={t('vendors.editCostCenter', { name: costCenter.name })}
                    icon={<EditOutlined />}
                    onClick={() =>
                      onEdit({
                        kind: 'costCenter',
                        item: costCenter,
                        productId: product.id,
                        vendorId,
                      })
                    }
                  />
                </Tooltip>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
})
