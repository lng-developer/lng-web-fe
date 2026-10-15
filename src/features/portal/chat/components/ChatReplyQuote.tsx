import { useTranslation } from 'react-i18next'
import { CloseOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import type { ChatMessage, ChatParticipant } from '../api/chatApi'
import { participantLabel } from './chatViewUtils'
import styles from './ChatMessageActions.module.scss'

type Quote = Pick<ChatMessage, 'senderAccountId' | 'body'> & {
  attachmentCount?: number
  assetIds?: string[]
}

export function ChatReplyQuote({
  quote,
  participants,
  onCancel,
  disabled,
}: {
  quote?: Quote | null
  participants: Map<string, ChatParticipant>
  onCancel?: () => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      className={`${styles.quote} ${onCancel ? styles.quoteDraft : ''}`}
      aria-label={t('chatReply.quote')}
    >
      <div className="min-w-0 flex-1">
        <strong className={styles.quoteSender}>
          {quote
            ? participantLabel(participants.get(quote.senderAccountId)) ||
              t('chatReply.unknownSender')
            : t('chatReply.unavailable')}
        </strong>
        {quote ? (
          <div className={styles.quoteText}>
            {quote.body ||
              t('chatReply.attachments', {
                count: quote.attachmentCount ?? quote.assetIds?.length ?? 0,
              })}
          </div>
        ) : null}
      </div>
      {onCancel ? (
        <Button
          size="small"
          type="text"
          icon={<CloseOutlined />}
          aria-label={t('chatReply.cancel')}
          onClick={onCancel}
          disabled={disabled}
        />
      ) : null}
    </div>
  )
}
