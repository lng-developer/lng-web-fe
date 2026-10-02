import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  CloseOutlined,
  MessageOutlined,
  SearchOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Badge, Button, Empty, Input, Popover, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  type ChatConversation,
  type ChatMessage,
  type ChatParticipant,
  listChatConversations,
  listChatMessages,
  listChatParticipants,
  markChatConversationRead,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { type ChatSocket, createChatSocket } from '@/features/portal/chat/realtime/chatSocket'

import styles from './ChatShell.module.scss'

const CHAT_PREVIEW_LIMIT = 8

function participantLabel(participant?: ChatParticipant) {
  return participant?.employeeCode || participant?.email || ''
}

function conversationTitle(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant>,
  currentAccountId?: string,
) {
  if (conversation.type === 'DIRECT') {
    const otherId = conversation.participantAccountIds.find((id) => id !== currentAccountId)
    const label = participantLabel(otherId ? participantById.get(otherId) : undefined)
    if (label) return label
  }
  return (
    conversation.title || conversation.relatedResource?.id || conversation.type.replaceAll('_', ' ')
  )
}

function formatRelativeTime(
  value: string | null,
  labels: { now: string; minute: string; hour: string; day: string },
) {
  if (!value) return ''
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return labels.now
  if (minutes < 60) return `${minutes}${labels.minute}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}${labels.hour}`
  return `${Math.round(hours / 24)}${labels.day}`
}

function messagePreviewText(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant>,
  currentAccountId?: string,
  emptyLabel = 'No messages yet',
  ownLabel = 'You',
) {
  if (!conversation.lastMessagePreview) return emptyLabel
  if (conversation.lastMessageSenderAccountId === currentAccountId) {
    return `${ownLabel}: ${conversation.lastMessagePreview}`
  }
  const sender = conversation.lastMessageSenderAccountId
    ? participantLabel(participantById.get(conversation.lastMessageSenderAccountId))
    : ''
  return sender ? `${sender}: ${conversation.lastMessagePreview}` : conversation.lastMessagePreview
}

type ChatShellProps = {
  account: CurrentAccount
}

type ChatPage<T> = { items: T[]; pagination: { page: number; limit: number; total: number } }

function upsertById<T extends { id: string }>(items: T[], item: T) {
  return [item, ...items.filter(({ id }) => id !== item.id)]
}

function mergeRealtimeConversation(
  items: ChatConversation[],
  conversation: ChatConversation,
  message: ChatMessage,
  currentAccountId: string,
  openConversationId: string | null,
) {
  const existing = items.find(({ id }) => id === conversation.id)
  const alreadyApplied =
    existing?.lastMessageAt === conversation.lastMessageAt &&
    existing?.lastMessageSenderAccountId === conversation.lastMessageSenderAccountId &&
    existing?.lastMessagePreview === conversation.lastMessagePreview
  const shouldMarkUnread =
    message.senderAccountId !== currentAccountId && message.conversationId !== openConversationId
  const unreadCount = shouldMarkUnread
    ? alreadyApplied
      ? existing?.unreadCount || conversation.unreadCount || 1
      : Math.max(existing?.unreadCount || 0, conversation.unreadCount || 0) + 1
    : 0

  return upsertById(items, {
    ...conversation,
    unreadCount,
    hasUnreadFromOthers: shouldMarkUnread,
  })
}

export function ChatShell({ account }: ChatShellProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [isChatPreviewOpen, setIsChatPreviewOpen] = useState(false)
  const [quickConversationId, setQuickConversationId] = useState<string | null>(null)
  const [quickDraft, setQuickDraft] = useState('')
  const [readQuickConversationIds, setReadQuickConversationIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [socketReady, setSocketReady] = useState(false)
  const chatPreviewRef = useRef<HTMLDivElement>(null)
  const quickMessagesEndRef = useRef<HTMLDivElement | null>(null)
  const chatSocketRef = useRef<ChatSocket | null>(null)
  const quickConversationIdRef = useRef<string | null>(null)
  const isChatWorkspaceRef = useRef(false)
  const chatLabel = t('shell.navigation.chat')
  const isChatWorkspace = location.pathname === '/portal/chat'
  const overlayRoot = typeof document === 'undefined' ? null : document.body
  const timeLabels = {
    now: t('chat.time.now'),
    minute: t('chat.time.minute'),
    hour: t('chat.time.hour'),
    day: t('chat.time.day'),
  }

  useEffect(() => {
    if (!isChatPreviewOpen) return
    const closeOnPageScroll = (event: Event) => {
      if (event.target instanceof Node && chatPreviewRef.current?.contains(event.target)) return
      setIsChatPreviewOpen(false)
    }
    window.addEventListener('scroll', closeOnPageScroll, true)
    return () => window.removeEventListener('scroll', closeOnPageScroll, true)
  }, [isChatPreviewOpen])

  useEffect(() => {
    quickConversationIdRef.current = quickConversationId
  }, [quickConversationId])

  useEffect(() => {
    isChatWorkspaceRef.current = isChatWorkspace
  }, [isChatWorkspace])

  useEffect(() => {
    const socket = createChatSocket()
    chatSocketRef.current = socket
    if (!socket) return
    socket.on('connect', () => setSocketReady(true))
    socket.on('disconnect', () => setSocketReady(false))
    socket.on('connect_error', () => setSocketReady(false))
    socket.on('message.created', ({ conversation, message }) => {
      if (isChatWorkspaceRef.current) return
      queryClient.setQueryData<ChatPage<ChatMessage>>(
        chatKeys.messages(message.conversationId),
        (current) =>
          current
            ? {
                ...current,
                items: [...current.items.filter(({ id }) => id !== message.id), message],
              }
            : current,
      )
      queryClient.setQueriesData<ChatPage<ChatConversation>>(
        { queryKey: [...chatKeys.all, 'conversations'] },
        (current) =>
          current
            ? {
                ...current,
                items: mergeRealtimeConversation(
                  current.items,
                  conversation,
                  message,
                  account.account.id,
                  quickConversationIdRef.current,
                ),
              }
            : current,
      )
    })
    return () => {
      socket.disconnect()
      chatSocketRef.current = null
      setSocketReady(false)
    }
  }, [account.account.id, queryClient])

  useEffect(() => {
    if (!quickConversationId || !chatSocketRef.current) return
    chatSocketRef.current.emit('conversation.join', { conversationId: quickConversationId })
  }, [quickConversationId])

  const chatConversations = useQuery({
    queryKey: chatKeys.conversations({ page: 1, limit: CHAT_PREVIEW_LIMIT }),
    queryFn: () => listChatConversations({ page: 1, limit: CHAT_PREVIEW_LIMIT }),
    refetchInterval: false,
  })
  const chatParticipants = useQuery({
    queryKey: ['chat-participants'],
    queryFn: () => listChatParticipants({ limit: 100 }),
  })
  const participantById = new Map(
    (chatParticipants.data?.items ?? []).map((participant) => [participant.id, participant]),
  )
  const recentConversations = chatConversations.data?.items ?? []
  const unreadCount = recentConversations.reduce(
    (total, conversation) => total + (conversation.unreadCount || 0),
    0,
  )
  const hasUnreadFromOthers = recentConversations.some(
    (conversation) => conversation.hasUnreadFromOthers,
  )
  const unreadConversation = recentConversations.find(
    (conversation) => conversation.hasUnreadFromOthers,
  )
  const quickConversation =
    recentConversations.find((conversation) => conversation.id === quickConversationId) ?? null
  const isQuickConversationUnread = Boolean(
    quickConversation &&
    quickConversation.hasUnreadFromOthers &&
    !readQuickConversationIds.has(quickConversation.id),
  )
  const quickTitle = quickConversation
    ? conversationTitle(quickConversation, participantById, account.account.id)
    : chatLabel
  const quickMessages = useQuery({
    queryKey: chatKeys.messages(quickConversationId),
    queryFn: () => listChatMessages(quickConversationId!, { page: 1, limit: 25 }),
    enabled: Boolean(quickConversationId) && !isChatWorkspace,
    refetchInterval: quickConversationId && !isChatWorkspace && !socketReady ? 30_000 : false,
  })
  const quickMessageItems = [...(quickMessages.data?.items ?? [])].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )
  const quickSend = useMutation({
    mutationFn: () =>
      sendChatMessage(quickConversationId!, {
        body: quickDraft.trim(),
        assetIds: [],
      }),
    onSuccess: async () => {
      setQuickDraft('')
    },
  })
  const { mutate: markQuickConversationRead } = useMutation({
    mutationFn: (conversationId: string) => markChatConversationRead(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.all })
    },
  })
  const canQuickSend = Boolean(quickConversationId && quickDraft.trim() && !quickSend.isPending)
  const markQuickChatRead = () => {
    if (
      !quickConversation?.hasUnreadFromOthers ||
      readQuickConversationIds.has(quickConversation.id)
    ) {
      return
    }
    setReadQuickConversationIds((current) => new Set(current).add(quickConversation.id))
    markQuickConversationRead(quickConversation.id)
  }
  const openQuickChat = (conversation: ChatConversation, markRead = true) => {
    if (isChatWorkspace) return
    setIsChatPreviewOpen(false)
    setQuickConversationId(conversation.id)
    if (markRead && conversation.hasUnreadFromOthers) {
      setReadQuickConversationIds((current) => new Set(current).add(conversation.id))
      markQuickConversationRead(conversation.id)
    }
  }

  useEffect(() => {
    if (!quickConversationId || quickMessages.isLoading) return
    requestAnimationFrame(() => {
      quickMessagesEndRef.current?.scrollIntoView?.({ block: 'end' })
    })
  }, [quickConversationId, quickMessageItems.length, quickMessages.isLoading])

  const chatPreview = (
    <div ref={chatPreviewRef} className={styles.chatPreview}>
      <div className={styles.chatPreviewHeader}>
        <Typography.Title level={4}>{t('chat.title', 'Chat')}</Typography.Title>
        <Button
          aria-label={t('chat.newGroup', 'New group')}
          icon={<MessageOutlined />}
          shape="circle"
          type="text"
          onClick={() => {
            setIsChatPreviewOpen(false)
            navigate('/portal/chat')
          }}
        />
      </div>
      <Input
        aria-label={t('chat.searchMessenger', 'Search Messenger')}
        className={styles.chatPreviewSearch}
        placeholder={t('chat.searchMessenger', 'Search Messenger')}
        prefix={<SearchOutlined />}
        readOnly
      />
      <div className={styles.chatPreviewList}>
        {recentConversations.length ? (
          recentConversations.map((conversation) => (
            <button
              className={styles.chatPreviewItem}
              key={conversation.id}
              type="button"
              onClick={() => openQuickChat(conversation)}
            >
              <Badge dot={conversation.hasUnreadFromOthers} offset={[-2, 40]}>
                <Avatar size={50} icon={<UserOutlined />} />
              </Badge>
              <span className={styles.chatPreviewText}>
                <strong>
                  {conversationTitle(conversation, participantById, account.account.id)}
                </strong>
                <span>
                  {messagePreviewText(
                    conversation,
                    participantById,
                    account.account.id,
                    t('chat.noMessages'),
                    t('chat.you'),
                  )}
                  {conversation.lastMessageAt
                    ? ` - ${formatRelativeTime(conversation.lastMessageAt, timeLabels)}`
                    : ''}
                </span>
              </span>
            </button>
          ))
        ) : (
          <Empty description={t('chat.emptyMessages', 'No messages yet')} />
        )}
      </div>
      <Link
        className={styles.chatPreviewAllLink}
        to="/portal/chat"
        onClick={() => setIsChatPreviewOpen(false)}
      >
        {t('chat.viewAll', 'View all in Messenger')}
      </Link>
    </div>
  )

  return (
    <>
      <div className={styles.chatMenuWrapper}>
        {isChatPreviewOpen ? (
          <Popover
            trigger="click"
            placement="bottomRight"
            open={isChatPreviewOpen}
            overlayClassName={styles.popover}
            content={chatPreview}
            onOpenChange={setIsChatPreviewOpen}
          >
            <Badge count={unreadCount} size="small">
              <Button
                aria-label={chatLabel}
                className={`${styles.headerChatButton} ${hasUnreadFromOthers ? styles.headerChatButtonUnread : ''}`}
                icon={<MessageOutlined />}
                shape="circle"
                type={isChatWorkspace ? 'primary' : 'text'}
                onClick={() => setIsChatPreviewOpen((open) => !open)}
              />
            </Badge>
          </Popover>
        ) : (
          <Badge count={unreadCount} size="small">
            <Button
              aria-label={chatLabel}
              className={`${styles.headerChatButton} ${hasUnreadFromOthers ? styles.headerChatButtonUnread : ''}`}
              icon={<MessageOutlined />}
              shape="circle"
              type={isChatWorkspace ? 'primary' : 'text'}
              onClick={() => setIsChatPreviewOpen((open) => !open)}
            />
          </Badge>
        )}
      </div>
      {overlayRoot &&
      !isChatWorkspace &&
      hasUnreadFromOthers &&
      quickConversationId !== unreadConversation?.id
        ? createPortal(
            <Badge count={unreadCount} className={styles.floatingChatBadge}>
              <button
                className={styles.floatingChatButton}
                type="button"
                aria-label={chatLabel}
                onClick={() => {
                  if (!unreadConversation) return
                  if (quickConversationId === unreadConversation.id) {
                    setQuickConversationId(null)
                    return
                  }
                  openQuickChat(unreadConversation)
                }}
              >
                <MessageOutlined />
              </button>
            </Badge>,
            overlayRoot,
          )
        : null}
      {overlayRoot && !isChatWorkspace && quickConversation
        ? createPortal(
            <section
              className={`${styles.quickChatWindow} ${
                isQuickConversationUnread ? styles.quickChatWindowUnread : ''
              }`}
              aria-label={quickTitle}
            >
              <div className={styles.quickChatHeader}>
                <Avatar size={32} icon={<UserOutlined />} />
                <strong>{quickTitle}</strong>
                <Button
                  aria-label={t('common.close', 'Close')}
                  icon={<CloseOutlined />}
                  shape="circle"
                  type="text"
                  onClick={() => setQuickConversationId(null)}
                />
              </div>
              <div className={styles.quickChatMessages}>
                {quickMessageItems.map((message) => (
                  <div
                    className={
                      message.senderAccountId === account.account.id
                        ? styles.quickMessageOwn
                        : styles.quickMessageOther
                    }
                    key={message.id}
                  >
                    {message.body}
                  </div>
                ))}
                <div ref={quickMessagesEndRef} aria-hidden="true" />
                {!quickMessages.isLoading && !quickMessageItems.length ? (
                  <Empty description={t('chat.noMessages', 'No messages yet')} />
                ) : null}
              </div>
              <div className={styles.quickChatComposer}>
                <Input
                  aria-label={t('chat.messageInput', 'Message')}
                  placeholder={t('chat.messagePlaceholder', 'Aa')}
                  value={quickDraft}
                  onChange={(event) => setQuickDraft(event.target.value)}
                  onFocus={markQuickChatRead}
                  onPressEnter={() => {
                    if (canQuickSend) quickSend.mutate()
                  }}
                />
                <Button
                  aria-label={t('chat.send', 'Send')}
                  disabled={!canQuickSend}
                  icon={<SendOutlined />}
                  shape="circle"
                  type="primary"
                  onClick={() => quickSend.mutate()}
                />
              </div>
            </section>,
            overlayRoot,
          )
        : null}
    </>
  )
}
