import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader, SectionCard } from '@/shared/ui'

import { VendorCostCenterEditorModal } from './VendorCostCenterEditorModal'
import { VendorEditorModal } from './VendorEditorModal'
import { VendorIntegrationModal } from './VendorIntegrationModal'
import { VendorProductEditorModal } from './VendorProductEditorModal'
import { type VendorEditorCommand, VendorTree } from './VendorTree'
import styles from './VendorWorkspacePage.module.scss'

export function VendorWorkspacePage() {
  const { t } = useTranslation(undefined, { keyPrefix: 'portal' })
  const [editor, setEditor] = useState<VendorEditorCommand>()
  const close = () => setEditor(undefined)

  return (
    <section className={styles.page}>
      <PageHeader title={t('vendors.title')} description={t('vendors.description')} />
      <SectionCard title={t('vendors.directory')}>
        <VendorTree onEdit={setEditor} />
      </SectionCard>
      {editor?.kind === 'vendor' ? (
        <VendorEditorModal item={editor.item} open onCancel={close} onSaved={close} />
      ) : null}
      {editor?.kind === 'product' ? (
        <VendorProductEditorModal
          item={editor.item}
          open
          vendorId={editor.vendorId}
          onCancel={close}
          onSaved={close}
        />
      ) : null}
      {editor?.kind === 'costCenter' ? (
        <VendorCostCenterEditorModal
          item={editor.item}
          open
          productId={editor.productId}
          vendorId={editor.vendorId}
          onCancel={close}
          onSaved={close}
        />
      ) : null}
      {editor?.kind === 'integration' ? (
        <VendorIntegrationModal open vendorId={editor.vendor.id} onCancel={close} onSaved={close} />
      ) : null}
    </section>
  )
}
