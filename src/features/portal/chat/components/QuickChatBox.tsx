import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CloseOutlined,
  MinusOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Avatar, Badge, Button, Empty, Input } from 'antd'

import {
  type ChatConversation,
  type ChatParticipant,
  listChatMessages,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { conversationTitle, participantLabel } from './chatViewUtils'

import styles from './ChatShell.module.scss'

type QuickChatBoxProps = {
  conversationId: string
  conversation?: ChatConversation | null
  currentAccountId: string
  participantById: Map<string, ChatParticipant>
  isMinimized: boolean
  isUnread: boolean
  style?: React.CSSProperties
  onToggleMinimize: () => void
  onClose: () => void
  onMarkRead: () => void
  onFocus?: () => void
  socketReady: boolean
  isChatWorkspace: boolean
}

export function QuickChatBox({
  conversationId,
  conversation,
  currentAccountId,
  participantById,
  isMinimized,
  isUnread,
  style,
  onToggleMinimize,
  onClose,
  onMarkRead,
  onFocus,
  socketReady,
  isChatWorkspace,
}: QuickChatBoxProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const onMarkReadRef = useRef(onMarkRead)

  useEffect(() => {
    onMarkReadRef.current = onMarkRead
  }, [onMarkRead])

  const quickMessages = useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: () => listChatMessages(conversationId, { page: 1, limit: 25 }),
    enabled: Boolean(conversationId) && !isChatWorkspace,
    refetchInterval: conversationId && !isChatWorkspace && !socketReady ? 30_000 : false,
  })

  const messageItems = [...(quickMessages.data?.items ?? [])].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )

  const quickSend = useMutation({
    mutationFn: () =>
      sendChatMessage(conversationId, {
        body: draft.trim(),
        assetIds: [],
      }),
    onSuccess: async () => {
      setDraft('')
    },
  })

  const unreadCount = conversation?.unreadCount ?? 0

  useEffect(() => {
    if (!isMinimized && (isUnread || unreadCount > 0)) {
      onMarkReadRef.current()
    }
  }, [isMinimized, isUnread, unreadCount])

  useEffect(() => {
    if (isMinimized || quickMessages.isLoading) return
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView?.({ block: 'end' })
    })
  }, [isMinimized, messageItems.length, quickMessages.isLoading])

  const title = conversation
    ? conversationTitle(conversation, participantById, currentAccountId)
    : t('shell.navigation.chat', 'Chat')

  const canSend = Boolean(conversationId && draft.trim() && !quickSend.isPending)

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      className={`${styles.quickChatWindow} ${isUnread ? styles.quickChatWindowUnread : ''}`}
      style={{
        ...style,
        display: isMinimized ? 'none' : 'flex',
      }}
      aria-label={title}
      onMouseDown={onFocus}
    >
      <div className={styles.quickChatHeader}>
        <div className={styles.quickChatHeaderInfo}>
          <Badge dot={isUnread} offset={[-2, 28]}>
            <Avatar
              size={30}
              icon={conversation?.type === 'DIRECT' ? <UserOutlined /> : <TeamOutlined />}
            />
          </Badge>
          <strong className={styles.quickChatTitle}>{title}</strong>
        </div>
        <div className={styles.quickChatHeaderActions}>
          <Button
            aria-label={t('chat.minimize', 'Minimize')}
            className={styles.quickChatHeaderActionBtn}
            icon={<MinusOutlined />}
            size="small"
            shape="circle"
            type="text"
            onClick={(e) => {
              e.stopPropagation()
              onToggleMinimize()
            }}
          />
          <Button
            aria-label={t('common.close', 'Close')}
            className={styles.quickChatHeaderActionBtn}
            icon={<CloseOutlined />}
            size="small"
            shape="circle"
            type="text"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />
        </div>
      </div>
      <div className={styles.quickChatBody}>
        <div className={styles.quickChatMessages}>
          {messageItems.map((message) => {
            const isOwn = message.senderAccountId === currentAccountId
            const showSenderName = !isOwn && conversation?.type !== 'DIRECT'
            const senderName = showSenderName
              ? participantLabel(participantById.get(message.senderAccountId))
              : null

            return (
              <div
                key={message.id}
                className={isOwn ? styles.quickMessageGroupOwn : styles.quickMessageGroupOther}
              >
                {senderName ? (
                  <span className={styles.quickMessageSender}>{senderName}</span>
                ) : null}
                <div className={isOwn ? styles.quickMessageOwn : styles.quickMessageOther}>
                  {message.body}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} aria-hidden="true" />
          {!quickMessages.isLoading && !messageItems.length ? (
            <Empty description={t('chat.noMessages', 'No messages yet')} />
          ) : null}
        </div>
        <div className={styles.quickChatComposer}>
          <Input
            aria-label={t('chat.messageInput', 'Message')}
            placeholder={t('chat.messagePlaceholder', 'Aa')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => onMarkReadRef.current()}
            onPressEnter={() => {
              if (canSend) quickSend.mutate()
            }}
            className={styles.quickChatInput}
          />
          <Button
            aria-label={t('chat.send', 'Send')}
            disabled={!canSend}
            icon={<SendOutlined />}
            shape="circle"
            type="primary"
            className={styles.quickChatSendButton}
            onClick={() => quickSend.mutate()}
          />
        </div>
      </div>
    </section>
  )
}
