import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CloseCircleFilled,
  PaperClipOutlined,
  SearchOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Skeleton,
  Space,
  Typography,
  Upload,
  type UploadFile,
} from 'antd'

import type {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
} from '@/features/portal/chat/api/chatApi'
import {
  createConversation,
  getMsGraphToken,
  listChatConversations,
  listChatMessages,
  listChatParticipants,
  markChatConversationRead,
  sendChatMessage,
  syncTeamsChat,
} from '@/features/portal/chat/api/chatApi'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { type ChatSocket, createChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import { uploadMediaAsset } from '@/features/portal/media/api/mediaApi'
import { getAccount } from '@/shared/auth/session'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { AuthenticatedMediaImage } from '@/shared/media'
import {
  conversationInitials,
  conversationTitle,
  formatRelativeTime,
  getInitials,
  matchesConversationSearch,
  matchesParticipantSearch,
  messagePreviewText,
  participantLabel,
} from '../components/chatViewUtils'

import styles from './ChatWorkspacePage.module.scss'

const MESSAGE_LIMIT = 50
type ChatPage<T> = { items: T[]; pagination: { page: number; limit: number; total: number } }

function formatMessageTime(dateString?: string | null) {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function getDateGroupKey(dateString?: string | null) {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

function formatDateGroupLabel(groupKey: string, t: (key: string, fallback: string) => string) {
  if (!groupKey) return ''
  try {
    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    if (groupKey === todayKey) return t('chat.today', 'Hôm nay')
    if (groupKey === yesterdayKey) return t('chat.yesterday', 'Hôm qua')

    const [year, month, day] = groupKey.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return groupKey
  }
}

function MessageBubble({
  message,
  isOwn,
  senderParticipant,
  showAvatar = true,
}: {
  message: ChatMessage
  isOwn: boolean
  senderParticipant?: ChatParticipant
  showAvatar?: boolean
}) {
  const assets = message.assets?.length
    ? message.assets
    : message.assetIds.map((assetId) => ({
        id: assetId,
        originalFilename: null,
        mimeType: null,
        size: null,
        downloadUrl: `/api/media/assets/${assetId}/download`,
      }))

  const timeLabel = formatMessageTime(message.createdAt)
  const senderInitials = getInitials(participantLabel(senderParticipant))

  return (
    <div
      className={`${styles.messageWrapper} ${isOwn ? styles.ownWrapper : styles.receivedWrapper}`}
    >
      {!isOwn ? (
        showAvatar ? (
          <Avatar
            size={32}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontWeight: 600,
              fontSize: 12,
              border: '1px solid #e2e8f0',
            }}
            className={styles.messageAvatar}
          >
            {senderInitials || <UserOutlined style={{ color: '#64748b' }} />}
          </Avatar>
        ) : (
          <div style={{ width: 32, flexShrink: 0 }} />
        )
      ) : null}
      <div
        className={`${styles.messageBubble} ${isOwn ? styles.ownBubble : styles.receivedBubble}`}
      >
        {message.body ? <div className={styles.messageText}>{message.body}</div> : null}
        {assets.length ? (
          <Space wrap size={6} className={styles.attachments}>
            {assets.map((asset) =>
              asset.mimeType?.startsWith('image/') ? (
                <a
                  key={asset.id}
                  href={asset.downloadUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                >
                  <AuthenticatedMediaImage
                    alt={asset.originalFilename || asset.id}
                    downloadUrl={asset.downloadUrl}
                    className={styles.imageAttachment}
                  />
                </a>
              ) : (
                <Typography.Link key={asset.id} href={asset.downloadUrl || undefined}>
                  <PaperClipOutlined /> {asset.originalFilename || asset.id.slice(-6)}
                </Typography.Link>
              ),
            )}
          </Space>
        ) : null}
        <div
          className={styles.messageTime}
          title={message.createdAt ? new Date(message.createdAt).toLocaleString() : undefined}
        >
          {timeLabel}
        </div>
      </div>
    </div>
  )
}

function sendSocketMessage(
  socket: ChatSocket,
  conversationId: string,
  input: { body: string; assetIds: string[]; msGraphToken?: string | null },
) {
  return new Promise<ChatMessage>((resolve, reject) => {
    socket.emit('message.send', { conversationId, ...input }, (result) => {
      if (!result.ok || !result.message) {
        reject(new Error(result.error || 'Message failed'))
        return
      }
      resolve(result.message)
    })
  })
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  return [item, ...items.filter(({ id }) => id !== item.id)]
}

function mergeRealtimeConversation(
  items: ChatConversation[],
  conversation: ChatConversation,
  message: ChatMessage,
  currentAccountId: string | undefined,
  activeConversationId: string | null,
) {
  const existing = items.find(({ id }) => id === conversation.id)
  const alreadyApplied =
    existing?.lastMessageAt === conversation.lastMessageAt &&
    existing?.lastMessageSenderAccountId === conversation.lastMessageSenderAccountId &&
    existing?.lastMessagePreview === conversation.lastMessagePreview
  const shouldMarkUnread =
    message.senderAccountId !== currentAccountId && message.conversationId !== activeConversationId
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

export function ChatWorkspacePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [presenceByAccountId, setPresenceByAccountId] = useState<
    Record<string, 'ONLINE' | 'OFFLINE'>
  >({})
  const [search, setSearch] = useState('')
  const [isNewMessage, setIsNewMessage] = useState(false)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<UploadFile[]>([])
  const socketRef = useRef<ChatSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const account = getAccount()

  const timeLabels = {
    now: t('chat.time.now'),
    minute: t('chat.time.minute'),
    hour: t('chat.time.hour'),
    day: t('chat.time.day'),
  }

  const conversations = useQuery({
    queryKey: chatKeys.conversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
    queryFn: () => listChatConversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
  })
  const participants = useQuery({
    queryKey: ['chat-participants'],
    queryFn: () => listChatParticipants({ limit: 100 }),
  })
  const participantById = useMemo(
    () => new Map((participants.data?.items ?? []).map((p) => [p.id, p])),
    [participants.data?.items],
  )
  const recentConversations = useMemo(
    () => (conversations.data?.items ?? []).filter((c) => Boolean(c.lastMessageAt)),
    [conversations.data?.items],
  )
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return recentConversations
    return recentConversations.filter((conv) =>
      matchesConversationSearch(conv, participantById, account?.id, search),
    )
  }, [recentConversations, participantById, account?.id, search])

  const conversationListItems = useMemo(() => {
    if (selectedId && !recentConversations.some((c) => c.id === selectedId)) {
      const newlyCreated = (conversations.data?.items ?? []).find((c) => c.id === selectedId)
      if (newlyCreated) {
        return [newlyCreated, ...filteredConversations]
      }
    }
    return filteredConversations
  }, [selectedId, recentConversations, conversations.data?.items, filteredConversations])

  const firstConversationId = conversationListItems[0]?.id ?? recentConversations[0]?.id ?? null
  const activeConversationId = selectedId ?? firstConversationId
  const selectedConversation =
    conversations.data?.items.find(({ id }) => id === activeConversationId) ?? null
  const messages = useQuery({
    queryKey: chatKeys.messages(activeConversationId),
    queryFn: () => listChatMessages(activeConversationId!, { page: 1, limit: MESSAGE_LIMIT }),
    enabled: Boolean(activeConversationId),
  })
  const { mutate: markRead } = useMutation({
    mutationFn: markChatConversationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.unread })
      void queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'conversations'] })
    },
  })
  const latestMessageId = messages.data?.items.at(-1)?.id
  useEffect(() => {
    const readVisibleConversation = () => {
      if (activeConversationId && latestMessageId && document.visibilityState === 'visible') {
        markRead(activeConversationId)
      }
    }
    readVisibleConversation()
    document.addEventListener('visibilitychange', readVisibleConversation)
    return () => document.removeEventListener('visibilitychange', readVisibleConversation)
  }, [activeConversationId, latestMessageId, markRead])
  const directorySearch = useQuery({
    queryKey: ['chat-participants', 'search', search.trim()],
    queryFn: () => listChatParticipants({ search: search.trim(), limit: 100 }),
    enabled: isNewMessage && Boolean(search.trim()),
  })

  const conversationByParticipantId = useMemo(() => {
    const map = new Map<string, ChatConversation>()
    ;(conversations.data?.items ?? []).forEach((conv) => {
      if (conv.type === 'DIRECT') {
        const otherId = conv.participantAccountIds.find((id) => id !== account?.id)
        if (otherId) {
          map.set(otherId, conv)
        }
      }
    })
    return map
  }, [conversations.data?.items, account?.id])

  const createMutation = useMutation({
    mutationFn: (input: {
      type: 'DIRECT'
      title: string | null
      participantAccountIds: string[]
    }) => createConversation(input),
    onSuccess: async (conversation) => {
      setSelectedId(conversation.id)
      await queryClient.invalidateQueries({ queryKey: chatKeys.all })
    },
  })
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId) throw new Error('No conversation selected')
      const body = draft.trim()
      const [uploadedAssets, msGraphToken] = await Promise.all([
        Promise.all(files.map((file) => uploadMediaAsset(file.originFileObj as File))),
        getMsGraphToken(),
      ])
      const input = {
        body,
        assetIds: uploadedAssets.map(({ id }) => id),
        ...(msGraphToken ? { msGraphToken } : {}),
      }
      return socketRef.current
        ? sendSocketMessage(socketRef.current, activeConversationId, input)
        : sendChatMessage(activeConversationId, input)
    },
    onSuccess: () => {
      setDraft('')
      setFiles([])
    },
  })

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    const socket = createChatSocket()
    socketRef.current = socket
    if (!socket) return
    socket.on('connect', () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.all })
      if (activeConversationIdRef.current)
        socket.emit('conversation.join', { conversationId: activeConversationIdRef.current })
    })
    socket.on('message.read', (state) => {
      if (state.accountId === account?.id) {
        void queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'conversations'] })
      }
    })
    socket.on('message.created', ({ conversation, message }) => {
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
                  account?.id,
                  document.visibilityState === 'visible' ? activeConversationIdRef.current : null,
                ),
              }
            : current,
      )
    })
    socket.on('presence.changed', ({ accountId, presence }) => {
      setPresenceByAccountId((current) => ({ ...current, [accountId]: presence }))
    })
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [queryClient, account?.id])

  useEffect(() => {
    if (!activeConversationId || !socketRef.current) return
    socketRef.current.emit('conversation.join', { conversationId: activeConversationId })
  }, [activeConversationId])

  useEffect(() => {
    if (!activeConversationId || messages.isLoading) return
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView?.({ block: 'end' })
    })
  }, [activeConversationId, messages.data?.items.length, messages.isLoading])

  const canSend = Boolean(
    activeConversationId && (draft.trim() || files.length) && !sendMutation.isPending,
  )
  const people = useMemo(() => {
    if (!isNewMessage) return []
    const candidates = directorySearch.data?.items ?? participants.data?.items ?? []
    return candidates.filter((acc) => {
      if (acc.id === account?.id) return false
      return matchesParticipantSearch(acc, search)
    })
  }, [isNewMessage, directorySearch.data?.items, participants.data?.items, account?.id, search])

  const otherAccountId =
    selectedConversation?.type === 'DIRECT'
      ? selectedConversation.participantAccountIds.find((id) => id !== account?.id)
      : null
  const otherParticipant = otherAccountId ? participantById.get(otherAccountId) : undefined
  const otherPresence = otherAccountId
    ? (presenceByAccountId[otherAccountId] ?? otherParticipant?.presence ?? 'OFFLINE')
    : 'OFFLINE'
  const isOtherOnline = otherPresence === 'ONLINE'
  const otherInitials = selectedConversation
    ? conversationInitials(selectedConversation, participantById, account?.id)
    : ''

  useEffect(() => {
    if (!activeConversationId || !otherParticipant?.email?.includes('@lngwork.co')) return

    let isDisposed = false
    const pollSync = () => {
      syncTeamsChat(activeConversationId)
        .then((res) => {
          if (!isDisposed && res?.syncedCount > 0) {
            queryClient.invalidateQueries({ queryKey: chatKeys.messages(activeConversationId) })
            queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'conversations'] })
          }
        })
        .catch(() => undefined)
    }

    pollSync()
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        pollSync()
      }
    }, 8000)

    return () => {
      isDisposed = true
      clearInterval(timer)
    }
  }, [activeConversationId, otherParticipant?.email, queryClient])

  const startDirectChat = (accountId: string) => {
    if (isNewMessage) {
      const candidateList = directorySearch.data?.items ?? participants.data?.items ?? []
      const participant = candidateList.find((item) => item.id === accountId)
      if (participant) {
        queryClient.setQueryData<{ items: ChatParticipant[] }>(
          ['chat-participants'],
          (current) => ({
            items: [...(current?.items ?? []).filter((item) => item.id !== accountId), participant],
          }),
        )
      }
      setIsNewMessage(false)
      setSearch('')
    }
    const existingConv = conversationByParticipantId.get(accountId)
    if (existingConv) {
      setSelectedId(existingConv.id)
      return
    }
    createMutation.mutate({ type: 'DIRECT', title: null, participantAccountIds: [accountId] })
  }

  const messageItems = messages.data?.items ?? []

  return (
    <div className={styles.shell}>
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Typography.Title level={4} className={styles.sidebarTitle}>
            {t('chat.title', 'Chat')}
          </Typography.Title>
          <Typography.Text type="secondary" className={styles.sidebarDesc}>
            {t('chat.description', 'Internal conversations and file handoffs')}
          </Typography.Text>
          <Button
            onClick={() => {
              setIsNewMessage((current) => !current)
              setSearch('')
            }}
          >
            {t(isNewMessage ? 'chat.backToConversations' : 'chat.newMessage')}
          </Button>
        </div>
        <div className={styles.searchWrap}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder={t(isNewMessage ? 'chat.searchCompany' : 'chat.searchMessenger')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className={styles.conversationList}>
          {participants.isLoading ||
          conversations.isLoading ||
          (isNewMessage && directorySearch.isFetching) ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : isNewMessage ? (
            people.length ? (
              <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                <Typography.Text className={styles.sectionLabel}>
                  {t('chat.people')}
                </Typography.Text>
                {people.map((accountItem) => {
                  const presence =
                    presenceByAccountId[accountItem.id] ?? accountItem.presence ?? 'OFFLINE'
                  const isOnline = presence === 'ONLINE'
                  const itemInitials = getInitials(participantLabel(accountItem))

                  return (
                    <button
                      key={accountItem.id}
                      type="button"
                      className={styles.conversationButton}
                      onClick={() => startDirectChat(accountItem.id)}
                    >
                      <Badge dot status={isOnline ? 'success' : 'default'} offset={[-2, 30]}>
                        <Avatar
                          size={38}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            fontWeight: 600,
                            fontSize: 13,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {itemInitials || <UserOutlined style={{ color: '#64748b' }} />}
                        </Avatar>
                      </Badge>
                      <span className={styles.conversationMeta}>
                        <span className={styles.conversationHeaderRow}>
                          <span className={styles.participantName}>
                            {participantLabel(accountItem)}
                          </span>
                        </span>
                        <span className={styles.previewRow}>
                          <span className={styles.preview}>
                            {accountItem.email ||
                              accountItem.employeeCode ||
                              (isOnline
                                ? t('chat.online', 'Online')
                                : t('chat.offline', 'Offline'))}
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </Space>
            ) : (
              <Empty
                description={
                  search.trim()
                    ? t('chat.noSearchResults', 'No results found')
                    : t('chat.searchCompany')
                }
              />
            )
          ) : conversationListItems.length ? (
            <Space orientation="vertical" size={2} style={{ width: '100%' }}>
              <Typography.Text className={styles.sectionLabel}>
                {t('chat.conversations')}
              </Typography.Text>
              {conversationListItems.map((conv) => {
                const isSelected = conv.id === activeConversationId
                const otherId =
                  conv.type === 'DIRECT'
                    ? conv.participantAccountIds.find((id) => id !== account?.id)
                    : null
                const otherP = otherId ? participantById.get(otherId) : undefined
                const presence = otherId
                  ? (presenceByAccountId[otherId] ?? otherP?.presence ?? 'OFFLINE')
                  : 'OFFLINE'
                const isOnline = presence === 'ONLINE'
                const timeLabel = conv.lastMessageAt
                  ? formatRelativeTime(conv.lastMessageAt, timeLabels)
                  : null
                const initials = conversationInitials(conv, participantById, account?.id)
                const title = conversationTitle(
                  conv,
                  participantById,
                  account?.id,
                  t('chat.deletedUser', 'Người dùng đã xóa'),
                )
                const preview =
                  conv.type === 'DIRECT' && conv.lastMessageSenderAccountId !== account?.id
                    ? conv.lastMessagePreview ||
                      (isOnline ? t('chat.online', 'Online') : t('chat.offline', 'Offline'))
                    : messagePreviewText(
                        conv,
                        participantById,
                        account?.id,
                        t('chat.noMessages', 'Chưa có tin nhắn'),
                        t('chat.you', 'Bạn'),
                      )

                return (
                  <button
                    key={conv.id}
                    type="button"
                    className={`${styles.conversationButton} ${isSelected ? styles.activeConversation : ''}`}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <Badge
                      dot={conv.type === 'DIRECT' && Boolean(otherP)}
                      status={isOnline ? 'success' : 'default'}
                      offset={[-2, 30]}
                    >
                      <Avatar
                        size={38}
                        style={{
                          backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#334155',
                          fontWeight: 600,
                          fontSize: 13,
                          border: isSelected ? 'none' : '1px solid #e2e8f0',
                        }}
                      >
                        {conv.type === 'TEAM' ? (
                          <TeamOutlined style={{ color: isSelected ? '#ffffff' : '#2563eb' }} />
                        ) : initials ? (
                          initials
                        ) : (
                          <UserOutlined style={{ color: isSelected ? '#ffffff' : '#64748b' }} />
                        )}
                      </Avatar>
                    </Badge>
                    <span className={styles.conversationMeta}>
                      <span className={styles.conversationHeaderRow}>
                        <span className={styles.participantName}>{title}</span>
                        {timeLabel ? (
                          <span className={styles.lastMessageTime}>{timeLabel}</span>
                        ) : null}
                      </span>
                      <span className={styles.previewRow}>
                        <span className={styles.preview}>{preview}</span>
                        {conv.unreadCount > 0 ? (
                          <span className={styles.unreadBadge}>{conv.unreadCount}</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                )
              })}
            </Space>
          ) : (
            <Empty
              description={
                search.trim()
                  ? t('chat.noSearchResults', 'No results found')
                  : t('chat.emptyMessages')
              }
            />
          )}
        </div>
      </aside>

      {/* ================= MAIN CHAT PANE ================= */}
      <main className={styles.pane}>
        {/* Header */}
        <div className={styles.paneHeader}>
          <div className={styles.paneHeaderLeft}>
            <Badge
              dot={Boolean(selectedConversation?.type === 'DIRECT' && otherParticipant)}
              status={isOtherOnline ? 'success' : 'default'}
              offset={[-2, 32]}
            >
              <Avatar
                size={40}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {selectedConversation?.type === 'TEAM' ? (
                  <TeamOutlined style={{ color: '#ffffff' }} />
                ) : otherInitials ? (
                  otherInitials
                ) : (
                  <UserOutlined style={{ color: '#ffffff' }} />
                )}
              </Avatar>
            </Badge>
            <div className={styles.paneHeaderInfo}>
              <Typography.Title level={4} className={styles.paneHeaderTitle}>
                {selectedConversation
                  ? conversationTitle(
                      selectedConversation,
                      participantById,
                      account?.id,
                      t('chat.deletedUser', 'Người dùng đã xóa'),
                    )
                  : t('chat.select', 'Select a conversation')}
              </Typography.Title>
              <div className={styles.paneHeaderSub}>
                {selectedConversation?.type === 'DIRECT' ? (
                  otherParticipant ? (
                    <>
                      <span
                        className={`${styles.statusDot} ${isOtherOnline ? styles.online : styles.offline}`}
                      />
                      <span>
                        {isOtherOnline
                          ? t('chat.activeNow', 'Active now')
                          : t('chat.offline', 'Offline')}
                      </span>
                      {otherParticipant?.email ? (
                        <>
                          <span>•</span>
                          <span>{otherParticipant.email}</span>
                        </>
                      ) : null}
                      {otherParticipant?.email?.includes('@lngwork.co') ? (
                        <span className={styles.teamsTag}>
                          <TeamOutlined /> {t('chat.teamsConnected', 'Teams')}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span>{t('chat.deletedUser', 'Người dùng đã xóa')}</span>
                  )
                ) : (
                  <span>
                    {selectedConversation?.participantAccountIds.length || 0}{' '}
                    {t('chat.participants', 'người tham gia')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className={styles.messages}>
          <div className={styles.messagesInner}>
            {!activeConversationId ? (
              <Empty description={t('chat.select', 'Select a conversation')} />
            ) : messages.isLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : messageItems.length ? (
              <>
                {messageItems.map((message, idx) => {
                  const isOwn = message.senderAccountId === account?.id
                  const currentDateKey = getDateGroupKey(message.createdAt)
                  const prevDateKey =
                    idx > 0 ? getDateGroupKey(messageItems[idx - 1].createdAt) : null
                  const showDateDivider = currentDateKey !== prevDateKey

                  const prevSender = idx > 0 ? messageItems[idx - 1].senderAccountId : null
                  const showAvatar = message.senderAccountId !== prevSender || showDateDivider

                  const senderParticipant = message.senderAccountId
                    ? participantById.get(message.senderAccountId)
                    : undefined

                  return (
                    <div
                      key={message.id}
                      className={`${styles.messageRow} ${isOwn ? styles.ownRow : styles.receivedRow}`}
                    >
                      {showDateDivider ? (
                        <div className={styles.dateDivider}>
                          <span>{formatDateGroupLabel(currentDateKey, t)}</span>
                        </div>
                      ) : null}
                      <MessageBubble
                        message={message}
                        isOwn={isOwn}
                        senderParticipant={senderParticipant}
                        showAvatar={showAvatar}
                      />
                    </div>
                  )
                })}
                <div ref={messagesEndRef} aria-hidden="true" />
              </>
            ) : (
              <Empty description={t('chat.emptyMessages', 'No messages yet')} />
            )}
          </div>
        </div>

        {/* Composer */}
        <div className={styles.composer}>
          {files.length ? (
            <div className={styles.attachmentsPreview}>
              {files.map((file) => (
                <span key={file.uid} className={styles.attachmentChip}>
                  <PaperClipOutlined />
                  <span>{file.name}</span>
                  <CloseCircleFilled
                    className={styles.attachmentRemove}
                    onClick={() =>
                      setFiles((current) => current.filter(({ uid }) => uid !== file.uid))
                    }
                  />
                </span>
              ))}
            </div>
          ) : null}
          <div className={styles.composerForm}>
            <Upload
              multiple
              fileList={files}
              showUploadList={false}
              beforeUpload={(file) => {
                setFiles((current) => [
                  ...current,
                  { uid: file.uid, name: file.name, status: 'done', originFileObj: file },
                ])
                return false
              }}
            >
              <button
                type="button"
                className={styles.attachBtn}
                aria-label={t('chat.attach', 'Attach')}
                title={t('chat.attach', 'Attach')}
              >
                <PaperClipOutlined style={{ fontSize: 17 }} />
              </button>
            </Upload>
            <div className={styles.composerInputWrap}>
              <textarea
                ref={textareaRef}
                className={styles.composerTextarea}
                aria-label={t('chat.composerLabel', 'Message')}
                placeholder={t('chat.placeholder', 'Write a message')}
                value={draft}
                rows={1}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && canSend) {
                    event.preventDefault()
                    sendMutation.mutate()
                  }
                }}
              />
            </div>
            <button
              type="button"
              className={styles.sendBtn}
              aria-label={t('chat.send', 'Send')}
              title={t('chat.send', 'Send')}
              disabled={!canSend}
              onClick={() => sendMutation.mutate()}
            >
              <SendOutlined style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
