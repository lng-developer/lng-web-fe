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
  listChatConversations,
  listChatMessages,
  listChatParticipants,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { type ChatSocket, createChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import { uploadMediaAsset } from '@/features/portal/media/api/mediaApi'
import { getAccount } from '@/shared/auth/session'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { AuthenticatedMediaImage } from '@/shared/media'

import styles from './ChatWorkspacePage.module.scss'

const MESSAGE_LIMIT = 50
type ChatPage<T> = { items: T[]; pagination: { page: number; limit: number; total: number } }

function participantLabel(account?: ChatParticipant) {
  return account?.displayName || account?.fullName || account?.email || account?.employeeCode || ''
}

function getInitials(name?: string) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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

function conversationTitle(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant> = new Map(),
  currentAccountId?: string,
) {
  if (conversation.type === 'DIRECT') {
    const otherAccountId = conversation.participantAccountIds.find((id) => id !== currentAccountId)
    const otherParticipant = otherAccountId ? participantById.get(otherAccountId) : undefined
    const name = otherParticipant?.displayName || otherParticipant?.fullName
    if (name) return name
    const fallback = participantLabel(otherParticipant)
    if (fallback) return fallback
    if (conversation.title) return conversation.title
  }
  return (
    conversation.title ||
    conversation.relatedResource?.id ||
    `${conversation.type.replaceAll('_', ' ')} conversation`
  )
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
  input: { body: string; assetIds: string[] },
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
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<UploadFile[]>([])
  const socketRef = useRef<ChatSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const account = getAccount()

  const conversations = useQuery({
    queryKey: chatKeys.conversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
    queryFn: () => listChatConversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
  })
  const directConversations = useMemo(
    () => (conversations.data?.items ?? []).filter((c) => c.type === 'DIRECT'),
    [conversations.data?.items],
  )
  const firstConversationId = directConversations[0]?.id ?? null
  const activeConversationId = selectedId ?? firstConversationId
  const selectedConversation =
    conversations.data?.items.find(({ id }) => id === activeConversationId) ?? null
  const messages = useQuery({
    queryKey: chatKeys.messages(activeConversationId),
    queryFn: () => listChatMessages(activeConversationId!, { page: 1, limit: MESSAGE_LIMIT }),
    enabled: Boolean(activeConversationId),
  })
  const participants = useQuery({
    queryKey: ['chat-participants'],
    queryFn: () => listChatParticipants({ limit: 100 }),
  })

  const conversationByParticipantId = useMemo(() => {
    const map = new Map<string, ChatConversation>()
    directConversations.forEach((conv) => {
      const otherId = conv.participantAccountIds.find((id) => id !== account?.id)
      if (otherId) {
        map.set(otherId, conv)
      }
    })
    return map
  }, [directConversations, account?.id])

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
      const uploadedAssets = await Promise.all(
        files.map((file) => uploadMediaAsset(file.originFileObj as File)),
      )
      const input = {
        body,
        assetIds: uploadedAssets.map(({ id }) => id),
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
                  activeConversationIdRef.current,
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
  const participantById = useMemo(
    () => new Map((participants.data?.items ?? []).map((p) => [p.id, p])),
    [participants.data?.items],
  )
  const searchText = search.trim().toLowerCase()
  const people = (participants.data?.items ?? []).filter(
    (acc) => !searchText || participantLabel(acc).toLowerCase().includes(searchText),
  )

  // Prioritize users with active/recent messages at the top
  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      const convA = conversationByParticipantId.get(a.id)
      const convB = conversationByParticipantId.get(b.id)
      const timeA = convA?.lastMessageAt ? new Date(convA.lastMessageAt).getTime() : 0
      const timeB = convB?.lastMessageAt ? new Date(convB.lastMessageAt).getTime() : 0
      if (timeA !== timeB) return timeB - timeA
      return participantLabel(a).localeCompare(participantLabel(b))
    })
  }, [people, conversationByParticipantId])

  const otherAccountId =
    selectedConversation?.type === 'DIRECT'
      ? selectedConversation.participantAccountIds.find((id) => id !== account?.id)
      : null
  const otherParticipant = otherAccountId ? participantById.get(otherAccountId) : undefined
  const otherPresence = otherAccountId
    ? (presenceByAccountId[otherAccountId] ?? otherParticipant?.presence ?? 'OFFLINE')
    : 'OFFLINE'
  const isOtherOnline = otherPresence === 'ONLINE'
  const otherInitials = getInitials(participantLabel(otherParticipant))

  const startDirectChat = (accountId: string) => {
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
        </div>
        <div className={styles.searchWrap}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder={t('chat.searchMessenger', 'Search Messenger')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className={styles.conversationList}>
          {participants.isLoading || conversations.isLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : sortedPeople.length ? (
            <Space orientation="vertical" size={2} style={{ width: '100%' }}>
              <Typography.Text className={styles.sectionLabel}>
                {t('chat.people', 'People')}
              </Typography.Text>
              {sortedPeople.map((accountItem) => {
                const conv = conversationByParticipantId.get(accountItem.id)
                const isSelected = activeConversationId
                  ? conv?.id === activeConversationId || accountItem.id === otherAccountId
                  : false
                const presence =
                  presenceByAccountId[accountItem.id] ?? accountItem.presence ?? 'OFFLINE'
                const isOnline = presence === 'ONLINE'
                const lastTime = conv?.lastMessageAt ? formatMessageTime(conv.lastMessageAt) : null
                const itemInitials = getInitials(participantLabel(accountItem))

                return (
                  <button
                    key={accountItem.id}
                    type="button"
                    className={`${styles.conversationButton} ${isSelected ? styles.activeConversation : ''}`}
                    onClick={() => startDirectChat(accountItem.id)}
                  >
                    <Badge dot status={isOnline ? 'success' : 'default'} offset={[-2, 30]}>
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
                        {itemInitials || (
                          <UserOutlined style={{ color: isSelected ? '#ffffff' : '#64748b' }} />
                        )}
                      </Avatar>
                    </Badge>
                    <span className={styles.conversationMeta}>
                      <span className={styles.conversationHeaderRow}>
                        <span className={styles.participantName}>
                          {participantLabel(accountItem)}
                        </span>
                        {lastTime ? (
                          <span className={styles.lastMessageTime}>{lastTime}</span>
                        ) : null}
                      </span>
                      <span className={styles.previewRow}>
                        <span className={styles.preview}>
                          {conv?.lastMessagePreview ||
                            (isOnline ? t('chat.online', 'Online') : t('chat.offline', 'Offline'))}
                        </span>
                        {conv && conv.unreadCount > 0 ? (
                          <span className={styles.unreadBadge}>{conv.unreadCount}</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                )
              })}
            </Space>
          ) : (
            <Empty description={t('chat.emptyPeople', 'No chat participants')} />
          )}
        </div>
      </aside>

      {/* ================= MAIN CHAT PANE ================= */}
      <main className={styles.pane}>
        {/* Header */}
        <div className={styles.paneHeader}>
          <div className={styles.paneHeaderLeft}>
            <Badge dot status={isOtherOnline ? 'success' : 'default'} offset={[-2, 32]}>
              <Avatar
                size={40}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {otherInitials || <UserOutlined style={{ color: '#ffffff' }} />}
              </Avatar>
            </Badge>
            <div className={styles.paneHeaderInfo}>
              <Typography.Title level={4} className={styles.paneHeaderTitle}>
                {selectedConversation
                  ? conversationTitle(selectedConversation, participantById, account?.id)
                  : t('chat.select', 'Select a conversation')}
              </Typography.Title>
              <div className={styles.paneHeaderSub}>
                <span
                  className={`${styles.statusDot} ${isOtherOnline ? styles.online : styles.offline}`}
                />
                <span>
                  {isOtherOnline ? t('chat.activeNow', 'Active now') : t('chat.offline', 'Offline')}
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
