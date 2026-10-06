import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loginWithMicrosoft } from '@/features/auth/api/authApi'
import { env } from '@/shared/config/env'

import { clearStuckMsalInteraction, getMsalInstance } from './msalClient'

export function useMicrosoftLoginHandler() {
  const { t } = useTranslation()
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [microsoftError, setMicrosoftError] = useState<string | null>(null)
  const inProgressRef = useRef(false)
  const popupOpenedRef = useRef(false)

  const resetMicrosoftLogin = useCallback(() => {
    inProgressRef.current = false
    popupOpenedRef.current = false
    setMicrosoftLoading(false)
  }, [])

  useEffect(() => {
    window.addEventListener('pageshow', resetMicrosoftLogin)
    return () => window.removeEventListener('pageshow', resetMicrosoftLogin)
  }, [resetMicrosoftLogin])

  useEffect(() => {
    const markPopupOpened = () => {
      if (inProgressRef.current) {
        popupOpenedRef.current = true
      }
    }
    const recoverClosedPopup = () => {
      if (!inProgressRef.current || !popupOpenedRef.current) return

      resetMicrosoftLogin()
      clearStuckMsalInteraction()
    }

    window.addEventListener('blur', markPopupOpened)
    window.addEventListener('focus', recoverClosedPopup)
    return () => {
      window.removeEventListener('blur', markPopupOpened)
      window.removeEventListener('focus', recoverClosedPopup)
    }
  }, [resetMicrosoftLogin])

  const triggerMicrosoftLogin = async () => {
    setMicrosoftError(null)

    if (!env.microsoftClientId) {
      setMicrosoftError(t('auth.login.microsoftNotConfigured'))
      return
    }

    if (inProgressRef.current) return
    inProgressRef.current = true
    popupOpenedRef.current = false
    setMicrosoftLoading(true)

    try {
      clearStuckMsalInteraction()
      const pca = await getMsalInstance()
      const response = await pca.loginPopup({
        scopes: ['openid', 'profile', 'email', 'User.Read', 'ChatMessage.Send', 'Chat.ReadWrite'],
        prompt: 'select_account',
        redirectUri: `${window.location.origin}/msal-popup.html`,
        extraQueryParameters: {
          domain_hint: 'lngwork.co',
        },
      })
      if (!response.idToken) {
        throw new Error(t('auth.login.microsoftFailed'))
      }
      await loginWithMicrosoft(response.idToken)
      window.location.assign('/')
    } catch (err: unknown) {
      resetMicrosoftLogin()
      const error = err as { errorCode?: string; message?: string }
      if (
        error?.errorCode === 'user_cancelled' ||
        error?.message?.includes('user_cancelled') ||
        error?.message?.includes('User cancelled')
      ) {
        setMicrosoftError(null)
      } else {
        console.error('[LNG] Microsoft sign-in failed', err)
        setMicrosoftError(t('errors.unexpected'))
      }
    }
  }

  return {
    triggerMicrosoftLogin,
    microsoftLoading,
    microsoftError,
  }
}
