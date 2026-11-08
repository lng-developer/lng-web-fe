import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CloseOutlined,
  MinusOutlined,
  PaperClipOutlined,
  SendOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Avatar, Button, Empty, Input, Upload, type UploadFile } from 'antd'

import {
  type ChatConversation,
  type ChatParticipant,
  type ChatMessage,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import {
  chatMessageOptions,
  receiveChatMessage,
  useTeamsChatSync,
} from '@/features/portal/chat/api/chatQueries'
import { uploadMediaAsset } from '@/features/portal/media/api/mediaApi'
import { EmployeeAvatar } from '@/shared/ui'

import { ChatAttachments } from './ChatAttachments'
import { ChatReplyQuote } from './ChatReplyQuote'
import { ChatReplyAction } from './ChatReplyAction'
import messageStyles from './ChatMessageActions.module.scss'
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
}: QuickChatBoxProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const uploadedIds = useRef(new Map<string, string>())
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const onMarkReadRef = useRef(onMarkRead)

  useEffect(() => {
    onMarkReadRef.current = onMarkRead
  }, [onMarkRead])

  const quickMessages = useQuery({
    ...chatMessageOptions(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: conversationId && !socketReady ? 30_000 : false,
  })

  const otherId = conversation?.participantAccountIds.find((id) => id !== currentAccountId)
  const otherParticipant = otherId ? participantById.get(otherId) : undefined
  const isOnline = otherParticipant?.presence === 'ONLINE'
  const isGroup = conversation?.type !== 'DIRECT'

  useTeamsChatSync(
    conversationId,
    !isMinimized &&
      conversation?.type === 'DIRECT' &&
      Boolean(otherId && participantById.get(otherId)?.email.toLowerCase().endsWith('@lngwork.co')),
  )

  const messageItems = [...(quickMessages.data?.items ?? [])].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )

  const quickSend = useMutation({
    mutationFn: async () => {
      const assetIds: string[] = []
      for (const file of files) {
        let id = uploadedIds.current.get(file.uid)
        if (!id) {
          const asset = await uploadMediaAsset(file.originFileObj as File)
          id = asset.id
          uploadedIds.current.set(file.uid, id)
        }
        assetIds.push(id)
      }
      return sendChatMessage(conversationId, {
        body: draft.trim(),
        assetIds,
        ...(replyTo ? { replyToMessageId: replyTo.id } : {}),
      })
    },
    onSuccess: async (message) => {
      await receiveChatMessage(queryClient, message)
      setDraft('')
      setReplyTo(null)
      setFiles([])
      uploadedIds.current.clear()
    },
  })

  const unreadCount = conversation?.unreadCount ?? 0

  useEffect(() => {
    if (!isMinimized && (isUnread || unreadCount > 0)) {
      onMarkReadRef.current()
    }
  }, [isMinimized, isUnread, unreadCount])

  const latestMessageId = messageItems.at(-1)?.id
  useEffect(() => {
    if (isMinimized || quickMessages.isLoading) return
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView?.({ block: 'end' })
    })
  }, [isMinimized, latestMessageId, quickMessages.isLoading])

  const title = conversation
    ? conversationTitle(conversation, participantById, currentAccountId)
    : t('shell.navigation.chat')

  const canSend = Boolean(conversationId && (draft.trim() || files.length) && !quickSend.isPending)

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
          <div className={styles.quickChatHeaderAvatarWrapper}>
            {!isGroup ? (
              <EmployeeAvatar
                size={34}
                name={title}
                avatarUrl={otherParticipant?.avatarUrl}
                className={styles.headerAvatar}
              />
            ) : (
              <Avatar size={34} icon={<TeamOutlined />} className={styles.headerAvatarGroup} />
            )}
            {!isGroup ? (
              isOnline ? (
                <span className={styles.onlineDot} title={t('chat.activeNow')} />
              ) : isUnread ? (
                <span className={styles.unreadDot} />
              ) : null
            ) : isUnread ? (
              <span className={styles.unreadDot} />
            ) : null}
          </div>
          <div className={styles.quickChatHeaderInfoText}>
            <strong className={styles.quickChatTitle} title={title}>
              {title}
            </strong>
            <span
              className={
                !isGroup && isOnline ? styles.quickChatSubtitleActive : styles.quickChatSubtitle
              }
            >
              {!isGroup
                ? isOnline
                  ? t('chat.activeNow')
                  : t('chat.offline')
                : `${conversation?.participantAccountIds?.length ?? 0} ${t('chat.members')}`}
            </span>
          </div>
        </div>
        <div className={styles.quickChatHeaderActions}>
          <Button
            aria-label={t('chat.minimize')}
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
            aria-label={t('common.close')}
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
          {messageItems.map((message, index) => {
            const isOwn = message.senderAccountId === currentAccountId
            const prev = index > 0 ? messageItems[index - 1] : null
            const next = index < messageItems.length - 1 ? messageItems[index + 1] : null

            const isSameSenderAsPrev = Boolean(
              prev &&
              prev.senderAccountId === message.senderAccountId &&
              Math.abs(new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime()) <
                10 * 60 * 1000,
            )
            const isSameSenderAsNext = Boolean(
              next &&
              next.senderAccountId === message.senderAccountId &&
              Math.abs(new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime()) <
                10 * 60 * 1000,
            )

            const isFirstInGroup = !isSameSenderAsPrev
            const isLastInGroup = !isSameSenderAsNext

            let bubbleCornerClass = ''
            if (isOwn) {
              if (isFirstInGroup && isLastInGroup) bubbleCornerClass = styles.bubbleOwnSingle
              else if (isFirstInGroup && !isLastInGroup) bubbleCornerClass = styles.bubbleOwnFirst
              else if (!isFirstInGroup && !isLastInGroup) bubbleCornerClass = styles.bubbleOwnMiddle
              else bubbleCornerClass = styles.bubbleOwnLast
            } else {
              if (isFirstInGroup && isLastInGroup) bubbleCornerClass = styles.bubbleOtherSingle
              else if (isFirstInGroup && !isLastInGroup) bubbleCornerClass = styles.bubbleOtherFirst
              else if (!isFirstInGroup && !isLastInGroup)
                bubbleCornerClass = styles.bubbleOtherMiddle
              else bubbleCornerClass = styles.bubbleOtherLast
            }

            const marginClass = isLastInGroup
              ? styles.messageLastInGroup
              : styles.messageConsecutive
            const showSenderName = !isOwn && conversation?.type !== 'DIRECT' && isFirstInGroup
            const senderParticipant = participantById.get(message.senderAccountId)
            const senderName = showSenderName ? participantLabel(senderParticipant) : null

            return (
              <div
                key={message.id}
                className={`${messageStyles.message} ${isOwn ? styles.quickMessageGroupOwn : styles.quickMessageGroupOther} ${marginClass}`}
                tabIndex={-1}
                onPointerDown={(event) => {
                  if (event.pointerType === 'touch') event.currentTarget.focus()
                }}
              >
                {senderName ? (
                  <span className={styles.quickMessageSender}>{senderName}</span>
                ) : null}
                <div className={styles.messageRow}>
                  {!isOwn ? (
                    isLastInGroup ? (
                      <EmployeeAvatar
                        size={28}
                        name={participantLabel(senderParticipant)}
                        avatarUrl={senderParticipant?.avatarUrl}
                        className={styles.messageAvatar}
                      />
                    ) : (
                      <div className={styles.messageAvatarSpacer} aria-hidden="true" />
                    )
                  ) : null}
                  <div
                    className={`${isOwn ? styles.quickMessageOwn : styles.quickMessageOther} ${bubbleCornerClass}`}
                  >
                    {message.replyToMessageId ? (
                      <ChatReplyQuote
                        quote={message.replyToMessage}
                        participants={participantById}
                        isOwn={isOwn}
                      />
                    ) : null}
                    {message.body}
                    <ChatAttachments message={message} />
                  </div>
                </div>
                {!message.deletedAt ? (
                  <ChatReplyAction
                    disabled={quickSend.isPending}
                    onClick={() => setReplyTo(message)}
                  />
                ) : null}
              </div>
            )
          })}
          <div ref={messagesEndRef} aria-hidden="true" />
          {!quickMessages.isLoading && !messageItems.length ? (
            <Empty description={t('chat.noMessages')} />
          ) : null}
        </div>
        {quickSend.isError ? <Alert type="error" title={t('chatMedia.sendFailed')} /> : null}
        {replyTo ? (
          <ChatReplyQuote
            quote={replyTo}
            participants={participantById}
            onCancel={() => setReplyTo(null)}
            disabled={quickSend.isPending}
          />
        ) : null}
        {files.length ? (
          <div className={messageStyles.fileList}>
            {files.map((file) => (
              <div key={file.uid} className={messageStyles.fileChip}>
                <PaperClipOutlined />
                <span className="min-w-0 flex-1 truncate" title={file.name}>
                  {file.name}
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  aria-label={t('chatMedia.removeAttachment', { name: file.name })}
                  disabled={quickSend.isPending}
                  onClick={() => {
                    setFiles((current) => current.filter(({ uid }) => uid !== file.uid))
                    uploadedIds.current.delete(file.uid)
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
        <div className={styles.quickChatComposer}>
          <Upload
            multiple
            fileList={files}
            showUploadList={false}
            disabled={quickSend.isPending}
            beforeUpload={(file) => {
              setFiles((current) => [
                ...current,
                { uid: file.uid, name: file.name, originFileObj: file },
              ])
              return false
            }}
          >
            <Button
              aria-label={t('chat.attach')}
              title={t('chat.attach')}
              icon={<PaperClipOutlined />}
              type="text"
              shape="circle"
              className={styles.quickChatAttachBtn}
              disabled={quickSend.isPending}
            />
          </Upload>
          <Input
            disabled={quickSend.isPending}
            aria-label={t('chat.messageInput')}
            placeholder={t('chat.messagePlaceholder')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => onMarkReadRef.current()}
            onPressEnter={() => {
              if (canSend) quickSend.mutate()
            }}
            className={styles.quickChatInput}
          />
          <Button
            aria-label={t('chat.send')}
            disabled={!canSend}
            loading={quickSend.isPending}
            icon={<SendOutlined />}
            shape="circle"
            type="primary"
            className={`${styles.quickChatSendButton} ${canSend ? styles.quickChatSendButtonActive : ''}`}
            onClick={() => quickSend.mutate()}
          />
        </div>
      </div>
    </section>
  )
}
