import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PaperClipOutlined,
  SearchOutlined,
  SendOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  Select,
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
import { FormattedDateTime } from '@/shared/ui'

import styles from './ChatWorkspacePage.module.scss'

const MESSAGE_LIMIT = 50
type ChatPage<T> = { items: T[]; pagination: { page: number; limit: number; total: number } }

function participantLabel(account?: ChatParticipant) {
  return account?.displayName || account?.fullName || account?.employeeCode || account?.email || ''
}

function conversationTitle(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant> = new Map(),
  currentAccountId?: string,
) {
  if (conversation.type === 'DIRECT') {
    const otherAccountId = conversation.participantAccountIds.find((id) => id !== currentAccountId)
    const label = participantLabel(otherAccountId ? participantById.get(otherAccountId) : undefined)
    if (label) return label
  }
  return (
    conversation.title ||
    conversation.relatedResource?.id ||
    `${conversation.type.replaceAll('_', ' ')} conversation`
  )
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const assets = message.assets?.length
    ? message.assets
    : message.assetIds.map((assetId) => ({
        id: assetId,
        originalFilename: null,
        mimeType: null,
        size: null,
        downloadUrl: `/api/media/assets/${assetId}/download`,
      }))

  return (
    <div className={`${styles.message} ${isOwn ? styles.ownMessage : ''}`}>
      {!isOwn ? (
        <Avatar size={28} icon={<UserOutlined />} className={styles.messageAvatar} />
      ) : null}
      <div className={styles.messageBody}>
        {message.body ? <Typography.Text>{message.body}</Typography.Text> : null}
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
        <div className={styles.messageTime}>
          <FormattedDateTime value={message.createdAt} />
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
  const [isGroupOpen, setIsGroupOpen] = useState(false)
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [conversationTitleDraft, setConversationTitleDraft] = useState('')
  const [presenceByAccountId, setPresenceByAccountId] = useState<
    Record<string, 'ONLINE' | 'OFFLINE'>
  >({})
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<UploadFile[]>([])
  const socketRef = useRef<ChatSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const account = getAccount()

  const conversations = useQuery({
    queryKey: chatKeys.conversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
    queryFn: () => listChatConversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
  })
  const firstConversationId = conversations.data?.items[0]?.id ?? null
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
  const createMutation = useMutation({
    mutationFn: (input: {
      type: 'DIRECT' | 'TEAM'
      title: string | null
      participantAccountIds: string[]
    }) => createConversation(input),
    onSuccess: async (conversation) => {
      setIsGroupOpen(false)
      setParticipantIds([])
      setConversationTitleDraft('')
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
  }, [queryClient])

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
  const participantById = new Map(
    (participants.data?.items ?? []).map((participant) => [participant.id, participant]),
  )
  const searchText = search.trim().toLowerCase()
  const people = (participants.data?.items ?? []).filter(
    (account) => !searchText || participantLabel(account).toLowerCase().includes(searchText),
  )
  const groups = (conversations.data?.items ?? []).filter(
    (conversation) =>
      conversation.type !== 'DIRECT' &&
      (!searchText ||
        conversationTitle(conversation, participantById, account?.id)
          .toLowerCase()
          .includes(searchText)),
  )
  const startDirectChat = (accountId: string) => {
    createMutation.mutate({ type: 'DIRECT', title: null, participantAccountIds: [accountId] })
  }
  const createGroup = () => {
    createMutation.mutate({
      type: 'TEAM',
      title: conversationTitleDraft.trim() || null,
      participantAccountIds: participantIds,
    })
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {t('chat.title', 'Chat')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('chat.description', 'Internal conversations and file handoffs')}
            </Typography.Text>
          </div>
          <Button
            type="primary"
            icon={<TeamOutlined />}
            aria-label={t('chat.newGroup', 'New group')}
            onClick={() => setIsGroupOpen(true)}
          >
            {t('chat.newGroup', 'New group')}
          </Button>
        </div>
        <div className={styles.searchWrap}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('chat.searchMessenger', 'Search Messenger')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className={styles.conversationList}>
          {participants.isLoading || conversations.isLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : people.length || groups.length ? (
            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
              <Typography.Text type="secondary" className={styles.sectionLabel}>
                {t('chat.people', 'People')}
              </Typography.Text>
              {people.map((account) => {
                const presence = presenceByAccountId[account.id] ?? account.presence ?? 'OFFLINE'
                return (
                  <Button
                    key={account.id}
                    type="text"
                    className={styles.conversationButton}
                    onClick={() => startDirectChat(account.id)}
                  >
                    <Badge
                      dot
                      status={presence === 'ONLINE' ? 'success' : 'default'}
                      offset={[-2, 28]}
                    >
                      <Avatar size={34} icon={<UserOutlined />} />
                    </Badge>
                    <span className={styles.conversationMeta}>
                      <Typography.Text strong>{participantLabel(account)}</Typography.Text>
                      <Typography.Text type="secondary" className={styles.preview}>
                        {presence === 'ONLINE'
                          ? t('chat.online', 'Online')
                          : t('chat.offline', 'Offline')}
                      </Typography.Text>
                    </span>
                  </Button>
                )
              })}
              {groups.length ? (
                <Typography.Text type="secondary" className={styles.sectionLabel}>
                  {t('chat.groups', 'Groups')}
                </Typography.Text>
              ) : null}
              {groups.map((conversation) => (
                <Button
                  key={conversation.id}
                  type={conversation.id === activeConversationId ? 'primary' : 'text'}
                  className={styles.conversationButton}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <Avatar size={34} icon={<TeamOutlined />} />
                  <span className={styles.conversationMeta}>
                    <Typography.Text strong>
                      {conversationTitle(conversation, participantById, account?.id)}
                    </Typography.Text>
                    <Typography.Text type="secondary" className={styles.preview}>
                      {conversation.lastMessagePreview || t('chat.noMessages', 'No messages yet')}
                    </Typography.Text>
                  </span>
                </Button>
              ))}
            </Space>
          ) : (
            <Empty description={t('chat.emptyPeople', 'No chat participants')} />
          )}
        </div>
      </aside>
      <main className={styles.pane}>
        <div className={styles.paneHeader}>
          <Avatar
            size={42}
            icon={selectedConversation?.type === 'TEAM' ? <TeamOutlined /> : <UserOutlined />}
          />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {selectedConversation
                ? conversationTitle(selectedConversation, participantById, account?.id)
                : t('chat.select', 'Select a conversation')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {selectedConversation?.relatedResource
                ? `${selectedConversation.relatedResource.type}: ${selectedConversation.relatedResource.id}`
                : t('chat.internalThread', 'Internal message thread')}
            </Typography.Text>
          </div>
        </div>
        <div className={styles.messages}>
          {!activeConversationId ? (
            <Empty description={t('chat.select', 'Select a conversation')} />
          ) : messages.isLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : messages.data?.items.length ? (
            <>
              {messages.data.items.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderAccountId === account?.id}
                />
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </>
          ) : (
            <Empty description={t('chat.emptyMessages', 'No messages yet')} />
          )}
        </div>
        <div className={styles.composer}>
          <textarea
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
          <div className={styles.composerActions}>
            <Upload
              multiple
              fileList={files}
              beforeUpload={(file) => {
                setFiles((current) => [
                  ...current,
                  { uid: file.uid, name: file.name, status: 'done', originFileObj: file },
                ])
                return false
              }}
              onRemove={(file) =>
                setFiles((current) => current.filter(({ uid }) => uid !== file.uid))
              }
            >
              <Button aria-label={t('chat.attach', 'Attach')} icon={<UploadOutlined />}>
                {t('chat.attach', 'Attach')}
              </Button>
            </Upload>
            <Button
              type="primary"
              aria-label={t('chat.send', 'Send')}
              icon={<SendOutlined />}
              disabled={!canSend}
              loading={sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              {t('chat.send', 'Send')}
            </Button>
          </div>
        </div>
      </main>
      <Modal
        title={t('chat.newGroup', 'New group')}
        open={isGroupOpen}
        okText={t('chat.createGroup', 'Create group')}
        cancelText={t('chat.cancel', 'Cancel')}
        confirmLoading={createMutation.isPending}
        okButtonProps={{ disabled: participantIds.length < 2 }}
        onOk={createGroup}
        onCancel={() => setIsGroupOpen(false)}
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Input
            placeholder={t('chat.groupTitle', 'Group title')}
            value={conversationTitleDraft}
            onChange={(event) => setConversationTitleDraft(event.target.value)}
          />
          <Select
            mode="multiple"
            showSearch
            style={{ width: '100%' }}
            placeholder={t('chat.participants', 'Participants')}
            loading={participants.isLoading}
            value={participantIds}
            options={(participants.data?.items ?? []).map((account) => ({
              value: account.id,
              label: participantLabel(account),
            }))}
            optionFilterProp="label"
            onChange={setParticipantIds}
          />
        </Space>
      </Modal>
    </div>
  )
}
