import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/shared/api'
import { env } from '@/shared/config/env'

import { clearStuckMsalInteraction, getMsalInstance } from './msalClient'

export function useMicrosoftLoginHandler() {
  const { t } = useTranslation()
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [microsoftError, setMicrosoftError] = useState<string | null>(null)
  const inProgressRef = useRef(false)

  const triggerMicrosoftLogin = async () => {
    setMicrosoftError(null)

    if (!env.microsoftClientId) {
      setMicrosoftError(t('auth.login.microsoftNotConfigured'))
      return
    }

    if (inProgressRef.current) return
    inProgressRef.current = true
    setMicrosoftLoading(true)

    try {
      clearStuckMsalInteraction()
      const pca = await getMsalInstance()
      await pca.loginRedirect({
        scopes: ['openid', 'profile', 'email', 'User.Read', 'ChatMessage.Send', 'Chat.ReadWrite'],
        prompt: 'select_account',
        redirectUri: window.location.origin,
        redirectStartPage: window.location.origin,
        extraQueryParameters: {
          domain_hint: 'lngwork.co',
        },
      })
    } catch (err: unknown) {
      inProgressRef.current = false
      setMicrosoftLoading(false)
      const error = err as { errorCode?: string; message?: string }
      if (
        error?.errorCode === 'user_cancelled' ||
        error?.message?.includes('user_cancelled') ||
        error?.message?.includes('User cancelled')
      ) {
        setMicrosoftError(null)
      } else if (err instanceof ApiError) {
        setMicrosoftError(err.message)
      } else {
        setMicrosoftError(error?.message || t('auth.login.microsoftFailed'))
      }
    }
  }

  return {
    triggerMicrosoftLogin,
    microsoftLoading,
    microsoftError,
  }
}
