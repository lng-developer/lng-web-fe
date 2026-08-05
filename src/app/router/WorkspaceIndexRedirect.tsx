import { Navigate, useRouteLoaderData } from 'react-router-dom'

import { getDefaultWorkspacePath } from '@/app/layout/appNavigation'
import type { CurrentAccount } from '@/features/auth/api/authApi'

export function WorkspaceIndexRedirect() {
  const account = useRouteLoaderData('workspace') as CurrentAccount
  return <Navigate to={getDefaultWorkspacePath(account)} replace />
}
