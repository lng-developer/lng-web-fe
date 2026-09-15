import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Button, Card, Progress, Space, Tag } from 'antd'
import { ApiError } from '@/shared/api'
import { AuthenticatedMediaImage } from '@/shared/media/AuthenticatedMediaImage'
import { FeedbackAlert, FileUpload, useFeedbackToast } from '@/shared/ui'
import { requestMockupAnalysis, uploadMockup } from '../api/listingLaunchApi'
import type { Launch } from '../api/listingLaunchTypes'
import { useGenerationIntent } from '../hooks/useGenerationIntent'
import { activeRun } from '../hooks/useLaunchRunPolling'
import styles from '../pages/ListingLaunchDetailPage.module.scss'
export default function MockupAnalysisPanel({
  launch,
  canWrite,
  onSaved,
  dirty,
}: {
  launch: Launch
  canWrite: boolean
  onSaved: () => void
  dirty: boolean
}) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const intent = useGenerationIntent(launch.id, 'analysis')
  const [progress, setProgress] = useState(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error(t('listingLaunch.imageLimit'))
      controller.current = new AbortController()
      return uploadMockup(
        launch.id,
        file,
        {
          expectedMockupRevision: launch.mockupRevision,
          expectedInputVersion: launch.contentInputVersion,
        },
        { signal: controller.current.signal, onProgress: setProgress },
      )
    },
    onSuccess: () => {
      intent.clear()
      toast('success', t('listingLaunch.uploaded'))
    },
    onSettled: onSaved,
  })
  const analysis = useMutation({
    mutationFn: () =>
      requestMockupAnalysis(launch.id, {
        ...intent.getOrCreate({ expectedMockupRevision: launch.mockupRevision }),
        expectedMockupRevision: launch.mockupRevision,
      }),
    onSuccess: (response) => {
      intent.clear()
      if (response.dispatchWarning) toast('warning', t('listingLaunch.dispatchPending'))
    },
    onError: (error) => {
      if (error instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(error.status || 0))
        intent.clear()
    },
    onSettled: onSaved,
  })
  const run = launch.latestMockupAnalysis
  return (
    <Card title={t('listingLaunch.mockup')}>
      <div className={styles.stack}>
        {launch.mockup ? (
          <AuthenticatedMediaImage
            className={styles.preview}
            downloadUrl={launch.mockup.downloadUrl}
            alt={t('listingLaunch.mockup')}
          />
        ) : null}
        <FeedbackAlert
          type="info"
          title={t('listingLaunch.previewNotice')}
          description={t('listingLaunch.providerDisclosure')}
        />
        {canWrite && !dirty && !upload.isPending ? (
          <FileUpload
            title={t('listingLaunch.upload')}
            description={t('listingLaunch.imageLimit')}
            accept="image/png,image/jpeg,image/webp"
            maxCount={1}
            multiple={false}
            fileList={[]}
            onChange={({ file }) => {
              const original = file.originFileObj || (file as unknown as File)
              if (!upload.isPending) upload.mutate(original)
            }}
          />
        ) : null}
        {upload.isPending ? (
          <Space>
            <Progress percent={progress} />
            <Button onClick={() => controller.current?.abort()}>{t('listingLaunch.cancel')}</Button>
          </Space>
        ) : null}
        {upload.error || analysis.error ? (
          <FeedbackAlert
            type="error"
            title={t('listingLaunch.error')}
            description={(upload.error || analysis.error)?.message}
          />
        ) : null}
        <Button
          onClick={() => analysis.mutate()}
          loading={analysis.isPending}
          disabled={
            !canWrite || !launch.mockup || upload.isPending || activeRun(run?.status) || dirty
          }
        >
          {t('listingLaunch.analyze')}
        </Button>
        {run ? (
          <>
            <Tag>{t(`listingLaunch.${run.status}`)}</Tag>
            {run.errorCode ? (
              <FeedbackAlert
                type={run.status === 'FAILED' ? 'error' : 'warning'}
                title={run.errorCode}
                description={run.errorMessage || undefined}
              />
            ) : null}
            {run.isStale ? <FeedbackAlert type="warning" title={t('listingLaunch.stale')} /> : null}
            {run.result?.warnings.map((warning, i) => (
              <Tag key={`${warning}-${i}`}>{warning}</Tag>
            ))}
          </>
        ) : null}
      </div>
    </Card>
  )
}
