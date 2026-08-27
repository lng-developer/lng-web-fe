import type { CurrentAccount } from '@/features/auth/api/authApi'

import { IntegrationWorkbenchPage as IntegrationWorkbenchContent } from './IntegrationWorkbenchContent'

export interface IntegrationWorkbenchPageProps {
  readonly account?: CurrentAccount
}

export function IntegrationWorkbenchPage({ account }: IntegrationWorkbenchPageProps) {
  return <IntegrationWorkbenchContent account={account} />
}

export default IntegrationWorkbenchPage
