import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ExpandOutlined, MessageOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Badge, Button, Empty, Input, Popover, Tooltip, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  type ChatConversation,
  type ChatParticipant,
  createConversation,
  getChatUnreadCount,
  listChatParticipants,
  markChatConversationRead,
} from '@/features/portal/chat/api/chatApi'
import { chatConversationOptions, receiveChatMessage } from '@/features/portal/chat/api/chatQueries'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { type ChatSocket, createChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import { requestDesktopNotificationPermission, useNotificationAlerts } from '@/shared/notification'
import { EmployeeAvatar } from '@/shared/ui'
import {
  conversationTitle,
  formatRelativeTime,
  matchesConversationSearch,
  matchesParticipantSearch,
  messagePreviewText,
  participantLabel,
} from './chatViewUtils'
import { QuickChatBox } from './QuickChatBox'
import { QuickChatBubble } from './QuickChatBubble'

import styles from './ChatShell.module.scss'

const CHAT_PREVIEW_LIMIT = 8
type ChatPage<T> = { items: T[]; pagination: { page: number; limit: number; total: number } }

type ChatShellProps = {
  account: CurrentAccount
}

export function ChatShell({ account }: ChatShellProps) {
  const { t } = useTranslation()
  const { alertImportantNotification } = useNotificationAlerts()
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
  const openQuickChatRef = useRef<(conversation: ChatConversation, markRead?: boolean) => void>(
    () => {},
  )
  const openQuickChatByIdRef = useRef<(conversationId: string) => void>(() => {})
  const participantByIdRef = useRef<Map<string, ChatParticipant>>(new Map())
  const alertImportantNotificationRef = useRef(alertImportantNotification)
  useEffect(() => {
    alertImportantNotificationRef.current = alertImportantNotification
  }, [alertImportantNotification])
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
    const markVisibleChatsRead = () => {
      if (document.visibilityState !== 'visible') return
      for (const conversationId of openQuickConversationIdsRef.current) {
        if (!minimizedQuickConversationIdsRef.current.includes(conversationId)) {
          markConversationAsRead(conversationId)
        }
      }
    }
    document.addEventListener('visibilitychange', markVisibleChatsRead)
    return () => document.removeEventListener('visibilitychange', markVisibleChatsRead)
  }, [markConversationAsRead])

  useEffect(() => {
    const socket = createChatSocket()
    chatSocketRef.current = socket
    if (!socket) return
    let hasConnected = false
    socket.on('connect', () => {
      setSocketReady(true)
      if (hasConnected) void queryClient.invalidateQueries({ queryKey: chatKeys.all })
      hasConnected = true
      for (const conversationId of openQuickConversationIdsRef.current) {
        socket.emit('conversation.join', { conversationId })
      }
    })
    socket.on('message.read', (state) => {
      if (state.accountId === account.account.id) {
        void queryClient.invalidateQueries({ queryKey: chatKeys.unread })
        void queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'conversations'] })
      }
    })
    socket.on('disconnect', () => setSocketReady(false))
    socket.on('connect_error', () => setSocketReady(false))
    socket.on('message.created', ({ message, conversation }) => {
      const isActivelyOpen =
        openQuickConversationIdsRef.current.includes(message.conversationId) &&
        !minimizedQuickConversationIdsRef.current.includes(message.conversationId)

      if (
        isActivelyOpen &&
        document.visibilityState === 'visible' &&
        message.senderAccountId !== account.account.id
      ) {
        markQuickConversationRead(message.conversationId)
      } else if (message.senderAccountId !== account.account.id) {
        const sender = participantByIdRef.current?.get(message.senderAccountId)
        const senderName = sender ? participantLabel(sender) : t('chat.newMessage')
        const snippet = message.body?.trim() || t('chat.newMessage')

        alertImportantNotificationRef.current?.({
          id: `chat-${message.id}`,
          title: t('notificationAlerts.newMessageFrom', { sender: senderName }),
          message: snippet,
          actionText: t('notificationAlerts.openChat'),
          flashText: t('notificationAlerts.titleFlashMessage'),
          onAction: () => {
            if (conversation) {
              openQuickChatRef.current?.(conversation)
            } else {
              openQuickChatByIdRef.current?.(message.conversationId)
            }
          },
        })
      }

      receiveChatMessage(queryClient, message)
    })
    return () => {
      socket.disconnect()
      chatSocketRef.current = null
      setSocketReady(false)
    }
  }, [account.account.id, markQuickConversationRead, queryClient, t])

  useEffect(() => {
    if (!openQuickConversationIds.length || !chatSocketRef.current) return
    for (const conversationId of openQuickConversationIds) {
      chatSocketRef.current.emit('conversation.join', { conversationId })
    }
  }, [openQuickConversationIds])

  const chatConversations = useQuery({
    ...chatConversationOptions(),
    refetchInterval: !socketReady && isChatPreviewOpen ? 30_000 : false,
  })
  const unreadQuery = useQuery({
    queryKey: chatKeys.unread,
    queryFn: getChatUnreadCount,
    refetchInterval: socketReady ? false : 30_000,
  })
  const chatParticipants = useQuery({
    queryKey: ['chat-participants'],
    queryFn: () => listChatParticipants({ limit: 100 }),
    enabled: isChatPreviewOpen || openQuickConversationIds.length > 0,
  })
  const participantById = useMemo(
    () =>
      new Map(
        (chatParticipants.data?.items ?? []).map((participant) => [participant.id, participant]),
      ),
    [chatParticipants.data?.items],
  )
  useEffect(() => {
    participantByIdRef.current = participantById
  }, [participantById])
  const recentConversations = useMemo(
    () => chatConversations.data?.items ?? [],
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
    const withMessages = recentConversations.filter((conv) => Boolean(conv.lastMessageAt))
    if (!previewSearch.trim()) return withMessages
    return withMessages.filter((conv) =>
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

  // Count all conversations, not just the preview page.
  const unreadCount = unreadQuery.data?.unreadCount ?? 0

  const unreadConversations = recentConversations.filter(
    (conversation) =>
      conversation.hasUnreadFromOthers && !openExpandedIds.includes(conversation.id),
  )
  const hasUnreadFromOthers = unreadConversations.length > 0 || unreadCount > 0
  const unreadConversation = unreadConversations[0] ?? null

  const openQuickChat = useCallback(
    (conversation: ChatConversation, markRead = true) => {
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
    },
    [markConversationAsRead],
  )

  useEffect(() => {
    openQuickChatRef.current = openQuickChat
  }, [openQuickChat])

  const openQuickChatById = (conversationId: string) => {
    const existing = (chatConversations.data?.items ?? []).find((c) => c.id === conversationId)
    if (existing) {
      openQuickChat(existing)
    } else {
      setIsChatPreviewOpen(false)
      setPreviewSearch('')
      setOpenQuickConversationIds((prev) => {
        const withoutIt = prev.filter((id) => id !== conversationId)
        const next = [...withoutIt, conversationId]
        const maxWindows = typeof window !== 'undefined' && window.innerWidth < 1024 ? 2 : 3
        return next.length > maxWindows ? next.slice(-maxWindows) : next
      })
      setMinimizedQuickConversationIds((prev) => prev.filter((id) => id !== conversationId))
      setActiveQuickConversationId(conversationId)
      markConversationAsRead(conversationId)
    }
  }

  useEffect(() => {
    openQuickChatByIdRef.current = openQuickChatById
  })

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
        <div className={styles.chatPreviewTitleGroup}>
          <Typography.Title level={4} className={styles.chatPreviewTitle}>
            {t('chat.title')}
          </Typography.Title>
        </div>
        <div className={styles.chatPreviewHeaderActions}>
          <Tooltip title={t('chat.openWorkspace', 'Open chat')}>
            <Button
              aria-label={t('chat.openWorkspace', 'Open chat')}
              icon={<ExpandOutlined />}
              shape="circle"
              type="text"
              className={styles.chatActionCircleBtn}
              onClick={() => {
                setIsChatPreviewOpen(false)
                navigate('/portal/chat')
              }}
            />
          </Tooltip>
        </div>
      </div>
      <div className={styles.chatPreviewSearchWrapper}>
        <Input
          aria-label={t('chat.searchMessenger')}
          className={styles.chatPreviewSearch}
          placeholder={t('chat.searchMessenger')}
          prefix={<SearchOutlined className={styles.chatSearchIcon} />}
          value={previewSearch}
          onChange={(e) => setPreviewSearch(e.target.value)}
          allowClear
        />
      </div>
      <div className={styles.chatPreviewList}>
        {filteredConversations.length > 0 || matchingOtherParticipants.length > 0 ? (
          <>
            {filteredConversations.slice(0, CHAT_PREVIEW_LIMIT).map((conversation) => {
              const otherParticipantId = conversation.participantAccountIds?.find(
                (id) => id !== account.account.id,
              )
              const otherParticipant = otherParticipantId
                ? participantById.get(otherParticipantId)
                : undefined
              const isOnline =
                conversation.type === 'DIRECT' && otherParticipant?.presence === 'ONLINE'
              const hasUnread = Boolean(conversation.hasUnreadFromOthers)
              const title = conversationTitle(
                conversation,
                participantById,
                account.account.id,
                t('chat.deletedUser'),
              )

              return (
                <button
                  className={`${styles.chatPreviewItem} ${hasUnread ? styles.chatPreviewItemUnread : ''}`}
                  key={conversation.id}
                  type="button"
                  onClick={() => openQuickChat(conversation)}
                >
                  <div className={styles.avatarWrapper}>
                    {conversation.type === 'TEAM' ? (
                      <Avatar size={48} className={styles.chatAvatar}>
                        <TeamOutlined className={styles.teamIcon} />
                      </Avatar>
                    ) : (
                      <EmployeeAvatar
                        size={48}
                        className={styles.chatAvatar}
                        name={title}
                        avatarUrl={otherParticipant?.avatarUrl}
                      />
                    )}
                    {isOnline ? (
                      <span
                        className={styles.onlineBadge}
                        aria-label={t('chat.online', 'Online')}
                      />
                    ) : null}
                  </div>
                  <span className={styles.chatPreviewText}>
                    <span className={styles.chatPreviewHeaderRow}>
                      <span className={styles.chatTitleGroup}>
                        <span className={hasUnread ? styles.chatTitleUnread : styles.chatTitle}>
                          {title}
                        </span>
                        {otherParticipant?.employeeCode ? (
                          <span className={styles.employeeCodeTag}>
                            {otherParticipant.employeeCode}
                          </span>
                        ) : null}
                      </span>
                      {conversation.lastMessageAt ? (
                        <span
                          className={`${styles.chatPreviewTime} ${hasUnread ? styles.chatTimeUnread : ''}`}
                        >
                          {formatRelativeTime(conversation.lastMessageAt, timeLabels)}
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.chatPreviewSnippetRow}>
                      <span
                        className={`${styles.chatPreviewSnippet} ${hasUnread ? styles.chatSnippetUnread : ''}`}
                      >
                        {messagePreviewText(
                          conversation,
                          participantById,
                          account.account.id,
                          t('chat.noMessages'),
                          t('chat.you'),
                        )}
                      </span>
                      {hasUnread ? (
                        <span className={styles.chatUnreadDot} aria-hidden="true" />
                      ) : null}
                    </span>
                  </span>
                </button>
              )
            })}
            {matchingOtherParticipants.length > 0 ? (
              <>
                {filteredConversations.length > 0 ? (
                  <div className={styles.chatPreviewSectionTitle}>{t('chat.people')}</div>
                ) : null}
                {matchingOtherParticipants.map((participant) => {
                  const isOnline = participant.presence === 'ONLINE'
                  const pName = participantLabel(participant)
                  return (
                    <button
                      className={styles.chatPreviewItem}
                      key={participant.id}
                      type="button"
                      onClick={() => handleSelectParticipant(participant)}
                    >
                      <div className={styles.avatarWrapper}>
                        <EmployeeAvatar
                          size={48}
                          className={styles.chatAvatar}
                          name={pName}
                          avatarUrl={participant.avatarUrl}
                        />
                        {isOnline ? (
                          <span
                            className={styles.onlineBadge}
                            aria-label={t('chat.online', 'Online')}
                          />
                        ) : null}
                      </div>
                      <span className={styles.chatPreviewText}>
                        <span className={styles.chatPreviewHeaderRow}>
                          <span className={styles.chatTitleGroup}>
                            <span className={styles.chatTitle}>{pName}</span>
                            {participant.employeeCode ? (
                              <span className={styles.employeeCodeTag}>
                                {participant.employeeCode}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className={styles.chatPreviewSnippetRow}>
                          <span className={styles.chatPreviewSnippet}>
                            {participant.email ||
                              participant.employeeCode ||
                              t('chat.startConversation')}
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </>
            ) : null}
          </>
        ) : previewSearch.trim() ? (
          <div className={styles.emptyContainer}>
            <Empty description={t('chat.noSearchResults')} />
          </div>
        ) : (
          <div className={styles.emptyContainer}>
            <Empty description={t('chat.emptyMessages')} />
          </div>
        )}
      </div>
      <div className={styles.chatPreviewFooter}>
        <Link
          className={styles.chatPreviewAllLink}
          to="/portal/chat"
          onClick={() => {
            setIsChatPreviewOpen(false)
            setPreviewSearch('')
          }}
        >
          {t('chat.viewAll')}
        </Link>
      </div>
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
                onClick={() => {
                  void requestDesktopNotificationPermission()
                  setIsChatPreviewOpen((open) => !open)
                }}
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
              onClick={() => {
                void requestDesktopNotificationPermission()
                setIsChatPreviewOpen((open) => !open)
              }}
            />
          </Badge>
        )}
      </div>

      {/* Minimized Chat Heads (Bong bóng chat) */}
      {overlayRoot
        ? bubbleIds.map((conversationId, index) => {
            const conversation = recentConversations.find((c) => c.id === conversationId) ?? null
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
            const conversation = recentConversations.find((c) => c.id === conversationId) ?? null
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
