import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useBlocker, useParams, useRouteLoaderData } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Modal, Spin, Typography } from 'antd'
import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { FeedbackAlert } from '@/shared/ui'
import { listingLaunchKeys } from '../api/listingLaunchKeys'
import ContentReviewPanel from '../components/ContentReviewPanel'
import LaunchDraftForm from '../components/LaunchDraftForm'
import DraftMetadataForm from '../components/DraftMetadataForm'
import MockupAnalysisPanel from '../components/MockupAnalysisPanel'
import MockupConfirmationForm from '../components/MockupConfirmationForm'
import { canWriteLaunch } from '../guards/listingLaunchAccess'
import { useLaunch } from '../hooks/useListingLaunchQueries'
import styles from './ListingLaunchDetailPage.module.scss'
export default function ListingLaunchDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const query = useLaunch(id)
  const client = useQueryClient()
  const [inputsDirty, setInputsDirty] = useState(false)
  const [contentDirty, setContentDirty] = useState(false)
  const [metadataDirty, setMetadataDirty] = useState(false)
  const dirty = inputsDirty || contentDirty || metadataDirty
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const saved = () => {
    void client.invalidateQueries({ queryKey: listingLaunchKeys.detail(id) })
    void client.invalidateQueries({ queryKey: ['catalog', 'listing-options'] })
  }
  const launch = query.data
  if (!launch)
    return query.error ? (
      <FeedbackAlert
        type="error"
        title={t('listingLaunch.error')}
        description={query.error.message}
      />
    ) : (
      <Spin />
    )
  const canWrite = canWriteLaunch(account, launch.shopId)
  return (
    <div className={styles.page}>
      <Link to={workspaceRouteLinks.listingLaunches}>{t('listingLaunch.back')}</Link>
      <Typography.Title level={3}>{launch.workingTitle || launch.brief}</Typography.Title>
      <DraftMetadataForm
        launch={launch}
        canWrite={canWrite && !query.error && !inputsDirty && !contentDirty}
        onSaved={saved}
        onDirty={setMetadataDirty}
      />
      <FeedbackAlert type="info" title={t('listingLaunch.candidateNotice')} />
      {query.error ? (
        <FeedbackAlert
          type="error"
          title={t('listingLaunch.error')}
          description={query.error.message}
        />
      ) : null}
      {dirty ? (
        <FeedbackAlert
          type="warning"
          title={t('listingLaunch.unsaved')}
          action={<Button onClick={saved}>{t('listingLaunch.refresh')}</Button>}
        />
      ) : null}
      {launch.state === 'BRIEF' ? (
        <LaunchDraftForm launch={launch} account={account} onSaved={saved} />
      ) : (
        <>
          <div className={styles.columns}>
            <MockupAnalysisPanel
              launch={launch}
              canWrite={canWrite && !query.error}
              onSaved={saved}
              dirty={dirty}
            />
            <MockupConfirmationForm
              key={id}
              launch={launch}
              canWrite={canWrite && !query.error}
              onSaved={saved}
              onDirty={setInputsDirty}
            />
          </div>
          <ContentReviewPanel
            launch={launch}
            canWrite={canWrite && !query.error}
            onSaved={saved}
            dirty={inputsDirty || metadataDirty}
            onDirty={setContentDirty}
          />
        </>
      )}
      <Modal
        open={blocker.state === 'blocked'}
        title={t('listingLaunch.unsaved')}
        onOk={() => blocker.state === 'blocked' && blocker.proceed()}
        onCancel={() => blocker.state === 'blocked' && blocker.reset()}
        okText={t('listingLaunch.discard')}
        cancelText={t('listingLaunch.cancel')}
      />
    </div>
  )
}
