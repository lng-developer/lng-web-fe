import { useTranslation } from 'react-i18next'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button } from 'antd'

import { FeedbackAlert } from '@/shared/ui'

import { type CreateShopInput } from '../api/shopApi'
import { ShopWorkspaceMetrics } from './components/ShopWorkspaceMetrics'
import { ShopWorkspaceTable } from './components/ShopWorkspaceTable'
import { ShopEditorModal } from './ShopEditorModal'
import styles from './ShopWorkspacePage.module.scss'
import { useShopWorkspacePage } from './useShopWorkspacePage'

export function ShopWorkspacePage() {
  const { t } = useTranslation()
  const { value, handle } = useShopWorkspacePage()

  return (
    <section className={styles.page}>
      <ShopWorkspaceMetrics
        totalShops={value.totalShops}
        activeCount={value.activeCount}
        inactiveCount={value.inactiveCount}
        loading={value.shops.isLoading}
      />

      {value.shops.error ? (
        <FeedbackAlert
          type="error"
          title={t('portal.shops.unavailable')}
          action={
            <Button type="link" icon={<ReloadOutlined aria-hidden />} onClick={handle.retry}>
              {t('portal.shops.retry')}
            </Button>
          }
        />
      ) : null}

      <ShopWorkspaceTable
        account={value.account}
        canWriteAnyShop={value.canWriteAnyShop}
        data={value.shops.data}
        loading={value.shops.isLoading}
        params={value.params}
        search={value.search}
        onClearFilters={handle.clearFilters}
        onEditShop={handle.editShop}
        onPageChange={handle.pageChange}
        onSearchChange={handle.searchChange}
        onStatusChange={handle.statusChange}
        actions={
          value.canCreate ? (
            <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={handle.createOpen}>
              {t('portal.shops.createAction')}
            </Button>
          ) : null
        }
      />

      <ShopEditorModal
        canWrite={value.canWriteEditingShop}
        open={value.modalOpen}
        saving={value.modalSaving}
        shop={value.editingShop}
        onClose={handle.editorClose}
        onCreate={(input: CreateShopInput) => handle.create(input)}
        onUpdateStatus={handle.updateStatus}
      />
    </section>
  )
}

export default ShopWorkspacePage
