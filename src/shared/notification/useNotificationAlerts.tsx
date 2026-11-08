import type React from 'react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { notification as staticNotification, App as AntdApp, Button } from 'antd'
import type { NotificationArgsProps } from 'antd'

import { FeedbackAlert } from '@/shared/ui'
import { showDesktopNotification } from './desktopNotification'
import { useTitleFlashStore } from './useTitleFlashStore'
import styles from '@/shared/ui/sharedUi.module.scss'

export interface AlertNotificationOptions {
  id: string
  title: string
  message: string
  onAction?: () => void
  actionText?: string
  flashText?: string
}

type NotifyApi = {
  open: (args: NotificationArgsProps) => void
  destroy?: (key?: React.Key) => void
}

export function useNotificationAlerts() {
  const { t } = useTranslation()
  let appNotification: NotifyApi | null = null
  try {
    const app = AntdApp.useApp()
    if (app?.notification && typeof app.notification.open === 'function') {
      appNotification = app.notification
    }
  } catch {
    // Context might not be wrapped with AntdApp in some isolated test harnesses
  }

  const notifyApi: NotifyApi = appNotification ?? staticNotification
  const setFlashMessage = useTitleFlashStore((s) => s.setFlashMessage)

  const alertImportantNotification = useCallback(
    ({ id, title, message, onAction, actionText, flashText }: AlertNotificationOptions) => {
      const key = `alert-${id}`

      // 1. In-App Toast with Action button
      if (typeof notifyApi?.open === 'function') {
        notifyApi.open({
          key,
          className: styles.feedbackToastNotification,
          closable: true,
          duration: 8,
          placement: 'topRight',
          title: (
            <FeedbackAlert
              type="info"
              title={title}
              description={message}
              action={
                onAction ? (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      notifyApi.destroy?.(key)
                      onAction()
                    }}
                  >
                    {actionText ?? t('notificationAlerts.viewDetail')}
                  </Button>
                ) : undefined
              }
            />
          ),
        })
      }

      // 2. Desktop Web Notification (if tab is hidden or unfocused)
      const isTabActive =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        (typeof document.hasFocus !== 'function' || document.hasFocus())

      if (!isTabActive) {
        showDesktopNotification({
          title,
          body: message,
          tag: key,
          onClick: () => {
            notifyApi?.destroy?.(key)
            onAction?.()
          },
        })

        // 3. Document Title Flash
        if (flashText) {
          setFlashMessage(flashText)
        }
      }
    },
    [notifyApi, setFlashMessage, t],
  )

  return { alertImportantNotification }
}
