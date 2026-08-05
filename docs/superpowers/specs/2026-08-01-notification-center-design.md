# Notification Center Design

- Add a notification bell to the global header for every authenticated account.
- Show unread count and the latest notifications in a compact popover.
- Support marking one notification or all notifications as read.
- Refresh the unread count every 60 seconds and refresh the inbox when opened.
- Keep backend-provided title/message content unchanged; localize all UI controls in Vietnamese and English.
- No dedicated page, websocket, or resource deep-link until the backend exposes stable resource routes/events.
