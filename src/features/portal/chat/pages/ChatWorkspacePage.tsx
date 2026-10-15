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
  Alert,
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
  SendChatMessageInput,
} from '@/features/portal/chat/api/chatApi'
import {
  createConversation,
  listChatParticipants,
  markChatConversationRead,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { getTeamsOAuthStatus } from '@/features/integration/teams/api/teamsOAuthApi'
import {
  chatConversationOptions,
  chatMessageOptions,
  receiveChatMessage,
  useTeamsChatSync,
} from '@/features/portal/chat/api/chatQueries'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { type ChatSocket, createChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import { uploadMediaAsset } from '@/features/portal/media/api/mediaApi'
import { getAccount } from '@/shared/auth/session'
import { ChatAttachments } from '../components/ChatAttachments'
import { ChatReplyQuote } from '../components/ChatReplyQuote'
import { ChatReplyAction } from '../components/ChatReplyAction'
import messageStyles from '../components/ChatMessageActions.module.scss'
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
  participants,
  onReply,
  sending,
}: {
  message: ChatMessage
  isOwn: boolean
  senderParticipant?: ChatParticipant
  showAvatar?: boolean
  participants: Map<string, ChatParticipant>
  onReply: () => void
  sending: boolean
}) {
  const timeLabel = formatMessageTime(message.createdAt)
  const senderInitials = getInitials(participantLabel(senderParticipant))

  return (
    <div
      className={`${messageStyles.message} ${styles.messageWrapper} ${isOwn ? styles.ownWrapper : styles.receivedWrapper}`}
      tabIndex={-1}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch') event.currentTarget.focus()
      }}
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
        {message.replyToMessageId ? (
          <ChatReplyQuote quote={message.replyToMessage} participants={participants} />
        ) : null}
        {message.body ? <div className={styles.messageText}>{message.body}</div> : null}
        <ChatAttachments message={message} />
        <div
          className={styles.messageTime}
          title={message.createdAt ? new Date(message.createdAt).toLocaleString() : undefined}
        >
          {timeLabel}
        </div>
      </div>
      {!message.deletedAt ? <ChatReplyAction onClick={onReply} disabled={sending} /> : null}
    </div>
  )
}

function sendSocketMessage(
  socket: ChatSocket,
  conversationId: string,
  input: SendChatMessageInput,
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
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
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
    ...chatConversationOptions(),
  })
  const participants = useQuery({
    queryKey: ['chat-participants'],
    queryFn: () => listChatParticipants({ limit: 100 }),
  })
  const teamsOAuth = useQuery({
    queryKey: ['teams-oauth-status'],
    queryFn: getTeamsOAuthStatus,
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
    ...chatMessageOptions(activeConversationId),
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
      const uploadedAssets = await Promise.all(
        files.map((file) => uploadMediaAsset(file.originFileObj as File)),
      )
      const input = {
        ...(replyTo?.conversationId === activeConversationId
          ? { replyToMessageId: replyTo.id }
          : {}),
        body,
        assetIds: uploadedAssets.map(({ id }) => id),
      }
      return socketRef.current
        ? sendSocketMessage(socketRef.current, activeConversationId, input)
        : sendChatMessage(activeConversationId, input)
    },
    onSuccess: async (message) => {
      await receiveChatMessage(queryClient, message)
      setDraft('')
      setReplyTo(null)
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
    socket.on('message.created', ({ message }) => {
      receiveChatMessage(queryClient, message)
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
  }, [activeConversationId, latestMessageId, messages.isLoading])

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
  const canShowTeamsStatus =
    selectedConversation?.type === 'DIRECT' &&
    Boolean(otherParticipant?.email.toLowerCase().endsWith('@lngwork.co')) &&
    teamsOAuth.data?.enabled

  useTeamsChatSync(
    activeConversationId,
    selectedConversation?.type === 'DIRECT' &&
      Boolean(otherParticipant?.email.toLowerCase().endsWith('@lngwork.co')),
  )

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
            {t('chat.title')}
          </Typography.Title>
          <Typography.Text type="secondary" className={styles.sidebarDesc}>
            {t('chat.description')}
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
                              (isOnline ? t('chat.online') : t('chat.offline'))}
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </Space>
            ) : (
              <Empty
                description={search.trim() ? t('chat.noSearchResults') : t('chat.searchCompany')}
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
                  t('chat.deletedUser'),
                )
                const preview =
                  conv.type === 'DIRECT' && conv.lastMessageSenderAccountId !== account?.id
                    ? conv.lastMessagePreview || (isOnline ? t('chat.online') : t('chat.offline'))
                    : messagePreviewText(
                        conv,
                        participantById,
                        account?.id,
                        t('chat.noMessages'),
                        t('chat.you'),
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
              description={search.trim() ? t('chat.noSearchResults') : t('chat.emptyMessages')}
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
                      t('chat.deletedUser'),
                    )
                  : t('chat.select')}
              </Typography.Title>
              <div className={styles.paneHeaderSub}>
                {selectedConversation?.type === 'DIRECT' ? (
                  otherParticipant ? (
                    <>
                      <span
                        className={`${styles.statusDot} ${isOtherOnline ? styles.online : styles.offline}`}
                      />
                      <span>{isOtherOnline ? t('chat.activeNow') : t('chat.offline')}</span>
                      {otherParticipant?.email ? (
                        <>
                          <span>•</span>
                          <span>{otherParticipant.email}</span>
                        </>
                      ) : null}
                      {canShowTeamsStatus && teamsOAuth.data?.grantStatus === 'CONNECTED' ? (
                        <span className={styles.teamsTag}>
                          <TeamOutlined /> {t('chat.teamsConnected')}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span>{t('chat.deletedUser')}</span>
                  )
                ) : (
                  <span>
                    {selectedConversation?.participantAccountIds.length || 0}{' '}
                    {t('chat.participants')}
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
              <Empty description={t('chat.select')} />
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
                        participants={participantById}
                        sending={sendMutation.isPending}
                        onReply={() => {
                          setReplyTo(message)
                          textareaRef.current?.focus()
                        }}
                      />
                    </div>
                  )
                })}
                <div ref={messagesEndRef} aria-hidden="true" />
              </>
            ) : (
              <Empty description={t('chat.emptyMessages')} />
            )}
          </div>
        </div>

        {/* Composer */}
        <div className={styles.composer}>
          {sendMutation.isError ? <Alert type="error" title={t('chatMedia.sendFailed')} /> : null}
          {replyTo?.conversationId === activeConversationId ? (
            <ChatReplyQuote
              quote={replyTo}
              participants={participantById}
              onCancel={() => setReplyTo(null)}
              disabled={sendMutation.isPending}
            />
          ) : null}
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
              disabled={sendMutation.isPending}
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
                disabled={sendMutation.isPending}
                type="button"
                className={styles.attachBtn}
                aria-label={t('chat.attach')}
                title={t('chat.attach')}
              >
                <PaperClipOutlined style={{ fontSize: 17 }} />
              </button>
            </Upload>
            <div className={styles.composerInputWrap}>
              <textarea
                disabled={sendMutation.isPending}
                ref={textareaRef}
                className={styles.composerTextarea}
                aria-label={t('chat.composerLabel')}
                placeholder={t('chat.placeholder')}
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
              aria-label={t('chat.send')}
              title={t('chat.send')}
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
