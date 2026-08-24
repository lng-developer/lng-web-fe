import { memo, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Button, Empty } from 'antd'

import { getGlobalPermissions } from '@/shared/auth/session'
import { SearchInput, StatusTag } from '@/shared/ui'

import { listVendors, type Vendor } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'
import { VendorBranch } from './VendorBranch'
import styles from './VendorWorkspacePage.module.scss'

export type VendorEditorCommand =
  | { kind: 'vendor'; item?: Vendor }
  | { kind: 'product'; item?: import('../api/vendorApi').VendorProduct; vendorId: string }
  | {
      kind: 'costCenter'
      item?: import('../api/vendorApi').VendorCostCenter
      productId: string
      vendorId: string
    }
  | { kind: 'integration'; vendor: Vendor }

export interface VendorTreeProps {
  readonly onEdit: (command: VendorEditorCommand) => void
}

export function VendorTree({ onEdit }: VendorTreeProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const params = useMemo(
    () => ({ limit: 50, page: 1, q: deferredSearch || undefined }),
    [deferredSearch],
  )
  const canWrite = getGlobalPermissions().includes('VENDORS:WRITE')

  const vendors = useQuery({
    queryKey: vendorKeys.vendors(params),
    queryFn: () => listVendors(params),
  })

  if (vendors.isError) {
    return (
      <div className={styles.branchError} role="alert">
        <span>{t('vendors.unavailable')}</span>
        <Button type="link" onClick={() => void vendors.refetch()}>
          {t('vendors.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.tree} role="tree" aria-label={t('vendors.directory')}>
      <div className={styles.treeToolbar}>
        <SearchInput
          aria-label={t('vendors.searchVendors')}
          placeholder={t('vendors.searchVendors')}
          value={search}
          onSearchChange={setSearch}
        />
        {canWrite ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onEdit({ kind: 'vendor' })}>
            {t('vendors.addVendor')}
          </Button>
        ) : null}
      </div>
      {vendors.isLoading ? <div className={styles.branchLoading} aria-busy="true" /> : null}
      {!vendors.isLoading && (vendors.data?.items.length ?? 0) === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('vendors.noVendors')} />
      ) : null}
      {(vendors.data?.items ?? []).map((vendor) => (
        <VendorBranch onEdit={onEdit} vendor={vendor} key={vendor.id} />
      ))}
    </div>
  )
}

export const VendorStatus = memo(function VendorStatus({ status }: { readonly status: string }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  return (
    <StatusTag status={status === 'ACTIVE' ? 'operational' : 'draft'}>{t(`vendors.status.${status}`)}</StatusTag>
  )
})
