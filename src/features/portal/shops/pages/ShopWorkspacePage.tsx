import { useTranslation } from 'react-i18next'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button } from 'antd'

import { FeedbackAlert } from '@/shared/ui'

import { type CreateShopInput } from '../api/shopApi'
import { ShopEditorModal } from './components/ShopEditorModal'
import { ShopWorkspaceMetrics } from './components/ShopWorkspaceMetrics'
import { ShopWorkspaceTable } from './components/ShopWorkspaceTable'
import styles from './ShopWorkspacePage.module.scss'
import { useShopWorkspacePage } from './useShopWorkspacePage'

export function ShopWorkspacePage() {
  const { t } = useTranslation()
  const { value, handle } = useShopWorkspacePage()
  const {
    retry,
    clearFilters,
    create,
    createOpen,
    editShop,
    pageChange,
    searchChange,
    statusChange,
    editorClose,
    updateStatus,
  } = handle
  const {
    account,
    activeCount,
    canCreate,
    totalShops,
    inactiveCount,
    canWriteAnyShop,
    shops,
    canWriteEditingShop,
    editingShop,
    modalOpen,
    modalSaving,
    params,
    search,
  } = value

  return (
    <section className={styles.page}>
      <ShopWorkspaceMetrics
        totalShops={totalShops}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        loading={shops.isLoading}
      />

      {shops.error ? (
        <FeedbackAlert
          type="error"
          title={t('portal.shops.unavailable')}
          action={
            <Button type="link" icon={<ReloadOutlined aria-hidden />} onClick={retry}>
              {t('portal.shops.retry')}
            </Button>
          }
        />
      ) : null}

      <ShopWorkspaceTable
        account={account}
        canWriteAnyShop={canWriteAnyShop}
        data={shops.data}
        loading={shops.isLoading}
        params={params}
        search={search}
        onClearFilters={clearFilters}
        onEditShop={editShop}
        onPageChange={pageChange}
        onSearchChange={searchChange}
        onStatusChange={statusChange}
        actions={
          canCreate ? (
            <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={createOpen}>
              {t('portal.shops.createAction')}
            </Button>
          ) : null
        }
      />

      <ShopEditorModal
        canWrite={canWriteEditingShop}
        open={modalOpen}
        saving={modalSaving}
        shop={editingShop}
        onClose={editorClose}
        onCreate={(input: CreateShopInput) => create(input)}
        onUpdateStatus={updateStatus}
      />
    </section>
  )
}

export default ShopWorkspacePage
