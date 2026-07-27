import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Popover,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../api/notification.mutations.js'
import { useNotificationInboxQuery, useUnreadCountQuery } from '../api/notification.queries.js'
import { navigateToNotification } from '../api/notificationApi.js'

function NotificationListSkeleton() {
  return (
    <Stack className="gap-3 p-4">
      {[0, 1, 2].map((item) => (
        <Box key={item}>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="30%" />
        </Box>
      ))}
    </Stack>
  )
}

export default function NotificationPopover({ authenticated }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const unreadQuery = useUnreadCountQuery(authenticated)
  const inboxQuery = useNotificationInboxQuery(authenticated, open)
  const markRead = useMarkNotificationReadMutation()
  const markAllRead = useMarkAllNotificationsReadMutation()
  const unreadCount = unreadQuery.data ?? 0

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) {
      try {
        await markRead.mutateAsync(notification.id)
      } catch {
        return
      }
    }

    if (navigateToNotification(notification, navigate)) setAnchorEl(null)
  }

  return (
    <>
      <IconButton
        aria-label={t('header.notifications')}
        aria-controls={open ? 'notification-popover' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="dialog"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={(theme) => ({
          color: 'text.disabled',
          height: theme.spacing(4.5),
          width: theme.spacing(4.5),
          '&:hover': { bgcolor: 'background.default', color: 'text.primary' },
        })}
      >
        <Badge badgeContent={unreadCount} color="error" max={99} overlap="circular">
          <NotificationsNoneIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popover
        id="notification-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            'aria-label': t('notifications.title'),
            className: 'mt-2 w-[380px] max-w-[calc(100vw-24px)]',
            role: 'dialog',
          },
        }}
      >
        <Box className="flex items-center justify-between gap-3 px-4 py-3">
          <Box>
            <Typography variant="subtitle1" className="font-semibold">
              {t('notifications.title')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('notifications.unreadCount', { count: unreadCount })}
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {t('notifications.markAllRead')}
          </Button>
        </Box>
        <Divider />

        {inboxQuery.isPending ? <NotificationListSkeleton /> : null}
        {inboxQuery.isError ? (
          <Alert severity="error" className="m-4">
            {t('notifications.loadError')}
          </Alert>
        ) : null}
        {markRead.isError || markAllRead.isError ? (
          <Alert severity="error" className="m-4">
            {t('notifications.actionError')}
          </Alert>
        ) : null}
        {!inboxQuery.isPending && !inboxQuery.isError && !inboxQuery.data?.items?.length ? (
          <Box className="px-4 py-10 text-center">
            <NotificationsNoneIcon color="disabled" />
            <Typography variant="body2" color="text.secondary" className="mt-2">
              {t('notifications.empty')}
            </Typography>
          </Box>
        ) : null}

        {inboxQuery.data?.items?.length ? (
          <List disablePadding className="max-h-[420px] overflow-y-auto">
            {inboxQuery.data.items.map((notification) => (
              <ListItemButton
                key={notification.id}
                alignItems="flex-start"
                className="gap-3 px-4 py-3"
                disabled={markRead.isPending}
                onClick={() => handleNotificationClick(notification)}
              >
                <Box
                  aria-hidden="true"
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                    notification.readAt ? 'bg-transparent' : 'bg-primary'
                  }`}
                />
                <Box className="min-w-0 flex-1">
                  <Typography
                    variant="body2"
                    className={notification.readAt ? 'text-ink-muted' : 'font-semibold text-ink'}
                  >
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" className="mt-1">
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" className="mt-1 block">
                    {notification.createdAt
                      ? new Intl.DateTimeFormat(i18n.language, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(notification.createdAt))
                      : null}
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        ) : null}
      </Popover>
    </>
  )
}
