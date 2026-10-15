import { useTranslation } from 'react-i18next'
import { PaperClipOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { Alert, Button, Space } from 'antd'

import type { ChatMessage } from '@/features/portal/chat/api/chatApi'
import { AuthenticatedMediaImage, downloadMediaAsset } from '@/shared/media'

import styles from './ChatAttachments.module.scss'

export function ChatAttachments({ message }: { message: ChatMessage }) {
  const { t } = useTranslation()
  const download = useMutation({
    mutationFn: ({ url, name }: { url: string; name: string }) => downloadMediaAsset(url, name),
  })
  const assets = message.assets?.length
    ? message.assets
    : message.assetIds.map((id) => ({
        id,
        originalFilename: null,
        mimeType: null,
        downloadUrl: `/api/media/assets/${id}/download`,
      }))
  if (!assets.length) return null
  return (
    <Space orientation="vertical" className={styles.attachments}>
      {assets.map((asset) => {
        const name = asset.originalFilename || asset.id
        const url = asset.downloadUrl || `/api/media/assets/${asset.id}/download`
        return (
          <div key={asset.id}>
            {asset.mimeType?.startsWith('image/') ? (
              <AuthenticatedMediaImage alt={name} downloadUrl={url} className={styles.image} />
            ) : null}
            <Button
              className={styles.download}
              type="link"
              icon={<PaperClipOutlined />}
              loading={download.isPending && download.variables?.url === url}
              onClick={() => download.mutate({ url, name })}
            >
              {name}
            </Button>
          </div>
        )
      })}
      {download.isError ? <Alert type="error" title={t('chatMedia.downloadFailed')} /> : null}
    </Space>
  )
}
