import { Configuration, PublicClientApplication } from '@azure/msal-browser'
import { env } from '@/shared/config/env'

let pcaInstance: PublicClientApplication | null = null
let pcaInitPromise: Promise<PublicClientApplication> | null = null

export function clearStuckMsalInteraction() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key && (key.includes('interaction.status') || key.includes('interaction_status'))) {
        sessionStorage.removeItem(key)
      }
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && (key.includes('interaction.status') || key.includes('interaction_status'))) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore
  }
}

export function getMsalInstance(): Promise<PublicClientApplication> {
  if (pcaInstance) {
    return Promise.resolve(pcaInstance)
  }
  if (!pcaInitPromise) {
    const tenant = env.microsoftTenantId || 'common'
    const msalConfig: Configuration = {
      auth: {
        clientId: env.microsoftClientId || 'placeholder-id',
        authority: `https://login.microsoftonline.com/${tenant}`,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
      system: {
        loggerOptions: {
          loggerCallback: (_level: unknown, message: string, containsPii: boolean) => {
            if (containsPii) return
            console.log('[MSAL]:', message)
          },
        },
      },
    }

    const pca = new PublicClientApplication(msalConfig)
    pcaInitPromise = pca.initialize().then(() => {
      pcaInstance = pca
      return pca
    })
  }
  return pcaInitPromise
}
