import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MessageOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Badge, Button, Empty, Input, Popover, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  type ChatConversation,
  type ChatMessage,
  type ChatParticipant,
  createConversation,
  listChatConversations,
  listChatParticipants,
  markChatConversationRead,
} from '@/features/portal/chat/api/chatApi'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { type ChatSocket, createChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import {
  conversationTitle,
  matchesConversationSearch,
  matchesParticipantSearch,
  participantLabel,
} from './chatViewUtils'
import { QuickChatBox } from './QuickChatBox'
import { QuickChatBubble } from './QuickChatBubble'

import styles from './ChatShell.module.scss'

const CHAT_PREVIEW_LIMIT = 8

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
  participantById: Map<string, ReturnType<typeof participantLabel> extends string ? import('@/features/portal/chat/api/chatApi').ChatParticipant : never>,
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
  openConversationIds: string[],
  minimizedConversationIds: string[],
) {
  const existing = items.find(({ id }) => id === conversation.id)
  const alreadyApplied =
    existing?.lastMessageAt === conversation.lastMessageAt &&
    existing?.lastMessageSenderAccountId === conversation.lastMessageSenderAccountId &&
    existing?.lastMessagePreview === conversation.lastMessagePreview
  const isActivelyOpen =
    openConversationIds.includes(message.conversationId) &&
    !minimizedConversationIds.includes(message.conversationId)
  const shouldMarkUnread =
    message.senderAccountId !== currentAccountId && !isActivelyOpen
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
  const [previewSearch, setPreviewSearch] = useState('')
  const [openQuickConversationIds, setOpenQuickConversationIds] = useState<string[]>([])
  const [minimizedQuickConversationIds, setMinimizedQuickConversationIds] = useState<string[]>([])
  const [activeQuickConversationId, setActiveQuickConversationId] = useState<string | null>(null)
  const [socketReady, setSocketReady] = useState(false)
  const chatPreviewRef = useRef<HTMLDivElement>(null)
  const chatSocketRef = useRef<ChatSocket | null>(null)
  const openQuickConversationIdsRef = useRef<string[]>([])
  const minimizedQuickConversationIdsRef = useRef<string[]>([])
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
    openQuickConversationIdsRef.current = openQuickConversationIds
  }, [openQuickConversationIds])

  useEffect(() => {
    minimizedQuickConversationIdsRef.current = minimizedQuickConversationIds
  }, [minimizedQuickConversationIds])

  useEffect(() => {
    isChatWorkspaceRef.current = isChatWorkspace
  }, [isChatWorkspace])

  const { mutate: markQuickConversationRead } = useMutation({
    mutationFn: (conversationId: string) => markChatConversationRead(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.all })
    },
  })

  const markConversationAsRead = useCallback(
    (conversationId: string) => {
      queryClient.setQueriesData<ChatPage<ChatConversation>>(
        { queryKey: [...chatKeys.all, 'conversations'] },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === conversationId
                    ? { ...item, unreadCount: 0, hasUnreadFromOthers: false }
                    : item,
                ),
              }
            : current,
      )
      markQuickConversationRead(conversationId)
    },
    [markQuickConversationRead, queryClient],
  )

  useEffect(() => {
    const socket = createChatSocket()
    chatSocketRef.current = socket
    if (!socket) return
    socket.on('connect', () => setSocketReady(true))
    socket.on('disconnect', () => setSocketReady(false))
    socket.on('connect_error', () => setSocketReady(false))
    socket.on('message.created', ({ conversation, message }) => {
      const isActivelyOpen =
        openQuickConversationIdsRef.current.includes(message.conversationId) &&
        !minimizedQuickConversationIdsRef.current.includes(message.conversationId)

      if (isActivelyOpen && message.senderAccountId !== account.account.id) {
        markQuickConversationRead(message.conversationId)
      }

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
                  openQuickConversationIdsRef.current,
                  minimizedQuickConversationIdsRef.current,
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
  }, [account.account.id, markQuickConversationRead, queryClient])

  useEffect(() => {
    if (!openQuickConversationIds.length || !chatSocketRef.current) return
    for (const conversationId of openQuickConversationIds) {
      chatSocketRef.current.emit('conversation.join', { conversationId })
    }
  }, [openQuickConversationIds])

  const chatConversations = useQuery({
    queryKey: chatKeys.conversations({ page: 1, limit: CHAT_PREVIEW_LIMIT }),
    queryFn: () => listChatConversations({ page: 1, limit: CHAT_PREVIEW_LIMIT }),
    refetchInterval: false,
  })
  const chatParticipants = useQuery({
    queryKey: ['chat-participants'],
    queryFn: () => listChatParticipants({ limit: 100 }),
  })
  const participantById = useMemo(
    () => new Map((chatParticipants.data?.items ?? []).map((participant) => [participant.id, participant])),
    [chatParticipants.data?.items],
  )
  const recentConversations = useMemo(
    () => (chatConversations.data?.items ?? []).filter((conv) => conv.type === 'DIRECT'),
    [chatConversations.data?.items],
  )

  const createDirectChatMutation = useMutation({
    mutationFn: (participantAccountId: string) =>
      createConversation({
        type: 'DIRECT',
        title: null,
        participantAccountIds: [participantAccountId],
      }),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.all })
      openQuickChat(conversation)
    },
  })

  const handleSelectParticipant = (participant: ChatParticipant) => {
    const existing = (chatConversations.data?.items ?? []).find(
      (conv) => conv.type === 'DIRECT' && conv.participantAccountIds.includes(participant.id),
    )
    if (existing) {
      openQuickChat(existing)
    } else {
      createDirectChatMutation.mutate(participant.id)
    }
  }

  const filteredConversations = useMemo(() => {
    if (!previewSearch.trim()) return recentConversations
    return recentConversations.filter((conv) =>
      matchesConversationSearch(conv, participantById, account.account.id, previewSearch),
    )
  }, [recentConversations, participantById, account.account.id, previewSearch])

  const matchingOtherParticipants = useMemo(() => {
    if (!previewSearch.trim()) return []
    const conversationParticipantIds = new Set(
      filteredConversations.flatMap((c) => c.participantAccountIds),
    )
    return (chatParticipants.data?.items ?? []).filter(
      (p) =>
        p.id !== account.account.id &&
        !conversationParticipantIds.has(p.id) &&
        matchesParticipantSearch(p, previewSearch),
    )
  }, [chatParticipants.data?.items, account.account.id, filteredConversations, previewSearch])

  // Active open windows (excluding those minimized into bubbles)
  const openExpandedIds = openQuickConversationIds.filter(
    (id) => !minimizedQuickConversationIds.includes(id),
  )
  const visibleWindowIds = [...openExpandedIds].reverse()

  // Total unread count excludes conversations currently open and viewed
  const unreadCount = recentConversations.reduce((total, conversation) => {
    if (openExpandedIds.includes(conversation.id)) {
      return total
    }
    return total + (conversation.unreadCount || 0)
  }, 0)

  const unreadConversations = recentConversations.filter(
    (conversation) =>
      conversation.hasUnreadFromOthers && !openExpandedIds.includes(conversation.id),
  )
  const hasUnreadFromOthers = unreadConversations.length > 0
  const unreadConversation = unreadConversations[0] ?? null

  const openQuickChat = (conversation: ChatConversation, markRead = true) => {
    setIsChatPreviewOpen(false)
    setPreviewSearch('')
    setOpenQuickConversationIds((prev) => {
      const withoutIt = prev.filter((id) => id !== conversation.id)
      const next = [...withoutIt, conversation.id]
      const maxWindows = typeof window !== 'undefined' && window.innerWidth < 1024 ? 2 : 3
      return next.length > maxWindows ? next.slice(-maxWindows) : next
    })
    setMinimizedQuickConversationIds((prev) => prev.filter((id) => id !== conversation.id))
    setActiveQuickConversationId(conversation.id)
    if (markRead) {
      markConversationAsRead(conversation.id)
    }
  }

  const handleToggleMinimize = (conversationId: string) => {
    setMinimizedQuickConversationIds((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId],
    )
  }

  const handleCloseQuickChat = (conversationId: string) => {
    setOpenQuickConversationIds((prev) => prev.filter((id) => id !== conversationId))
    setMinimizedQuickConversationIds((prev) => prev.filter((id) => id !== conversationId))
    setActiveQuickConversationId((current) => (current === conversationId ? null : current))
  }

  const handleExpandBubble = (conversationId: string) => {
    setMinimizedQuickConversationIds((prev) => prev.filter((id) => id !== conversationId))
    setOpenQuickConversationIds((prev) =>
      prev.includes(conversationId) ? prev : [...prev, conversationId],
    )
    setActiveQuickConversationId(conversationId)
    markConversationAsRead(conversationId)
  }

  // Bubbles list: all minimized chats, plus unread incoming conversation if not open
  const bubbleIds = [...minimizedQuickConversationIds]
  if (
    hasUnreadFromOthers &&
    unreadConversation &&
    !openExpandedIds.includes(unreadConversation.id) &&
    !bubbleIds.includes(unreadConversation.id)
  ) {
    bubbleIds.push(unreadConversation.id)
  }

  const hasBubbles = bubbleIds.length > 0
  const baseRight = hasBubbles ? 84 : 20

  const chatPreview = (
    <div ref={chatPreviewRef} className={styles.chatPreview}>
      <div className={styles.chatPreviewHeader}>
        <Typography.Title level={4}>{t('chat.title', 'Chat')}</Typography.Title>
        <Button
          aria-label={t('chat.openWorkspace', 'Open chat')}
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
        value={previewSearch}
        onChange={(e) => setPreviewSearch(e.target.value)}
        allowClear
      />
      <div className={styles.chatPreviewList}>
        {filteredConversations.length > 0 || matchingOtherParticipants.length > 0 ? (
          <>
            {filteredConversations.map((conversation) => (
              <button
                className={styles.chatPreviewItem}
                key={conversation.id}
                type="button"
                onClick={() => openQuickChat(conversation)}
              >
                <Badge dot={conversation.hasUnreadFromOthers} offset={[-2, 40]}>
                  <Avatar
                    size={50}
                    icon={conversation.type === 'DIRECT' ? <UserOutlined /> : <TeamOutlined />}
                  />
                </Badge>
                <span className={styles.chatPreviewText}>
                  <span className={styles.chatPreviewHeaderRow}>
                    <strong>
                      {conversationTitle(conversation, participantById, account.account.id)}
                    </strong>
                    {conversation.lastMessageAt ? (
                      <span className={styles.chatPreviewTime}>
                        {formatRelativeTime(conversation.lastMessageAt, timeLabels)}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.chatPreviewSnippet}>
                    {messagePreviewText(
                      conversation,
                      participantById,
                      account.account.id,
                      t('chat.noMessages'),
                      t('chat.you'),
                    )}
                  </span>
                </span>
              </button>
            ))}
            {matchingOtherParticipants.length > 0 ? (
              <>
                {filteredConversations.length > 0 ? (
                  <div className={styles.chatPreviewSectionTitle}>
                    {t('chat.people', 'People')}
                  </div>
                ) : null}
                {matchingOtherParticipants.map((participant) => (
                  <button
                    className={styles.chatPreviewItem}
                    key={participant.id}
                    type="button"
                    onClick={() => handleSelectParticipant(participant)}
                  >
                    <Badge
                      status={participant.presence === 'ONLINE' ? 'success' : 'default'}
                      offset={[-2, 40]}
                      dot
                    >
                      <Avatar size={50} icon={<UserOutlined />} />
                    </Badge>
                    <span className={styles.chatPreviewText}>
                      <span className={styles.chatPreviewHeaderRow}>
                        <strong>{participantLabel(participant)}</strong>
                      </span>
                      <span className={styles.chatPreviewSnippet}>
                        {participant.email ||
                          participant.employeeCode ||
                          t('chat.startConversation', 'Start a conversation')}
                      </span>
                    </span>
                  </button>
                ))}
              </>
            ) : null}
          </>
        ) : previewSearch.trim() ? (
          <Empty description={t('chat.noSearchResults', 'No results found')} />
        ) : (
          <Empty description={t('chat.emptyMessages', 'No messages yet')} />
        )}
      </div>
      <Link
        className={styles.chatPreviewAllLink}
        to="/portal/chat"
        onClick={() => {
          setIsChatPreviewOpen(false)
          setPreviewSearch('')
        }}
      >
        {t('chat.viewAll', 'View all in Messenger')}
      </Link>
    </div>
  )

  const isButtonActive = isChatWorkspace || isChatPreviewOpen
  const buttonClassName = [
    styles.headerChatButton,
    hasUnreadFromOthers
      ? styles.headerChatButtonUnread
      : isButtonActive
        ? styles.headerChatButtonActive
        : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={styles.chatMenuWrapper}>
        {isChatPreviewOpen ? (
          <Popover
            trigger="click"
            placement="bottomRight"
            open={isChatPreviewOpen}
            overlayClassName={styles.popover}
            zIndex={2147483050}
            content={chatPreview}
            onOpenChange={(open) => {
              setIsChatPreviewOpen(open)
              if (!open) {
                setPreviewSearch('')
              }
            }}
          >
            <Badge count={unreadCount} size="small">
              <Button
                aria-label={chatLabel}
                className={buttonClassName}
                icon={<MessageOutlined />}
                shape="circle"
                type="text"
                onClick={() => setIsChatPreviewOpen((open) => !open)}
              />
            </Badge>
          </Popover>
        ) : (
          <Badge count={unreadCount} size="small">
            <Button
              aria-label={chatLabel}
              className={buttonClassName}
              icon={<MessageOutlined />}
              shape="circle"
              type="text"
              onClick={() => setIsChatPreviewOpen((open) => !open)}
            />
          </Badge>
        )}
      </div>

      {/* Minimized Chat Heads (Bong bóng chat) */}
      {overlayRoot
        ? bubbleIds.map((conversationId, index) => {
            const conversation =
              recentConversations.find((c) => c.id === conversationId) ?? null
            const isUnread = Boolean(
              conversation &&
              ((conversation.unreadCount || 0) > 0 || conversation.hasUnreadFromOthers),
            )

            return createPortal(
              <QuickChatBubble
                key={`bubble-${conversationId}`}
                conversationId={conversationId}
                conversation={conversation}
                currentAccountId={account.account.id}
                participantById={participantById}
                isUnread={isUnread}
                unreadCount={conversation?.unreadCount}
                index={index}
                onExpand={() => handleExpandBubble(conversationId)}
                onClose={() => handleCloseQuickChat(conversationId)}
                chatLabel={chatLabel}
              />,
              overlayRoot,
            )
          })
        : null}

      {/* Open Quick Chat Windows */}
      {overlayRoot
        ? openQuickConversationIds.map((conversationId) => {
            const conversation =
              recentConversations.find((c) => c.id === conversationId) ?? null
            const isMinimized = minimizedQuickConversationIds.includes(conversationId)
            const isUnread = Boolean(
              conversation &&
              !openExpandedIds.includes(conversationId) &&
              ((conversation.unreadCount || 0) > 0 || conversation.hasUnreadFromOthers),
            )
            const winIndex = visibleWindowIds.indexOf(conversationId)
            const rightOffset = baseRight + Math.max(0, winIndex) * 340
            const isActive = activeQuickConversationId === conversationId
            const zIndex = isActive ? 2147483015 : 2147483001

            return createPortal(
              <QuickChatBox
                key={`box-${conversationId}`}
                conversationId={conversationId}
                conversation={conversation}
                currentAccountId={account.account.id}
                participantById={participantById}
                isMinimized={isMinimized}
                isUnread={isUnread}
                style={{
                  right: `calc(max(${rightOffset}px, calc(env(safe-area-inset-right) + ${rightOffset}px)))`,
                  zIndex,
                }}
                onToggleMinimize={() => handleToggleMinimize(conversationId)}
                onClose={() => handleCloseQuickChat(conversationId)}
                onMarkRead={() => markConversationAsRead(conversationId)}
                onFocus={() => setActiveQuickConversationId(conversationId)}
                socketReady={socketReady}
              />,
              overlayRoot,
            )
          })
        : null}
    </>
  )
}
