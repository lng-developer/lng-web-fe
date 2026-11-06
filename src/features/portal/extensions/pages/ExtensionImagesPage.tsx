import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/shared/ui'
import ListingImageSyncPanel from '@/features/portal/integrations/listing-images/components/ListingImageSyncPanel'
import { useExtensionHub } from '../hooks/useExtensionHub'
import styles from './ExtensionImagesPage.module.scss'

export function ExtensionImagesPage() {
  const { t } = useTranslation()
  const { account, managementAgents, shopNames } = useExtensionHub()

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('legacyMenu.imageSync', { defaultValue: 'Listing Image Sync' })}
        description={t('portal.extensions.images.subtitle', {
          defaultValue:
            'Synchronize marketplace listing high-resolution gallery and mockup images to LNG System storage.',
        })}
      />

      <ListingImageSyncPanel account={account} agents={managementAgents} shopNames={shopNames} />
    </div>
  )
}
export default ExtensionImagesPage
