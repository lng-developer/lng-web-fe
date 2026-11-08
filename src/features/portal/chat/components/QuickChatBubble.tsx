import { useState } from 'react'
import { CloseOutlined, TeamOutlined } from '@ant-design/icons'
import { Avatar, Badge, Tooltip } from 'antd'

import type { ChatConversation, ChatParticipant } from '@/features/portal/chat/api/chatApi'
import { conversationTitle } from './chatViewUtils'
import { EmployeeAvatar } from '@/shared/ui'

import styles from './ChatShell.module.scss'

type QuickChatBubbleProps = {
  conversationId: string
  conversation?: ChatConversation | null
  currentAccountId: string
  participantById: Map<string, ChatParticipant>
  isUnread: boolean
  unreadCount?: number
  index: number
  onExpand: () => void
  onClose: () => void
  chatLabel: string
}

export function QuickChatBubble({
  conversation,
  currentAccountId,
  participantById,
  isUnread,
  unreadCount,
  index,
  onExpand,
  onClose,
  chatLabel,
}: QuickChatBubbleProps) {
  const [isHovered, setIsHovered] = useState(false)
  const title = conversation
    ? conversationTitle(conversation, participantById, currentAccountId)
    : chatLabel

  const otherId = conversation?.participantAccountIds?.find((id) => id !== currentAccountId)
  const otherParticipant = otherId ? participantById.get(otherId) : undefined

  const displayCount = unreadCount || (isUnread ? 1 : 0)

  return (
    <div
      className={styles.chatBubbleWrapper}
      style={{
        bottom: `calc(max(20px, env(safe-area-inset-bottom)) + ${index * 62}px)`,
        right: 'max(20px, env(safe-area-inset-right))',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tooltip
        title={title}
        placement="left"
        zIndex={2147483060}
        rootClassName={styles.bubbleTooltip}
      >
        <button
          className={`${styles.chatBubbleButton} ${isUnread ? styles.chatBubbleButtonUnread : ''}`}
          type="button"
          aria-label={chatLabel}
          onClick={onExpand}
        >
          <Badge
            dot={isUnread && !unreadCount}
            count={isUnread ? displayCount : 0}
            size="small"
            offset={[-4, 4]}
          >
            {conversation?.type === 'DIRECT' ? (
              <EmployeeAvatar
                size={48}
                name={title || ''}
                avatarUrl={otherParticipant?.avatarUrl}
                className={styles.chatBubbleAvatar}
              />
            ) : (
              <Avatar size={48} icon={<TeamOutlined />} className={styles.chatBubbleAvatar} />
            )}
          </Badge>
        </button>
      </Tooltip>
      {isHovered ? (
        <button
          className={styles.chatBubbleCloseBtn}
          type="button"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <CloseOutlined />
        </button>
      ) : null}
    </div>
  )
}
