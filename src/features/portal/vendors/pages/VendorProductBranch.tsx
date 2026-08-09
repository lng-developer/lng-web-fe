import { memo, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  RightOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Empty, Flex, Image, Space, Tag, Tooltip } from 'antd'

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
  const deferredSearch = useDeferredValue(search)

  const params = useMemo(
    () => ({ limit: 30, page: 1, q: deferredSearch || undefined }),
    [deferredSearch],
  )
  const costCenters = useQuery({
    enabled: expanded,
    queryKey: vendorKeys.costCenters(product.id, params),
    queryFn: () => listVendorCostCenters(product.id, params),
    retry: false,
  })
  const canWrite = getGlobalPermissions().includes('VENDORS:WRITE')

  const slaDays =
    product.minProductionDays !== null || product.maxProductionDays !== null
      ? `${product.minProductionDays ?? 0}-${product.maxProductionDays ?? product.minProductionDays ?? 0} ${t('vendors.days')}`
      : null

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
          {/* Chevron indicator */}
          <span style={{ fontSize: 11, color: '#8c8c8c', width: 14 }}>
            {expanded ? <DownOutlined /> : <RightOutlined />}
          </span>

          {/* Thumbnail preview / Icon */}
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }}
              preview={false}
            />
          ) : (
            <Avatar
              shape="square"
              size={32}
              icon={<AppstoreOutlined />}
              style={{ background: '#f5f5f5', color: '#8c8c8c', borderRadius: 4 }}
            />
          )}

          {/* Product Info & Visual Badges */}
          <span className={styles.nodeIdentity}>
            <Flex align="center" gap={8} wrap="wrap">
              <strong>{product.name}</strong>
              <Tag color="default" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                {product.code}
              </Tag>
              {product.productTypeGroup?.name ? (
                <Tag color="blue" style={{ fontSize: 11 }}>
                  {product.productTypeGroup.name}
                </Tag>
              ) : null}
              {slaDays ? (
                <Tag color="cyan" icon={<ClockCircleOutlined />} style={{ fontSize: 11 }}>
                  {slaDays}
                </Tag>
              ) : null}
              {product.baseCostAmount !== undefined ? (
                <Tag color="green" style={{ fontSize: 11, fontWeight: 600 }}>
                  ${product.baseCostAmount} {product.currency ?? ''}
                </Tag>
              ) : null}
              <Tag color="geekblue" style={{ fontSize: 11 }}>
                {product.costCenterCount} cost centers
              </Tag>
            </Flex>
          </span>

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
                <Flex align="center" gap={8} wrap="wrap">
                  <TagOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                  <strong>{costCenter.name}</strong>
                  <Tag color="default" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                    {costCenter.code}
                  </Tag>
                  {costCenter.standardSize ? (
                    <Tag color="purple" style={{ fontSize: 11 }}>
                      Size: {costCenter.standardSize}
                    </Tag>
                  ) : null}
                  {costCenter.standardColor ? (
                    <Tag color="magenta" style={{ fontSize: 11 }}>
                      Color: {costCenter.standardColor}
                    </Tag>
                  ) : null}
                  {costCenter.baseCostAmount !== undefined ? (
                    <Tag color="green" style={{ fontSize: 11, fontWeight: 600 }}>
                      ${costCenter.baseCostAmount} {costCenter.currency ?? ''}
                    </Tag>
                  ) : null}
                </Flex>
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
