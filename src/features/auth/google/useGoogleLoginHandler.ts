import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api'
import { env } from '@/shared/config/env'

import { loginWithGoogle } from '../api/authApi'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: {
              access_token?: string
              error?: string
              error_description?: string
            }) => void
            error_callback?: (error: { type: string; message: string }) => void
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void
          }
        }
        id?: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          prompt: () => void
        }
      }
    }
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

export function useGoogleLoginHandler() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const tokenClientRef = useRef<{
    requestAccessToken: (config?: { prompt?: string }) => void
  } | null>(null)

  useEffect(() => {
    if (!env.googleClientId) return

    // If script is already in the document, don't duplicate
    const existingScript = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`)
    if (!existingScript) {
      const script = document.createElement('script')
      script.src = GSI_SCRIPT_URL
      script.async = true
      script.defer = true
      script.onload = () => {
        initClient()
      }
      document.body.appendChild(script)
    } else if (window.google?.accounts?.oauth2) {
      initClient()
    }

    function initClient() {
      if (!window.google?.accounts?.oauth2 || !env.googleClientId) return

      try {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: env.googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setGoogleLoading(false)
              setGoogleError(tokenResponse.error_description || tokenResponse.error)
              return
            }

            if (!tokenResponse.access_token) {
              setGoogleLoading(false)
              setGoogleError(t('auth.login.googleFailed'))
              return
            }

            try {
              const session = await loginWithGoogle({ accessToken: tokenResponse.access_token })
              navigate(
                session.account.mustChangePassword ? '/setup/password' : '/operations-dashboard',
                {
                  replace: true,
                },
              )
            } catch (err) {
              setGoogleError(err instanceof ApiError ? err.message : t('errors.unexpected'))
            } finally {
              setGoogleLoading(false)
            }
          },
          error_callback: (err) => {
            setGoogleLoading(false)
            setGoogleError(err?.message || t('auth.login.googleFailed'))
          },
        })
      } catch (e) {
        console.warn('Failed to initialize Google OAuth client', e)
      }
    }
  }, [navigate, t])

  const triggerGoogleLogin = () => {
    setGoogleError(null)

    if (!env.googleClientId) {
      setGoogleError(t('auth.login.googleNotConfigured'))
      return
    }

    if (!window.google?.accounts?.oauth2) {
      setGoogleLoading(true)
      const script = document.createElement('script')
      script.src = GSI_SCRIPT_URL
      script.async = true
      script.defer = true
      script.onload = () => {
        if (!window.google?.accounts?.oauth2) {
          setGoogleLoading(false)
          setGoogleError(t('auth.login.googleLoadError'))
          return
        }

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: env.googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setGoogleLoading(false)
              setGoogleError(tokenResponse.error_description || tokenResponse.error)
              return
            }
            if (!tokenResponse.access_token) {
              setGoogleLoading(false)
              setGoogleError(t('auth.login.googleFailed'))
              return
            }
            try {
              const session = await loginWithGoogle({ accessToken: tokenResponse.access_token })
              navigate(
                session.account.mustChangePassword ? '/setup/password' : '/operations-dashboard',
                {
                  replace: true,
                },
              )
            } catch (err) {
              setGoogleError(err instanceof ApiError ? err.message : t('errors.unexpected'))
            } finally {
              setGoogleLoading(false)
            }
          },
        })
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
      }
      script.onerror = () => {
        setGoogleLoading(false)
        setGoogleError(t('auth.login.googleLoadError'))
      }
      document.body.appendChild(script)
      return
    }

    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: env.googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setGoogleLoading(false)
            setGoogleError(tokenResponse.error_description || tokenResponse.error)
            return
          }
          if (!tokenResponse.access_token) {
            setGoogleLoading(false)
            setGoogleError(t('auth.login.googleFailed'))
            return
          }
          try {
            const session = await loginWithGoogle({ accessToken: tokenResponse.access_token })
            navigate(
              session.account.mustChangePassword ? '/setup/password' : '/operations-dashboard',
              {
                replace: true,
              },
            )
          } catch (err) {
            setGoogleError(err instanceof ApiError ? err.message : t('errors.unexpected'))
          } finally {
            setGoogleLoading(false)
          }
        },
      })
    }

    setGoogleLoading(true)
    tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
  }

  return {
    triggerGoogleLogin,
    googleLoading,
    googleError,
  }
}
