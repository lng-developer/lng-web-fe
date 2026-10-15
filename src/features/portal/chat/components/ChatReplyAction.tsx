import { useTranslation } from 'react-i18next'
import { Button } from 'antd'
import styles from './ChatMessageActions.module.scss'

export function ChatReplyAction({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const { t } = useTranslation()
  return (
    <Button
      className={styles.action}
      size="small"
      aria-label={t('chatReply.reply')}
      title={t('chatReply.reply')}
      disabled={disabled}
      onClick={onClick}
      icon={
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 14-5-5 5-5M4 9h10a6 6 0 0 1 6 6v5" />
        </svg>
      }
    />
  )
}
