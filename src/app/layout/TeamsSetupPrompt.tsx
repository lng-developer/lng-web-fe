import { useEffect, useState } from 'react'
import { Alert, Button } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getTeamsOAuthStatus,
  startTeamsOAuth,
} from '@/features/integration/teams/api/teamsOAuthApi'

const dismissalKey = 'teams-setup-prompt-dismissed'

function readDismissal() {
  try {
    return sessionStorage.getItem(dismissalKey) === 'true'
  } catch {
    return false
  }
}

export function TeamsSetupPrompt() {
  const queryClient = useQueryClient()
  const [dismissed, setDismissed] = useState(readDismissal)
  const status = useQuery({
    queryKey: ['teams-oauth-status'],
    queryFn: getTeamsOAuthStatus,
  })
  const needsSetup =
    status.data?.enabled && status.data.userLinked && status.data.grantStatus !== 'CONNECTED'

  useEffect(() => {
    const refreshStatus = () =>
      void queryClient.invalidateQueries({ queryKey: ['teams-oauth-status'] })
    window.addEventListener('focus', refreshStatus)
    return () => window.removeEventListener('focus', refreshStatus)
  }, [queryClient])

  if (!needsSetup || dismissed) return null

  const connect = async () => {
    const popup = window.open('', 'teams-oauth', 'popup,width=560,height=720')
    try {
      const { authorizationUrl } = await startTeamsOAuth()
      if (popup) popup.location.assign(authorizationUrl)
      else window.location.assign(authorizationUrl)
    } catch {
      popup?.close()
    }
  }

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissalKey, 'true')
    } catch {
      // Session storage is optional for this non-blocking prompt.
    }
    setDismissed(true)
  }

  return (
    <Alert
      banner
      closable
      title={
        status.data?.grantStatus === 'REAUTH_REQUIRED'
          ? 'Reconnect Teams to resume synchronization.'
          : 'Connect Teams to synchronize chat.'
      }
      action={
        <Button size="small" type="primary" onClick={() => void connect()}>
          Connect Teams
        </Button>
      }
      onClose={dismiss}
    />
  )
}
