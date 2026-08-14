import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/app/layout/AppShell'
import { AppProviders } from '@/app/providers/AppProviders'
import { markChatConversationRead } from '@/features/portal/chat/api/chatApi'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/app/layout/AppSidebar', () => ({
  AppSidebar: () => <nav aria-label="Test navigation" />,
}))
vi.mock('@/app/layout/AppRail', () => ({
  AppRail: () => <nav aria-label="Test core rail" />,
}))
vi.mock('@/app/layout/AccountMenu', () => ({
  AccountMenu: () => <button type="button">Test account</button>,
}))
vi.mock('@/features/portal/chat/api/chatApi', () => ({
  listChatConversations: vi.fn(async () => ({
    items: [
      {
        id: 'conversation-1',
        type: 'DIRECT',
        title: 'Design chat',
        shopId: null,
        relatedResource: null,
        participantAccountIds: ['account-1', 'account-2'],
        lastMessageAt: '2026-08-13T12:00:00.000Z',
        lastMessagePreview: 'New file is ready',
        lastMessageSenderAccountId: 'account-2',
        unreadCount: 1,
        hasUnreadFromOthers: true,
        createdAt: '2026-08-13T11:00:00.000Z',
        updatedAt: '2026-08-13T12:00:00.000Z',
      },
    ],
    pagination: { page: 1, limit: 8, total: 1 },
  })),
  listChatMessages: vi.fn(async () => ({
    items: [
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        senderAccountId: 'account-2',
        body: 'New file is ready',
        assetIds: [],
        mentions: [],
        replyToMessageId: null,
        editedAt: null,
        deletedAt: null,
        createdAt: '2026-08-13T12:00:00.000Z',
        updatedAt: '2026-08-13T12:00:00.000Z',
      },
    ],
    pagination: { page: 1, limit: 25, total: 1 },
  })),
  listChatParticipants: vi.fn(async () => ({
    items: [{ id: 'account-2', email: 'designer@lng.co' }],
  })),
  markChatConversationRead: vi.fn(async () => ({
    conversationId: 'conversation-1',
    accountId: 'account-1',
    lastReadAt: '2026-08-13T12:01:00.000Z',
  })),
  sendChatMessage: vi.fn(),
}))

describe('AppShell', () => {
  beforeEach(async () => {
    document.title = ''
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the shell and child route without importing application pages', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({
            account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
            roles: [],
            permissions: ['HR_ATTENDANCE:WRITE'],
            scopes: [],
            profileSetupRequired: false,
          }),
          HydrateFallback: () => null,
          element: <AppShell />,
          children: [{ path: 'operations-dashboard', element: <h1>Foundation test page</h1> }],
        },
      ],
      { initialEntries: ['/operations-dashboard'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(await screen.findByRole('banner')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('heading', { name: 'Foundation test page' })).toBeVisible()
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Chat' })).toHaveLength(1))
    expect(screen.getByRole('navigation', { name: 'Test navigation' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Test core rail' })).toBeVisible()
  })

  it('opens unread quick chat from the floating badge', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({
            account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
            roles: [],
            permissions: ['HR_ATTENDANCE:WRITE'],
            scopes: [],
            profileSetupRequired: false,
          }),
          HydrateFallback: () => null,
          element: <AppShell />,
          children: [{ path: 'operations-dashboard', element: <h1>Foundation test page</h1> }],
        },
      ],
      { initialEntries: ['/operations-dashboard'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Chat' })).toHaveLength(2))
    fireEvent.click(screen.getAllByRole('button', { name: 'Chat' })[1])
    expect(await screen.findByRole('region', { name: 'designer@lng.co' })).toBeVisible()
    expect(markChatConversationRead).toHaveBeenCalledWith('conversation-1')
    expect(router.state.location.pathname).toBe('/operations-dashboard')

    fireEvent.focus(screen.getByRole('textbox', { name: 'Message' }))
    await waitFor(() => expect(markChatConversationRead).toHaveBeenCalledWith('conversation-1'))

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'designer@lng.co' })).not.toBeInTheDocument(),
    )

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Chat' })).toHaveLength(2))
    fireEvent.click(screen.getAllByRole('button', { name: 'Chat' })[1])
    expect(await screen.findByRole('region', { name: 'designer@lng.co' })).toBeVisible()
  })

  it('closes the chat preview when the page scrolls', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({
            account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
            roles: [],
            permissions: ['HR_ATTENDANCE:WRITE'],
            scopes: [],
            profileSetupRequired: false,
          }),
          HydrateFallback: () => null,
          element: <AppShell />,
          children: [{ path: 'operations-dashboard', element: <h1>Foundation test page</h1> }],
        },
      ],
      { initialEntries: ['/operations-dashboard'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    const previewText = (_: string, node: Element | null) =>
      Boolean(node?.textContent?.includes('designer@lng.co: New file is ready'))

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Chat' })).toHaveLength(2))
    fireEvent.click(screen.getAllByRole('button', { name: 'Chat' })[0])
    expect((await screen.findAllByText(previewText))[0]).toBeVisible()
    fireEvent.scroll(window)
    await waitFor(() => expect(screen.queryAllByText(previewText)).toHaveLength(0))
  })

  it('updates the browser tab title from the active navigation page', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({
            account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
            roles: [],
            permissions: ['ORDERS:READ'],
            scopes: [],
            profileSetupRequired: false,
          }),
          HydrateFallback: () => null,
          element: <AppShell />,
          children: [{ path: 'portal/orders', element: <h1>Orders test page</h1> }],
        },
      ],
      { initialEntries: ['/portal/orders'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Orders test page' })).toBeVisible()
    expect(document.title).toBe('Orders | LNG Web')
  })

  it('does not auto-open quick chat on the full chat page', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => ({
            account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
            roles: [],
            permissions: ['HR_ATTENDANCE:WRITE'],
            scopes: [],
            profileSetupRequired: false,
          }),
          HydrateFallback: () => null,
          element: <AppShell />,
          children: [{ path: 'portal/chat', element: <h1>Full chat page</h1> }],
        },
      ],
      { initialEntries: ['/portal/chat'] },
    )

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Full chat page' })).toBeVisible()
    expect(screen.queryByRole('region', { name: 'designer@lng.co' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Chat' })).toHaveLength(1)
  })
})
