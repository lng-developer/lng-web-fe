import { useCallback, useMemo } from 'react'
import { App as AntdApp } from 'antd'

import { extractApiErrorMessage } from '@/shared/api'
import { FeedbackAlert, type FeedbackAlertProps } from './FeedbackAlert'
import styles from './sharedUi.module.scss'

export type FeedbackToastFn = {
  (type: FeedbackAlertProps['type'], title: string, description?: string): void
  apiError(err: unknown, fallbackTitle?: string): void
  success(title: string, description?: string): void
  error(title: string, description?: string): void
  warning(title: string, description?: string): void
  info(title: string, description?: string): void
}

export function useFeedbackToast(): FeedbackToastFn {
  const { notification } = AntdApp.useApp()

  const show = useCallback(
    (type: FeedbackAlertProps['type'], title: string, description?: string) => {
      notification.open({
        className: styles.feedbackToastNotification,
        closable: false,
        duration: 5,
        title: <FeedbackAlert type={type} title={title} description={description} />,
        placement: 'topRight',
      })
    },
    [notification],
  )

  return useMemo(() => {
    function fn(type: FeedbackAlertProps['type'], title: string, description?: string) {
      show(type, title, description)
    }

    return Object.assign(fn, {
      apiError: (err: unknown, fallbackTitle?: string) => {
        const { title, description } = extractApiErrorMessage(err, fallbackTitle)
        show('error', title, description)
      },
      success: (title: string, description?: string) => show('success', title, description),
      error: (title: string, description?: string) => show('error', title, description),
      warning: (title: string, description?: string) => show('warning', title, description),
      info: (title: string, description?: string) => show('info', title, description),
    }) as FeedbackToastFn
  }, [show])
}
