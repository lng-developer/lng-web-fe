import '@/shared/i18n/i18n'
import '@/styles/global.scss'

import { bootstrapApp } from '@/app/bootstrap'
import { loginWithMicrosoft } from '@/features/auth/api/authApi'
import { clearStuckMsalInteraction, getMsalInstance } from '@/features/auth/microsoft/msalClient'

async function resolveMicrosoftRedirect() {
  const hash = window.location.hash
  const search = window.location.search
  const authResponseString =
    hash.includes('code=') || hash.includes('error=')
      ? hash
      : search.includes('code=') || search.includes('error=')
        ? search
        : ''

  if (authResponseString) {
    try {
      const pca = await getMsalInstance()
      const response = await pca.handleRedirectPromise({
        hash: authResponseString,
        navigateToLoginRequestUrl: false,
      })
      if (response?.idToken) {
        await loginWithMicrosoft(response.idToken)
        window.history.replaceState(null, '', '/')
      } else {
        const parsed = new URLSearchParams(authResponseString.replace(/^[#?]/, ''))
        const error = parsed.get('error')
        const errorDesc = parsed.get('error_description')
        const msg = error
          ? `${error}: ${errorDesc || ''}`
          : `Không nhận được token từ Microsoft (${authResponseString.substring(0, 40)}...). Vui lòng thử lại.`
        sessionStorage.setItem('msal_login_error', msg)
        window.history.replaceState(null, '', '/login')
      }
    } catch (error: unknown) {
      clearStuckMsalInteraction()
      const err = error as { errorCode?: string; message?: string }
      if (err?.errorCode !== 'user_cancelled' && err?.errorCode !== 'access_denied') {
        const message =
          error instanceof Error ? error.message : err?.message || 'Microsoft login failed'
        sessionStorage.setItem('msal_login_error', message)
      }
      window.history.replaceState(null, '', '/login')
    }
  }

  return true
}

void bootstrapApp(resolveMicrosoftRedirect)
