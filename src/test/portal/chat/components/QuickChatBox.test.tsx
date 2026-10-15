import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  listChatMessages,
  sendChatMessage,
  syncTeamsChat,
  type ChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { QuickChatBox } from '@/features/portal/chat/components/QuickChatBox'
import { uploadMediaAsset } from '@/features/portal/media/api/mediaApi'
import { downloadMediaAsset } from '@/shared/media'

vi.mock('@/features/portal/chat/api/chatApi', () => ({
  listChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
  syncTeamsChat: vi.fn().mockResolvedValue({ status: 'SYNCED', syncedCount: 0 }),
}))
vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt }: { alt: string }) => <img alt={alt} />,
  downloadMediaAsset: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/features/portal/media/api/mediaApi', () => ({ uploadMediaAsset: vi.fn() }))

const message: ChatMessage = {
  id: 'm1',
  conversationId: 'c1',
  senderAccountId: 'other',
  body: 'Oldest visible message',
  assetIds: [],
  mentions: [],
  replyToMessageId: null,
  editedAt: null,
  deletedAt: null,
  createdAt: '2026-10-15T00:00:00Z',
  updatedAt: '2026-10-15T00:00:00Z',
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <QuickChatBox
        conversationId="c1"
        currentAccountId="me"
        isMinimized={false}
        isUnread={false}
        participantById={new Map([['other', { id: 'other', email: 'other@lngwork.co' }]])}
        conversation={{
          id: 'c1',
          type: 'DIRECT',
          title: null,
          shopId: null,
          relatedResource: null,
          participantAccountIds: ['me', 'other'],
          lastMessageAt: message.createdAt,
          lastMessagePreview: message.body,
          lastMessageSenderAccountId: 'other',
          unreadCount: 0,
          hasUnreadFromOthers: false,
          createdAt: message.createdAt,
          updatedAt: message.createdAt,
        }}
        onToggleMinimize={() => {}}
        onClose={() => {}}
        onMarkRead={() => {}}
        socketReady
      />
    </QueryClientProvider>,
  )
}
afterEach(cleanup)
it('renders a reply quote returned by the server even when its original is outside the history page', async () => {
  vi.mocked(listChatMessages).mockResolvedValueOnce({
    items: [
      {
        ...message,
        replyToMessageId: 'older',
        replyToMessage: {
          id: 'older',
          senderAccountId: 'other',
          body: 'Older original',
          attachmentCount: 0,
        },
      },
    ],
    pagination: { page: 1, limit: 50, total: 1 },
  })
  mount()
  expect(await screen.findByText('Older original')).toBeVisible()
})
it('replies to a selected message and supports cancelling the quote', async () => {
  vi.mocked(sendChatMessage).mockResolvedValue({
    ...message,
    id: 'reply',
    body: 'Reply text',
    replyToMessageId: 'm1',
  })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Reply' }))
  expect(screen.getByRole('button', { name: 'Cancel reply' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }))
  expect(screen.queryByRole('button', { name: 'Cancel reply' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reply text' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() =>
    expect(sendChatMessage).toHaveBeenCalledWith('c1', {
      body: 'Reply text',
      assetIds: [],
      replyToMessageId: 'm1',
    }),
  )
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Cancel reply' })).not.toBeInTheDocument(),
  )
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listChatMessages).mockImplementation(async (_id, params) => ({
    items: params?.limit === 50 ? [message] : [],
    pagination: { page: 1, limit: Number(params?.limit), total: 50 },
  }))
})
it('loads the same history window as Messenger', async () => {
  mount()
  expect(await screen.findByText('Oldest visible message')).toBeVisible()
})

it('scrolls to a new message when the history window remains at fifty items', async () => {
  const scroll = vi.fn()
  const previous = HTMLElement.prototype.scrollIntoView
  HTMLElement.prototype.scrollIntoView = scroll
  try {
    const items = Array.from({ length: 50 }, (_, i) => ({
      ...message,
      id: `m${i}`,
      createdAt: new Date(Date.UTC(2026, 9, 15, 0, i)).toISOString(),
    }))
    vi.mocked(listChatMessages).mockResolvedValue({
      items,
      pagination: { page: 1, limit: 50, total: 50 },
    })
    vi.mocked(sendChatMessage).mockResolvedValue({
      ...message,
      id: 'new',
      body: 'Newest',
      createdAt: '2026-10-15T01:00:00Z',
    })
    mount()
    await waitFor(() => expect(scroll).toHaveBeenCalled())
    scroll.mockClear()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Newest' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Newest')
    await waitFor(() => expect(scroll).toHaveBeenCalled())
  } finally {
    HTMLElement.prototype.scrollIntoView = previous
  }
})
it('renders attachment-only messages instead of blank bubbles', async () => {
  vi.mocked(listChatMessages).mockResolvedValue({
    items: [
      {
        ...message,
        body: '',
        assetIds: ['a1'],
        assets: [
          {
            id: 'a1',
            mimeType: 'image/png',
            originalFilename: 'proof.png',
            size: 100,
            downloadUrl: '/api/media/assets/a1/download',
          },
        ],
      },
    ],
    pagination: { page: 1, limit: 50, total: 1 },
  })
  mount()
  expect(await screen.findByRole('img', { name: 'proof.png' })).toBeVisible()
})
it('syncs Teams for an opened direct chat', async () => {
  mount()
  await waitFor(() => expect(syncTeamsChat).toHaveBeenCalledWith('c1'))
})
it('downloads files through authenticated media and reports download failures', async () => {
  vi.mocked(listChatMessages).mockResolvedValue({
    items: [
      {
        ...message,
        body: '',
        assetIds: ['a1'],
        assets: [
          {
            id: 'a1',
            mimeType: 'application/pdf',
            originalFilename: 'proof.pdf',
            size: 100,
            downloadUrl: '/api/media/assets/a1/download',
          },
        ],
      },
    ],
    pagination: { page: 1, limit: 50, total: 1 },
  })
  vi.mocked(downloadMediaAsset).mockRejectedValueOnce(new Error('Access denied'))
  mount()
  fireEvent.click(await screen.findByRole('button', { name: /proof.pdf/ }))
  await waitFor(() =>
    expect(downloadMediaAsset).toHaveBeenCalledWith('/api/media/assets/a1/download', 'proof.pdf'),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to download the attachment')
})
it('shows a sent message even when the socket echo is lost', async () => {
  vi.mocked(sendChatMessage).mockResolvedValue({
    ...message,
    id: 'm2',
    senderAccountId: 'me',
    body: 'Sent without echo',
  })
  mount()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sent without echo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(await screen.findByText('Sent without echo')).toBeVisible()
})

it('uploads and sends an attachment without text, then clears the selection', async () => {
  vi.mocked(uploadMediaAsset).mockResolvedValue({
    id: 'a2',
    originalFilename: 'draft.pdf',
    mimeType: 'application/pdf',
    size: 5,
    provider: 'LOCAL',
    resourceType: null,
    ownerType: null,
    status: 'ACTIVE',
    downloadUrl: '/api/media/assets/a2/download',
    createdAt: message.createdAt,
  })
  vi.mocked(sendChatMessage).mockResolvedValue({ ...message, id: 'm2', body: '', assetIds: ['a2'] })
  const { container } = mount()
  const input = container.querySelector('input[type="file"]')
  expect(input).not.toBeNull()
  const file = new File(['proof'], 'draft.pdf', { type: 'application/pdf' })
  fireEvent.change(input!, { target: { files: [file] } })
  expect(await screen.findByText('draft.pdf')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() =>
    expect(sendChatMessage).toHaveBeenCalledWith('c1', { body: '', assetIds: ['a2'] }),
  )
  expect(uploadMediaAsset).toHaveBeenCalledWith(file)
  await waitFor(() => expect(screen.queryByText('draft.pdf')).not.toBeInTheDocument())
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
})

it('keeps the draft and file after an upload failure without sending an incomplete message', async () => {
  vi.mocked(uploadMediaAsset).mockRejectedValueOnce(new Error('Upload failed'))
  const { container } = mount()
  const input = container.querySelector('input[type="file"]')
  expect(input).not.toBeNull()
  fireEvent.change(input!, { target: { files: [new File(['proof'], 'draft.pdf')] } })
  await screen.findByText('draft.pdf')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Please review' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to send')
  expect(screen.getByRole('textbox')).toHaveValue('Please review')
  expect(screen.getByText('draft.pdf')).toBeVisible()
  expect(sendChatMessage).not.toHaveBeenCalled()
})

it('allows removing a selected file before sending', async () => {
  const { container } = mount()
  const input = container.querySelector('input[type="file"]')
  expect(input).not.toBeNull()
  fireEvent.change(input!, { target: { files: [new File(['proof'], 'draft.pdf')] } })
  fireEvent.click(await screen.findByRole('button', { name: 'Remove draft.pdf' }))
  expect(screen.queryByText('draft.pdf')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  expect(uploadMediaAsset).not.toHaveBeenCalled()
})

it('locks the composer during upload and reuses the uploaded file after a send failure', async () => {
  let finishUpload!: (asset: Awaited<ReturnType<typeof uploadMediaAsset>>) => void
  vi.mocked(uploadMediaAsset).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishUpload = resolve
      }),
  )
  vi.mocked(sendChatMessage)
    .mockRejectedValueOnce(new Error('Send failed'))
    .mockResolvedValueOnce({ ...message, id: 'm3', body: 'Review', assetIds: ['a3'] })
  const { container } = mount()
  fireEvent.change(container.querySelector('input[type="file"]')!, {
    target: { files: [new File(['proof'], 'retry.pdf')] },
  })
  await screen.findByText('retry.pdf')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Review' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Attach' })).toBeDisabled())
  expect(screen.getByRole('textbox')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Remove retry.pdf' })).toBeDisabled()
  finishUpload({
    id: 'a3',
    originalFilename: 'retry.pdf',
    mimeType: 'application/pdf',
    size: 5,
    provider: 'LOCAL',
    resourceType: null,
    ownerType: null,
    status: 'ACTIVE',
    downloadUrl: '/api/media/assets/a3/download',
    createdAt: message.createdAt,
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to send')
  expect(screen.getByRole('textbox')).toHaveValue('Review')
  expect(screen.getByText('retry.pdf')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''))
  expect(uploadMediaAsset).toHaveBeenCalledTimes(1)
  expect(sendChatMessage).toHaveBeenLastCalledWith('c1', { body: 'Review', assetIds: ['a3'] })
})
