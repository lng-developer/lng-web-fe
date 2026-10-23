import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { MutationCacheNotifyEvent } from '@tanstack/query-core'
import { useQueryClient } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'

import { FeedbackAlert } from '@/shared/ui'
import styles from '@/shared/ui/sharedUi.module.scss'

function getMutationActionName(
  mutation: { options: { mutationKey?: unknown } },
  defaultLabel: string,
) {
  const key = mutation.options.mutationKey
  if (!Array.isArray(key) || key.length === 0) return defaultLabel
  const last = key[key.length - 1]
  if (typeof last === 'string') return last
  return JSON.stringify(key)
}

export function GlobalMutationToastProvider() {
  const queryClient = useQueryClient()
  const { notification } = AntdApp.useApp()
  const { t } = useTranslation()
  const seen = useRef(new Set<string>())

  useEffect(() => {
    const unsubscribe = queryClient
      .getMutationCache()
      .subscribe((event: MutationCacheNotifyEvent) => {
        if (event.type !== 'updated' || !event.mutation) return

        const mutation = event.mutation
        const state = mutation.state || {}
        const status = state.status
        const meta = mutation.options?.meta || {}
        if (meta.skipGlobalToast) return

        const mutationId = `${mutation.state?.submittedAt || ''}:${status}`
        if (seen.current.has(mutationId)) return

        if (status === 'error' && !mutation.options?.onError) {
          seen.current.add(mutationId)
          const action = getMutationActionName(mutation, t('globalFeedback.defaultAction'))
          const title = t('globalFeedback.actionFailed', { action })
          const description =
            (state.error && typeof state.error.message === 'string'
              ? state.error.message
              : undefined) || undefined
          notification.open({
            className: `${styles.feedbackToastNotification} ${styles.feedbackToastError}`,
            closable: true,
            duration: 5,
            title: <FeedbackAlert type="error" title={title} description={description} />,
            placement: 'topRight',
          })
          return
        }

        if (status === 'success' && !mutation.options?.onSuccess) {
          seen.current.add(mutationId)
          const action = getMutationActionName(mutation, t('globalFeedback.defaultAction'))
          const title = t('globalFeedback.actionSucceeded', { action })
          notification.open({
            className: styles.feedbackToastNotification,
            closable: true,
            duration: 5,
            title: <FeedbackAlert type="success" title={title} />,
            placement: 'topRight',
          })
        }
      })

    return () => unsubscribe()
  }, [queryClient, notification, t])

  return null
}
